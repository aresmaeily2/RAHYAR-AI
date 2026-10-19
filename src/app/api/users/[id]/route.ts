// /api/users/[id] — ویرایش/غیرفعال‌سازی/بازنشانی رمز/ابطال نشست/حذف (فقط مالک)
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
import { generatePassword } from '@/lib/users'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const actor = await requireUser(req)
    if (actor.role !== 'OWNER') return ownerForbiddenResponse()
    const { id } = await ctx.params
    const body = (await readJsonSafe(req)) as {
      displayName?: unknown
      disabled?: unknown
      newPassword?: unknown
      generatePassword?: unknown
      revokeSessions?: unknown
    } | null

    const target = await db.user.findUnique({ where: { id }, select: { id: true, username: true, role: true } })
    if (!target) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 })

    const data: { displayName?: string; disabled?: boolean; passwordHash?: string; mustChangePassword?: boolean } = {}
    const actions: string[] = []
    let generatedInitial: string | undefined // فقط برای پاسخ زندهٔ همین درخواست

    if (typeof body?.displayName === 'string') {
      const dn = cleanText(body.displayName, 60)
      if (!dn) return NextResponse.json({ error: 'نام نمایشی خالی است' }, { status: 400 })
      data.displayName = dn
    }

    if (typeof body?.disabled === 'boolean') {
      if (target.id === actor.id) {
        return NextResponse.json({ error: 'غیرفعال‌کردن حساب خودت مجاز نیست' }, { status: 400 })
      }
      if (target.role === 'OWNER' && body.disabled) {
        return NextResponse.json({ error: 'غیرفعال‌کردن مالک مجاز نیست' }, { status: 400 })
      }
      data.disabled = body.disabled
      actions.push(body.disabled ? 'disable_user' : 'enable_user')
      if (body.disabled) {
        // خروج فوری همه نشست‌های کاربر غیرفعال
        await db.session.deleteMany({ where: { userId: target.id } })
      }
    }

    if (body?.newPassword !== undefined || body?.generatePassword === true) {
      if (target.role === 'OWNER') {
        return NextResponse.json(
          { error: 'بازنشانی رمز مالک فقط از مسیر تغییر رمز خودش انجام می‌شود' },
          { status: 400 },
        )
      }
      let np: string
      if (body?.generatePassword === true) {
        np = generatePassword()
        generatedInitial = np
      } else {
        if (!passwordPolicyOk(body?.newPassword)) {
          return NextResponse.json({ error: 'رمز جدید باید حداقل ۸ نویسه باشد' }, { status: 400 })
        }
        np = body!.newPassword as string
      }
      data.passwordHash = hashPassword(np)
      data.mustChangePassword = true
      actions.push('reset_password')
      await db.session.deleteMany({ where: { userId: target.id } })
    }

    if (body?.revokeSessions === true) {
      await db.session.deleteMany({ where: { userId: target.id } })
      if (!actions.includes('revoke_sessions')) actions.push('revoke_sessions')
    }

    if (!Object.keys(data).length && !actions.length) {
      return NextResponse.json({ error: 'تغییری ارسال نشده است' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id: target.id },
      data,
      select: { id: true, username: true, displayName: true, disabled: true, mustChangePassword: true },
    })

    for (const a of actions) await logUserAudit(actor, a, updated.username)
    if (data.displayName) await logUserAudit(actor, 'update_user', updated.username)

    return NextResponse.json({ ok: true, user: updated, initialPassword: generatedInitial ?? null })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('PATCH /api/users/[id]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'ویرایش کاربر انجام نشد' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 30, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const actor = await requireUser(req)
    if (actor.role !== 'OWNER') return ownerForbiddenResponse()
    const { id } = await ctx.params

    const target = await db.user.findUnique({ where: { id }, select: { id: true, username: true, role: true } })
    if (!target) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 })
    if (target.id === actor.id) {
      return NextResponse.json({ error: 'حذف حساب خودت مجاز نیست' }, { status: 400 })
    }
    if (target.role === 'OWNER') {
      return NextResponse.json({ error: 'حذف حساب مالک مجاز نیست' }, { status: 400 })
    }

    await db.user.delete({ where: { id: target.id } }) // داده‌ها Cascade حذف می‌شوند
    await logUserAudit(actor, 'delete_user', target.username)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('DELETE /api/users/[id]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'حذف کاربر انجام نشد' }, { status: 500 })
  }
}
