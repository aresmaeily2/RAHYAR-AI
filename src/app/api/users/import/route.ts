// POST /api/users/import — ورود گروهی کاربران از CSV (فقط مالک)
// قالب هر ردیف: username,displayName,password  (رمز خالی → تولید خودکار)
// همه حساب‌ها mustChangePassword=true می‌گیرند؛ سقف ۵۰ ردیف در هر فراخوان.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireUser,
  unauthorizedResponse,
  AuthRequiredError,
  ownerForbiddenResponse,
  logUserAudit,
  hashPassword,
} from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'
import { parseUsersCsv, generatePassword, validateUsername, MAX_USERS } from '@/lib/users'

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const actor = await requireUser(req)
    if (actor.role !== 'OWNER') return ownerForbiddenResponse()

    const body = (await readJsonSafe(req)) as { csv?: unknown } | null
    const { rows, errors } = parseUsersCsv(typeof body?.csv === 'string' ? body.csv : '')

    const total = await db.user.count()
    if (total + rows.length > MAX_USERS) {
      return NextResponse.json({ error: `سقف کاربران (${MAX_USERS}) اجازه این ورود را نمی‌دهد` }, { status: 409 })
    }

    const created: { username: string; displayName: string; initialPassword: string }[] = []
    const skipped: { username: string; reason: string }[] = []

    for (const row of rows) {
      if (!validateUsername(row.username)) {
        skipped.push({ username: row.username, reason: 'invalid_username' })
        continue
      }
      const exists = await db.user.findUnique({ where: { username: row.username }, select: { id: true } })
      if (exists) {
        skipped.push({ username: row.username, reason: 'duplicate' })
        continue
      }
      const pw = row.password || generatePassword()
      const u = await db.user.create({
        data: {
          username: row.username,
          displayName: row.displayName,
          passwordHash: hashPassword(pw),
          role: 'USER',
          mustChangePassword: true,
        },
        select: { username: true, displayName: true },
      })
      created.push({ username: u.username, displayName: u.displayName, initialPassword: pw })
    }

    await logUserAudit(actor, 'import_users', undefined, {
      requested: rows.length,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
    })

    // رمزهای اولیه فقط در همین پاسخ زنده به مالک برمی‌گردند (برای تحویل به کاربران)
    return NextResponse.json({ ok: true, created, skipped, errors })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/users/import', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'ورود گروهی انجام نشد' }, { status: 500 })
  }
}
