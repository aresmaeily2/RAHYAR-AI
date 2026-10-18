// ─── لایه سرور ماژول مالی — دسترسی DB متمرکز و اعتبارسنجی ──────

import { db } from '@/lib/db'
import { isFinanceType, isAccountKind, EXPENSE_CATEGORIES, type FinanceType } from './core'

export interface FinanceTxCreate {
  type: FinanceType
  amount: number
  accountId: string
  toAccountId?: string | null
  category?: string
  note?: string | null
  occurredAt?: Date | string | null
  source?: string
  externalRef?: string | null
}

/** خطای اعتبارسنجی با پیام فارسی شفاف */
export class FinanceValidationError extends Error {}

function assertOwned<T extends { userId: string }>(row: T | null, userId: string): T {
  if (!row || row.userId !== userId) throw new FinanceValidationError('یافت نشد')
  return row
}

export async function listAccounts(userId: string) {
  const [accounts, txs] = await Promise.all([
    db.financeAccount.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: 'asc' },
    }),
    db.financeTransaction.findMany({ where: { userId }, select: { type: true, amount: true, accountId: true, toAccountId: true } }),
  ])
  const { accountBalance } = await import('./core')
  return accounts.map((a) => ({
    ...a,
    balance: accountBalance(a.openingAmount, a.id, txs),
  }))
}

export async function createAccount(
  userId: string,
  input: { name?: unknown; kind?: unknown; openingAmount?: unknown },
) {
  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 60) : ''
  if (name.length < 2) throw new FinanceValidationError('نام حساب کوتاه است')
  const kind = isAccountKind(input.kind) ? input.kind : 'cash'
  const opening = Number(input.openingAmount)
  const acc = await db.financeAccount.create({
    data: {
      userId,
      name,
      kind,
      openingAmount: Number.isFinite(opening) ? opening : 0,
    },
  })
  return acc
}

export async function updateAccount(
  userId: string,
  id: string,
  input: { name?: unknown; kind?: unknown; archived?: unknown },
) {
  const existing = assertOwned(
    await db.financeAccount.findUnique({ where: { id } }),
    userId,
  )
  const data: { name?: string; kind?: string; archived?: boolean } = {}
  if (typeof input.name === 'string' && input.name.trim().length >= 2) data.name = input.name.trim().slice(0, 60)
  if (isAccountKind(input.kind)) data.kind = input.kind
  if (typeof input.archived === 'boolean') data.archived = input.archived
  return db.financeAccount.update({ where: { id: existing.id }, data })
}

export async function deleteAccount(userId: string, id: string) {
  const existing = assertOwned(
    await db.financeAccount.findUnique({ where: { id } }),
    userId,
  )
  // حذف حساب = حذف تراکنش‌های آن (Cascade در schema)
  await db.financeAccount.delete({ where: { id: existing.id } })
}

export async function listTransactions(
  userId: string,
  opts: { month?: string; type?: string; take?: number } = {},
) {
  const where: { userId: string; occurredAt?: { gte: Date; lt: Date }; type?: string } = { userId }
  if (opts.month && /^\d{4}-\d{2}$/.test(opts.month)) {
    const [y, m] = opts.month.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)
    where.occurredAt = { gte: start, lt: end }
  }
  if (opts.type && isFinanceType(opts.type)) where.type = opts.type
  return db.financeTransaction.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: Math.min(opts.take ?? 200, 500),
    include: { account: { select: { name: true, kind: true } }, toAccount: { select: { name: true, kind: true } } },
  })
}

