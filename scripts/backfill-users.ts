// ─── Backfill جداسازی کاربران — اجرای یک‌بارمصرف ─────────────
// مأموریت: همه رکوردهای موجودِ پیش از احراز هویت به «کاربر مالک» تخصیص یابند.
// رمز مالک عمداً مقدار نگه‌دارنده SETUP_REQUIRED است؛ تا مالک از صفحه ورود
// «راه‌اندازی اولیه» را کامل نکند، هیچ نشستی صادر نمی‌شود.
// هیچ رمز واقعی در این اسکریپت، لاگ یا گزارش قرار نمی‌گیرد.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const SENTINEL = 'SETUP_REQUIRED'

async function main() {
  const existing = await db.user.count()
  if (existing > 0) {
    console.log(`کاربر از قبل وجود دارد (${existing}) — فقط رکوردهای بی‌صاحب تخصیص می‌شوند`)
  }

  let owner = await db.user.findUnique({ where: { username: 'owner' } })
  if (!owner) {
    owner = await db.user.create({
      data: {
        username: 'owner',
        displayName: 'علیرضا',
        passwordHash: SENTINEL,
      },
    })
    console.log('کاربر مالک ساخته شد (username=owner، رمز=نگه‌دارنده راه‌اندازی اولیه)')
  }

  const t = await db.task.updateMany({ where: { userId: null }, data: { userId: owner.id } })
  const r = await db.reminder.updateMany({ where: { userId: null }, data: { userId: owner.id } })
  const c = await db.chatMessage.updateMany({ where: { userId: null }, data: { userId: owner.id } })
  const m = await db.memory.updateMany({ where: { userId: null }, data: { userId: owner.id } })

  // Setting: ساختار جدید (id PK + userId) — رکوردهای بدون مالک به مالک می‌روند
  const orphanSettings = await db.setting.findMany({ where: { userId: null } })
  for (const s of orphanSettings) {
    await db.setting.update({ where: { id: s.id }, data: { userId: owner.id } })
  }

  console.log(
    `تخصیص: کار=${t.count} یادآور=${r.count} چت=${c.count} حافظه=${m.count} تنظیمات=${orphanSettings.length}`,
  )

  // راستی‌آزمایی: هیچ رکورد بی‌صاحب نماند
  const [tn, rn, cn, mn, sn] = await Promise.all([
    db.task.count({ where: { userId: null } }),
    db.reminder.count({ where: { userId: null } }),
    db.chatMessage.count({ where: { userId: null } }),
    db.memory.count({ where: { userId: null } }),
    db.setting.count({ where: { userId: null } }),
  ])
  const orphans = tn + rn + cn + mn + sn
  if (orphans > 0) {
    console.error(`هشدار: ${orphans} رکورد بی‌صاحب باقی ماند!`)
    process.exit(1)
  }
  console.log('راستی‌آزمایی: صفر رکورد بی‌صاحب — backfill کامل')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
