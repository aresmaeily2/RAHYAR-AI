import { NextRequest, NextResponse } from 'next/server'
import { getProfile, setProfileName, DEFAULT_USER_NAME } from '@/lib/server-profile'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'

/** پروفایل کاربر — نام پیش‌فرض محصول: علیرضا (قابل تغییر از رابط) */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const profile = await getProfile(user.id)
    return NextResponse.json({ profile, defaultName: DEFAULT_USER_NAME })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/profile', e)
    return NextResponse.json({ error: 'خطا در دریافت پروفایل' }, { status: 500 })
  }
}

/** تغییر نام کاربر */
export async function PUT(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = await readJsonSafe(req) as { name?: unknown } | null
    const name = await setProfileName(user.id, body?.name)
    return NextResponse.json({ profile: { name } })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('PUT /api/profile', e)
    return NextResponse.json({ error: 'خطا در ذخیره پروفایل' }, { status: 500 })
  }
}
