// /api/users — مدیریت کاربران (فقط مالک) — مأموریت چندکاربره
// GET  : فهرست کاربران (بدون هیچ اثر رمز)
// POST : ایجاد کاربر جدید (رمز اولیه یک‌بارمصرف؛ پاسخ زنده فقط این‌جا)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireUser,
  unauthorizedResponse,
  AuthRequiredError,
  ownerForbiddenResponse,
  logUserAudit,
  hashPassword,
  passwordPolicyOk,
} from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'
import { validateUsername, generatePassword, MAX_USERS } from '@/lib/users'

export async function GET(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    if (user.role !== 'OWNER') return ownerForbiddenResponse()
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        disabled: true,
        mustChangePassword: true,
        createdAt: true,
        _count: { select: { sessions: true } },
      },
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        disabled: u.disabled,
        mustChangePassword: u.mustChangePassword,
        activeSessions: u._count.sessions,
        createdAt: u.createdAt,
      })),
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/users', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'دریافت فهرست کاربران انجام نشد' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const actor = await requireUser(req)
    if (actor.role !== 'OWNER') return ownerForbiddenResponse()
    const body = (await readJsonSafe(req)) as {
      username?: unknown
      displayName?: unknown
      password?: unknown
      generatePassword?: unknown
    } | null

    const username = cleanText(body?.username, 40)
    if (!validateUsername(username)) {
      return NextResponse.json(
        { error: 'نام کاربری باید ۳ تا ۴۰ نویسه لاتین/رقم/نقطه/خط تیره باشد و «owner» رزرو است' },
        { status: 400 },
      )
    }
    const total = await db.user.count()
    if (total >= MAX_USERS) {
      return NextResponse.json({ error: `سقف تعداد کاربران (${MAX_USERS}) پر است` }, { status: 409 })
    }
    const displayName = (cleanText(body?.displayName, 60) || username).slice(0, 60)

    let initial: string
    if (body?.generatePassword === true) {
      initial = generatePassword()
    } else {
      if (!passwordPolicyOk(body?.password)) {
        return NextResponse.json(
          { error: 'رمز اولیه باید حداقل ۸ نویسه باشد یا گزینه تولید رمز را بزن' },
          { status: 400 },
        )
      }
      initial = body!.password as string
    }

    const uname = username.toLowerCase()
    const exists = await db.user.findUnique({ where: { username: uname }, select: { id: true } })
    if (exists) {
      return NextResponse.json({ error: 'این نام کاربری قبلاً گرفته شده است' }, { status: 409 })
    }

    const created = await db.user.create({
      data: {
        username: uname,
        displayName,
        passwordHash: hashPassword(initial),
        role: 'USER', // مالک فقط از مسیر setup — ایجاد مالک دوم ممنوع
        mustChangePassword: true, // تغییر اجباری رمز در اولین ورود
      },
      select: { id: true, username: true, displayName: true },
    })

    await logUserAudit(actor, 'create_user', created.username, { displayName: created.displayName })
    // رمز اولیه فقط در همین پاسخ زنده به مالک برمی‌گردد — در لاگ/ممیزی/CSV هرگز
    return NextResponse.json({ ok: true, user: created, initialPassword: initial })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/users', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'ایجاد کاربر انجام نشد' }, { status: 500 })
  }
}
