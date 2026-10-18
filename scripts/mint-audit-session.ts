// ─── نشست موقت آزمایشی برای اسکرین‌شات منوها ─────────────────
// حساب مالک در حالت SETUP_REQUIRED ساخته می‌شود (اگر نباشد) — یعنی
// رمز واقعی همچنان توسط مالک در «راه‌اندازی اولیه» تعیین می‌شود.
// این اسکریپت فقط توکن نشست چاپ می‌کند تا مرورگر آزمایشی با کوکی وارد شود.
// پاک‌سازی نشست: scripts/cleanup-audit-session.ts
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()
const SETUP_SENTINEL = 'SETUP_REQUIRED'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const user = await db.user.upsert({
  where: { username: 'owner' },
  update: {}, // اگر هست، دست نمی‌زنیم
  create: { username: 'owner', displayName: 'مالک', passwordHash: SETUP_SENTINEL },
})

const token = crypto.randomBytes(32).toString('base64url')
const expiresAt = new Date(Date.now() + 2 * 3600 * 1000) // ۲ ساعت
await db.session.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt } })

console.log(JSON.stringify({ ok: true, token, userId: user.id }))
await db.$disconnect()
