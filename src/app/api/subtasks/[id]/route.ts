import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serializeTask } from '@/lib/server-tasks'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const { id } = await ctx.params
    // مهار بدنه (رفع A3: قبلاً req.json() خام بدون سقف بود)
    const body = (await readJsonSafe(req)) as { done?: unknown } | null
    if (!body) return NextResponse.json({ error: 'بدنه درخواست نامعتبر است' }, { status: 400 })
    const user = await requireUser(req)
    // جداسازی داده: زیرکار باید به کارِ همین کاربر تعلق داشته باشد
    const sub = await db.subtask.findUnique({ where: { id }, include: { task: { select: { userId: true } } } })
    if (!sub || sub.task.userId !== user.id) {
      return NextResponse.json({ error: 'زیرکار یافت نشد' }, { status: 404 })
    }
    await db.subtask.update({ where: { id }, data: { done: Boolean(body?.done) } })
    const task = await db.task.findUnique({ where: { id: sub.taskId }, include: { subtasks: true } })
    if (!task) return NextResponse.json({ error: 'کار یافت نشد' }, { status: 404 })
    return NextResponse.json({ task: serializeTask(task) })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('PATCH /api/subtasks/[id]', e)
    return NextResponse.json({ error: 'خطا در به‌روزرسانی زیرکار' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const { id } = await ctx.params
    const user = await requireUser(req)
    const sub = await db.subtask.findUnique({ where: { id }, include: { task: { select: { userId: true } } } })
    if (!sub || sub.task.userId !== user.id) {
      return NextResponse.json({ error: 'زیرکار یافت نشد' }, { status: 404 })
    }
    await db.subtask.delete({ where: { id } })
    const task = await db.task.findUnique({ where: { id: sub.taskId }, include: { subtasks: true } })
    if (!task) return NextResponse.json({ error: 'کار یافت نشد' }, { status: 404 })
    return NextResponse.json({ task: serializeTask(task) })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('DELETE /api/subtasks/[id]', e)
    return NextResponse.json({ error: 'خطا در حذف زیرکار' }, { status: 500 })
  }
}
