import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'

/**
 * حذف کامل داده‌های محتوایی کاربر — حریم خصوصی (حق فراموشی):
 * کارها/زیرکارها، یادآورها، گفتگو، حافظه‌ها، مالی. حساب و نشست می‌ماند.
 * نیازمند تأیید متنی: body.confirm === 'پاک کن' (یا 'erase').
 */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 3, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as { confirm?: unknown } | null
    const confirm = typeof body?.confirm === 'string' ? body.confirm.trim() : ''
    if (confirm !== 'پاک کن' && confirm.toLowerCase() !== 'erase') {
      return NextResponse.json({ error: 'برای حذف، عبارت تأیید لازم است' }, { status: 400 })
    }

    // SEC-07: پاک‌سازی کاملاً اتمیک در یک تراکنش واحد + پوشش کامل FinanceBudget و Setting
    const [
      tasks,
      reminders,
      chat,
      memories,
      transactions,
      accounts,
      budgets,
      settings,
      aiUsage,
      actionLogs,
    ] = await db.$transaction([
      db.task.deleteMany({ where: { userId: user.id } }),
      db.reminder.deleteMany({ where: { userId: user.id } }),
      db.chatMessage.deleteMany({ where: { userId: user.id } }),
      db.memory.deleteMany({ where: { userId: user.id } }),
      db.financeTransaction.deleteMany({ where: { userId: user.id } }),
      db.financeAccount.deleteMany({ where: { userId: user.id } }),
      db.financeBudget.deleteMany({ where: { userId: user.id } }),
      db.setting.deleteMany({ where: { userId: user.id } }),
      db.aiUsage.deleteMany({ where: { userId: user.id } }),
      db.actionLog.deleteMany({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      ok: true,
      deleted: {
        tasks: tasks.count,
        reminders: reminders.count,
        chatMessages: chat.count,
        memories: memories.count,
        financeTransactions: transactions.count,
        financeAccounts: accounts.count,
        financeBudgets: budgets.count,
        settings: settings.count,
        aiUsage: aiUsage.count,
        actionLogs: actionLogs.count,
      },
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/data/delete-all', e)
    return NextResponse.json({ error: 'حذف داده‌ها ناموفق بود' }, { status: 500 })
  }
}
