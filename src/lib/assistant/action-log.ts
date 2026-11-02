// ─── دفتر اقدامات (ActionLog) — بخش ۷ دستور اجرایی ───────────
// هر اقدام بیرونی/اجرایی با نتیجه ثبت می‌شود:
//   status: success | failed | canceled | needs_confirmation
// idempotencyKey یکتا: اجرای تکراری در اثر retry یا دریافت مجدد،
// به‌جای دوباره‌کاری، نتیجه ثبت‌شده قبلی را برمی‌گرداند.
import { db } from '@/lib/db'

export type ActionStatus = 'success' | 'failed' | 'canceled' | 'needs_confirmation'

export interface LoggedActionResult {
  duplicate: boolean
}

/**
 * F2-AG (مأموریت تکمیلی §۳ سناریو ۸): رزرو کلید idempotency «پیش از اجرا» —
 * claim-first. در الگوی قبلی، نوشتن DB اول انجام و لاگ بعد آن ثبت می‌شد؛
 * در نتیجه retry همان درخواست، ردیف دوباره می‌ساخت. اکنون کلید پیش از هر
 * نوشتنی رزرو می‌شود؛ اگر رزرو ناموفق باشد یعنی این درخواست قبلاً اجرا شده
 * و کل دستهٔ اکشن‌ها خنثی می‌شود (بدون هیچ نوشتنی).
 */
export async function claimIdempotencyKey(userId: string, key: string | null): Promise<boolean> {
  const k = key?.trim().slice(0, 120)
  if (!k) return true // بدون کلید — مسیر قدیمی؛ بدون دوباره‌کاری‌یابی
  try {
    await db.actionLog.create({
      data: {
        userId,
        actionType: 'idempotency_claim',
        status: 'success',
        idempotencyKey: k,
        detail: 'claim-before-execute',
      },
    })
    return true
  } catch {
    // نقض یکتایی — این کلید قبلاً مصرف شده است
    return false
  }
}

/**
 * ثبت نتیجه اقدام با کلید idempotency اختیاری.
 * اگر کلید قبلاً دیده شده → duplicate=true (اجرای تکراری خنثی می‌شود).
 */
export async function logAction(args: {
  userId: string
  actionType: string
  status: ActionStatus
  targetType?: string
  targetId?: string
  idempotencyKey?: string | null
  detail?: string
}): Promise<LoggedActionResult> {
  const key = args.idempotencyKey?.trim().slice(0, 120) || null
  if (key) {
    // یکتایی در سطح کاربر — کلید مشابه دو کاربر مختلف تداخل ندارد
    const existing = await db.actionLog.findUnique({
      where: { userId_idempotencyKey: { userId: args.userId, idempotencyKey: key } },
    })
    if (existing) return { duplicate: true }
    try {
      await db.actionLog.create({
        data: {
          userId: args.userId,
          actionType: args.actionType.slice(0, 60),
          status: args.status,
          targetType: args.targetType?.slice(0, 40),
          targetId: args.targetId,
          idempotencyKey: key,
          detail: args.detail?.slice(0, 300),
        },
      })
      return { duplicate: false }
    } catch {
      // مسابقه روی کلید یکتا — نتیجه قبلی برنده شده است
      return { duplicate: true }
    }
  }
  await db.actionLog.create({
    data: {
      userId: args.userId,
      actionType: args.actionType.slice(0, 60),
      status: args.status,
      targetType: args.targetType?.slice(0, 40),
      targetId: args.targetId,
      detail: args.detail?.slice(0, 300),
    },
  })
  return { duplicate: false }
}

/** خواندن آخرین اقدامات کاربر برای گزارش/نمایش وضعیت اجرا */
export async function recentActions(userId: string, take = 20) {
  return db.actionLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      actionType: true,
      targetType: true,
      targetId: true,
      status: true,
      detail: true,
      createdAt: true,
    },
  })
}
