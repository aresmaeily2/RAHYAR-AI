// ─── پاک‌سازی جراحی داده نمایشی Redesign — بدون آسیب به حساب واقعی ──
// برخلاف cleanup-audit-session قدیمی (که کاربر SETUP_REQUIRED را حذف می‌کرد)،
// این اسکریپت:
//   ۱) فقط IDهای نمایشی demo-seed-ids.json را حذف می‌کند
//   ۲) فقط «نشست آزمایشی» audit (با توکن مشخص) را می‌بندد
//   ۳) کاربر مالک و نشست واقعی او را دست نمی‌زند
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { readFileSync, existsSync } from 'fs'

const db = new PrismaClient()
const AUDIT_TOKEN = 'lWNNErf30wFC61zxJtXkwOrGukTvRnU50S9zJlrwf5I'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const idsFile = '/home/z/my-project/artifacts/rahyar-audit/demo-seed-ids.json'
if (!existsSync(idsFile)) {
  console.log(JSON.stringify({ ok: false, reason: 'demo-seed-ids not found — nothing to clean' }))
  process.exit(0)
}
const ids = JSON.parse(readFileSync(idsFile, 'utf8')) as {
  taskIds: string[]
  reminderIds: string[]
  memoryIds: string[]
}

// حذف یادآورها (FK به کار) → کارها → حافظه‌ها
const r1 = await db.reminder.deleteMany({ where: { id: { in: ids.reminderIds } } })
const r2 = await db.task.deleteMany({ where: { id: { in: ids.taskIds } } })
const r3 = await db.memory.deleteMany({ where: { id: { in: ids.memoryIds } } })

// بستن نشست آزمایشی audit — فقط همین توکن
const r4 = await db.session.deleteMany({ where: { tokenHash: hashToken(AUDIT_TOKEN) } })

// بررسی بقای مالک — باید دست‌نخورده باشد
const owner = await db.user.findUnique({ where: { username: 'owner' } })
const rest = {
  tasks: await db.task.count(),
  reminders: await db.reminder.count(),
  memories: await db.memory.count(),
  sessions: await db.session.count(),
}
console.log(
  JSON.stringify({
    ok: true,
    deleted: { reminders: r1.count, tasks: r2.count, memories: r3.count, auditSessions: r4.count },
    ownerIntact: !!owner && owner.passwordHash !== 'SETUP_REQUIRED',
    remaining: rest,
  }),
)
await db.$disconnect()
