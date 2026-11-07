// ─── F5: آداپتور بومی Gemini (Google Generative Language REST) ──
// POST {base}/v1beta/models/{model}:generateContent با هدر x-goog-api-key
// (کلید در URL نمی‌رود تا در لاگ‌ها نشت نکند). استریم با alt=sse و ترجمهٔ
// SSE گوگل به قالب سازگار با OpenAI برای Gateway.

import type { LlmMessage } from '@/lib/ai'
import { lookup } from 'node:dns/promises'
import {
  endpointHostAllowed,
  type AIProvider,
  type ProviderCallContext,
  type ProviderChatResult,
  ProviderConfigError,
} from './types'

const TIMEOUT_MS = 30_000
export const GEMINI_BASE = 'https://generativelanguage.googleapis.com'

async function post(ctx: ProviderCallContext, path: string, body: string): Promise<Response> {
  const base = ((ctx.endpointUrl ?? '').trim() || GEMINI_BASE).replace(/\/+$/, '')
  if (!(ctx.endpointKey ?? '').trim()) throw new ProviderConfigError('کلید API ثبت نشده است')
  let target: URL
  try {
    target = new URL(`${base}${path}`)
  } catch {
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
    res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': (ctx.endpointKey as string).trim() },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'manual',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.toLowerCase().includes('timeout')) throw new ProviderConfigError('مهلت پاسخ سرویس تمام شد (Timeout)')
    throw new ProviderConfigError('اتصال به سرویس Gemini ناموفق بود')
  }
  if (res.status === 401 || res.status === 403) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError('کلید API گوگل نامعتبر است یا دسترسی ندارد')
  }
  if (res.status === 429) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError('محدودیت نرخ Gemini (429) — کمی بعد دوباره تلاش کن')
  }
  if (!res.ok) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError(`سرویس Gemini پاسخ ${res.status} داد`)
  }
  return res
}

/** تبدیل پیام‌ها به فرمت Gemini — system به systemInstruction می‌رود */
export function buildGeminiBody(messages: LlmMessage[]): string {
  let system = ''
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
  for (const m of messages) {
    if (m.role === 'system') system += (system ? '\n' : '') + m.content
    else contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })
  }
  return JSON.stringify({
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents,
  })
}

function extractText(data: unknown): string {
  const d = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null
  return (d?.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p?.text ?? '')
    .join('')
    .trim()
}

export const geminiProvider: AIProvider = {
  id: 'gemini',
  label: 'Gemini (Google)',
  consumesQuota: false,

  isConfigured(ctx: ProviderCallContext): boolean {
    return Boolean((ctx.endpointKey ?? '').trim())
  },

  async chat(messages: LlmMessage[], ctx: ProviderCallContext): Promise<ProviderChatResult> {
    const model = (ctx.endpointModel ?? '').trim() || 'gemini-1.5-flash'
    const res = await post(ctx, `/v1beta/models/${encodeURIComponent(model)}:generateContent`, buildGeminiBody(messages))
    const data = (await res.json().catch(() => null)) as { modelVersion?: string } | null
    const text = extractText(data)
    if (!text) throw new ProviderConfigError('سرویس Gemini پاسخ خالی برگرداند')
    return { text, model: data?.modelVersion ? String(data.modelVersion) : model }
  },

  async stream(messages: LlmMessage[], ctx: ProviderCallContext): Promise<ReadableStream<Uint8Array>> {
    const model = (ctx.endpointModel ?? '').trim() || 'gemini-1.5-flash'
    const res = await post(
      ctx,
      `/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      buildGeminiBody(messages),
    )
    if (!res.body) throw new ProviderConfigError('استریم Gemini خالی است')
    const enc = new TextEncoder()
    const dec = new TextDecoder()
    let buf = ''
    return res.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctrl) {
          buf += dec.decode(chunk, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            const s = line.trim()
            if (!s.startsWith('data:')) continue
            const payload = s.slice(5).trim()
            if (!payload) continue
            try {
              const ev = JSON.parse(payload) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
              const t = (ev.candidates?.[0]?.content?.parts ?? []).map((p) => p?.text ?? '').join('')
              if (t) ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`))
            } catch {
              /* قطعهٔ ناقص SSE */
            }
          }
        },
        flush(ctrl) {
          ctrl.enqueue(enc.encode('data: [DONE]\n\n'))
        },
      }),
    )
  },
}

/** تست اتصال واقعی Gemini */
export async function testGemini(
  ctx: ProviderCallContext,
): Promise<{ ok: boolean; model: string; latencyMs: number; sample: string; error?: string }> {
  const started = Date.now()
  const model = (ctx.endpointModel ?? '').trim() || 'gemini-1.5-flash'
  try {
    const res = await post(ctx, `/v1beta/models/${encodeURIComponent(model)}:generateContent`, buildGeminiBody([{ role: 'user', content: 'سلام' }]))
    const data = (await res.json().catch(() => null)) as { modelVersion?: string } | null
    const text = extractText(data)
    return { ok: Boolean(text), model: data?.modelVersion ?? model, latencyMs: Date.now() - started, sample: text.slice(0, 60) }
  } catch (e) {
    return {
      ok: false,
      model,
      latencyMs: Date.now() - started,
      sample: '',
      error: e instanceof Error ? e.message.slice(0, 200) : 'خطای ناشناخته',
    }
  }
}
