// V1-P2 — ساخت کاربر دوم آزمون (testuser2) برای سناریوهای مالکیت (P6/P8)
// رمز از آرگومان env — هرگز در لاگ چاپ نمی‌شود
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()
const pw = process.env.UP2 || ''
if (pw.length < 8) {
  console.error('UP2 missing/short')
  process.exit(1)
}
const existing = await db.user.findUnique({ where: { username: 'testuser2' } })
if (existing) {
  console.log(JSON.stringify({ ok: true, already: true }))
  process.exit(0)
}
const salt = crypto.randomBytes(16)
const hash = crypto.scryptSync(pw, salt, 64, { N: 16384 })
await db.user.create({
  data: {
    username: 'testuser2',
    displayName: 'کاربر آزمون دوم',
    passwordHash: `s1:${salt.toString('hex')}:${hash.toString('hex')}`,
  },
})
console.log(JSON.stringify({ ok: true, created: 'testuser2' }))
await db.$disconnect()
