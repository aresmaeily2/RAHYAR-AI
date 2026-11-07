// ─── F5: آداپتور بومی Claude (Anthropic Messages API) ───────────
// POST {base}/v1/messages با هدر x-api-key + anthropic-version.
// استریم SSE کلود به قالب SSE سازگار با OpenAI ترجمه می‌شود تا
// Gateway/مسیر چت بدون تغییر کار کند.
// خطاها صادقانه: کلید نامعتبر، محدودیت نرخ، مهلت، قطع اینترنت.

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
const API_VERSION = '2023-06-01'
const DEFAULT_MAX_TOKENS = 1024

export const CLAUDE_BASE = 'https://api.anthropic.com'

async function post(ctx: ProviderCallContext, body: string, signal?: AbortSignal): Promise<Response> {
  const base = ((ctx.endpointUrl ?? '').trim() || CLAUDE_BASE).replace(/\/+$/, '')
  if (!(ctx.endpointKey ?? '').trim()) throw new ProviderConfigError('کلید API ثبت نشده است')
  let target: URL
  try {
    target = new URL(`${base}/v1/messages`)
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
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': (ctx.endpointKey as string).trim(),
        'anthropic-version': API_VERSION,
      },
      body,
      signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'manual',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.toLowerCase().includes('timeout')) throw new ProviderConfigError('مهلت پاسخ سرویس تمام شد (Timeout)')
    throw new ProviderConfigError('اتصال به سرویس Claude ناموفق بود')
  }
  if (res.status === 401 || res.status === 403) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError('کلید API کلود نامعتبر است یا دسترسی ندارد')
  }
  if (res.status === 429) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError('محدودیت نرخ Claude (429) — کمی بعد دوباره تلاش کن')
  }
  if (!res.ok) {
    void res.body?.cancel().catch(() => {})
    throw new ProviderConfigError(`سرویس Claude پاسخ ${res.status} داد`)
  }
  return res
}

/** تبدیل پیام‌ها به فرمت Claude — system جدا می‌شود */
export function buildClaudeBody(messages: LlmMessage[], model: string, stream: boolean, maxTokens = DEFAULT_MAX_TOKENS): string {
  let system = ''
  const msgs: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const m of messages) {
    if (m.role === 'system') system += (system ? '\n' : '') + m.content
    else msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })
  }
  return JSON.stringify({ model, max_tokens: maxTokens, ...(system ? { system } : {}), messages: msgs, stream })
}

function extractText(data: unknown): string {
  const d = data as { content?: Array<{ type?: string; text?: string }> } | null
  return (d?.content ?? [])
    .filter((c) => c?.type === 'text')
    .map((c) => c.text ?? '')
    .join('')
    .trim()
}

export const claudeProvider: AIProvider = {
  id: 'claude',
  label: 'Claude (Anthropic)',
  consumesQuota: false,

  isConfigured(ctx: ProviderCallContext): boolean {
    return Boolean((ctx.endpointKey ?? '').trim())
  },

  async chat(messages: LlmMessage[], ctx: ProviderCallContext): Promise<ProviderChatResult> {
    const model = (ctx.endpointModel ?? '').trim() || 'claude-3-5-haiku-latest'
    const res = await post(ctx, buildClaudeBody(messages, model, false))
    const data = (await res.json().catch(() => null)) as { model?: string } | null
    const text = extractText(data)
    if (!text) throw new ProviderConfigError('سرویس Claude پاسخ خالی برگرداند')
    return { text, model: data?.model ? String(data.model) : model }
  },

  async stream(messages: LlmMessage[], ctx: ProviderCallContext): Promise<ReadableStream<Uint8Array>> {
    const model = (ctx.endpointModel ?? '').trim() || 'claude-3-5-haiku-latest'
    const res = await post(ctx, buildClaudeBody(messages, model, true))
    if (!res.body) throw new ProviderConfigError('استریم Claude خالی است')
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
            if (!payload || payload === '[DONE]') continue
            try {
              const ev = JSON.parse(payload) as {
                type?: string
                delta?: { type?: string; text?: string }
              }
              if (ev.type === 'content_block_delta' && ev.delta?.text) {
                ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: ev.delta.text } }] })}\n\n`))
              }
            } catch {
              /* قطعهٔ ناقص SSE — نادیده */
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

/** تست اتصال واقعی Claude — پیام بسیار کوتاه (max_tokens کم) */
export async function testClaude(
  ctx: ProviderCallContext,
): Promise<{ ok: boolean; model: string; latencyMs: number; sample: string; error?: string }> {
  const started = Date.now()
  const model = (ctx.endpointModel ?? '').trim() || 'claude-3-5-haiku-latest'
  try {
    const res = await post(ctx, buildClaudeBody([{ role: 'user', content: 'سلام' }], model, false, 16))
    const data = (await res.json().catch(() => null)) as { model?: string } | null
    const text = extractText(data)
    return { ok: Boolean(text), model: data?.model ?? model, latencyMs: Date.now() - started, sample: text.slice(0, 60) }
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
