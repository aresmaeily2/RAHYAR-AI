import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serializeTask } from '@/lib/server-tasks'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'

const MAX_SUBTASKS_PER_TASK = 30

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = await readJsonSafe(req) as { title?: unknown; taskId?: unknown } | null
    const title = cleanText(body?.title, 200)
    const taskId = typeof body?.taskId === 'string' ? body.taskId : ''
    if (!title || !taskId) {
      return NextResponse.json({ error: 'عنوان زیرکار و شناسه کار الزامی است' }, { status: 400 })
    }
    // جداسازی داده: زیرکار فقط برای کارِ متعلق به کاربر نشست
    const task = await db.task.findFirst({ where: { id: taskId, userId: user.id }, include: { subtasks: true } })
    if (!task) return NextResponse.json({ error: 'کار یافت نشد' }, { status: 404 })
    if (task.subtasks.length >= MAX_SUBTASKS_PER_TASK) {
      return NextResponse.json({ error: 'زیرکارها به سقف مجاز رسیده‌اند' }, { status: 400 })
    }
    await db.subtask.create({ data: { taskId, title, order: task.subtasks.length } })
    const updated = await db.task.findUnique({ where: { id: taskId }, include: { subtasks: true } })
    return NextResponse.json({ task: updated ? serializeTask(updated) : null }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/subtasks', e)
    return NextResponse.json({ error: 'خطا در ایجاد زیرکار' }, { status: 500 })
  }
}
