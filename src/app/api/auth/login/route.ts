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
import { rateLimit, rateLimitKeyed, resetRateLimitKey, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  // سقف ۱۰ تلاش در دقیقه برای هر IP — دفاع brute-force
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const body = (await readJsonSafe(req)) as { username?: unknown; password?: unknown } | null
    // GRAND-F4 (SEC-F11b): ایجاد حساب همیشه lowercase است؛ جستجوی ورود هم باید
    // lowercase باشد وگرنه ورود با حروف بزرگ همیشه شکست می‌خورد (ناسازگاری)
    const username = cleanText(body?.username, 40).toLowerCase()
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!username || !password || password.length > 128) {
      return NextResponse.json({ error: 'نام کاربری یا رمز اشتباه است' }, { status: 401 })
    }

    // GU2-SEC2: سقف دوم به ازای حساب (مستقل از IP) — با چرخاندن IP/پروکسی
    // نمی‌توان رمز یک حساب را بی‌سقف حدس زد. ۲۰ تلاش در ۱۵ دقیقه.
    const acctKey = `login-acct::${username.toLowerCase()}`
    const acct = rateLimitKeyed(acctKey, 20, 15 * 60_000)
    if (!acct.ok) {
      return NextResponse.json(
        { error: 'تلاش‌های ورود برای این حساب زیاد بوده؛ چند دقیقه دیگر تلاش کن' },
        { status: 429, headers: { 'Retry-After': String(Math.max(acct.retryAfter, 1)) } },
      )
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
    // حساب غیرفعال توسط مالک → فقط دارندهٔ رمز درست این وضعیت را می‌بیند
    if (user.disabled) {
      return NextResponse.json({ error: 'این حساب غیرفعال شده است؛ با مالک تماس بگیر' }, { status: 403 })
    }

    // GRAND-F4 (SEC-F4): ورود موفق شمارندهٔ حساب را پاک می‌کند — تلاش موفق جزو
    // حدس رمز نیست؛ تلاش ناموفق همچنان می‌شمارد
    resetRateLimitKey(acctKey)

    const { token, expiresAt } = await createSession(user.id)
    const res = NextResponse.json({
      ok: true,
      user: { username: user.username, displayName: user.displayName, role: user.role },
      mustChangePassword: user.mustChangePassword,
    })
    attachSessionCookie(res, token, expiresAt)
    return res
  } catch (e) {
    console.error('POST /api/auth/login', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'ورود انجام نشد؛ دوباره تلاش کن' }, { status: 500 })
  }
}
