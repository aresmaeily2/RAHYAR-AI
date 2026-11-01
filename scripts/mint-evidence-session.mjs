// ─── رهیار AI — بوت‌استراپ محیط شواهد (نسخهٔ fail-closed — P0-6R FINAL) ──
// تغییر امنیتی نسبت به نسخهٔ قدیم (fix/corrective-mission-360):
//   ۱) هیچ رمز hardcoded وجود ندارد؛ رمز فقط از RAHYAR_EVIDENCE_PASSWORD خوانده می‌شود.
//   ۲) نبود/کوتاهی رمز → خروجی غیرصفر و توقف کامل (بدون هیچ fallback ناامن).
//   ۳) رمز هرگز روی دیسک نوشته نمی‌شود (فایل .evidence-password دیگر ساخته نمی‌شود).
//   ۴) فقط فایل توکن نشست با دسترسی 0600 نوشته می‌شود (مسیر قابل تنظیم برای آزمون).
//   ۵) هیچ مقدار حساسی در stdout/stderr چاپ نمی‌شود.
import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'
import fs from 'node:fs'

const MIN_LEN = 12

function fail(msg) {
  console.error(`mint-evidence-session: ${msg}`)
  process.exit(2)
}

// ── fail-closed: رمز فقط از env، بدون fallback ──
const PASSWORD = process.env.RAHYAR_EVIDENCE_PASSWORD
if (!PASSWORD || typeof PASSWORD !== 'string' || PASSWORD.trim().length < MIN_LEN) {
  fail(`RAHYAR_EVIDENCE_PASSWORD missing or shorter than ${MIN_LEN} chars — aborting (fail-closed)`)
}

const TOKEN_FILE = process.env.RAHYAR_TOKEN_FILE || '/home/z/my-project/.evidence-session-token'

const db = new PrismaClient()

try {
  let owner = await db.user.findFirst({ where: { role: 'owner' } })
  if (!owner) {
    const mod = await import('/home/z/my-project/src/lib/auth.ts')
    const hash = await mod.hashPassword(PASSWORD)
    owner = await db.user.create({
      data: {
        username: 'owner',
        displayName: 'مالک (شواهد)',
        role: 'owner',
        passwordHash: hash,
      },
    })
    console.log('owner created (evidence bootstrap, empty dev DB)')
  } else {
    console.log('owner reused (no duplicate)')
  }

  const token = crypto.randomBytes(32).toString('base64url')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000)
  await db.session.create({ data: { tokenHash, userId: owner.id, expiresAt } })

  fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 })
  fs.chmodSync(TOKEN_FILE, 0o600)
  console.log('session minted for owner:', owner.username, '| expires:', expiresAt.toISOString())
  console.log(`token written to ${TOKEN_FILE} (mode 0600, no password material)`)
} catch (e) {
  console.error('mint-evidence-session: operation failed cleanly —', e?.code || e?.name || 'error')
  process.exit(3)
} finally {
  await db.$disconnect()
}
