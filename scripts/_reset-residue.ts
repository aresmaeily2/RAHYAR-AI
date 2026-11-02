// post-E2E residue cleanup + fresh numbers snapshot for the report
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const settings = await db.setting.findMany()
console.log('settings before:', JSON.stringify(settings))
const del = await db.setting.deleteMany({ where: { key: { in: ['calendar_mode', 'calendarMode', 'lang', 'language'] } } })
console.log('deleted residue:', del.count)
console.log('users:', JSON.stringify(await db.user.findMany({ select: { username: true, role: true } })))
console.log('tasks:', await db.task.count(), '| tx:', await db.financeTransaction.count(), '| reminders:', await db.reminder.count())
await db.$disconnect()
