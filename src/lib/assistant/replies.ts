// ─── پاسخ‌های قطعی دستیار — دوزبانه (فارسی/انگلیسی) ────────────
// همه رشته‌های کاربرپذیرِ مسیرهای قطعی چت اینجاست؛ زبان از تنظیم
// کاربر می‌آید (server-lang.pick). هیچ رشته فارسی سخت‌کدشده در
// مسیرهای chat نمی‌ماند تا رابط انگلیسی کاملاً مستقل بماند.

import { pick } from '@/lib/server-lang'
import type { AppLang as Lang } from '@/lib/types'
import { categoryLabel } from '@/lib/finance/summary'

/** ارقام فارسی برای پیام‌های فارسی — انگلیسی لاتین می‌ماند */
function num(lang: Lang, n: number | string): string {
  const s = String(n)
  return lang === 'fa' ? s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : s
}

export interface ReportFacts {
  done: number
  remaining: number
  overdue: number
}

/** پاسخ ثبت کار موفق */
export function replyTaskAdded(lang: Lang, title: string, hasDue: boolean): string {
  return pick(
    lang,
    `ثبت شد: «${title}»${hasDue ? ' — سررسید مشخص شد' : ''}. کاری دیگر هم هست؟`,
    `Saved: “${title}”${hasDue ? ' — due date set' : ''}. Anything else?`,
  )
}

/** پاسخ گزارش روزانه */
export function replyDailyReport(lang: Lang, r: ReportFacts): string {
  return pick(
    lang,
    `گزارش امروز: ${num(lang, r.done)} کار انجام‌شده، ${num(lang, r.remaining)} کار باقی‌مانده${r.overdue > 0 ? ` و ${num(lang, r.overdue)} کار عقب‌افتاده` : ''}. ${r.overdue > 0 ? 'عقب‌افتاده‌ها را اول بگیریم؟' : 'عالی پیش می‌روی!'}`,
    `Today's report: ${r.done} done, ${r.remaining} remaining${r.overdue > 0 ? `, ${r.overdue} overdue` : ''}. ${r.overdue > 0 ? 'Shall we tackle the overdue ones first?' : 'You are doing great!'}`,
  )
}

/** پاسخ تکمیل کار */
export function replyTaskDone(lang: Lang, title: string): string {
  return pick(lang, `انجام شد: «${title}». آفرین!`, `Done: “${title}”. Well done!`)
}

// ── F-AG1: پاسخ قطعی گزارش مالی با اعداد واقعی ─────────────────

export interface FinanceFacts {
  range: 'today' | 'week' | 'month'
  expense: number
  income: number
  count: number
  topCats: Array<{ category: string; total: number }>
  currency: 'irr' | 'toman'
}

const RANGE_FA = { today: 'امروز', week: 'این هفته', month: 'این ماه' } as const
const RANGE_EN = { today: 'today', week: 'this week', month: 'this month' } as const

export function replyFinanceSummary(lang: Lang, f: FinanceFacts): string {
  const unit = f.currency === 'toman' ? (lang === 'fa' ? 'تومان' : 'toman') : (lang === 'fa' ? 'ریال' : 'rial')
  const exp = num(lang, Math.round(f.expense / (f.currency === 'toman' ? 10 : 1)).toLocaleString('en-US'))
  const inc = num(lang, Math.round(f.income / (f.currency === 'toman' ? 10 : 1)).toLocaleString('en-US'))
  if (lang === 'fa') {
    if (f.expense === 0 && f.income === 0)
      return `${RANGE_FA[f.range]} هنوز تراکنشی ثبت نشده؛ از نمای «مالی» یا ورود پیامک بانکی می‌توانی اضافه کنی.`
    const cats = f.topCats
      .slice(0, 3)
      .map((c) => `${categoryLabel(c.category, 'fa')}: ${num(lang, Math.round(c.total / (f.currency === 'toman' ? 10 : 1)).toLocaleString('en-US'))} ${unit}`)
      .join('، ')
    return `جمع هزینهٔ ${RANGE_FA[f.range]}: ${exp} ${unit}${f.income > 0 ? ` — درآمد: ${inc} ${unit}` : ''}.${cats ? `\nبزرگ‌ترین دسته‌ها: ${cats}` : ''}`
  }
  if (f.expense === 0 && f.income === 0)
    return `No transactions recorded ${RANGE_EN[f.range]} yet — add them from the Finance view or bank-SMS import.`
  const cats = f.topCats
    .slice(0, 3)
    .map((c) => `${categoryLabel(c.category, 'en')}: ${Math.round(c.total / (f.currency === 'toman' ? 10 : 1)).toLocaleString('en-US')} ${unit}`)
    .join(', ')
  return `Expenses ${RANGE_EN[f.range]}: ${exp} ${unit}${f.income > 0 ? ` — income: ${inc} ${unit}` : ''}.${cats ? `\nTop categories: ${cats}` : ''}`
}

