// POST /api/auth/logout — پایان نشست فعلی (حذف رکورد + انقضای کوکی)
import { NextRequest, NextResponse } from 'next/server'
import { destroySession, clearSessionCookie } from '@/lib/auth'
import { sameOriginOk, forbiddenOrigin, rateLimit, tooManyRequests } from '@/lib/security'

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 20, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  await destroySession(req)
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
