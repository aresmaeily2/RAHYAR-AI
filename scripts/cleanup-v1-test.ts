// ─── پاک‌سازی حساب آزمایشی نسخه ۱٫۰ — بازگرداندن وضعیت راه‌اندازی اولیه ──
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const users = await db.user.findMany({ select: { id: true, username: true } })
if (users.length === 1 && users[0].username === 'owner') {
  await db.user.delete({ where: { id: users[0].id } }) // Cascade همه‌چیز
  console.log('test owner deleted — fresh-setup state restored')
} else {
  console.log('skip — users:', users.map((u) => u.username).join(','))
}
await db.$disconnect()
