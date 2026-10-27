// ─── زمان‌بند سمت سرور رهیار AI (بخش ۷ و ۸ دستور) ────────────
// هدف: کارهای زمان‌بندی‌شده به باز بودن تب مرورگر وابسته نباشند — تا حد
// امکانات محیط (پروسه Next سرور فعال است، بدون cron بیرونی).
// مسئولیت‌ها:
//  1) منقضی‌سازی یادآوری‌های گذشته: پس از پنجره هشدار ۱۵ دقیقه، fired=true
//     می‌شود تا وضعیت سرور حقیقت واحد بماند (کلاینت در پنجره ۱۵ دقیقه فرصت
//     نمایش هشدار دارد؛ بعد از آن یادآوری منقضی شمرده می‌شود).
//  2) هرس نشست‌های منقضی (مدیریت نشست منقضی — بخش ۴ دستور).
//  3) بازتولید کارهای تکرارشونده هر ساعت (respawn) برای همه کاربران.
// محدودیت صادقانه: اگر پروسه سرور خاموش باشد، این زمان‌بند هم نمی‌چرخد؛
// اعلان بومی دستگاه نیازمند Web Push/پوش بومی است — مستند:
// docs/REMINDERS_PLATFORMS.md
//
// ممیزی ۳۶۰ درجه (یافتهٔ مهم — کارایی و پایداری):
//  - الگوی N+1 حذف شد: ثبت لاگ منقضی‌ها قبلاً به‌ازای هر رکورد یک کوئری
//    می‌زد؛ اکنون updateMany + createMany در یک تراکنش اتمیک.
//  - گارد هم‌زمانی (isRunning): اگر یک تیک بیش از ۶۰ ثانیه طول بکشد،
//    تیک بعدی روی آن اجرا نمی‌شود.
//  - تایمر unref شد و SIGTERM/SIGINT تایمر را پاک می‌کند (خاموشی نجیب) —
//    پروسهٔ سرور دیگر برای خروج منتظر تایمر نمی‌ماند.

import { db } from '@/lib/db'
import { pruneExpiredSessions } from '@/lib/auth'
import { respawnRecurringTasks } from '@/lib/server-tasks'

const ALERT_GRACE_MS = 15 * 60 * 1000 // پنجره هشدار کلاینت

let timer: ReturnType<typeof setInterval> | null = null
let isRunning = false // گارد ورود مجدد — هم‌زمانی دو تیک ممنوع
let respawnCounter = 0

async function tick(): Promise<void> {
  if (isRunning) return
  isRunning = true
  try {
    // ۱) منقضی‌سازی یادآوری‌های پشت‌مانده — دسته‌ای و اتمیک (ضد N+1)
    const cutoff = new Date(Date.now() - ALERT_GRACE_MS)
    const stale = await db.reminder.findMany({
      where: { fired: false, remindAt: { lt: cutoff } },
      select: { id: true, userId: true },
      take: 100,
    })
    if (stale.length > 0) {
      // ثبت نتیجه اقدام + تغییر وضعیت در یک تراکنش واحد — یا هر دو یا هیچ
      await db.$transaction([
        db.reminder.updateMany({
          where: { id: { in: stale.map((r) => r.id) } },
          data: { fired: true },
        }),
        // failed = تحویل نشد در پنجره هشدار
        db.actionLog.createMany({
          data: stale.map((r) => ({
            userId: r.userId,
            actionType: 'reminder_expire',
            status: 'failed',
            targetType: 'reminder',
            targetId: r.id,
            detail: 'پنجره هشدار ۱۵ دقیقه‌ای گذشت — بدون تحویل زنده',
          })),
        }),
      ])
    }

    // ۲) هرس نشست‌های منقضی
    await pruneExpiredSessions().catch(() => {})

    // ۳) respawn تکرارشونده‌ها — یک تیک بعد از بوت (بازیابی پس از ری‌استارت)
    //    و سپس هر ۶۰ تیک (یک‌بار در ساعت)
    //    ممیزی ۳۶۰ (رفع N+1 جدول User): فقط کاربرانی که واقعاً کار تکرارشونده
    //    دارند کوئری می‌شوند (distinct روی Task) — نه اسکن کل جدول User.
    respawnCounter = (respawnCounter + 1) % 60
    if (respawnCounter === 1) {
      const usersWithRecurring = await db.task.findMany({
        where: { repeat: { in: ['daily', 'weekly'] } },
        select: { userId: true },
        distinct: ['userId'],
      })
      for (const { userId } of usersWithRecurring) {
        await respawnRecurringTasks(userId).catch(() => {})
      }
    }
  } catch (e) {
    console.error('scheduler tick failed', e instanceof Error ? e.message : e)
  } finally {
    isRunning = false
  }
}

/** شروع زمان‌بند — idempotent (فقط یک تایمر در هر پروسه) */
export function startScheduler(): void {
  if (timer) return
  // اولین تیک ۳۰ ثانیه بعد از بوت تا آماده‌سازی سرور مختل نشود
  timer = setInterval(tick, 60_000)
  // تایمر نباید پروسه را زنده نگه دارد — خاموشی تمیز پس از SIGTERM
  if (typeof timer.unref === 'function') timer.unref()
  console.log('rahyar scheduler started (60s interval)')

  const shutdown = (): void => {
    if (timer) {
      clearInterval(timer)
      timer = null
      console.log('rahyar scheduler stopped (graceful shutdown)')
    }
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

export function stopSchedulerForTests(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
