// ─── قرارداد AIProvider — معماری ارائه‌دهنده‌های مدل رهیار ─────
// هدف نسخه ۱٫۰: هیچ وابستگی اختصاصی به هیچ شرکت خاصی نباشد.
// هر ارائه‌دهنده (حال و آینده) فقط این رابط را پیاده می‌کند؛
// Gateway و بقیه سامانه فقط این رابط را می‌شناسند.
//
// Providerهای آینده (همه از همین رابط ارث می‌برند):
//   OpenAI | Claude | Gemini | DeepSeek | Ollama | LM Studio |
//   OpenRouter | هر Endpoint سازگار با OpenAI
//
// فعال در همین نسخه (تنها این دو — طبق مأموریت نسخه ۱٫۰):
//   1) local_rules        — موتور قواعد محلی (بدون مدل، بدون هزینه، بدون اینترنت)
//   2) openai_compatible  — هر Endpoint سازگار با OpenAI (Ollama، LM Studio،
//                           DeepSeek، OpenRouter، …) — کاربر URL/کلید می‌دهد
// هیچ Provider دیگری فعال نیست و هیچ کلیدی در کد Hardcode نشده است.

import type { LlmMessage } from '@/lib/ai'

/** شناسه موتور فعال — ذخیره در تنظیمات کاربر (Setting: ai_engine) */
export type AiEngineId = 'local_rules' | 'openai_compatible'

export const AI_ENGINE_IDS: AiEngineId[] = ['local_rules', 'openai_compatible']

export function isAiEngineId(v: unknown): v is AiEngineId {
  return typeof v === 'string' && (AI_ENGINE_IDS as string[]).includes(v)
}

/** پیکربندی سمت سرور هر فراخوانی — از تنظیمات کاربر خوانده می‌شود */
export interface ProviderCallContext {
  userId: string
  /** فقط برای openai_compatible */
  endpointUrl?: string
  endpointKey?: string
  endpointModel?: string
}

export interface ProviderChatResult {
  text: string
  /** برچسب مدل واقعی استفاده‌شده — برای ثبت مصرف */
  model: string
}

export interface AIProvider {
  /** شناسه پایدار — ذخیره در DB و AiUsage.provider */
  readonly id: AiEngineId
  /** برچسب نمایشی */
  readonly label: string
  /** آیا فراخوانی این Provider به سهمیه مدل (gateway quota) شمارش می‌شود؟ */
  readonly consumesQuota: boolean
  /** آیا Provider آماده استفاده است؟ */
  isConfigured(ctx: ProviderCallContext): boolean | Promise<boolean>
  /** فراخوانی عادی — خروجی متن */
  chat(messages: LlmMessage[], ctx: ProviderCallContext): Promise<ProviderChatResult>
  /**
   * فراخوانی استریمی — SSE سازگار با OpenAI:
   *   data: {"choices":[{"delta":{"content":"…"}}]} … data: [DONE]
   * Provider بدون پشتیبانی استریم (مثل local_rules) این متد را پیاده نمی‌کند.
   */
  stream?(messages: LlmMessage[], ctx: ProviderCallContext): Promise<ReadableStream<Uint8Array>>
}

/** خطای قابلیت — Provider «این کار را بلد نیست» (مثلاً قواعد محلی بدون مدل) */
export class ProviderCapabilityError extends Error {
  constructor(message = 'این ارائه‌دهنده این قابلیت را ندارد') {
    super(message)
    this.name = 'ProviderCapabilityError'
  }
}

/** خطای پیکربندی — Endpoint/کلید ناقص یا نامعتبر */
export class ProviderConfigError extends Error {
  constructor(message = 'ارائه‌دهنده مدل پیکربندی نشده است') {
    super(message)
    this.name = 'ProviderConfigError'
  }
}

/** اعتبارسنجی URL نقطه پایانی کاربر — فقط http/https (برای Ollama/LM Studio لوکال مجاز است) */
export function validateEndpointUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const url = raw.trim()
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (u.username || u.password) return null
    // بدون مسیر عمیق — فقط ریشه سرویس (مثل /v1)
    return u.origin + (u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, ''))
  } catch {
    return null
  }
}

// ── گارد SSRF برای Endpoint کاربر (GU2-SEC3) ─────────────────
// Endpoint از سمت سرور فراخوانی می‌شود؛ بدون گارد، کاربر می‌توانست سرور را
// به آدرس‌های داخلی/متادیتای ابری (169.254.169.254) بفرستد و بخشی از پاسخ را
// در پیام خطا ببیند. سیاست:
//  - link-local / متادیتا / 0.0.0.0 / multicast همیشه مسدود
//  - loopback و شبکه خصوصی (Ollama/LM Studio محلی) پیش‌فرض مجاز؛ با
//    AI_ALLOW_PRIVATE_ENDPOINTS=0 در استقرار عمومی چندکاربره مسدود می‌شوند
export type EndpointHostVerdict = 'public' | 'private' | 'blocked'

export function classifyIp(ip: string): EndpointHostVerdict {
  const v = ip.trim().toLowerCase().replace(/^\[|\]$/g, '')
  const m4 = v.match(/^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m4) {
    const [a, b] = [Number(m4[1]), Number(m4[2])]
    if (a === 0 || a >= 224) return 'blocked'
    if (a === 169 && b === 254) return 'blocked'
    if (a === 100 && b >= 64 && b <= 127) return 'blocked' // CGNAT / Alibaba metadata 100.100.100.200
    if (a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'private'
    return 'public'
  }
  if (v.includes(':')) {
    if (v === '::' || v.startsWith('ff') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return 'blocked'
    if (v.startsWith('fd00:ec2:')) return 'blocked'
    if (v === '::1' || v.startsWith('fc') || v.startsWith('fd')) return 'private'
    return 'public'
  }
  return 'public'
}

const BLOCKED_HOSTNAMES = new Set(['metadata.google.internal', 'metadata', 'instance-data', 'metadata.azure.com'])

export function endpointHostAllowed(
  hostname: string,
  resolvedIps: string[],
  allowPrivate: boolean,
): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  if (BLOCKED_HOSTNAMES.has(h)) return false
  const all = [h.replace(/^\[|\]$/g, ''), ...resolvedIps].filter((x) => /^[\d.]+$|:/.test(x))
  for (const ip of all) {
    const c = classifyIp(ip)
    if (c === 'blocked') return false
    if (c === 'private' && !allowPrivate) return false
  }
  return true
}
