// ساخت حساب مالک با رمز قوی (رفع بن‌بست راه‌اندازی روی DB خالی)
// رمز در artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt ذخیره می‌شود
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()
const SCRYPT = { N: 16384 }

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT)
  return `s1:${salt.toString('hex')}:${hash.toString('hex')}`
}

const existing = await db.user.findUnique({ where: { username: 'owner' } })
if (existing && existing.passwordHash !== 'SETUP_REQUIRED') {
  console.log(JSON.stringify({ ok: true, already: true }))
  process.exit(0)
}
if (existing) {
  await db.user.delete({ where: { id: existing.id } })
}

const pwFile = '/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt'
import { readFileSync, writeFileSync } from 'fs'
let pw = ''
try {
  pw = readFileSync(pwFile, 'utf-8').trim()
} catch {}
if (!pw || pw.length < 10) {
  pw = (crypto.randomBytes(18).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + 'Aa9!').slice(0, 16)
}
await db.user.create({
  data: { username: 'owner', displayName: 'مالک', passwordHash: hashPassword(pw) },
})
writeFileSync(pwFile, pw, { mode: 0o600 })
console.log(JSON.stringify({ ok: true, created: true, passwordSavedTo: pwFile }))
await db.$disconnect()
