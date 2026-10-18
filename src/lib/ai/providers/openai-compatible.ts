// ─── Provider «Endpoint سازگار با OpenAI» — بدون وابستگی به شرکت ──
// کاربر فقط URL و (در صورت نیاز) کلید و نام مدل می‌دهد؛
// هر سرویس سازگار کار می‌کند: Ollama، LM Studio، DeepSeek،
// OpenRouter، OpenAI، یا هر سرور سازگار دیگر.
// هیچ شرکت یا مدل خاصی داخل کد فرض نشده است.
//
// نکته امنیتی: درخواست سمت سرور زده می‌شود (کلید هرگز به کلاینت
// برنمی‌گردد)؛ URL فقط http/https؛ مهلت ۳۰ ثانیه؛ بدنه مهارشده.

import type { LlmMessage } from '@/lib/ai'
import {
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
  let res: Response
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body,
      signal,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new ProviderConfigError(`اتصال به Endpoint ناموفق بود: ${msg.slice(0, 120)}`)
  }
  if (!res.ok) {
    const snippet = (await res.text().catch(() => '')).slice(0, 200)
    throw new ProviderConfigError(`Endpoint پاسخ ${res.status} داد: ${snippet}`)
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
