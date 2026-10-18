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
