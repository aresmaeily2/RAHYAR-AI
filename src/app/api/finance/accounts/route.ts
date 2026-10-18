import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'
import {
  listAccounts,
  createAccount,
  FinanceValidationError,
} from '@/lib/finance/server'

/** حساب‌های مالی کاربر + مانده محاسبه‌شده */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    return NextResponse.json({ accounts: await listAccounts(user.id) })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/finance/accounts', e)
    return NextResponse.json({ error: 'خطا در دریافت حساب‌ها' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 20, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as { name?: unknown; kind?: unknown; openingAmount?: unknown } | null
    const account = await createAccount(user.id, body ?? {})
    return NextResponse.json({ account })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    if (e instanceof FinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('POST /api/finance/accounts', e)
    return NextResponse.json({ error: 'خطا در ساخت حساب' }, { status: 500 })
  }
}
