// ─── Provider «قواعد محلی» — موتور قطعی بدون مدل، بدون هزینه ────
// پیش‌فرض نسخه ۱٫۰: هیچ کلیدی، هیچ اینترنتی، هیچ هزینه‌ای.
// پاسخ‌ها قطعی‌اند (Deterministic) — زبان از خود متن پیام کاربر
// تشخیص داده می‌شود (detectLangFromText) تا تست‌پذیری خالص بماند.
// این Provider استریم ندارد (stream پیاده نمی‌شود) — مسیر استریم
// به‌جای آن پاسخ قطعی را در یک SSE فوری برمی‌گرداند (مسیر stream route).

import type { LlmMessage } from '@/lib/ai'
import {
  AIProvider,
  ProviderCallContext,
  ProviderChatResult,
} from './types'

/** تشخیص زبان از متن — حضور نویسه‌های خط فارسی/عربی → fa؛ غیر آن → en */
export function detectLangFromText(text: string): 'fa' | 'en' {
  return /[\u0600-\u06FF]/.test(text ?? '') ? 'fa' : 'en'
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * پاسخ قطعی موتور محلی — خالص و آزمون‌پذیر (بدون DB و بدون مدل).
 * شاخه‌ها: سلام/احوالپرسی، ساعت، تاریخ، تشکر، و پیش‌فرض راهنمای شفاف.
 */
export function localRulesReply(text: string, now: Date = new Date()): string {
  const lang = detectLangFromText(text)
  const t = (text ?? '').trim()

  // ── سلام و احوالپرسی ──
  const faGreeting = /^(سلام|درود|هلو|هِی|سلام علیکم|صبح بخیر|عصر بخیر|شب بخیر)/
  const enGreeting = /^(hi|hello|hey|good (morning|afternoon|evening))\b/i
  if (faGreeting.test(t)) {
    return 'سلام! من «رهیار» هستم — در حالت قواعد محلی کار می‌کنم؛ کارها را ثبت و پیگیری می‌کنم و برای گفتگوی باز می‌توانی در تنظیمات یک موتور مدل انتخاب کنی.'
  }
  if (enGreeting.test(t)) {
    return "Hi! I'm Rahyar — running in Local Rules mode; I can track your tasks, and you can pick a model engine in Settings for open-ended chat."
  }

  // ── ساعت و تاریخ (قطعی از دستگاه) ──
  if (/ساعت|چند\s*شد|ساعت\s*چنده|چه\s*ساعته|\btime\b|what time/i.test(t)) {
    const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
    return lang === 'fa'
      ? `الان ساعت ${hhmm} است (به وقت دستگاه تو).`
      : `It's ${hhmm} right now (device time).`
  }
  if (/تاریخ|امروز\s*چندمه|چه\s*تاریخی|\bdate\b|what('s| is) the date|today'?s date/i.test(t)) {
    const ymd = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
    return lang === 'fa'
      ? `امروز ${ymd} میلادی است.`
      : `Today is ${ymd}.`
  }

  // ── تشکر ──
  if (/^(ممنون|مرسی|تشکر|سپاس|دمت گرم)|\bthanks?\b|\bthank you\b/i.test(t)) {
    return lang === 'fa'
      ? 'خواهش می‌کنم! کار دیگری هست که ثبت کنم؟'
      : 'You are welcome! Anything else to add?'
  }

  // ── پیش‌فرض: راهنمای شفاف موتور محلی (دوزبانه) ──
  return lang === 'fa'
    ? 'در حالت قواعد محلی هستم — ثبت کار، گزارش روز و یادآوری را بدون مدل انجام می‌دهم. برای گفتگوی باز، در تنظیمات یک موتور مدل انتخاب کن.'
    : "I'm in Local Rules mode — task tracking, daily report and reminders work without a model. For open-ended chat, pick a model engine in Settings."
}

export const localRulesProvider: AIProvider = {
  id: 'local_rules',
  label: 'قواعد محلی (بدون مدل — رایگان)',
  /** بدون مدل است؛ سهمیه پلتفرم مصرف نمی‌کند و کلید قطع آن را نمی‌بندد */
  consumesQuota: false,

  isConfigured(_ctx: ProviderCallContext): boolean {
    return true // هیچ پیکربندی لازم ندارد؛ همیشه آماده است
  },

  async chat(
    messages: LlmMessage[],
    _ctx: ProviderCallContext,
  ): Promise<ProviderChatResult> {
    // آخرین پیام کاربر مبنای پاسخ قطعی است — هیچ فراخوانی خارجی انجام نمی‌شود
    const lastUser = [...(messages ?? [])].reverse().find((m) => m.role === 'user')
    const text = lastUser?.content ?? ''
    return {
      text: localRulesReply(text),
      model: 'local-rules',
    }
  },
}
