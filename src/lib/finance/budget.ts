// ─── بودجه مالی — منطق خالص و قطعی (آزمون‌پذیر بدون DB) ───────
// هر دسته هزینه یک سقف ماهانه دارد؛ مصرفِ همان ماه از تراکنش‌های
// «expense» همان دسته شمرده می‌شود. انتقال‌ها و درآمدها بودجه‌انداخت
// نیستند. خروجی کاملاً قطعی و بدون هیچ فراخوانی مدل است.

import { EXPENSE_CATEGORIES } from './core'

export interface BudgetLike {
  category: string
  monthlyLimit: number
}

export interface BudgetTxLike {
  type: string // income | expense | transfer
  category: string
  amount: number
  occurredAt: Date | string
}

export interface BudgetStatus {
  category: string
  limit: number
  spent: number
  remaining: number
  /** نسبت مصرف به سقف — ۰ تا ∞ (۱ = دقیقاً سقف) */
  ratio: number
  /** عبور از سقف */
  over: boolean
  /** نزدیک سقف (۸۰٪ به بالا) */
  warn: boolean
}

/** کلید ماه «YYYY-MM» از تاریخ — بدون وابستگی به منطقه زمانی سرور (UTC) */
export function monthKeyOf(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** آیا این دسته بودجه‌پذیر است؟ (فقط دسته‌های هزینه) */
export function isBudgetCategory(v: unknown): v is string {
  return typeof v === 'string' && (EXPENSE_CATEGORIES as readonly string[]).includes(v)
}

/**
 * وضعیت بودجه‌ها برای یک ماه مشخص — تابع خالص.
 * بودجه بدون تراکنش: spent=۰. دسته بدون بودجه: در خروجی نیست.
 */
export function budgetStatuses(
  budgets: readonly BudgetLike[],
  txs: readonly BudgetTxLike[],
  monthKey: string,
): BudgetStatus[] {
  const spentByCat = new Map<string, number>()
  for (const tx of txs) {
    if (tx.type !== 'expense') continue
    if (monthKeyOf(tx.occurredAt) !== monthKey) continue
    const prev = spentByCat.get(tx.category) ?? 0
    spentByCat.set(tx.category, prev + Math.max(0, tx.amount))
  }
  return budgets
    .filter((b) => isBudgetCategory(b.category) && Number.isFinite(b.monthlyLimit) && b.monthlyLimit > 0)
    .map((b) => {
      const spent = Math.round(spentByCat.get(b.category) ?? 0)
      const limit = Math.round(b.monthlyLimit)
      const remaining = limit - spent
      const ratio = limit > 0 ? spent / limit : 0
      return {
        category: b.category,
        limit,
        spent,
        remaining,
        ratio,
        over: spent > limit,
        warn: !overGuard(spent, limit) && ratio >= 0.8,
      }
    })
}

function overGuard(spent: number, limit: number): boolean {
  return spent > limit
}

/** جمع مصرف بودجه‌دار ماه — برای نمودار و گزارش سرصفحه */
export function budgetTotals(statuses: readonly BudgetStatus[]): {
  totalLimit: number
  totalSpent: number
  overCount: number
} {
  let totalLimit = 0
  let totalSpent = 0
  let overCount = 0
  for (const s of statuses) {
    totalLimit += s.limit
    totalSpent += s.spent
    if (s.over) overCount++
  }
  return { totalLimit, totalSpent, overCount }
}
