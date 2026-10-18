// ─── دیتای نمایشی برای اسکرین‌شات — با شناسه‌ها برای پاک‌سازی کامل ──
// همه رکوردها ثبت می‌شوند در artifacts/rahyar-audit/demo-seed-ids.json
// پاک‌سازی: scripts/cleanup-audit-session.ts (همه را حذف می‌کند)
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const db = new PrismaClient()
const owner = await db.user.findUnique({ where: { username: 'owner' } })
if (!owner) {
  console.error('owner user not found')
  process.exit(1)
}
const uid = owner.id

const today = new Date()
const at = (dayOffset: number, h: number, m = 0) => {
  const d = new Date(today)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d
}

const tasksData = [
  { title: 'بازبینی گزارش فروش هفته', notes: 'تمرکز روی اعداد سه‌ماهه سوم', priority: 1, status: 'todo', tag: 'کار', dueDate: at(0, 18), dueTime: '18:00', starred: true },
  { title: 'تماس با تیم پشتیبانی', notes: null, priority: 2, status: 'todo', tag: 'کار', dueDate: at(0, 21), dueTime: '21:00', starred: false },
  { title: 'خرید هفتگی', notes: 'میوه، نان، لبنیات', priority: 3, status: 'todo', tag: 'شخصی', dueDate: at(1, 11), dueTime: '11:00', starred: false },
  { title: 'تمرین ورزشی', notes: '۳۰ دقیقه دویدن', priority: 2, status: 'todo', tag: 'سلامت', dueDate: at(1, 7), dueTime: '07:00', starred: false, repeat: 'daily' },
  { title: 'پرداخت قبض اینترنت', notes: null, priority: 1, status: 'todo', tag: 'مالی', dueDate: at(2, 12), dueTime: '12:00', starred: false },
  { title: 'خواندن ۲۰ صفحه کتاب', notes: 'کتاب عادت‌های اتمی', priority: 3, status: 'done', tag: 'رشد', dueDate: at(-1, 22), dueTime: '22:00', starred: false, completedAt: at(-1, 21, 40) },
  { title: 'جلسه برنامه‌ریزی پروژه', notes: null, priority: 2, status: 'done', tag: 'کار', dueDate: at(-1, 10), dueTime: '10:00', starred: false, completedAt: at(-1, 10, 45) },
]

const remindersData = [
  { message: 'وقت جلسه با تیم محصول', remindAt: at(0, 17, 30) },
  { message: 'داروی سرماخوردگی', remindAt: at(0, 22) },
  { message: 'تمدید اشتراک دامنه', remindAt: at(3, 9) },
]

const memoriesData = [
  { fact: 'زبان ترجیحی من فارسی است', source: 'manual' },
  { fact: 'ساعت کاری من ۹ تا ۱۷ است', source: 'chat' },
  { fact: 'سرمایه‌گذاری بلندمدت را به نوسان‌گیری ترجیح می‌دهم', source: 'chat' },
]

const taskIds: string[] = []
for (const t of tasksData) {
  const r = await db.task.create({ data: { ...t, userId: uid } })
  taskIds.push(r.id)
}
const reminderIds: string[] = []
for (const r of remindersData) {
  const row = await db.reminder.create({ data: { ...r, userId: uid } })
  reminderIds.push(row.id)
}
const memoryIds: string[] = []
for (const m of memoriesData) {
  const row = await db.memory.create({ data: { ...m, userId: uid } })
  memoryIds.push(row.id)
}

// یک یادآور متصل به کار
await db.reminder.create({ data: { userId: uid, taskId: taskIds[0], message: 'یادآور بازبینی گزارش', remindAt: at(0, 17) } })

writeFileSync('/home/z/my-project/artifacts/rahyar-audit/demo-seed-ids.json', JSON.stringify({ taskIds, reminderIds, memoryIds }, null, 1))
console.log(JSON.stringify({ ok: true, tasks: taskIds.length, reminders: reminderIds.length + 1, memories: memoryIds.length }))
await db.$disconnect()
