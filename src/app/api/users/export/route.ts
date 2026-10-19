// GET /api/users/export — خروجی CSV کاربران (فقط مالک)
// طبق سیاست مأموریت: هیچ رمز یا هش رمزی در خروجی نمی‌آید.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorizedResponse, AuthRequiredError, ownerForbiddenResponse } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'
import { csvRow } from '@/lib/users'

export async function GET(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const actor = await requireUser(req)
    if (actor.role !== 'OWNER') return ownerForbiddenResponse()

    const users = await db.user.findMany({
      select: { username: true, displayName: true, role: true, disabled: true, mustChangePassword: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    let csv = csvRow(['username', 'displayName', 'role', 'status', 'mustChangePassword', 'createdAt'])
    for (const u of users) {
      csv += csvRow([
        u.username,
        u.displayName,
        u.role,
        u.disabled ? 'disabled' : 'active',
        u.mustChangePassword ? 'yes' : 'no',
        u.createdAt.toISOString().slice(0, 10),
      ])
    }

    // BOM برای اکسل فارسی + فرمول‌گارد داخل csvRow
    return new NextResponse('\uFEFF' + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rahyar-users-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/users/export', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'خروجی CSV انجام نشد' }, { status: 500 })
  }
}
