import { NextRequest, NextResponse } from 'next/server'
import { bootstrapTasks } from '@/lib/server-tasks'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'

/**
 * اجرای صریح و هم‌رفته bootstrap (seed نمونه + بازتولید کارهای تکرارشونده).
 * Idempotent است: اجرای مکرر چیزی مضاعف نمی‌سازد (M7).
 * GET /api/tasks هم همین را به‌صورت lazy صدا می‌زند؛ این مسیر برای
 * کنترل صریح، عملیات و آزمون است.
 */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const result = await bootstrapTasks(user.id)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/tasks/bootstrap', e)
    return NextResponse.json({ error: 'خطا در آماده‌سازی کارها' }, { status: 500 })
  }
}
