import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'
import {
  listTransactions,
  createTransaction,
  FinanceValidationError,
} from '@/lib/finance/server'

/** فهرست تراکنش‌ها — فیلتر ماه (میلادی YYYY-MM) و نوع */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const month = req.nextUrl.searchParams.get('month') ?? undefined
    const type = req.nextUrl.searchParams.get('type') ?? undefined
    const transactions = await listTransactions(user.id, { month, type })
    return NextResponse.json({ transactions })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/finance/transactions', e)
    return NextResponse.json({ error: 'خطا در دریافت تراکنش‌ها' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 40, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as {
      type?: unknown
      amount?: unknown
      accountId?: unknown
      toAccountId?: unknown
      category?: unknown
      note?: unknown
      occurredAt?: unknown
      source?: unknown
      externalRef?: unknown
    } | null
    const tx = await createTransaction(user.id, {
      type: body?.type as never,
      amount: body?.amount as never,
      accountId: String(body?.accountId ?? ''),
      toAccountId: body?.toAccountId ? String(body.toAccountId) : null,
      category: typeof body?.category === 'string' ? body.category : 'other',
      note: cleanText(body?.note as string, 300) || null,
      occurredAt: body?.occurredAt ? String(body.occurredAt) : null,
      source: typeof body?.source === 'string' ? body.source : 'manual',
      externalRef: typeof body?.externalRef === 'string' ? body.externalRef.slice(0, 80) : null,
    })
    return NextResponse.json({ transaction: tx })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    if (e instanceof FinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('POST /api/finance/transactions', e)
    return NextResponse.json({ error: 'خطا در ثبت تراکنش' }, { status: 500 })
  }
}
