import { NextRequest, NextResponse } from 'next/server'
import { requireUser, AuthRequiredError, type SessionUser } from '@/lib/auth'
import { rateLimitKeyed, tooManyRequests, sameOriginOk, forbiddenOrigin, type RateResult } from '@/lib/security'

/**
 * F2-EMU-SEC: گارد اختصاصی مسیرهای شبیه‌ساز اندروید.
 *
 * مأموریت مالک (مرحلهٔ ۴): مسیرهای /api/android/* و صفحهٔ /emulator هرگز
 * عمومی نیستند — فقط مالک با نشست معتبر. لایه‌ها:
 *   ۱) احراز هویت نشست (requireUser — توکن در DB اعتبارسنجی می‌شود، نه فقط حضور کوکی)
 *   ۲) مجوز نقش — فقط OWNER (شبیه‌ساز زیرساخت خصوصی مالک است)
 *   ۳) CSRF: عملیات تغییردهنده فقط هم‌مبدأ (sameOriginOk + Sec-Fetch-Site)
 *   ۴) محدودیت نرخ: تصویر و وضعیت — بر پایهٔ شناسهٔ کاربر (نه IP قابل‌جعل)
 * خطای واقعی (۴۰۱/۴۰۳/۴۲۹) به‌جای صفحهٔ سفید برگردانده می‌شود.
 */

export type EmuGuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: Response }

export async function guardEmuApi(
  req: NextRequest,
  opts: { write?: boolean; limit?: number; windowMs?: number } = {},
): Promise<EmuGuardResult> {
  // ۱+۲) نشست + نقش مالک
  let user: SessionUser
  try {
    user = await requireUser(req)
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'برای مشاهدهٔ شبیه‌ساز وارد حساب مالک شوید' },
          { status: 401 },
        ) as Response,
      }
    }
    throw e
  }
  if (user.role !== 'OWNER') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'شبیه‌ساز فقط برای مالک قابل دسترسی است' },
        { status: 403 },
      ),
    }
  }

  // ۳) CSRF — فقط برای عملیات تغییردهنده
  if (opts.write && !sameOriginOk(req)) {
    return { ok: false, response: forbiddenOrigin() }
  }

  // ۴) محدودیت نرخ — سهمیهٔ پیش‌فرض: خواندن ۶ در ۱۰ثانیه، نوشتن ۳۰ در دقیقه
  const limit = opts.limit ?? (opts.write ? 30 : 6)
  const windowMs = opts.windowMs ?? (opts.write ? 60_000 : 10_000)
  const res: RateResult = rateLimitKeyed(`emu:${user.username}:${windowMs}:${limit}`, limit, windowMs)
  if (!res.ok) {
    return { ok: false, response: tooManyRequests(res) }
  }
  return { ok: true, user }
}
