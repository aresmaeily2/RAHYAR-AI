// quick DB state check (no secrets printed)
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const users = await db.user.findMany({ select: { username: true, role: true } })
console.log('users:', JSON.stringify(users))
console.log('tasks:', await db.task.count())
console.log('tx:', await db.financeTransaction.count())
console.log('chat:', await db.chatMessage.count())
// calendar_mode residue check (any settings-like table)
const tables = await db.$queryRawUnsafe<{ name: string }[]>(`SELECT name FROM sqlite_master WHERE type='table'`)
console.log('tables:', tables.map(t => t.name).join(','))
for (const t of tables) {
  const cols = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info(${t.name})`)
  if (cols.some(c => c.name === 'key' || c.name === 'calendarMode' || c.name === 'calendar_mode')) {
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM ${t.name} LIMIT 20`)
    console.log(`table ${t.name}:`, JSON.stringify(rows).slice(0, 400))
  }
}
await db.$disconnect()
