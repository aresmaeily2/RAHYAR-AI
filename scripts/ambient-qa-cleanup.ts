// ─── پاک‌سازی کامل نشست QA لایه محیطی ──────────────────────────
// کاربر ambient-qa با همه دیتاها و نشست‌ها حذف می‌شود (مالک سالم)
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const u = await db.user.findUnique({ where: { username: 'ambient-qa' } })
if (!u) {
  console.log(JSON.stringify({ ok: true, note: 'already clean' }))
} else {
  await db.user.delete({ where: { id: u.id } }) // Cascade همه چیز
  console.log(JSON.stringify({ ok: true, removed: u.id }))
}
await db.$disconnect()
