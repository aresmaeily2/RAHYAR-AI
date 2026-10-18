import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'

/** آمار مصرف هوش مصنوعی کاربر (فقط فراداده — بخش حریم خصوصی تنظیمات) */
export async function GET(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 30, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const [today, month] = await Promise.all([
      db.aiUsage.count({ where: { userId: user.id, status: 'ok', createdAt: { gte: dayStart } } }),
      db.aiUsage.count({ where: { userId: user.id, status: 'ok', createdAt: { gte: monthStart } } }),
    ])
    return NextResponse.json({ today, month })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/settings/ai/usage', e)
    return NextResponse.json({ error: 'خطا در آمار مصرف' }, { status: 500 })
  }
}
