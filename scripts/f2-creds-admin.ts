// F2-CREDS: به خواست مالک — حساب‌های آزمایشی:
//   مالک:  admin / admin  (role OWNER)
//   کاربر: user  / admin  (role USER)
// یادداشت صادقانه: در یک استقرار واحد، username یکتاست؛ دو حساب با «admin/admin»
// هم‌زمان ممکن نیست — حساب مالک admin/admin و حساب کاربر user/admin ساخته می‌شود.
// همهٔ نشست‌های قبلی باطل می‌شوند. mustChangePassword=false (مالک گفته بعداً عوض می‌کند).
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384 })
  return `s1:${salt.toString('hex')}:${hash.toString('hex')}`
}
function verify(pw: string, stored: string): boolean {
  const [, sh, hh] = stored.split(':')
  return crypto.scryptSync(pw, Buffer.from(sh, 'hex'), 64, { N: 16384 }).toString('hex') === hh
}

const accounts = [
  { username: 'admin', displayName: 'مالک (admin)', role: 'OWNER' as const, pw: 'admin' },
  { username: 'user', displayName: 'کاربر آزمایشی (user)', role: 'USER' as const, pw: 'admin' },
]

for (const a of accounts) {
  const h = hashPassword(a.pw)
  await db.user.upsert({
    where: { username: a.username },
    update: { passwordHash: h, role: a.role, displayName: a.displayName, disabled: false, mustChangePassword: false },
    create: { username: a.username, displayName: a.displayName, passwordHash: h, role: a.role, disabled: false, mustChangePassword: false },
  })
  const chk = await db.user.findUnique({ where: { username: a.username } })
  const ok = verify(a.pw, chk!.passwordHash)
  console.log(`${a.username}: role=${chk!.role} verify=${ok ? 'PASS' : 'FAIL'}`)
}

const del = await db.session.deleteMany({})
console.log('sessions revoked:', del.count)
await db.$disconnect()
