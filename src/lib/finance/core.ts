// ─── هسته ماژول مالی — محاسبات خالص و آزمون‌پذیر ──────────────
// بدون DB و بدون وابستگی؛ نما/API از این توابع استفاده می‌کنند.

export type FinanceType = 'income' | 'expense' | 'transfer'
export type AccountKind = 'cash' | 'bank' | 'card'

export const FINANCE_TYPES: FinanceType[] = ['income', 'expense', 'transfer']

export function isFinanceType(v: unknown): v is FinanceType {
  return typeof v === 'string' && (FINANCE_TYPES as string[]).includes(v)
}

export const ACCOUNT_KINDS: AccountKind[] = ['cash', 'bank', 'card']

export function isAccountKind(v: unknown): v is AccountKind {
  return typeof v === 'string' && (ACCOUNT_KINDS as string[]).includes(v)
}

/** دسته‌های پیش‌فرض — کلید ثابت برای ذخیره؛ برچسب با i18n */
export const EXPENSE_CATEGORIES = [
  'food', 'transport', 'housing', 'bills', 'shopping',
  'health', 'education', 'fun', 'family', 'charity', 'other',
] as const

export const INCOME_CATEGORIES = [
  'salary', 'freelance', 'gift', 'interest', 'sale', 'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]

/** برچسب دسته‌ها — کلید i18n طبیعی (فارسی مبنا) */
export const CATEGORY_LABELS: Record<string, string> = {
  food: 'خوراک',
  transport: 'حمل‌ونقل',
  housing: 'مسکن',
  bills: 'قبوض',
  shopping: 'خرید',
  health: 'سلامت',
  education: 'آموزش',
  fun: 'تفریح',
  family: 'خانواده',
  charity: 'خیریه',
  other: 'متفرقه',
  salary: 'حقوق',
  freelance: 'پروژه',
  gift: 'هدیه',
  interest: 'سود',
  sale: 'فروش',
}

/** آیکن دسته — بدون وابستگی؛ در UI به lucide نگاشت می‌شود */
export const CATEGORY_ICONS: Record<string, string> = {
  food: 'utensils',
  transport: 'car',
  housing: 'home',
  bills: 'receipt',
  shopping: 'shopping-bag',
  health: 'heart-pulse',
  education: 'book-open',
  fun: 'gamepad-2',
  family: 'users',
  charity: 'hand-heart',
  other: 'circle',
  salary: 'briefcase',
  freelance: 'laptop',
  gift: 'gift',
  interest: 'percent',
  sale: 'tag',
}

export function categoriesForType(type: FinanceType): readonly string[] {
  if (type === 'income') return INCOME_CATEGORIES
  if (type === 'transfer') return ['transfer']
  return EXPENSE_CATEGORIES
}

// ── محاسبه مانده و خلاصه ─────────────────────────────────────

export interface AmountLike {
  type: string
  amount: number
  accountId: string
  toAccountId?: string | null
}

/** مانده یک حساب = افتتاحیه + درآمدها − هزینه‌ها + ورودی انتقال − خروجی انتقال */
export function accountBalance(
  opening: number,
  accountId: string,
  txs: AmountLike[],
): number {
  let bal = opening
  for (const t of txs) {
    if (t.type === 'income' && t.accountId === accountId) bal += t.amount
    else if (t.type === 'expense' && t.accountId === accountId) bal -= t.amount
    else if (t.type === 'transfer') {
      if (t.accountId === accountId) bal -= t.amount
      if (t.toAccountId === accountId) bal += t.amount
    }
  }
  return bal
}

export interface MonthSummary {
  income: number
  expense: number
  net: number
  transferIn: number
  transferOut: number
  byCategory: Array<{ category: string; total: number; count: number }>
  byDay: Array<{ day: number; expense: number; income: number }>
}

/**
 * خلاصه ماهانه از تراکنش‌های همان ماه (زمان تهران).
 * انتقال در درآمد/هزینه خالص حساب نمی‌شود (پول جابه‌جا شده، نه ساخته/سوخته).
 */
export function monthSummary(txs: Array<AmountLike & { occurredAt: Date | string; category: string }>): MonthSummary {
  let income = 0
  let expense = 0
  let transferIn = 0
  let transferOut = 0
  const catMap = new Map<string, { total: number; count: number }>()
  const dayMap = new Map<number, { expense: number; income: number }>()

  for (const t of txs) {
    const d = new Date(t.occurredAt)
    const day = Number(new Intl.DateTimeFormat('en-u-ca-persian', { day: 'numeric', timeZone: 'Asia/Tehran' }).format(d).replace(/[^\d]/g, '')) || 1
    if (t.type === 'income') {
      income += t.amount
      const e = dayMap.get(day) ?? { expense: 0, income: 0 }
      e.income += t.amount
      dayMap.set(day, e)
    } else if (t.type === 'expense') {
      expense += t.amount
      const e = dayMap.get(day) ?? { expense: 0, income: 0 }
      e.expense += t.amount
      dayMap.set(day, e)
      const c = catMap.get(t.category) ?? { total: 0, count: 0 }
      c.total += t.amount
      c.count += 1
      catMap.set(t.category, c)
    } else if (t.type === 'transfer') {
      transferOut += t.amount
      transferIn += t.amount // در سطح کل سامانه دو سر انتقال جمع می‌شود
    }
  }

  const byCategory = [...catMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total)

  const byDay = [...dayMap.entries()]
    .map(([day, v]) => ({ day, ...v }))
    .sort((a, b) => a.day - b.day)

  return { income, expense, net: income - expense, transferIn, transferOut, byCategory, byDay }
}

/** قالب مبلغ — فارسی: ۱٬۲۳۴٬۵۶۷ ریال؛ انگلیسی: 1,234,567 IRR */
export function formatAmount(amount: number, lang: 'fa' | 'en', currency = 'IRR'): string {
  const grouped = Math.round(amount).toLocaleString('en-US')
  if (lang === 'fa') {
    const digits = grouped.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
    return `${digits} ریال`
  }
  return `${grouped} ${currency}`
}
