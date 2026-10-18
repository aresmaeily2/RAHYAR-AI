import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveDueDate, serializeTask } from '@/lib/server-tasks'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'

type Ctx = { params: Promise<{ id: string }> }

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    const body = await readJsonSafe(req) as Record<string, unknown> | null
    // جداسازی داده: فقط کارِ متعلق به کاربر نشست
    const existing = await db.task.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'کار یافت نشد' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    const title = cleanText(body?.title, 200)
    if (title) data.title = title
    if (body?.notes !== undefined)
      data.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null
    if (body?.tag !== undefined)
      data.tag = typeof body.tag === 'string' && body.tag.trim() ? body.tag.trim().slice(0, 40) : null
    if ([1, 2, 3].includes(body?.priority as number)) data.priority = body?.priority
    if (typeof body?.starred === 'boolean') data.starred = body.starred
    if (body?.repeat !== undefined)
      data.repeat = body.repeat === 'daily' || body.repeat === 'weekly' ? body.repeat : null
    if (body?.dueDate !== undefined) data.dueDate = resolveDueDate(body.dueDate as string)
    if (body?.dueTime !== undefined)
      data.dueTime =
        typeof body.dueTime === 'string' && TIME_RE.test(body.dueTime) ? body.dueTime : null

    if (body?.status === 'done' && existing.status !== 'done') {
      data.status = 'done'
      data.completedAt = new Date()
    } else if (body?.status === 'todo' && existing.status !== 'todo') {
      data.status = 'todo'
      data.completedAt = null
    }

    const t = await db.task.update({ where: { id }, data, include: { subtasks: true } })
    return NextResponse.json({ task: serializeTask(t) })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('PATCH /api/tasks/[id]', e)
    return NextResponse.json({ error: 'خطا در به‌روزرسانی کار' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const { id } = await ctx.params
    const existing = await db.task.findFirst({ where: { id, userId: user.id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'کار یافت نشد' }, { status: 404 })
    await db.task.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('DELETE /api/tasks/[id]', e)
    return NextResponse.json({ error: 'خطا در حذف کار' }, { status: 500 })
  }
}
