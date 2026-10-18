// POST /api/auth/login — ورود مالک
// پیام خطای عمومی (بدون افشای وجود/عدم وجود حساب) + سقف سخت نرخ برای جلوگیری از جستجوی رمز.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  isSetupPending,
  createSession,
  attachSessionCookie,
  burnPasswordTiming,
} from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  // سقف ۱۰ تلاش در دقیقه برای هر IP — دفاع brute-force
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const body = (await readJsonSafe(req)) as { username?: unknown; password?: unknown } | null
    const username = cleanText(body?.username, 40)
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!username || !password || password.length > 128) {
      return NextResponse.json({ error: 'نام کاربری یا رمز اشتباه است' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { username } })
    if (!user || isSetupPending(user.passwordHash)) {
      // هم‌ترازی زمان: هزینه scrypt حتی وقتی حساب وجود ندارد هم پرداخت می‌شود
      burnPasswordTiming(password)
      return NextResponse.json({ error: 'نام کاربری یا رمز اشتباه است' }, { status: 401 })
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'نام کاربری یا رمز اشتباه است' }, { status: 401 })
    }

    const { token, expiresAt } = await createSession(user.id)
    const res = NextResponse.json({
      ok: true,
      user: { username: user.username, displayName: user.displayName },
    })
    attachSessionCookie(res, token, expiresAt)
    return res
  } catch (e) {
    console.error('POST /api/auth/login', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'ورود انجام نشد؛ دوباره تلاش کن' }, { status: 500 })
  }
}
