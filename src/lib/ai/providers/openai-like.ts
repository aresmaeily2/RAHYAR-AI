// ─── F5: آداپتور «سازگار با OpenAI» برای Providerهای نام‌دار ────
// OpenAI · DeepSeek · OpenRouter · Ollama · LM Studio همگی همین
// پروتکل (Chat Completions) را پیاده می‌کنند. این فایل یک factory
// دارد که برای هر پیش‌تنظیم یک AIProvider کامل (chat + stream) می‌سازد.
//
// امنیت (هم‌راستا با openai-compatible.ts):
//  - درخواست فقط سمت سرور؛ کلید هرگز به کلاینت برنمی‌گردد
//  - گارد SSRF پیش از اتصال + resolve دوم ضد TOCTOU
//  - ریدایرکت دنبال نمی‌شود؛ مهلت ۳۰ ثانیه؛ خطاها صادقانه و بدون نشت بدنه

import type { LlmMessage } from '@/lib/ai'
import { lookup } from 'node:dns/promises'
import {
  endpointHostAllowed,
  type AIProvider,
  type ProviderCallContext,
  type ProviderChatResult,
  ProviderConfigError,
} from './types'
import { PROVIDER_PRESETS, type PresetEngineId } from './presets'

const TIMEOUT_MS = 30_000

export interface OpenAiLikeOptions {
  /** برچسب مدل جایگزین وقتی سرویس مدل برنمی‌گرداند */
  fallbackModelLabel: string
}

async function guardedPost(
  ctx: ProviderCallContext,
  path: string,
  headers: Record<string, string>,
  body: string,
): Promise<Response> {
  const base = (ctx.endpointUrl ?? '').replace(/\/+$/, '')
  let target: URL
  try {
    target = new URL(`${base}${path}`)
  } catch {
    throw new ProviderConfigError('آدرس Endpoint نامعتبر است')
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new ProviderConfigError('آدرس Endpoint نامعتبر است')
  }
  const host = target.hostname.replace(/^\[|\]$/g, '')
  const allowPrivate = process.env.AI_ALLOW_PRIVATE_ENDPOINTS === '1'
  for (let round = 0; round < 2; round++) {
    const ips = await lookup(host, { all: true })
      .then((r) => r.map((x) => x.address))
      .catch(() => [] as string[])
    if (!endpointHostAllowed(target.hostname, ips, allowPrivate)) {
      throw new ProviderConfigError('این آدرس Endpoint به دلایل امنیتی مجاز نیست')
    }
  }
  let res: Response
  try {
    res = await fetch(target, { method: 'POST', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'manual' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // خطاهای رایج را صادقانه و قابل‌فهم گزارش می‌کنیم (Timeout / قطع شبکه / محدودیت نرخ)
    console.warn(`openai-like fetch failed: ${msg.slice(0, 120)}`)
    if (msg.includes('TimeoutError') || msg.toLowerCase().includes('timeout')) {
      throw new ProviderConfigError('مهلت پاسخ سرویس تمام شد (Timeout)')
    }
    throw new ProviderConfigError('اتصال به سرویس ناموفق بود (قطع اینترنت یا سرویس در دسترس نیست)')
  }
  if (res.status >= 300 && res.status < 400) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError('سرویس ریدایرکت داد؛ آدرس نهایی را مستقیم وارد کن')
  }
  if (res.status === 401 || res.status === 403) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError('کلید API نامعتبر است یا دسترسی ندارد')
  }
  if (res.status === 429) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError('محدودیت نرخ سرویس (429) — کمی بعد دوباره تلاش کن')
  }
  if (!res.ok) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError(`سرویس پاسخ ${res.status} داد`)
  }
  return res
}

function requireKey(ctx: ProviderCallContext, keyRequired: boolean): void {
  if (keyRequired && !(ctx.endpointKey ?? '').trim()) {
    throw new ProviderConfigError('کلید API ثبت نشده است')
  }
}

/** ساخت یک AIProvider کامل برای یک پیش‌تنظیمِ سازگار با OpenAI */
export function makeOpenAiLikeProvider(id: PresetEngineId, opts: OpenAiLikeOptions): AIProvider {
  const preset = PROVIDER_PRESETS[id]
  const label = preset.label
  const keyRequired = preset.keyRequired

  function buildBody(messages: LlmMessage[], model: string, stream: boolean): string {
    return JSON.stringify({ model, messages, stream })
  }

  return {
    id,
    label,
    consumesQuota: false,

    isConfigured(ctx: ProviderCallContext): boolean {
      if (!(ctx.endpointUrl ?? '').trim()) return false
      if (keyRequired && !(ctx.endpointKey ?? '').trim()) return false
      return true
    },

    async chat(messages: LlmMessage[], ctx: ProviderCallContext): Promise<ProviderChatResult> {
      const model = (ctx.endpointModel ?? '').trim() || preset.defaultModel
      requireKey(ctx, keyRequired)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if ((ctx.endpointKey ?? '').trim()) headers.Authorization = `Bearer ${(ctx.endpointKey as string).trim()}`
      const res = await guardedPost(ctx, '/chat/completions', headers, buildBody(messages, model, false))
      const data = (await res.json().catch(() => null)) as {
        model?: string
        choices?: Array<{ message?: { content?: string } }>
      } | null
      const text = data?.choices?.[0]?.message?.content ?? ''
      if (!text.trim()) throw new ProviderConfigError('سرویس پاسخ خالی برگرداند')
      return { text, model: data?.model ? String(data.model) : model }
    },

    async stream(messages: LlmMessage[], ctx: ProviderCallContext): Promise<ReadableStream<Uint8Array>> {
      const model = (ctx.endpointModel ?? '').trim() || preset.defaultModel
      requireKey(ctx, keyRequired)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if ((ctx.endpointKey ?? '').trim()) headers.Authorization = `Bearer ${(ctx.endpointKey as string).trim()}`
      const res = await guardedPost(ctx, '/chat/completions', headers, buildBody(messages, model, true))
      if (!res.body) throw new ProviderConfigError('استریم سرویس خالی است')
      // SSE همان قالب OpenAI — مستقیم پاس داده می‌شود
      return res.body
    },
  }
}

/** تست اتصال واقعی — یک درخواست کوچک با پاسخ کوتاه */
export async function testOpenAiLike(
  provider: AIProvider,
  ctx: ProviderCallContext,
  fallbackModelLabel: string,
): Promise<{ ok: boolean; model: string; latencyMs: number; sample: string; error?: string }> {
  const started = Date.now()
  try {
    const r = await provider.chat([{ role: 'user', content: 'با یک جملهٔ کوتاه سلام کن' }], ctx)
    return { ok: true, model: r.model, latencyMs: Date.now() - started, sample: r.text.trim().slice(0, 60) }
  } catch (e) {
    return {
      ok: false,
      model: (ctx.endpointModel ?? '').trim() || fallbackModelLabel,
      latencyMs: Date.now() - started,
      sample: '',
      error: e instanceof Error ? e.message.slice(0, 200) : 'خطای ناشناخته',
    }
  }
}
