// ─── پارس قطعیِ «ثبت هزینه/درآمد» از جملهٔ گفتاری/نوشتاری (F7 — ایجنت ۲/۳) ──
// هدف: فرمان صوتی «هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن» هرگز نباید Task بسازد؛
// باید به عملیات مالی متصل شود (یافتهٔ F6 دربارهٔ intent-routing).
// خالص و بدون اثر جانبی — اجرا/نوشتن فقط با تأیید صریح کاربر (ماشین pending-action).

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** یکسان‌سازی ارقام فارسی/عربی به لاتین — خالص */
export function normalizeDigits(input: string): string {
  let out = ''
  for (const ch of input ?? '') {
    const fa = FA_DIGITS.indexOf(ch)
    if (fa >= 0) {
      out += String(fa)
      continue
    }
    const ar = AR_DIGITS.indexOf(ch)
    if (ar >= 0) {
      out += String(ar)
      continue
    }
    out += ch
  }
  return out
}

/** اسم‌های پولی که «ثبت تراکنش» را معنا می‌دهند */
const MONEY_NOUN_RE =
  /(?:هزینه|خرج|مخارج|پرداخت|خرید|درآمد|دریافتی|expense|spent|paid|bought|purchase|income|received)/i

/** عبارت‌های صریحِ «ثبت کار/وظیفه» — ثبت کار مقدم بر مالی است (گار ضدقاپیختن) */
const TASK_EXPLICIT_RE = /(?:وظیفه|کار|کارها)\s*(?:جدید|new)|new\s*task|\btask\b|(?:وظیفه‌?ای|یک\s*کار)\s+(?:برای|ثبت)/i

/** واژه‌های تجمیعی/گزارشی — این جمله‌ها ثبت نیستند (مسیر گزارش مالی خودش را دارد) */
const AGG_RE = /(?:جمع|گزارش|خلاصه|بالانس|چقدر|چند\s*تا|report|summary|how\s*much)/i

/** فعل‌های ثبت — اختیاری (گفتار طبیعی ممکن است بدون فعل بیاید) */
const REG_VERB_RE =
  /(?:ثبت\s*کن|ثبت\s*بشه|بزن|بذار|بزار|بساز|اضافه\s*کن|درج\s*کن|register|add|log|record)/i

export interface ParsedExpense {
  /** 'expense' = هزینه | 'income' = درآمد */
  dir: 'expense' | 'income'
  /** مبلغ به تومان (عدد صحیح مثبت) */
  amount: number
  /** یادداشت/عنوان باقی‌ماندهٔ جمله (می‌تواند خالی باشد) */
  note: string
}

/**
 * استخراج مبلغ تومانی از جمله.
 * پشتیبانی: ارقام فارسی/عربی/لاتین، جداکنندهٔ هزارگان (, / ٬ / ،)،
 * ضریب‌ها: هزار/میلیون/میلیارد (و معادل انگلیسی)، واحد ریال → تقسیم بر ۱۰ (قرارداد Toman پروژه).
 * خروجی: عدد تومان یا null اگر عددی نبود.
 */
export function parseFaAmount(rawText: string): number | null {
  const t = normalizeDigits(rawText ?? '')
  // همهٔ اعداد جمله را با ضریب/واحد مجاورشان جمع کن؛ عددِ «همراه با هزار/میلیون/تومان/ریال»
 // مقدم است تا «ساعت ۹» در جمله‌های پولی اشتباهی مبلغ گرفته نشود.
  const scan = t.matchAll(
    /(\d[\d,\u066C\u060C.]*)\s*(میلیارد|میلیون|هزار|billion|million|thousand)?\s*(ریال|rial|toman|تومان)?/gi,
  )
  let firstBare: number | null = null
  for (const m of scan) {
    const numStr = m[1].replace(/[,\u066C\u060C]/g, '')
    if (!/^\d+(\.\d+)?$/.test(numStr)) continue
    let value = Number(numStr)
    if (!Number.isFinite(value)) continue
    const mult = (m[2] ?? '').toLowerCase()
    if (mult === 'هزار' || mult === 'thousand') value *= 1_000
    else if (mult === 'میلیون' || mult === 'million') value *= 1_000_000
    else if (mult === 'میلیارد' || mult === 'billion') value *= 1_000_000_000
    const unit = (m[3] ?? '').toLowerCase()
    if (unit === 'ریال' || unit === 'rial') value /= 10
    value = Math.round(value)
    if (value <= 0) continue
    if (m[2] || m[3]) return value // عددِ صریح پولی — مقدم بر هر عدد دیگری
    if (firstBare === null) firstBare = value
  }
  return firstBare
}

