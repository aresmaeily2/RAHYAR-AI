// ─── پاک‌سازی داده‌های تست Red Team — بازگرداندن سامانه به حالت راه‌اندازی ──
// حساب owner به SETUP_REQUIRED برمی‌گردد تا مالک واقعی خودش رمز نهایی را
// از طریق جادوگر راه‌اندازی تعیین کند. همه نشست‌ها و ردیف‌های آزمون حذف می‌شوند.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const [sessions, tasks, chats, memories, settings, reminders] = await Promise.all([
  db.session.deleteMany({}),
  db.task.deleteMany({}),
  db.chatMessage.deleteMany({}),
  db.memory.deleteMany({}),
  db.setting.deleteMany({}),
  db.reminder.deleteMany({}),
])

const users = await db.user.updateMany({
  data: { passwordHash: 'SETUP_REQUIRED', displayName: 'علیرضا' },
})

console.log(
  JSON.stringify(
    {
      cleaned: {
        sessions: sessions.count,
        tasks: tasks.count,
        chatMessages: chats.count,
        memories: memories.count,
        settings: settings.count,
        reminders: reminders.count,
      },
      ownerReset: users.count,
    },
    null,
    2,
  ),
)
await db.$disconnect()
