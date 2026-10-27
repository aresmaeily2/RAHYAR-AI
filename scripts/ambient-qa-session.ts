// ─── نشست QA موقت برای لایه محیطی — کاربر دورریز مستقل ─────────
// کاربر ambient-qa می‌سازد (مالک دست‌نخورده) + دیتای نمایشی حداقلی
// + نشست ۳ ساعته. پاک‌سازی: scripts/ambient-qa-cleanup.ts
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const today = new Date()
const at = (dayOffset: number, h: number, m = 0) => {
  const d = new Date(today)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d
}

const user = await db.user.upsert({
  where: { username: 'ambient-qa' },
  update: {},
  create: { username: 'ambient-qa', displayName: 'سارا', passwordHash: 'SETUP_REQUIRED' },
})
const uid = user.id

// دیتای نمایشی — فقط برای همین کاربر
await db.task.deleteMany({ where: { userId: uid } })
await db.task.createMany({
  data: [
    { userId: uid, title: 'بازبینی گزارش فروش هفته', priority: 1, status: 'todo', tag: 'کار', dueDate: at(0, 18), dueTime: '18:00', starred: true },
    { userId: uid, title: 'تماس با تیم پشتیبانی', priority: 2, status: 'todo', tag: 'کار', dueDate: at(0, 21), dueTime: '21:00' },
    { userId: uid, title: 'خرید هفتگی', notes: 'میوه، نان، لبنیات', priority: 3, status: 'todo', tag: 'شخصی', dueDate: at(1, 11), dueTime: '11:00' },
    { userId: uid, title: 'تمرین ورزشی', priority: 2, status: 'todo', tag: 'سلامت', dueDate: at(1, 7), dueTime: '07:00', repeat: 'daily' },
    { userId: uid, title: 'خواندن ۲۰ صفحه کتاب', priority: 3, status: 'done', tag: 'رشد', dueDate: at(-1, 22), dueTime: '22:00', completedAt: at(-1, 21, 40) },
  ],
})
await db.reminder.deleteMany({ where: { userId: uid } })
await db.reminder.create({ data: { userId: uid, message: 'وقت جلسه با تیم محصول', remindAt: at(0, 17, 30) } })
await db.memory.deleteMany({ where: { userId: uid } })
await db.memory.create({ data: { userId: uid, fact: 'زبان ترجیحی من فارسی است', source: 'manual' } })

const token = crypto.randomBytes(32).toString('base64url')
const expiresAt = new Date(Date.now() + 3 * 3600 * 1000)
await db.session.create({ data: { tokenHash: hashToken(token), userId: uid, expiresAt } })

console.log(JSON.stringify({ ok: true, token, userId: uid }))
await db.$disconnect()
