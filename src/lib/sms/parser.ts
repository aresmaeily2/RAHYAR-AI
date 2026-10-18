// ─── پارسر پیامک بانکی — استخراج تراکنش از SMS بانک‌های ایران ──
// اصل: همه‌چیز خالص و قطعی؛ هیچ پیامکی بدون تأیید کاربر ثبت نمی‌شود.
// خروجی: نام بانک، نوع (درآمد/هزینه)، مبلغ (ریال)، موجودی، کارت، تاریخ.
// سطح اطمینان: only high-confidence (مبلغ + فعل مشخص) به پیش‌نمایش می‌رود.

export interface ParsedSms {
  bank: string
  type: 'income' | 'expense'
  /** مبلغ به ریال */
  amount: number
  balance: number | null
  cardLast4: string | null
  occurredAt: Date | null
  /** متن کامل پیامک — برای هش ضدتکرار و نمایش */
  raw: string
  confidence: number // 0..1
}

export type ParsedSmsResult = {
  transactions: ParsedSms[]
  ignored: number
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** نرمال‌سازی ارقام و علائم فارسی/عربی به لاتین */
export function normalizeDigits(s: string): string {
  let out = ''
  for (const ch of s) {
    const p = PERSIAN_DIGITS.indexOf(ch)
    if (p >= 0) {
      out += String(p)
      continue
    }
    const a = ARABIC_DIGITS.indexOf(ch)
    if (a >= 0) {
      out += String(a)
      continue
    }
    if (ch === '\u066C' || ch === '٬') {
      out += ',' // جداکننده هزارگان عربی/فارسی
      continue
    }
    if (ch === '\u066B') {
      out += '.' // ممیز عربی
      continue
    }
    out += ch
  }
  return out
}

/** بانک‌های اصلی ایران — تشخیص از نام یا فرستنده */
const BANK_PATTERNS: Array<[string, RegExp]> = [
  ['ملت', /بانک\s*ملت|bank\s*mellat/i],
  ['ملی', /بانک\s*ملی|bank\s*melli(?!ran)/i],
  ['صادرات', /بانک\s*صادرات|bank\s*saderat/i],
  ['پارسیان', /بانک\s*پارسیان|bank\s*parsian/i],
  ['پاسارگاد', /بانک\s*پاسارگاد|bank\s*pasargad/i],
  ['سامان', /بانک\s*سامان|bank\s*saman/i],
  ['کشاورزی', /بانک\s*کشاورزی|bank\s*keshavarzi/i],
  ['تجارت', /بانک\s*تجارت|bank\s*tejarat/i],
  ['سپه', /بانک\s*سپه|bank\s*sepah/i],
  ['رفاه', /بانک\s*رفاه|bank\s*refah/i],
  ['مسکن', /بانک\s*مسکن|bank\s*maskan/i],
  ['آینده', /بانک\s*آینده|bank\s*ayandeh/i],
  ['شهر', /بانک\s*شهر|bank\s*shahr/i],
  ['دی', /بانک\s*دی\b|bank\s*dey/i],
  ['اقتصاد نوین', /اقتصاد\s*نوین|bank\s*ecnovin|EN\s*Bank/i],
  ['سرمایه', /بانک\s*سرمایه|bank\s*sarmayeh/i],
  ['انصار', /بانک\s*انصار|bank\s*ansar/i],
  ['قوامین', /بانک\s*قوامین|bank\s*qavamin/i],
  ['پست بانک', /پست\s*بانک|post\s*bank/i],
  ['توصیه/حکمت ایرانیان', /حکمت\s*ایرانیان|hekmat/i],
]

export function detectBank(text: string): string {
  for (const [name, re] of BANK_PATTERNS) {
    if (re.test(text)) return name
  }
  return ''
}

/** «۱۲٬۳۴۵٬۶۷۸» یا "12,345,678" یا 12345678 → عدد */
function parseAmount(s: string): number {
  const digits = s.replace(/[^\d]/g, '')
  if (!digits) return 0
  const n = Number(digits)
  return Number.isFinite(n) ? n : 0
}

const INCOME_VERBS = /واریز|شارژ|سود\s*(سپرده|سرمایه)?|عودت|برگشت\s*خرید|افتتاح|درآمد|وصول/
const EXPENSE_VERBS = /برداشت|خرید|پرداخت|کارمزد|انتقال|قبض|هزینه|کسر|مسدود/

/** الگوهای مبلغ — مبلغِ عددی پس از کلیدواژه‌ها */
const AMOUNT_PATTERNS = [
  /مبلغ\s*[:=\s]*([\d،,\s]{3,20})\s*(?:ریال|تومان|rial)?/,
  /([\d،,\s]{3,20})\s*ریال/,
  /([\d،,\s]{3,20})\s*تومان/,
]

const BALANCE_PATTERN = /موجودی\s*[:=\s]*([\d،,\s]{3,20})/
/** کارت ماسک‌شده: 6104****1234 یا کارت 1234 (بدون دنباله ماسک) */
const CARD_PATTERN =
  /\d{4,6}[*x.]{2,}\s*(\d{4})|کارت?\s*[:=\s]*(\d{4})(?![\dx*.])|card\s*[:=\s]*(\d{4})/i
const DATE_PATTERN = /(\d{2,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/
const TIME_PATTERN = /(\d{1,2}):(\d{2})/

/** «تومان» در پیامک‌های بانک‌ها تقریباً همیشه ریال است؛ اگر صریحاً تومان بود ×۱۰ */
function toRial(amount: number, explicitToman: boolean): number {
  return explicitToman ? amount * 10 : amount
}

/**
 * تحلیل یک بلوک متن (یک پیامک) — بانک + فعل + مبلغ در همان بلوک.
 * خروجی null یعنی پیامک قابل تشخیص نیست.
 */
function parseMessage(block: string, rawLine: string): ParsedSms | null {
  const line = block
  const bank = detectBank(line)
  if (!bank) return null

  const isIncome = INCOME_VERBS.test(line)
  const isExpense = EXPENSE_VERBS.test(line)
  if (!isIncome && !isExpense) return null

  // مبلغ: اولین الگوی مبلغی که واقعاً عدد دارد
  let amount = 0
  let explicitToman = false
  for (const re of AMOUNT_PATTERNS) {
    const m = line.match(re)
    if (m) {
      amount = parseAmount(m[1])
      if (amount > 0) {
        explicitToman = /تومان/.test(line) && !/ریال/.test(line)
        break
      }
    }
  }
  if (amount <= 0) return null

  const balanceMatch = line.match(BALANCE_PATTERN)
  const balance = balanceMatch ? parseAmount(balanceMatch[1]) : null

  const cardMatch = line.match(CARD_PATTERN)
  const cardLast4 = cardMatch ? (cardMatch[1] || cardMatch[2] || cardMatch[3] || null) : null

  // تاریخ — پیامک‌های بانکی: 1404/07/09 یا 09/10/2025؛ بدون سال کامل = سال جاری
  let occurredAt: Date | null = null
  const dm = line.match(DATE_PATTERN)
  const tm = line.match(TIME_PATTERN)
  if (dm) {
    const a = Number(dm[1])
    const b = Number(dm[2])
    const c = Number(dm[3])
    let y = 0
    let mo = 0
    let d = 0
    if (a >= 1300 && a <= 1500) {
      y = a
      mo = b
      d = c
    } else if (c >= 1300 && c <= 1500) {
      y = c
      mo = b
      d = a
    } else {
      mo = a
      d = b
      y = new Date().getFullYear()
    }
    if (y >= 1300 && y <= 1500) {
      occurredAt = jalaliToGregorian(y, mo, d)
    } else {
      occurredAt = new Date(y, Math.min(mo, 12) - 1, Math.min(d, 31))
    }
    if (tm) {
      occurredAt.setHours(Math.min(Number(tm[1]), 23), Math.min(Number(tm[2]), 59), 0, 0)
    }
  }

  const confidence = bank && amount > 0 ? (isIncome !== isExpense ? 0.9 : 0.6) : 0.4

  return {
    bank,
    type: isIncome && !isExpense ? 'income' : 'expense',
    amount: toRial(amount, explicitToman),
    balance,
    cardLast4,
    occurredAt,
    raw: rawLine,
    confidence,
  }
}

/**
 * تحلیل متن کل — استراتژی دومرحله‌ای:
 *   ۱) هر خط مستقل اگر خودش پیامک کامل باشد → تراکنش
 *   ۲) خط‌های ناکام متوالی با هم یک پیامک فرض و ادغام می‌شوند
 *      (پیامک‌های بانکی چندخطی: بانک در خط اول، مبلغ در خط دوم)
 */
export function parseSmsText(input: string): ParsedSmsResult {
  const text = normalizeDigits(input ?? '')
  const lines = text.split(/\n+/).map((l) => l.trim()).filter((l) => l.length >= 3)
  const transactions: ParsedSms[] = []
  const rawLines = input.split(/\n+/).map((l) => l.trim())
  let ignored = 0
  let pendingFails: string[] = []

  const flushPending = (): void => {
    if (pendingFails.length === 0) return
    const merged = pendingFails.join(' ')
    const rawMerged = rawLines.find((r) => normalizeDigits(r).trim() === pendingFails[0]) ?? pendingFails[0]
    const tx = parseMessage(merged, rawMerged)
    if (tx) transactions.push(tx)
    else ignored += pendingFails.length
    pendingFails = []
  }

  for (const line of lines) {
    const tx = parseMessage(line, rawLines.find((r) => normalizeDigits(r).trim() === line) ?? line)
    if (tx) {
      flushPending() // پیامک کامل؛ گروه ناکام قبلی را ببند
      transactions.push(tx)
    } else {
      pendingFails.push(line)
    }
  }
  flushPending()

  return { transactions, ignored }
}

/** تبدیل جلالی به میلادی — الگوریتم استاندارد (بدون وابستگی) */
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  let gy = jy <= 979 ? 621 : 1600
  const jy2 = jy <= 979 ? jy : jy - 979
  let days =
    365 * jy2 +
    Math.floor(jy2 / 33) * 8 +
    Math.floor(((jy2 % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)
  gy += 400 * Math.floor(days / 146097)
  days %= 146097
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524)
    days %= 36524
    if (days >= 365) days++
  }
  gy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    gy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  let gd = days + 1
  const leap =
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm = 0
  for (gm = 0; gm < 12; gm++) {
    if (gd <= monthDays[gm]) break
    gd -= monthDays[gm]
  }
  return new Date(gy, gm, gd)
}
