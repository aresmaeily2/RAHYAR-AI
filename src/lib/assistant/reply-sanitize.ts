// ─── V1-P3 (D-6): جداسازی خروجی نمایشی از payload داخلی اکشن‌ها ──────
// یافتهٔ زندهٔ P8-8/S1/S5/S6: مدل گاهی JSON خام اکشن را در متن پاسخ می‌نویسد و
// پیام‌های قدیمی هم ممکن است آلوده شده باشند. تضمین: هیچ payload داخلی
// (اکشن/wrapper/followups/sources) به کاربر نمایش داده نمی‌شود — هم در زمان
// ذخیره (پاسخ تازه) و هم در زمان نمایش (تاریخچهٔ قدیمی، فارسی و انگلیسی).
// خطای parsing هرگز متن فنی خام نمایش نمی‌دهد؛ فقط یادداشت کوتاه صادقانه.

/** یادداشت نمایشی وقتی کل پاسخ فقط payload فنی بود — ادعای موفقیت ندارد */
export const HIDDEN_TECH_REPLY_FA =
  '(پاسخ مدل قابل نمایش نبود و پنهان شد — لطفاً درخواست را دوباره بفرستید.)'
export const HIDDEN_TECH_REPLY_EN =
  '(The model reply was not displayable and was hidden — please send your request again.)'

/** نشانهٔ کلیدهای payload داخلی اکشن‌ها — مبنای تشخیص «شکل-اکشن» */
const INNER_KEYS_RE =
  /"(type|actions|followups|sources|taskId|remindAt|dueDate|dueTime|subtasks|fact|factContains|amount|dir|accountId|draft|plan|ok|pending)"\s*:/

/** بازیابی wrapper کامل {"reply":"...","actions":[...]} — reply سالم را بیرون می‌کشد */
function tryExtractWrapperReply(text: string): string | null {
  const t = text.trim()
  if (!(t.startsWith('{') && t.endsWith('}'))) return null
  try {
    const o = JSON.parse(t) as Record<string, unknown>
    if (o && typeof o === 'object') {
      const isWrapper = 'reply' in o || 'actions' in o || 'followups' in o || 'sources' in o
      const isAction = typeof o.type === 'string'
      if (isWrapper || isAction) {
        if (isWrapper && typeof o.reply === 'string' && o.reply.trim()) return o.reply.trim()
        return '' // کل متن payload داخلی بود
      }
    }
  } catch {
    /* JSON ناقص — در اسکن متعادل پایین‌تر پاک می‌شود */
  }
  return null
}

/** حذف آبجکت/آرایه‌های JSON شکل-اکشن (متعادل؛ ناقص‌ها تا انتها بریده می‌شوند) */
function stripShapedJson(text: string): string {
  let out = text
  for (let pass = 0; pass < 6; pass++) {
    let result = ''
    let i = 0
    let changed = false
    while (i < out.length) {
      const ch = out[i]
      if (ch === '{' || ch === '[') {
        const close = ch === '{' ? '}' : ']'
        let depth = 0
        let inStr = false
        let esc = false
        let end = -1
        for (let j = i; j < out.length; j++) {
          const c = out[j]
          if (inStr) {
            if (esc) esc = false
            else if (c === '\\') esc = true
            else if (c === '"') inStr = false
            continue
          }
          if (c === '"') inStr = true
          else if (c === ch) depth++
          else if (c === close) {
            depth--
            if (depth === 0) {
              end = j
              break
            }
          }
        }
        const chunk = end >= 0 ? out.slice(i, end + 1) : out.slice(i)
        if (INNER_KEYS_RE.test(chunk)) {
          result = result.replace(/[ \t]+$/, '')
          i = end >= 0 ? end + 1 : out.length
          changed = true
          continue
        }
        result += ch
        i++
        continue
      }
      result += ch
      i++
    }
    out = result
    if (!changed) break
  }
  return out
}

/**
 * خروجی «قابل‌نمایش» از ساختار داخلی جدا می‌شود:
 *  ۱) wrapper کامل → متن reply داخلش (بازیابی) یا خالی
 *  ۲) آبجکت/آرایه‌های شکل-اکشن داخل متن → حذف
 *  ۳) پسوند تقلیدی «(اکشن‌ها اجرا شد)» وقتی اکشن واقعی نیست → حذف
 * خروجی خالی یعنی «چیزی برای نمایش نیست» — caller fallback صادقانه می‌گذارد.
 */
export function sanitizeReplyForDisplay(text: string, hasActions = false): string {
  if (!text) return ''
  const w = tryExtractWrapperReply(text)
  let out = w !== null ? w : text
  out = stripShapedJson(out)
  if (!hasActions) out = out.split('(اکشن‌ها اجرا شد)').join('')
  out = out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return out
}

/** fallback نهایی برای پاسخِ خالی بعد از پاکسازی — بدون payload، بدون ادعا */
export function displayFallback(lang: 'fa' | 'en'): string {
  return lang === 'fa' ? HIDDEN_TECH_REPLY_FA : HIDDEN_TECH_REPLY_EN
}

/** نمایش امنِ پیام‌های ذخیره‌شدهٔ قدیمی (GET تاریخچه) — idempotent، دوزبانه */
export function safeDisplayContent(content: string, hasActions: boolean): string {
  const s = sanitizeReplyForDisplay(content, hasActions)
  return s || '(پاسخ فنی پنهان شد — hidden technical reply)'
}
