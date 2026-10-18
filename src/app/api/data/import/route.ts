import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'

interface ImportTask {
  title?: unknown
  notes?: unknown
  priority?: unknown
  status?: unknown
  tag?: unknown
  dueDate?: unknown
  dueTime?: unknown
  starred?: unknown
  repeat?: unknown
  completedAt?: unknown
  createdAt?: unknown
  subtasks?: Array<{ title?: unknown; done?: unknown }>
}

/**
 * ورود داده — JSON خروجی رهیار (یا سازگار). فقط ساخت اضافه می‌شود
 * (ادغام)، چیزی بازنویسی یا حذف نمی‌شود. سقف: ۵۰۰ کار در هر درخواست.
 */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 5, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const raw = await readJsonSafe(req)
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'فایل JSON نامعتبر است' }, { status: 400 })
    }
    const body = raw as { tasks?: ImportTask[]; memories?: Array<{ fact?: unknown; source?: unknown }> }

    let taskCount = 0
    let memoryCount = 0

    if (Array.isArray(body.tasks)) {
      for (const t of body.tasks.slice(0, 500)) {
        const title = cleanText(t.title as string, 200)
        if (!title) continue
        const priority = Number(t.priority)
        const created = await db.task.create({
          data: {
            userId: user.id,
            title,
            notes: t.notes ? cleanText(t.notes as string, 2000) : null,
            priority: [1, 2, 3].includes(priority) ? priority : 2,
            status: t.status === 'done' ? 'done' : 'todo',
            tag: t.tag ? cleanText(t.tag as string, 40) : null,
            dueDate: t.dueDate ? new Date(String(t.dueDate)) : null,
            dueTime: t.dueTime ? cleanText(t.dueTime as string, 5) : null,
            starred: t.starred === true,
            repeat: t.repeat === 'daily' || t.repeat === 'weekly' ? t.repeat : null,
            completedAt: t.completedAt ? new Date(String(t.completedAt)) : null,
            createdAt: t.createdAt ? new Date(String(t.createdAt)) : undefined,
          },
        })
        taskCount++
        if (Array.isArray(t.subtasks)) {
          for (const [i, s] of t.subtasks.slice(0, 30).entries()) {
            const st = cleanText(s.title as string, 200)
            if (!st) continue
            await db.subtask.create({ data: { taskId: created.id, title: st, done: s.done === true, order: i } })
          }
        }
      }
    }

    if (Array.isArray(body.memories)) {
      for (const m of body.memories.slice(0, 200)) {
        const fact = cleanText(m.fact as string, 300)
        if (!fact) continue
        await db.memory.create({
          data: { userId: user.id, fact, source: m.source === 'manual' ? 'manual' : 'import' },
        })
        memoryCount++
      }
    }

    return NextResponse.json({ ok: true, tasks: taskCount, memories: memoryCount })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/data/import', e)
    return NextResponse.json({ error: 'ورود داده ناموفق بود' }, { status: 500 })
  }
}
