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

/**
 * یافتن کوتاه‌ترین بلوک متوازن {…} از اولین آکولاد — آگاه از رشته‌ها
 * (آکولاد داخل رشته و escape حساب می‌شود). ممیزی ۳۶۰: تلاش جایگزین وقتی
 * مدل بعد از JSON متن اضافه می‌گذارد یا بندانگشتیِ ابتدایی خراب است.
 */
function balancedJsonSlice(s: string): string | null {
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}

function tryParse(candidate: string | null): unknown {
  if (!candidate) return null
  try {
    return JSON.parse(candidate)
  } catch {
    try {
      // اصلاح کامای اضافی پیش از بستن
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'))
    } catch {
      return null
    }
  }
}

/** استخراج مقاوم JSON از پاسخ مدل (با تحمل markdown fence و متن اضافه) */
export function extractJson<T>(text: string): T | null {
  if (!text) return null
  let s = text.trim()
  // حذف code fence
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
  // تلاش ۱ و ۲: پنجرهٔ کامل اولین { تا آخرین } (+ کامای اضافی)
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end > start) {
    const parsed = tryParse(s.slice(start, end + 1))
    if (parsed !== null) return parsed as T
  }
  // تلاش ۳ و ۴: پیمایش متوازن آکولاد — متن اضافهٔ پس از JSON را نادیده می‌گیرد
  const balanced = tryParse(balancedJsonSlice(s))
  if (balanced !== null) return balanced as T
  return null
}
