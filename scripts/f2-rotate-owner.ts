// §2 security: rotate exposed owner password + revoke ALL sessions/tokens.
// Password is random, never printed, stored 0600 in artifacts for the media pipeline.
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { writeFileSync, chmodSync } from 'fs'

const db = new PrismaClient()
const owner = await db.user.findUnique({ where: { username: 'owner' } })
if (!owner) { console.error('no owner'); process.exit(2) }

const pw = 'Rr' + crypto.randomBytes(12).toString('base64url').replace(/[-_]/g, 'x') + '!9'
const salt = crypto.randomBytes(16)
const hash = crypto.scryptSync(pw, salt, 64, { N: 16384 })

await db.user.update({
  where: { id: owner.id },
  data: { passwordHash: `s1:${salt.toString('hex')}:${hash.toString('hex')}` },
})
const del = await db.session.deleteMany({}) // ابطال همهٔ توکن‌های فعال (نشست‌های قبلی)
console.log('owner password ROTATED (not printed); sessions revoked:', del.count)

writeFileSync('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt', pw, { mode: 0o600 })
chmodSync('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt', 0o600)
// verify the new hash validates, without printing it
const chk = await db.user.findUnique({ where: { username: 'owner' } })
const [, sh, hh] = (chk!.passwordHash as string).split(':')
const ok = crypto.scryptSync(pw, Buffer.from(sh, 'hex'), 64, { N: 16384 }).toString('hex') === hh
console.log('rotation verified:', ok)
await db.$disconnect()
