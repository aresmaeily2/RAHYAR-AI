// GET /api/auth/session — وضعیت نشست/راه‌اندازی برای لایه کلاینت
// پاسخ هیچ اطلاع حساسی (هش رمز، توکن) برنمی‌گرداند.
import { NextRequest, NextResponse } from 'next/server'
import { resolveUser, ownerSetupPending, checkSetupToken } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'

export async function GET(req: NextRequest) {
  // سقف نرخ سبک — جلوگیری از سوءاستفاده resolve مکرر (GET بی‌هزینه اما نه بی‌کران)
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await resolveUser(req)
    if (user) {
      return NextResponse.json({
        authenticated: true,
        user: { username: user.username, displayName: user.displayName, role: user.role },
        mustChangePassword: user.mustChangePassword,
      })
    }
    const setupPending = await ownerSetupPending()
    // GU2-SEC1: کلاینت می‌فهمد آیا فیلد «کد راه‌اندازی» لازم است (بدون افشای خود کد)
    const setupTokenRequired = setupPending && checkSetupToken(undefined) !== 'ok'
    return NextResponse.json({ authenticated: false, setupPasswordPending: setupPending, setupTokenRequired })
  } catch (e) {
    console.error('GET /api/auth/session', e)
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
