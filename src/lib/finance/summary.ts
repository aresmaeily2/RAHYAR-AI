// ─── خلاصهٔ مالی دوره‌ای — مغز مشترک مسیر قطعی چت و اکشن finance_summary ──
// F-AG1 (مأموریت نهایی): پیش از این، دستیار به دادهٔ مالی دسترسی نداشت و
// «مخارج این هفته را جمع کن» بی‌پاسخ واقعی بود. اکنون:
//  - محدوده‌ها همه به وقت تهران (یافتهٔ GRAND-F6 هم‌عرض) — «این هفته» از شنبه
//    آغاز می‌شود (هفتهٔ رسمی ایران)، «این ماه» از آغاز ماه تهران.
//  - واحد نمایش از تنظیم کاربر (finance_currency) می‌آید — رعایت درستی
//    تومان/ریال (B-2): ذخیره همیشه ریال است، نمایش با ضریب تنظیم‌شده.
//  - aggregateSummary و financeRangeBounds خالص‌اند و در tests/unit پوشش دارند.
import { db } from '@/lib/db'
import { getFinanceCurrency } from '@/lib/server-settings'
import { tehranDayStart, tehranMonthStart } from '@/lib/persian-date'

export type FinanceRange = 'today' | 'week' | 'month'

export interface FinanceAgg {
  expense: number
  income: number
  net: number
  count: number
  topCats: Array<{ category: string; total: number }>
}

const DAY_MS = 86_400_000
const TEHRAN_OFFSET = '+03:30' // ایران از ۱۴۰۱ ساعت تابستانی ندارد

/**
 * مرزهای دوره به وقت تهران — خالص.
 * week = شنبهٔ جاری تهران تا الان؛ month = آغاز ماه تهران تا الان؛ today = امروز.
 */
export function financeRangeBounds(
  range: FinanceRange,
  now: Date = new Date(),
): { start: Date; end: Date } {
  if (range === 'today') {
    const start = tehranDayStart(now)
    return { start, end: now }
  }
  if (range === 'month') {
    const start = tehranMonthStart(now)
    return { start, end: now }
  }
  // week — روز هفته تهران: شنبه=0 … جمعه=6
  const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Tehran' })
    .format(now)
  const idx = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(wd)
  const back = Number.isNaN(idx) || idx < 0 ? 0 : idx
  const start = new Date(tehranDayStart(now).getTime() - back * DAY_MS)
  return { start, end: now }
}

/** تجمیع خالص تراکنش‌ها — انتقال‌ها در جمع هزینه/درآمد خالص نمی‌آیند */
export function aggregateSummary(
  rows: Array<{ type: string; amount: number; category: string }>,
): FinanceAgg {
  let expense = 0
  let income = 0
  let count = 0
  const catMap = new Map<string, number>()
  for (const t of rows) {
    if (t.type === 'transfer') continue
    count++
    if (t.type === 'expense') {
      expense += t.amount
      catMap.set(t.category || 'other', (catMap.get(t.category || 'other') ?? 0) + t.amount)
    } else if (t.type === 'income') {
      income += t.amount
    }
  }
  const topCats = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, total]) => ({ category, total }))
  return { expense, income, net: income - expense, count, topCats }
}

/** واحد نمایش: toman → ریال تقسیم بر ۱۰ (B-2)؛ irr → همان ریال */
export function displayAmount(rawRial: number, currency: 'irr' | 'toman'): number {
  return currency === 'toman' ? Math.round(rawRial / 10) : Math.round(rawRial)
}

