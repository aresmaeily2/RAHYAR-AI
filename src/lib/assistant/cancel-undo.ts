// ─── V1-P2 (یافتهٔ آزمون P8): لغو پس از ثبتِ فوری — مسیر قطعی undo ───
// قبلاً: کاربر می‌گفت «منصرف شدم» بعد از ثبتِ فوریِ یادآور، و پاسخ
// «انصراف داده شد — هیچ تغییری اعمال نشد.» صادر می‌شد در حالی که ردیف
// تازه ثبت‌شده در DB می‌ماند (پاسخ غیرصادق — نقص واقعی).
// اکنون: اگر کاربر بلافاصله (پنجرهٔ ۱۰ دقیقه) بعد از ثبتِ فوریِ یک یادآور/کار
// فرمان لغوِ کوتاه بدهد، همان ردیفِ تازه (با گارد مالکیت userId) حذف می‌شود
// و پاسخ دقیقاً اعلام می‌کند چه چیزی حذف شد. منطقِ انتخابِ هدف «خالص» است
// و روی JVM/بون بدون DB آزمون می‌شود؛ نوشتن/حذف فقط در مسیر زندهٔ سرور.
import { db } from '@/lib/db'
import { CANCEL_RE } from '@/lib/assistant/pending-action'
import { logAction } from '@/lib/assistant/action-log'
import { pick } from '@/lib/server-lang'
import type { AppLang } from '@/lib/types'

/** پنجرهٔ undo — فقط لغوِ بلافاصله (نه حذف گذشته) */
export const UNDO_WINDOW_MS = 10 * 60_000
/** سقف طول پیامِ لغو — پیام بلند یعنی فرمان جدید، نه انصراف */
export const MAX_CANCEL_LEN = 40

export interface UndoableTarget {
  kind: 'reminder' | 'task'
  id: string
  label: string
}

type UnknownAction = {
  type?: string
  ok?: boolean
  reminder?: { id?: string; message?: string }
  task?: { id?: string; title?: string }
}

/** استخراج آخرین اکشنِ ثبتِ فوریِ قابل‌لغو از آرایهٔ اکشن‌های پیام — خالص */
export function extractUndoable(actions: unknown): UndoableTarget | null {
  if (!Array.isArray(actions)) return null
  for (let i = actions.length - 1; i >= 0; i--) {
    const a = actions[i] as UnknownAction
    if (!a || typeof a !== 'object' || a.ok !== true) continue
    if (a.type === 'add_reminder' && a.reminder && typeof a.reminder.id === 'string' && a.reminder.id) {
      return { kind: 'reminder', id: a.reminder.id, label: a.reminder.message || '' }
    }
    if (a.type === 'add_task' && a.task && typeof a.task.id === 'string' && a.task.id) {
      return { kind: 'task', id: a.task.id, label: a.task.title || '' }
    }
  }
  return null
}

/** متن پاسخ صادقانهٔ undo — خالص و آزمون‌پذیر */
export function undoReply(lang: AppLang, target: UndoableTarget): string {
  const label = target.label.slice(0, 60)
  if (target.kind === 'reminder') {
    return pick(lang, `انصراف داده شد — یادآور «${label}» که تازه ثبت شده بود حذف شد.`, `Canceled — the reminder “${label}” that was just added has been removed.`)
  }
  return pick(lang, `انصراف داده شد — کار «${label}» که تازه ثبت شده بود حذف شد.`, `Canceled — the task “${label}” that was just added has been removed.`)
}

/** آیا این پیام، انصرافِ کوتاهِ قابل‌undo است؟ — خالص */
export function isShortCancel(message: string): boolean {
  if (message.length > MAX_CANCEL_LEN) return false
  return CANCEL_RE.test(message)
}

/**
 * مسیر زندهٔ سرور: لغوِ آخرین ثبتِ فوری (یادآور/کار) با گارد مالکیت.
 * خروجی: متن پاسخ (undo انجام شد) یا null (این مسیر صادق نیست — ادامه به مسیرهای دیگر).
 */
export async function tryUndoRecentAdd(userId: string, message: string, lang: AppLang): Promise<string | null> {
  if (!isShortCancel(message)) return null
  const since = new Date(Date.now() - UNDO_WINDOW_MS)
  let candidates: Array<{ actions: unknown }> = []
  try {
    candidates = await db.chatMessage.findMany({
      where: { userId, role: 'assistant', actions: { not: null }, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
  } catch {
    return null
  }
  for (const m of candidates) {
    const target = extractUndoable(m.actions)
    if (!target) continue
    if (target.kind === 'reminder') {
      const del = await db.reminder.deleteMany({ where: { id: target.id, userId } })
      if (del.count === 0) continue
      await logAction({ userId, actionType: 'add_reminder', status: 'canceled', targetType: 'reminder', targetId: target.id, detail: 'undo after immediate add (V1-P2 cancel lane)' })
      return undoReply(lang, target)
    }
    const del = await db.task.deleteMany({ where: { id: target.id, userId } })
    if (del.count === 0) continue
    await logAction({ userId, actionType: 'add_task', status: 'canceled', targetType: 'task', targetId: target.id, detail: 'undo after immediate add (V1-P2 cancel lane)' })
    return undoReply(lang, target)
  }
  return null
}
