// ─── پاک‌سازی کامل پس از اسکرین‌شات ─────────────────────────
// حذف: دیتای نمایشی (طبق demo-seed-ids.json)، همه نشست‌های آزمایشی،
// و اگر کاربر owner فقط حاصل اسکریپت ما باشد (SETUP_REQUIRED)، خود کاربر
// نیز حذف می‌شود تا مالک واقعی «راه‌اندازی اولیه» را از صفر انجام دهد.
import { PrismaClient } from '@prisma/client'
import { readFileSync, unlinkSync } from 'fs'

const db = new PrismaClient()
const ids = JSON.parse(readFileSync('/home/z/my-project/artifacts/rahyar-audit/demo-seed-ids.json', 'utf-8'))

let removedTasks = 0, removedReminders = 0, removedMemories = 0, removedSessions = 0, removedUser = false

// پاک‌سازی دیتای نمایشی: همه رکوردهای owner (نه فقط seed — چون DB قبل از ما خالی بود)
const owner = await db.user.findUnique({ where: { username: 'owner' }, select: { id: true, passwordHash: true } })
if (owner) {
  removedTasks = (await db.task.deleteMany({ where: { userId: owner.id } })).count
  removedReminders = (await db.reminder.deleteMany({ where: { userId: owner.id } })).count
  removedMemories = (await db.memory.deleteMany({ where: { userId: owner.id } })).count
  await db.chatMessage.deleteMany({ where: { userId: owner.id } })
  await db.setting.deleteMany({ where: { userId: owner.id } })
  removedSessions = (await db.session.deleteMany({ where: { userId: owner.id } })).count
  // اگر حساب در حالت SETUP_REQUIRED است، یعنی ما ساخته‌ایم → حذف کامل تا مالک خودش بسازد
  if (owner.passwordHash === 'SETUP_REQUIRED') {
    await db.user.delete({ where: { id: owner.id } })
    removedUser = true
  }
}

try { unlinkSync('/home/z/my-project/artifacts/rahyar-audit/demo-seed-ids.json') } catch {}
console.log(JSON.stringify({ ok: true, removedTasks, removedReminders, removedMemories, removedSessions, removedUser }))
await db.$disconnect()
