// ─── انواع مشترک لایه هوش مصنوعی رهیار AI ────────────────────
// معماری Provider نسخه ۱٫۰: هیچ فراخوانی مستقیم مدل در کد نیست؛
// همه‌چیز از AI Gateway مرکزی عبور می‌کند (src/lib/ai/gateway.ts) و
// موتور فعال هر کاربر از رجیستری Provider خوانده می‌شود:
//   1) local_rules        — موتور قواعد محلی (بدون مدل/هزینه/کلید)
//   2) openai_compatible  — Endpoint سازگار با OpenAI (اختیاری کاربر)
// این فایل فقط نوع LlmMessage و استخراج JSON را فراهم می‌کند.

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** استخراج مقاوم JSON از پاسخ مدل (با تحمل markdown fence و متن اضافه) */
export function extractJson<T>(text: string): T | null {
  if (!text) return null
  let s = text.trim()
  // حذف code fence
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
  // پیدا کردن اولین { و آخرین }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = s.slice(start, end + 1)
  try {
    return JSON.parse(candidate) as T
  } catch {
    // تلاش دوم: اصلاح کاماهای اضافی
    try {
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1')) as T
    } catch {
      return null
    }
  }
}
