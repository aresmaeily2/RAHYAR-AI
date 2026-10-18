import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAllTasks, resolveDueDate, bootstrapTasks, serializeTask } from '@/lib/server-tasks'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { logAction } from '@/lib/assistant/action-log'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    // M7: bootstrap (seed + respawn) مسابقه‌امن شد — اجراهای همزمان ادغام و
    // حداکثر هر ۶۰ ثانیه اجرا می‌شود. lazy bootstrap در GET می‌ماند ولی
    // race ندارد؛ کنترل صریح: POST /api/tasks/bootstrap
    await bootstrapTasks(user.id)
    const tasks = await getAllTasks(user.id)
    return NextResponse.json({ tasks })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/tasks', e)
    return NextResponse.json({ error: 'خطا در دریافت کارها' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = await readJsonSafe(req) as { title?: unknown; priority?: unknown; dueTime?: unknown; repeat?: unknown; notes?: unknown; tag?: unknown; dueDate?: unknown; starred?: unknown; clientKey?: unknown } | null
    const title = cleanText(body?.title, 200)
    if (!title) {
      return NextResponse.json({ error: 'عنوان کار الزامی است' }, { status: 400 })
    }
    const priority = [1, 2, 3].includes(body?.priority as number) ? (body?.priority as number) : 2
    const dueTime =
      typeof body?.dueTime === 'string' && TIME_RE.test(body.dueTime) ? body.dueTime : null
    const repeat = body?.repeat === 'daily' || body?.repeat === 'weekly' ? body.repeat : null
    const t = await db.task.create({
      data: {
        userId: user.id,
        title,
        notes: typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null,
        priority,
        tag: typeof body?.tag === 'string' && body.tag.trim() ? body.tag.trim().slice(0, 40) : null,
        dueDate: resolveDueDate(typeof body?.dueDate === 'string' ? body.dueDate : null),
        dueTime,
        starred: Boolean(body?.starred),
        repeat,
      },
      include: { subtasks: true },
    })
    // idempotency: کلید کلاینت → دفتر اقدامات (اجرای تکراری retry خنثی)
    const clientKey = cleanText(body?.clientKey, 120) || null
    if (clientKey) {
      const r = await logAction({ userId: user.id, actionType: 'add_task', status: 'success', targetType: 'task', targetId: t.id, idempotencyKey: clientKey })
      return NextResponse.json({ task: serializeTask(t), duplicate: r.duplicate }, { status: r.duplicate ? 200 : 201 })
    }
    return NextResponse.json({ task: serializeTask(t) }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/tasks', e)
    return NextResponse.json({ error: 'خطا در ایجاد کار' }, { status: 500 })
  }
}