export async function createTransaction(userId: string, input: FinanceTxCreate) {
  if (!isFinanceType(input.type)) throw new FinanceValidationError('نوع تراکنش نامعتبر است')
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e15) {
    throw new FinanceValidationError('مبلغ نامعتبر است')
  }
  const acc = assertOwned(
    await db.financeAccount.findUnique({ where: { id: input.accountId } }),
    userId,
  )
  let toId: string | null = null
  if (input.type === 'transfer') {
    if (!input.toAccountId) throw new FinanceValidationError('حساب مقصد انتقال لازم است')
    const to = assertOwned(
      await db.financeAccount.findUnique({ where: { id: input.toAccountId } }),
      userId,
    )
    if (to.id === acc.id) throw new FinanceValidationError('حساب مبدأ و مقصد یکسان است')
    toId = to.id
  }

  // ضدتکرار: با externalRef یکتا در سطح کاربر
  if (input.externalRef) {
    const dup = await db.financeTransaction.findFirst({
      where: { userId, externalRef: input.externalRef },
      select: { id: true },
    })
    if (dup) return { ...dup, duplicate: true } as { id: string; duplicate: boolean }
  }

  const occurred = input.occurredAt ? new Date(input.occurredAt) : new Date()
  const tx = await db.financeTransaction.create({
    data: {
      userId,
      type: input.type,
      amount,
      accountId: acc.id,
      toAccountId: toId,
      category: (input.category ?? 'other').slice(0, 30),
      note: input.note ? String(input.note).slice(0, 300) : null,
      occurredAt: Number.isNaN(occurred.getTime()) ? new Date() : occurred,
      source: (input.source ?? 'manual').slice(0, 10),
      externalRef: input.externalRef ?? null,
    },
    include: { account: { select: { name: true, kind: true } }, toAccount: { select: { name: true, kind: true } } },
  })
  return { ...tx, duplicate: false } as { id: string; duplicate: boolean }
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: { amount?: unknown; category?: unknown; note?: unknown; occurredAt?: unknown },
) {
  const existing = assertOwned(
    await db.financeTransaction.findUnique({ where: { id } }),
    userId,
  )
  const data: { amount?: number; category?: string; note?: string | null; occurredAt?: Date } = {}
  if (input.amount !== undefined) {
    const a = Number(input.amount)
    if (!Number.isFinite(a) || a <= 0) throw new FinanceValidationError('مبلغ نامعتبر است')
    data.amount = a
  }
  if (typeof input.category === 'string' && input.category.trim()) data.category = input.category.trim().slice(0, 30)
  if (input.note !== undefined) data.note = input.note ? String(input.note).slice(0, 300) : null
  if (input.occurredAt) {
    const d = new Date(String(input.occurredAt))
    if (!Number.isNaN(d.getTime())) data.occurredAt = d
  }
  return db.financeTransaction.update({
    where: { id: existing.id },
    data,
    include: { account: { select: { name: true, kind: true } }, toAccount: { select: { name: true, kind: true } } },
  })
}

export async function deleteTransaction(userId: string, id: string) {
  const existing = assertOwned(
    await db.financeTransaction.findUnique({ where: { id } }),
    userId,
  )
  await db.financeTransaction.delete({ where: { id: existing.id } })
}

/** داده خروجی — برای CSV/Excel/JSON/TXT و PDF چاپی */
export async function exportRows(userId: string, month?: string) {
  const [accounts, txs, budgets] = await Promise.all([
    listAccounts(userId),
    listTransactions(userId, { month, take: 500 }),
    listBudgets(userId),
  ])
  return { accounts, transactions: txs, budgets }
}

// ── بودجه ماهانه دسته‌ها ──────────────────────────────────────
export async function listBudgets(userId: string) {
  return db.financeBudget.findMany({
    where: { userId },
    orderBy: { category: 'asc' },
  })
}

/** ثبت/به‌روزرسانی سقف ماهانه یک دسته (upsert) */
export async function upsertBudget(
  userId: string,
  category: string,
  monthlyLimit: number,
) {
  const cat = String(category ?? '').trim()
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(cat))
    throw new FinanceValidationError('دسته نامعتبر است')
  const limit = Math.round(Number(monthlyLimit))
  if (!Number.isFinite(limit) || limit <= 0 || limit > 1_000_000_000_000)
    throw new FinanceValidationError('سقف بودجه نامعتبر است')
  return db.financeBudget.upsert({
    where: { userId_category: { userId, category: cat } },
    create: { userId, category: cat, monthlyLimit: limit },
    update: { monthlyLimit: limit },
  })
}

/** حذف بودجه یک دسته */
export async function deleteBudget(userId: string, category: string) {
  const cat = String(category ?? '').trim()
  if (!cat) throw new FinanceValidationError('دسته نامعتبر است')
  await db.financeBudget.deleteMany({ where: { userId, category: cat } })
}
