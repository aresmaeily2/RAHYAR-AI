import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'

/**
 * RT-3 (اصلاح Red Team): کلید Endpoint مدل (ai_endpoint_key) یک راز است و
 * نباید در فایل خروجی عمومیِ داده plaintext بیاید — کاربر ممکن است فایل را
 * برای اشتراک‌گذاری/پشتیبان ارسال کند. کلید از خروجی حذف می‌شود.
 */
const SECRET_SETTING_KEYS = new Set(['ai_endpoint_key'])

/**
 * خروجی داده کاربر — JSON خوانا از همه محتوای خودش:
 * کارها/زیرکارها، یادآورها، حافظه‌ها، گفتگو، مالی، تنظیمات.
 * هیچ داده‌ای از کاربران دیگر هرگز در پاسخ نیست.
 */
export async function GET(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const [tasks, reminders, memories, chat, accounts, transactions, settings] = await Promise.all([
      db.task.findMany({ where: { userId: user.id }, include: { subtasks: true }, orderBy: { createdAt: 'asc' } }),
      db.reminder.findMany({ where: { userId: user.id }, orderBy: { remindAt: 'asc' } }),
      db.memory.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }),
      db.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }),
      db.financeAccount.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } }),
      db.financeTransaction.findMany({ where: { userId: user.id }, orderBy: { occurredAt: 'asc' } }),
      db.setting.findMany({ where: { userId: user.id } }),
    ])

    const payload = {
      app: 'Rahyar AI',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: { displayName: user.displayName },
      tasks,
      reminders,
      memories,
      chat,
      finance: { accounts, transactions },
      settings: settings.filter((s) => !SECRET_SETTING_KEYS.has(s.key)),
    }

    const stamp = new Date().toISOString().slice(0, 10)
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="rahyar-data-${stamp}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/data/export', e)
    return NextResponse.json({ error: 'خطا در ساخت خروجی' }, { status: 500 })
  }
}
