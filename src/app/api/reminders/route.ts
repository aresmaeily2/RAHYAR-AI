import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const rows = await db.reminder.findMany({
      where: { fired: false, userId: user.id },
      orderBy: { remindAt: 'asc' },
      take: 50,
    })
    return NextResponse.json({
      reminders: rows.map((r) => ({
        id: r.id,
        taskId: r.taskId,
        message: r.message,
        remindAt: r.remindAt.toISOString(),
        fired: r.fired,
      })),
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/reminders', e)
    return NextResponse.json({ error: 'خطا در دریافت یادآوری‌ها' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 30, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = await readJsonSafe(req) as { message?: unknown; remindAt?: unknown; taskId?: unknown } | null
    const message = cleanText(body?.message, 300)
    const remindAt = body?.remindAt ? new Date(body.remindAt as string) : null
    if (!message || !remindAt || Number.isNaN(remindAt.getTime())) {
      return NextResponse.json({ error: 'پیام و زمان معتبر الزامی است' }, { status: 400 })
    }
    if (remindAt.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: 'زمان یادآوری نمی‌تواند در گذشته باشد' }, { status: 400 })
    }
    if (remindAt.getTime() > Date.now() + 366 * 24 * 3600 * 1000) {
      return NextResponse.json({ error: 'زمان یادآوری خیلی دور است' }, { status: 400 })
    }
    const activeCount = await db.reminder.count({ where: { fired: false, userId: user.id } })
    if (activeCount >= 50) {
      return NextResponse.json({ error: 'یادآوری‌های فعال به سقف رسیده‌اند' }, { status: 400 })
    }
    const taskId = typeof body?.taskId === 'string' && body.taskId ? body.taskId : null
    if (taskId) {
      const exists = await db.task.findFirst({ where: { id: taskId, userId: user.id }, select: { id: true } })
      if (!exists) return NextResponse.json({ error: 'کار مرتبط یافت نشد' }, { status: 400 })
    }
    const r = await db.reminder.create({
      data: {
        userId: user.id,
        message,
        remindAt,
        taskId,
      },
    })
    return NextResponse.json(
      {
        reminder: {
          id: r.id,
          taskId: r.taskId,
          message: r.message,
          remindAt: r.remindAt.toISOString(),
          fired: r.fired,
        },
      },
      { status: 201 },
    )
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/reminders', e)
    return NextResponse.json({ error: 'خطا در ثبت یادآوری' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const body = await readJsonSafe(req) as { id?: unknown } | null
    const user = await requireUser(req)
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 })
    // رفع A6: شناسه ناموجود باید ۴۰۴ بدهد نه خطای داخلی ۵۰۰ + جداسازی کاربر
    const exists = await db.reminder.findFirst({ where: { id, userId: user.id }, select: { id: true } })
    if (!exists) return NextResponse.json({ error: 'یادآوری یافت نشد' }, { status: 404 })
    await db.reminder.update({ where: { id }, data: { fired: true } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('PATCH /api/reminders', e)
    return NextResponse.json({ error: 'خطا در به‌روزرسانی یادآوری' }, { status: 500 })
  }
}
