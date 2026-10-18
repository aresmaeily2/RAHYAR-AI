// ─── مینت نشست زنده برای آزمون — توکن در فایل temp (نه stdout) ───
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()
const u = await db.user.findUnique({ where: { username: 'owner' } })
if (!u) throw new Error('no owner')
const token = crypto.randomBytes(32).toString('base64url')
await db.session.create({
  data: { tokenHash: crypto.createHash('sha256').update(token).digest('hex'), userId: u.id, expiresAt: new Date(Date.now() + 30 * 60_000) },
})
await Bun.write('/tmp/rahyar-test-token.txt', token)
console.log('minted ok, token length=' + token.length)
await db.$disconnect()
