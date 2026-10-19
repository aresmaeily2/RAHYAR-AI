// بازرسی فقط-خواندنی دیتابیس برای پیش‌نمایش (بدون چاپ هیچ داده حساسی)
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const users = await db.user.findMany({ select: { id: true, username: true, displayName: true } })
console.log('users:', JSON.stringify(users))
for (const u of users) {
  const tasks = await db.task.count({ where: { userId: u.id } })
  const tx = await db.transaction.count({ where: { userId: u.id } }).catch(() => 'n/a')
  const chats = await db.chatMessage.count({ where: { userId: u.id } }).catch(() => 'n/a')
  const sessions = await db.session.count({ where: { userId: u.id } })
  console.log(`- ${u.username}: tasks=${tasks} tx=${tx} chats=${chats} sessions=${sessions}`)
}
const models = Object.keys(db).filter((k) => !k.startsWith('_') && !k.startsWith('$'))
console.log('models:', models.join(', '))
await db.$disconnect()