/** کار برای تکمیل پیدا نشد */
export function replyTaskNotFound(lang: Lang): string {
  return pick(
    lang,
    'کار مطابق این عنوان را پیدا نکردم. عنوان دقیق‌تر بگو یا از نمای «کارها» تیکش را بزن.',
    'I could not find a task with that title. Be more specific, or check it off in the Tasks view.',
  )
}

/** شروع تمرکز */
export function replyFocusStarted(lang: Lang): string {
  return pick(
    lang,
    'تایمر تمرکز باز شد — ۲۵ دقیقه وقت داری. محیط هم حالت تمرکز می‌گیرد.',
    'Focus timer opened — you have 25 minutes. The ambience switches to focus mode too.',
  )
}

/** راهنما — فهرست توانایی‌های قطعی */
export function replyHelp(lang: Lang): string {
  return pick(
    lang,
    [
      'چیزهایی که بدون مدل هم انجام می‌دهم:',
      '· ثبت کار: «ثبت کن فردا ۹ جلسه دارم»',
      '· لیست: «چه کارهایی دارم؟»',
      '· گزارش: «گزارش امروز»',
      '· تکمیل: «جلسه با تیم انجام شد»',
      '· تمرکز: «شروع تمرکز»',
      '· یادآوری: «یادم بنداز ساعت ۵ قرص»',
      'برای گفتگوی آزاد، موتور مدل را در تنظیمات معرفی کن.',
    ].join('\n'),
    [
      'Things I can do without a language model:',
      '· Add task: “add I have a meeting tomorrow at 9”',
      '· List: “what are my tasks?”',
      '· Report: “daily report”',
      '· Complete: “the team meeting is done”',
      '· Focus: “start focus”',
      '· Reminder: “remind me to take my pills at 5”',
      'For open-ended chat, configure a model engine in Settings.',
    ].join('\n'),
  )
}

/** لیست کارهای فعال */
export function replyTaskList(lang: Lang, titles: string[]): string {
  return pick(
    lang,
    titles.length
      ? `کارهای فعال تو:\n${titles.map((t, i) => `${num(lang, i + 1)}. ${t}`).join('\n')}`
      : 'فعلاً کار فعالی نداری. بگو چه کاری ثبت کنم؟',
    titles.length
      ? `Your active tasks:\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : 'You have no active tasks. Tell me what to add.',
  )
}

/** موتور محلی — پیش‌فرض */
export function replyLocalRulesDefault(lang: Lang): string {
  return pick(
    lang,
    'در حالت قواعد محلی هستم — برای گفتگوی باز، در تنظیمات یک موتور مدل انتخاب کن.',
    "I'm in Local Rules mode — for open-ended chat, pick a model engine in Settings.",
  )
}

/** پیام خطای عمومی پردازش */
export function replyModelFailure(lang: Lang): string {
  return pick(
    lang,
    'سرویس مدل در دسترس نیست. ثبت و پیگیری کارها بدون مدل همچنان کار می‌کند.',
    'The model service is unreachable. Adding and tracking tasks still works without it.',
  )
}

/** خطای اتصال Endpoint کاربر */
export function replyEndpointError(lang: Lang, detail: string): string {
  return pick(
    lang,
    `اتصال Endpoint ناموفق: ${detail}`,
    `Endpoint connection failed: ${detail}`,
  )
}

/** پاسخ پیش‌فرض نهایی */
export function replyFallback(lang: Lang): string {
  return pick(
    lang,
    'الان نتوانستم درست پاسخ بدهم، لطفاً دوباره تلاش کن.',
    "I couldn't respond properly — please try again.",
  )
}
