import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'

/** GU2-DATA1: تاریخ نامعتبر قبلاً Invalid Date به Prisma می‌رفت → ۵۰۰ و ورود نیمه‌کاره */
function parseDateOrNull(v: unknown): Date | null | 'invalid' {
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string' && typeof v !== 'number') return 'invalid'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return 'invalid'
  const y = d.getUTCFullYear()
  return y < 1900 || y > 2200 ? 'invalid' : d
}

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

    // مرحله ۱: اعتبارسنجی کامل پیش از هر نوشتن (همه یا هیچ)
    const taskRows: Array<{ data: Prisma.TaskUncheckedCreateInput; subtasks: Array<{ title: string; done: boolean; order: number }> }> = []
    if (Array.isArray(body.tasks)) {
      for (const t of body.tasks.slice(0, 500)) {
        if (!t || typeof t !== 'object') continue
        const title = cleanText(t.title, 200)
        if (!title) continue
        const dueDate = parseDateOrNull(t.dueDate)
        const completedAt = parseDateOrNull(t.completedAt)
        const createdAt = parseDateOrNull(t.createdAt)
        if (dueDate === 'invalid' || completedAt === 'invalid' || createdAt === 'invalid') {
          return NextResponse.json({ error: 'فایل ورودی شامل تاریخ نامعتبر است' }, { status: 400 })
        }
        const priority = Number(t.priority)
        const dueTime = typeof t.dueTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t.dueTime) ? t.dueTime : null
        const subtasks: Array<{ title: string; done: boolean; order: number }> = []
        if (Array.isArray(t.subtasks)) {
          for (const [i, sub] of t.subtasks.slice(0, 30).entries()) {
            if (!sub || typeof sub !== 'object') continue
            const st = cleanText(sub.title, 200)
            if (st) subtasks.push({ title: st, done: sub.done === true, order: i })
          }
        }
        taskRows.push({
          data: {
            userId: user.id,
            title,
            notes: t.notes ? cleanText(t.notes, 2000) || null : null,
            priority: [1, 2, 3].includes(priority) ? priority : 2,
            status: t.status === 'done' ? 'done' : 'todo',
            tag: t.tag ? cleanText(t.tag, 40) || null : null,
            dueDate,
            dueTime,
            starred: t.starred === true,
            repeat: t.repeat === 'daily' || t.repeat === 'weekly' ? t.repeat : null,
            completedAt,
            createdAt: createdAt ?? undefined,
          },
          subtasks,
        })
      }
    }
    const memoryRows: Prisma.MemoryCreateManyInput[] = []
    if (Array.isArray(body.memories)) {
      for (const m of body.memories.slice(0, 200)) {
        if (!m || typeof m !== 'object') continue
        const fact = cleanText(m.fact, 300)
        if (fact) memoryRows.push({ userId: user.id, fact, source: m.source === 'manual' ? 'manual' : 'import' })
      }
    }

    // مرحله ۲: نوشتن اتمیک — شکست وسط کار هیچ داده نیمه‌کاره‌ای باقی نمی‌گذارد
    await db.$transaction(async (tx) => {
      for (const row of taskRows) {
        const created = await tx.task.create({ data: row.data })
        if (row.subtasks.length) {
          await tx.subtask.createMany({ data: row.subtasks.map((st) => ({ ...st, taskId: created.id })) })
        }
      }
      if (memoryRows.length) await tx.memory.createMany({ data: memoryRows })
    }, { timeout: 20_000 })
    const taskCount = taskRows.length
    const memoryCount = memoryRows.length

    return NextResponse.json({ ok: true, tasks: taskCount, memories: memoryCount })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/data/import', e)
    return NextResponse.json({ error: 'ورود داده ناموفق بود' }, { status: 500 })
  }
}
