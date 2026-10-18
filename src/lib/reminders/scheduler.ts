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

import { db } from '@/lib/db'
import { pruneExpiredSessions } from '@/lib/auth'
import { respawnRecurringTasks } from '@/lib/server-tasks'
import { logAction } from '@/lib/assistant/action-log'

const ALERT_GRACE_MS = 15 * 60 * 1000 // پنجره هشدار کلاینت

let timer: ReturnType<typeof setInterval> | null = null
let respawnCounter = 0

async function tick(): Promise<void> {
  try {
    // ۱) منقضی‌سازی یادآوری‌های پشت‌مانده
    const cutoff = new Date(Date.now() - ALERT_GRACE_MS)
    const stale = await db.reminder.findMany({
      where: { fired: false, remindAt: { lt: cutoff } },
      select: { id: true, userId: true },
      take: 100,
    })
    if (stale.length > 0) {
      await db.reminder.updateMany({
        where: { id: { in: stale.map((r) => r.id) } },
        data: { fired: true },
      })
      // ثبت نتیجه اقدام: منقضی‌شده بدون تحویل (failed = تحویل نشد در پنجره)
      for (const r of stale) {
        await logAction({
          userId: r.userId,
          actionType: 'reminder_expire',
          status: 'failed',
          targetType: 'reminder',
          targetId: r.id,
          detail: 'پنجره هشدار ۱۵ دقیقه‌ای گذشت — بدون تحویل زنده',
        }).catch(() => {})
      }
    }

    // ۲) هرس نشست‌های منقضی
    await pruneExpiredSessions().catch(() => {})

    // ۳) respawn تکرارشونده‌ها — هر ۶۰ تیک (یک‌بار در ساعت)
    respawnCounter++
    if (respawnCounter >= 60) {
      respawnCounter = 0
      const users = await db.user.findMany({ select: { id: true } })
      for (const u of users) {
        await respawnRecurringTasks(u.id).catch(() => {})
      }
    }
  } catch (e) {
    console.error('scheduler tick failed', e instanceof Error ? e.message : e)
  }
}

/** شروع زمان‌بند — idempotent (فقط یک تایمر در هر پروسه) */
export function startScheduler(): void {
  if (timer) return
  // اولین تیک ۳۰ ثانیه بعد از بوت تا آماده‌سازی سرور مختل نشود
  timer = setInterval(tick, 60_000)
  console.log('rahyar scheduler started (60s interval)')
}

export function stopSchedulerForTests(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