function faNum(s: string): string {
  return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

function fmt(n: number, lang: 'fa' | 'en'): string {
  const v = Math.abs(Math.round(n))
  return lang === 'fa' ? faNum(v.toLocaleString('en-US')) : v.toLocaleString('en-US')
}

const RANGE_LABEL = {
  today: { fa: 'امروز', en: 'today' },
  week: { fa: 'این هفته', en: 'this week' },
  month: { fa: 'این ماه', en: 'this month' },
} as const

export const CATEGORY_FA: Record<string, string> = {
  food: 'خوراک', transport: 'حمل‌ونقل', shopping: 'خرید', bills: 'قبوض',
  health: 'سلامت', education: 'آموزش', fun: 'سرگرمی', family: 'خانواده',
  charity: 'خیریه', other: 'سایر', salary: 'حقوق', freelance: 'فریلنس',
  gift: 'هدیه', interest: 'سود', sale: 'فروش',
}

export function categoryLabel(cat: string, lang: 'fa' | 'en'): string {
  if (lang === 'en') return cat
  return CATEGORY_FA[cat] ?? cat
}

/** متن پاسخ قطعی — با اعداد واقعی از DB */
export function formatFinanceSummary(
  lang: 'fa' | 'en',
  range: FinanceRange,
  agg: FinanceAgg,
  currency: 'irr' | 'toman',
): string {
  const unit = currency === 'toman' ? (lang === 'fa' ? 'تومان' : 'toman') : (lang === 'fa' ? 'ریال' : 'rial')
  const exp = fmt(displayAmount(agg.expense, currency), lang)
  const inc = fmt(displayAmount(agg.income, currency), lang)
  const label = RANGE_LABEL[range][lang]
  const cats = agg.topCats
    .slice(0, 3)
    .map((c) => `${categoryLabel(c.category, lang)}: ${fmt(displayAmount(c.total, currency), lang)} ${unit}`)
    .join(lang === 'fa' ? '، ' : ', ')
  if (lang === 'fa') {
    const head = agg.expense === 0
      ? `${label} هنوز هزینه‌ای ثبت نشده.`
      : `هزینهٔ ${label} ${exp} ${unit} بود${agg.income > 0 ? ` و درآمد ${inc} ${unit}` : ''}.`
    return cats ? `${head} بزرگ‌ترین دسته‌ها: ${cats}.` : head
  }
  const head = agg.expense === 0
    ? `No expenses recorded ${label} yet.`
    : `Spent ${exp} ${unit} ${label}${agg.income > 0 ? `, income ${inc} ${unit}` : ''}.`
  return cats ? `${head} Top categories: ${cats}.` : head
}

/** اجرای واقعی روی DB کاربر — سرویس مشترک چت قطعی و اکشن مدل */
export async function financeSummaryFor(
  userId: string,
  range: FinanceRange,
): Promise<{ agg: FinanceAgg; currency: 'irr' | 'toman' }> {
  const { start, end } = financeRangeBounds(range)
  const [rows, currency] = await Promise.all([
    db.financeTransaction.findMany({
      where: { userId, occurredAt: { gte: start, lt: end }, type: { in: ['income', 'expense'] } },
      select: { type: true, amount: true, category: true },
      take: 2000,
    }),
    getFinanceCurrency(userId),
  ])
  return { agg: aggregateSummary(rows), currency }
}

/** ساخت remindAt از سررسید کار + فاصله دقیقه — به وقت تهران */
export function reminderAtFromDue(
  dueDate: Date,
  dueTime: string,
  beforeMin: number,
  now: Date = new Date(),
): Date | null {
  if (!/^\d{1,2}:\d{2}$/.test(dueTime)) return null
  const iso = dueDate.toISOString().slice(0, 10)
  const at = new Date(`${iso}T${dueTime.padStart(5, '0')}:00${TEHRAN_OFFSET}`)
  if (Number.isNaN(at.getTime())) return null
  const remind = new Date(at.getTime() - beforeMin * 60_000)
  // همان گاردهای مسیر REST: گذشته یا خیلی دور → نامعتبر
  if (remind.getTime() < now.getTime() - 60_000) return null
  if (remind.getTime() > now.getTime() + 366 * DAY_MS) return null
  return remind
}
