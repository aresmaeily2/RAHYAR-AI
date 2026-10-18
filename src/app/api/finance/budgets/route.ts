import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'
import { listBudgets, upsertBudget, deleteBudget, FinanceValidationError } from '@/lib/finance/server'
import { db } from '@/lib/db'
import { budgetStatuses, monthKeyOf, budgetTotals } from '@/lib/finance/budget'

/**
 * بودجه ماهانه دسته‌های هزینه —
 *   GET            فهرست بودجه‌ها + وضعیت مصرف ماه جاری
 *   PUT  {category, monthlyLimit}   ثبت/به‌روزرسانی
 *   DELETE ?category=…              حذف
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const budgets = await listBudgets(user.id)
    // وضعیت مصرف ماه جاری — تراکنش‌های هزینه همین ماه
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const monthEnd = new Date(monthStart)
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1)
    const txs = await db.financeTransaction.findMany({
      where: { userId: user.id, occurredAt: { gte: monthStart, lt: monthEnd } },
      select: { type: true, category: true, amount: true, occurredAt: true },
    })
    const mk = monthKeyOf(new Date())
    const statuses = budgetStatuses(budgets, txs, mk)
    return NextResponse.json({
      budgets,
      statuses,
      totals: budgetTotals(statuses),
      monthKey: mk,
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/finance/budgets', e)
    return NextResponse.json({ error: 'خطا در دریافت بودجه‌ها' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 30, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as {
      category?: unknown
      monthlyLimit?: unknown
    } | null
    if (!body || typeof body.category !== 'string' || typeof body.monthlyLimit !== 'number') {
      return NextResponse.json({ error: 'داده نامعتبر است' }, { status: 400 })
    }
    const budget = await upsertBudget(user.id, body.category, body.monthlyLimit)
    return NextResponse.json({ ok: true, budget })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    if (e instanceof FinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('PUT /api/finance/budgets', e)
    return NextResponse.json({ error: 'خطا در ذخیره بودجه' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 30, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const category = req.nextUrl.searchParams.get('category') ?? ''
    await deleteBudget(user.id, category)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    if (e instanceof FinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('DELETE /api/finance/budgets', e)
    return NextResponse.json({ error: 'خطا در حذف بودجه' }, { status: 500 })
  }
}
