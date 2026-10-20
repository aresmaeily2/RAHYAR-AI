// ─── Provider «Endpoint سازگار با OpenAI» — بدون وابستگی به شرکت ──
// کاربر فقط URL و (در صورت نیاز) کلید و نام مدل می‌دهد؛
// هر سرویس سازگار کار می‌کند: Ollama، LM Studio، DeepSeek،
// OpenRouter، OpenAI، یا هر سرور سازگار دیگر.
// هیچ شرکت یا مدل خاصی داخل کد فرض نشده است.
//
// نکته امنیتی: درخواست سمت سرور زده می‌شود (کلید هرگز به کلاینت
// برنمی‌گردد)؛ URL فقط http/https؛ مهلت ۳۰ ثانیه؛ بدنه مهارشده.

import type { LlmMessage } from '@/lib/ai'
import { lookup } from 'node:dns/promises'
import {
  endpointHostAllowed,
  AIProvider,
  ProviderCallContext,
  ProviderChatResult,
  ProviderConfigError,
} from './types'

const TIMEOUT_MS = 30_000
export const FALLBACK_MODEL_LABEL = 'openai-compatible'

/** ساخت بدنه درخواست سازگار با OpenAI Chat Completions */
function buildBody(messages: LlmMessage[], model: string, stream: boolean): string {
  return JSON.stringify({ model, messages, stream })
}

async function postChat(
  ctx: ProviderCallContext,
  body: string,
  signal: AbortSignal,
): Promise<Response> {
  const base = (ctx.endpointUrl ?? '').replace(/\/+$/, '')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (ctx.endpointKey) headers.Authorization = `Bearer ${ctx.endpointKey}`
  // GU2-SEC3: گارد SSRF — بررسی میزبان و IPهای resolve‌شده پیش از اتصال
  let target: URL
  try {
    target = new URL(`${base}/chat/completions`)
  } catch {
    throw new ProviderConfigError('آدرس Endpoint نامعتبر است')
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new ProviderConfigError('آدرس Endpoint نامعتبر است')
  }
  const ips = await lookup(target.hostname.replace(/^\[|\]$/g, ''), { all: true })
    .then((r) => r.map((x) => x.address))
    .catch(() => [] as string[])
  const allowPrivate = process.env.AI_ALLOW_PRIVATE_ENDPOINTS !== '0'
  if (!endpointHostAllowed(target.hostname, ips, allowPrivate)) {
    throw new ProviderConfigError('این آدرس Endpoint به دلایل امنیتی مجاز نیست')
  }
  // GRAND-F5 (SEC-F2): کاهش TOCTOU/rebinding DNS — resolve دوم بلافاصله پیش از
  // fetch؛ همهٔ IPهای تازه هم باید مجاز باشند. پنجرهٔ حمله از «بین lookup و اتصال»
  // به چند میلی‌ثانیه می‌رسد. ریشه‌کنی کامل نیازمند pin کردن IP در لایهٔ اتصال
  // است (undici dispatcher در دسترس نیست — محدودیت مستند در گزارش).
  const ips2 = await lookup(target.hostname.replace(/^\[|\]$/g, ''), { all: true })
    .then((r) => r.map((x) => x.address))
    .catch(() => [] as string[])
  if (!endpointHostAllowed(target.hostname, ips2, allowPrivate)) {
    throw new ProviderConfigError('این آدرس Endpoint به دلایل امنیتی مجاز نیست')
  }
  let res: Response
  try {
    res = await fetch(target, {
      method: 'POST',
      headers,
      body,
      signal,
      // ریدایرکت دنبال نمی‌شود — وگرنه گارد بالا با 30x به آدرس داخلی دور زده می‌شود
      redirect: 'manual',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('openai-compatible fetch failed', msg.slice(0, 120))
    throw new ProviderConfigError('اتصال به Endpoint ناموفق بود')
  }
  if (res.status >= 300 && res.status < 400) {
    throw new ProviderConfigError('Endpoint ریدایرکت داد؛ آدرس نهایی را مستقیم وارد کن')
  }
  if (!res.ok) {
    // بدنه پاسخ بازتاب داده نمی‌شود (جلوگیری از نشت محتوای سرویس داخلی) — فقط کد وضعیت
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError(`Endpoint پاسخ ${res.status} داد`)
  }
  return res
}

function requireConfig(ctx: ProviderCallContext): string {
  const url = (ctx.endpointUrl ?? '').trim()
  if (!url) throw new ProviderConfigError('آدرس Endpoint ثبت نشده است')
  const model = (ctx.endpointModel ?? '').trim() || 'default'
  return model
}

export const openAiCompatibleProvider: AIProvider = {
  id: 'openai_compatible',
  label: 'Endpoint سازگار با OpenAI',
  consumesQuota: false, // کلید مالِ خود کاربر است — سهمیه پلتفرم مصرف نمی‌شود

  isConfigured(ctx: ProviderCallContext): boolean {
    return Boolean((ctx.endpointUrl ?? '').trim())
  },

  async chat(
    messages: LlmMessage[],
    ctx: ProviderCallContext,
  ): Promise<ProviderChatResult> {
    const model = requireConfig(ctx)
    const res = await postChat(ctx, buildBody(messages, model, false), AbortSignal.timeout(TIMEOUT_MS))
    const data = (await res.json().catch(() => null)) as {
      model?: string
      choices?: Array<{ message?: { content?: string } }>
    } | null
    const text = data?.choices?.[0]?.message?.content ?? ''
    if (!text.trim()) throw new ProviderConfigError('Endpoint پاسخ خالی برگرداند')
    return { text, model: data?.model ? String(data.model) : model }
  },

  async stream(
    messages: LlmMessage[],
    ctx: ProviderCallContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const model = requireConfig(ctx)
    const res = await postChat(ctx, buildBody(messages, model, true), AbortSignal.timeout(TIMEOUT_MS))
    if (!res.body) throw new ProviderConfigError('Endpoint استریم خالی برگرداند')
    // SSE همان قالب OpenAI — مستقیم به Gateway/مسیر چت پاس می‌شود
    return res.body
  },
}

/** تست اتصال — یک درخواست کوچک؛ فقط برای دکمه «تست اتصال» تنظیمات */
export async function testEndpoint(
  ctx: ProviderCallContext,
): Promise<{ ok: boolean; model: string; latencyMs: number; sample: string; error?: string }> {
  const started = Date.now()
  try {
    const r = await openAiCompatibleProvider.chat(
      [{ role: 'user', content: 'ping' }],
      ctx,
    )
    return {
      ok: true,
      model: r.model,
      latencyMs: Date.now() - started,
      sample: r.text.trim().slice(0, 60),
    }
  } catch (e) {
    return {
      ok: false,
      model: (ctx.endpointModel ?? '').trim() || FALLBACK_MODEL_LABEL,
      latencyMs: Date.now() - started,
      sample: '',
      error: e instanceof Error ? e.message.slice(0, 200) : 'خطای ناشناخته',
    }
  }
}
