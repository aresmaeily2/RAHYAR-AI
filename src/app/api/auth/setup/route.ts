// POST /api/auth/setup — راه‌اندازی اولیه مالک (فقط یک‌بار)
// شرط سخت: فقط وقتی کاربر نگه‌دارنده (SETUP_REQUIRED) وجود دارد.
// پس از تعیین رمز، نشست معتبر صادر و مالک وارد می‌شود.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  isSetupPending,
  createSession,
  attachSessionCookie,
  passwordPolicyOk,
  checkSetupToken,
  SETUP_SENTINEL,
} from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const body = (await readJsonSafe(req)) as {
      username?: unknown
      displayName?: unknown
      password?: unknown
      setupToken?: unknown
    } | null

    // GU2-SEC1: پیش از هر نوشتن در DB، توکن راه‌اندازی خارج از باند بررسی شود
    const tok = checkSetupToken(body?.setupToken)
    if (tok === 'missing_config') {
      return NextResponse.json(
        { error: 'راه‌اندازی اولیه در محیط تولید به RAHYAR_SETUP_TOKEN نیاز دارد' },
        { status: 503 },
      )
    }
    if (tok === 'invalid') {
      return NextResponse.json({ error: 'کد راه‌اندازی نامعتبر است' }, { status: 403 })
    }

    let owner = await db.user.findUnique({ where: { username: 'owner' } })
    // نصب کاملاً خالی (بدون هیچ کاربری) → نگه‌دارنده را می‌سازیم و
    // ادعای اتمیک با همان sentinel انجام می‌شود (بدون تغییر امنیتی مسیر)
    if (!owner) {
      const total = await db.user.count()
      if (total > 0) {
        return NextResponse.json({ error: 'راه‌اندازی اولیه قبلاً انجام شده است' }, { status: 403 })
      }
      owner = await db.user.create({
        data: { username: 'owner', displayName: 'علیرضا', passwordHash: SETUP_SENTINEL },
      })
    }
    if (!isSetupPending(owner.passwordHash)) {
      return NextResponse.json({ error: 'راه‌اندازی اولیه قبلاً انجام شده است' }, { status: 403 })
    }
    if (!passwordPolicyOk(body?.password)) {
      return NextResponse.json(
        { error: 'رمز باید حداقل ۸ نویسه باشد' },
        { status: 400 },
      )
    }

    const username = cleanText(body?.username, 40) || 'owner'
    if (!/^[\w\u0600-\u06FF.-]+$/.test(username)) {
      return NextResponse.json({ error: 'نام کاربری فقط حرف، رقم و نقطه/خط تیره' }, { status: 400 })
    }
    const displayName = cleanText(body?.displayName, 40) || 'علیرضا'

    // ادعای اتمیک نگه‌دارنده: شرط sentinel در خود UPDATE — دو درخواست همزمان
    // هرگز هر دو برنده نمی‌شوند (رفع TOCTOU)
    const claimed = await db.user.updateMany({
      where: { id: owner.id, passwordHash: SETUP_SENTINEL },
      data: {
        username: username === owner.username ? owner.username : username,
        displayName,
        passwordHash: hashPassword(body.password),
      },
    })
    if (claimed.count !== 1) {
      return NextResponse.json({ error: 'راه‌اندازی اولیه قبلاً انجام شده است' }, { status: 403 })
    }

    const { token, expiresAt } = await createSession(owner.id)
    const res = NextResponse.json({
      ok: true,
      user: { username, displayName },
    })
    attachSessionCookie(res, token, expiresAt)
    return res
  } catch (e) {
    // برخورد username یکتا هم همین پیام عمومی می‌دهد — بدون افشای وجود حساب
    console.error('POST /api/auth/setup', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'راه‌اندازی انجام نشد — نام کاربری دیگری امتحان کن' }, { status: 400 })
  }
}