/**
 * نسخهٔ سخت‌گیرانه برای ثبت مالی: عدد باید همراه ضریب (هزار/میلیون/…) یا واحد
 * (تومان/ریال) بیاید — «ساعت ۹» هرگز مبلغ تلقی نمی‌شود.
 */
function parseFaAmountStrict(rawText: string): number | null {
  const t = normalizeDigits(rawText ?? '')
  const scan = t.matchAll(
    /(\d[\d,\u066C\u060C.]*)\s*(میلیارد|میلیون|هزار|billion|million|thousand)?\s*(ریال|rial|toman|تومان)?/gi,
  )
  for (const m of scan) {
    if (!m[2] && !m[3]) continue // بدون ضریب/واحد — مبلغ پولی محسوب نمی‌شود
    const numStr = m[1].replace(/[,\u066C\u060C]/g, '')
    if (!/^\d+(\.\d+)?$/.test(numStr)) continue
    let value = Number(numStr)
    if (!Number.isFinite(value)) continue
    const mult = (m[2] ?? '').toLowerCase()
    if (mult === 'هزار' || mult === 'thousand') value *= 1_000
    else if (mult === 'میلیون' || mult === 'million') value *= 1_000_000
    else if (mult === 'میلیارد' || mult === 'billion') value *= 1_000_000_000
    const unit = (m[3] ?? '').toLowerCase()
    if (unit === 'ریال' || unit === 'rial') value /= 10
    value = Math.round(value)
    if (value > 0) return value
  }
  return null
}

/**
 * تشخیص «ثبت هزینه/درآمد» از جمله — خالص.
 * قواعد سخت‌گیرانه برای اینکه گزارش مالی یا ثبت کار اشتباهی قاپیده نشود:
 *  - واژهٔ تجمیعی/گزارشی → null (مسیر گزارش مالی)
 *  - بدون اسم پولی یا بدون مبلغِ صریح پولی → null (کار/یادآوری مسیر خودش را دارد)
 *  - عبارت صریحِ ثبت کار/وظیفه → null (ثبت کار مقدم است)
 */
export function parseExpensePhrase(message: string): ParsedExpense | null {
  const text = (message ?? '').trim()
  if (text.length < 4) return null
  const t = normalizeDigits(text)
  if (AGG_RE.test(t)) return null
  if (TASK_EXPLICIT_RE.test(t)) return null
  if (!MONEY_NOUN_RE.test(t)) return null

  const dir: ParsedExpense['dir'] =
    /(?:درآمد|دریافتی|income|received)/i.test(t) ? 'income' : 'expense'

  const amount = parseFaAmountStrict(t)
  if (amount === null) return null

  // یادداشت: حذف مبلغ، ضریب، واحد، اسم پولی، افعال و حروف ربط از جمله
  let note = t
    .replace(/(\d[\d,\u066C\u060C.]*)\s*(میلیارد|میلیون|هزار|billion|million|thousand)?\s*(تومانی|تومان|ریال|rial|toman)?/gi, ' ')
    .replace(MONEY_NOUN_RE, ' ')
    .replace(REG_VERB_RE, ' ')
    .replace(/(?:بابت|برای|به\s*خاطر|جهت|on|for)\s*/gi, ' ')
    .replace(/یک|یه|please|لطفا/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim()

  // ثبت درآمد/هزینه بدون هیچ کلام اضافه هم معتبر است
  if (note.length < 2) note = dir === 'income' ? 'درآمد' : 'هزینه'
  if (note.length > 300) note = note.slice(0, 300)
  return { dir, amount, note }
}

/** متن نمایشی مبلغ با جداکنندهٔ هزارگان — برای پاسخ تأیید */
export function formatAmount(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
