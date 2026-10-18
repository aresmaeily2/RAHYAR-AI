import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'
import {
  updateTransaction,
  deleteTransaction,
  FinanceValidationError,
} from '@/lib/finance/server'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 40, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    const body = (await readJsonSafe(req)) as {
      amount?: unknown
      category?: unknown
      note?: unknown
      occurredAt?: unknown
    } | null
    const tx = await updateTransaction(user.id, id, body ?? {})
    return NextResponse.json({ transaction: tx })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    if (e instanceof FinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: e.message === 'یافت نشد' ? 404 : 400 })
    }
    console.error('PATCH /api/finance/transactions/[id]', e)
    return NextResponse.json({ error: 'خطا در ویرایش تراکنش' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 30, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    await deleteTransaction(user.id, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    if (e instanceof FinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    console.error('DELETE /api/finance/transactions/[id]', e)
    return NextResponse.json({ error: 'خطا در حذف تراکنش' }, { status: 500 })
  }
}
