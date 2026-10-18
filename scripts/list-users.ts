import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const users = await db.user.findMany({ select: { id: true, username: true, displayName: true, createdAt: true } })
console.log(JSON.stringify(users, null, 1))
await db.$disconnect()
