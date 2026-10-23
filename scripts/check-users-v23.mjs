import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
const users = await db.user.findMany({ select: { id: true, username: true, role: true } })
console.log('USERS:', JSON.stringify(users.map(u => ({ id: u.id.slice(0,8)+'…', username: u.username, role: u.role }))))
const chatCount = await db.chatMessage.count().catch(() => -1)
console.log('chatMessages:', chatCount)
await db.$disconnect()
