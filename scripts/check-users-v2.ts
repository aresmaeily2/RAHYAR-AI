import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const users = await db.user.findMany({ select: { id: true, username: true, role: true, disabled: true } })
console.log(JSON.stringify(users, null, 1))
const settings = await db.setting.findMany({ where: { key: { in: ['ai_engine'] } } })
console.log('ai_engine settings:', JSON.stringify(settings))
await db.$disconnect()
