// PUT /api/auth/password — تغییر رمز توسط کاربر واردشده
// نیاز به رمز فعلی + سیاست رمز جدید + ابطال همه نشست‌های دیگر (امنیت)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireUser,
  unauthorizedResponse,
  AuthRequiredError,
  verifyPassword,
  hashPassword,
  passwordPolicyOk,
  revokeOtherSessions,
  SESSION_COOKIE,
} from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'

export async function PUT(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 5, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as { currentPassword?: unknown; newPassword?: unknown } | null
    const current = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    if (!passwordPolicyOk(body?.newPassword)) {
      return NextResponse.json({ error: 'رمز جدید باید حداقل ۸ نویسه باشد' }, { status: 400 })
    }
    const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
    if (!row || !verifyPassword(current, row.passwordHash)) {
      return NextResponse.json({ error: 'رمز فعلی درست نیست' }, { status: 403 })
    }
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(body.newPassword) },
    })
    // ابطال واقعی همه نشست‌های دیگر — نشست فعلی حفظ می‌شود (ادعای کامنت خط ۲ حالا عملی است)
    const revoked = await revokeOtherSessions(user.id, req.cookies.get(SESSION_COOKIE)?.value)
    return NextResponse.json({ ok: true, revokedSessions: revoked })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('PUT /api/auth/password', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'تغییر رمز انجام نشد' }, { status: 500 })
  }
}
