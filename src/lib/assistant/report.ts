// ─── گزارش روزانه دستیار اجرایی (بخش ۷ دستور) ───────────────
// کاملاً قطعی و بدون مدل — انجام‌شده‌های امروز، باقی‌مانده، عقب‌افتاده
// و وضعیت یادآوری‌ها؛ همه فقط از داده کاربر نشست.
import { db } from '@/lib/db'
import { tehranIsoDate } from '@/lib/persian-date'

export interface DailyReport {
  done: number
  remaining: number
  overdue: number
  overdueTitles: string[]
  doneTitles: string[]
  remindersToday: number
  generatedAt: string
}

export async function dailyReport(userId: string): Promise<DailyReport> {
  const todayIso = tehranIsoDate()
  const dayStart = new Date(todayIso + 'T00:00:00.000Z')
  const dayEnd = new Date(todayIso + 'T23:59:59.999Z')

  const [doneRows, todoRows, reminders] = await Promise.all([
    db.task.findMany({
      where: { userId, status: 'done', completedAt: { gte: dayStart, lte: dayEnd } },
      select: { title: true },
    }),
    db.task.findMany({
      where: { userId, status: 'todo' },
      select: { title: true, dueDate: true, dueTime: true },
    }),
    db.reminder.findMany({
      where: { userId, remindAt: { gte: dayStart, lte: dayEnd } },
      select: { id: true },
    }),
  ])

  const overdueRows = todoRows.filter((t) => t.dueDate && t.dueDate.getTime() < dayStart.getTime())

  return {
    done: doneRows.length,
    doneTitles: doneRows.slice(0, 10).map((t) => t.title),
    remaining: todoRows.length - overdueRows.length,
    overdue: overdueRows.length,
    overdueTitles: overdueRows.slice(0, 10).map((t) => t.title),
    remindersToday: reminders.length,
    generatedAt: new Date().toISOString(),
  }
}
