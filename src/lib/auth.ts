// ─── احراز هویت و مدیریت نشست رهیار AI ──────────────────────
// اصول (بخش ۴ دستور اجرایی):
//  - رمز با scrypt استاندارد Node + نمک تصادفی؛ مقایسه با timingSafeEqual
//  - توکن نشست: ۳۲ بایت تصادفی؛ در DB فقط SHA-256 توکن ذخیره می‌شود
//    (افشای دیتابیس ≠ تسخیر نشست‌های فعال)
//  - کوکی: httpOnly + sameSite=lax + secure در تولید + انقضای مطلق ۳۰ روز
//  - راه‌اندازی اولیه: تا مالک رمز واقعی نگذارد (passwordHash=SETUP_REQUIRED)
//    هیچ نشستی صادر نمی‌شود؛ این حالت فقط برای کاربرِ نگه‌دارنده باز می‌شود
//  - نشست منقضی: در همان لحظه شناسایی حذف می‌شود + هرس دوره‌ای
import { db } from '@/lib/db'
import crypto from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'

export const SESSION_COOKIE = 'rahyar_session'
export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000 // ۳۰ روز
export const SETUP_SENTINEL = 'SETUP_REQUIRED'

// ── رمزها ────────────────────────────────────────────────────
const SCRYPT_KEYLEN = 64
const SCRYPT_COST = 16384 // N — تعادل امنیت/تأخیر برای ورود تک‌کاربره

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST })
  return `s1:${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    if (!stored.startsWith('s1:')) return false
    const [, saltHex, hashHex] = stored.split(':')
    if (!saltHex || !hashHex) return false
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    // دفاع: هش خراب/خالی هرگز معتبر نیست (کشف‌شده با آزمون واحد)
    if (salt.length < 8 || expected.length !== SCRYPT_KEYLEN) return false
    const actual = crypto.scryptSync(password, salt, expected.length, { N: SCRYPT_COST })
    return crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** رمز نگه‌دارنده هرگز با این تابع معتبر شناخته نمی‌شود */
export function isSetupPending(passwordHash: string): boolean {
  return passwordHash === SETUP_SENTINEL
}

/**
 * دادهٔ ادعای راه‌اندازی اولیهٔ مالک (GU2-SEC1 claim).
 * رفع باگ نصب تازه: پیش‌تر این UPDATE فقط رمز را می‌گذاشت و مالک با پیش‌فرض
 * schema (`role:"USER"`) می‌ماند → مدیریت کاربران برای مالک تازه‌نصب قفل بود.
 * نقش OWNER فقط و فقط همین‌جا تعیین می‌شود.
 */
export function ownerSetupClaimData(displayName: string, passwordHash: string) {
  return {
    displayName,
    passwordHash,
    role: 'OWNER' as const,
  }
}

// ── نشست‌ها ──────────────────────────────────────────────────
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: 'OWNER' | 'USER'
  mustChangePassword: boolean
}

/** ساخت نشست جدید — توکن خام فقط همین‌جا و فقط در کوکی برمی‌گردد */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } })
  return { token, expiresAt }
}

/** شناسایی کاربر از کوکی؛ نشست منقضی/نامعتبر حذف و null برمی‌گردد */
export async function resolveUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || token.length < 20 || token.length > 128) return null
  const tokenHash = hashToken(token)
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, role: true, disabled: true, mustChangePassword: true },
      },
    },
  })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  // حساب غیرفعال‌شده توسط مالک → نشست موجود هم فوراً بی‌اعتبار می‌شود
  if (session.user.disabled) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: session.user.role === 'OWNER' ? 'OWNER' : 'USER',
    mustChangePassword: session.user.mustChangePassword,
  }
}

/** پایان نشست — حذف رکورد + انقضای کوکی */
export async function destroySession(req: NextRequest): Promise<void> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {})
}

/** ابطال همه نشست‌های دیگر کاربر به‌جز نشست فعلی — پس از تغییر رمز فراخوانی می‌شود */
export async function revokeOtherSessions(
  userId: string,
  currentToken: string | undefined,
): Promise<number> {
  const keepHash =
    currentToken && currentToken.length >= 20 && currentToken.length <= 128
      ? hashToken(currentToken)
      : null
  const r = await db.session.deleteMany({
    where: { userId, ...(keepHash ? { tokenHash: { not: keepHash } } : {}) },
  })
  return r.count
}

/** هم‌ترازی زمان پاسخ ورود: وقتی حساب وجود ندارد هم همان هزینه scrypt پرداخت می‌شود
 *  تا وجود/عدم وجود نام کاربری از زمان پاسخ قابل حدس نباشد (دفاع timing-oracle) */
export function burnPasswordTiming(password: string): void {
  try {
    crypto.scryptSync(password, 'rahyar-timing-burn-salt', SCRYPT_KEYLEN, { N: SCRYPT_COST })
  } catch {
    /* بی‌اثر — فقط مصرف زمان */
  }
}

/** هرس نشست‌های منقضی — از زمان‌بند سرور فراخوانی می‌شود */
export async function pruneExpiredSessions(): Promise<number> {
  const r = await db.session.deleteMany({ where: { expiresAt: { lte: new Date() } } })
  return r.count
}

// ── کوکی ─────────────────────────────────────────────────────
export function attachSessionCookie(res: NextResponse, token: string, expiresAt: Date): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  })
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
}

// ── گارد استاندارد مسیرهای API ───────────────────────────────
export class AuthRequiredError extends Error {
  constructor() {
    super('auth required')
  }
}

/**
 * requireUser — هر مسیر API با فراخوانی این تابع کاربر نشست را می‌گیرد
 * یا خطای ۴۰۱ برمی‌گردد. جداسازی داده از همین شناسه آغاز می‌شود.
 */
export async function requireUser(req: NextRequest): Promise<SessionUser> {
  const user = await resolveUser(req)
  if (!user) throw new AuthRequiredError()
  return user
}

export const unauthorizedResponse = (): Response =>
  Response.json({ error: 'برای ادامه وارد حساب شوید' }, { status: 401 })

export const ownerForbiddenResponse = (): Response =>
  Response.json({ error: 'این بخش فقط برای مالک است' }, { status: 403 })

/** ممیزی مدیریت کاربران — هرگز رمز/توکن در detail نمی‌آید */
export async function logUserAudit(
  actor: { username: string },
  action: string,
  targetUsername?: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.userAudit.create({
      data: {
        actorUsername: actor.username,
        action,
        targetUsername: targetUsername ?? null,
        detail: detail ? JSON.stringify(detail) : null,
      },
    })
  } catch (e) {
    // ممیزی هرگز جریان اصلی را نمی‌شکند — فقط ثبت می‌شود
    console.error('userAudit', e instanceof Error ? e.message : e)
  }
}

/** آیا هیچ کاربری وجود ندارد؟ (حالت راه‌اندازی اولیه کل سامانه) */
export async function needsOwnerSetup(): Promise<boolean> {
  const n = await db.user.count()
  return n === 0
}

/** آیا کاربر مالک هنوز رمز واقعی نگرفته است؟
 *  نصب کاملاً خالی (بدون هیچ کاربری) هم حالت راه‌اندازی است —
 *  رفع عیب نسخه ۱٫۰: پس از پاک‌سازی کامل، سامانه دوباره قابل راه‌اندازی است. */
export async function ownerSetupPending(): Promise<boolean> {
  const n = await db.user.count()
  if (n === 0) return true
  const u = await db.user.findUnique({ where: { username: 'owner' }, select: { passwordHash: true } })
  return !!u && isSetupPending(u.passwordHash)
}

/** سیاست رمز: حداقل ۸ نویسه — در API و آزمون مشترک */
export function passwordPolicyOk(p: unknown): p is string {
  return typeof p === 'string' && p.length >= 8 && p.length <= 128
}

// ── گارد راه‌اندازی اولیه (GU2-SEC1) ────────────────────────
// مشکل: روی نصب تازه که به اینترنت در دسترس است، «اولین کسی که فرم را پر کند»
// مالک می‌شود (owner-claim race). راه‌حل: در تولید، راه‌اندازی فقط با توکن
// خارج از باند (RAHYAR_SETUP_TOKEN در env سرور) مجاز است. در توسعه، اگر توکن
// تعریف نشده باشد رفتار قبلی حفظ می‌شود. RAHYAR_ALLOW_OPEN_SETUP=1 فقط برای
// استقرار صرفاً محلی/پشت VPN.
export type SetupTokenCheck = 'ok' | 'missing_config' | 'invalid'

export function checkSetupToken(
  provided: unknown,
  env: Record<string, string | undefined> = process.env,
): SetupTokenCheck {
  const expected = (env.RAHYAR_SETUP_TOKEN ?? '').trim()
  if (!expected) {
    if (env.NODE_ENV !== 'production' || env.RAHYAR_ALLOW_OPEN_SETUP === '1') return 'ok'
    return 'missing_config'
  }
  if (typeof provided !== 'string' || !provided) return 'invalid'
  const a = crypto.createHash('sha256').update(provided.trim()).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b) ? 'ok' : 'invalid'
}
