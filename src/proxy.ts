import { NextRequest, NextResponse } from 'next/server'

/**
 * لایه Proxy (قرارداد Next.js 16 — جایگزین middleware.ts):
 * ممیزی ۳۶۰: src/middleware.ts به src/proxy.ts مهاجرت داده شد؛ کارکرد
 * عیناً همان است — Next 16 نام این لایه را Proxy گذاشت و فایل قدیمی
 * deprecated است.
 *
 * ۱) CSP با nonce (رفع SEC-H3 — حذف unsafe-inline/unsafe-eval از اسکریپت‌ها):
 * الگوی رسمی Next.js — nonce per-request روی درخواست ست می‌شود و Next خودش
 * آن را به اسکریپت‌های سمت سرور تزریق می‌کند؛ 'strict-dynamic' اعتماد را به
 * چانک‌های لودشده توسط اسکریپت‌های nonce‌دار منتقل می‌کند.
 * - 'unsafe-eval' فقط در توسعه (React Refresh/HMR).
 * - style-src 'unsafe-inline' حفظ شده: Tailwind استاتیک است ولی framer-motion
 *   و shadcn chart تگ <style> پویا تزریق می‌کنند.
 *
 * ۲) گیت احراز هویت (ایمن‌سازی فاز انتشار):
 * proxy روی Edge اجرا می‌شود و به DB دسترسی ندارد؛ پس فقط «حضور» کوکی
 * نشست را می‌سنجد (دفاع اول) و اعتبار واقعی توکن در هر مسیر API با
 * requireUser() (src/lib/auth.ts) سنجیده می‌شود (دفاع دوم، سخت‌گیر).
 *  - صفحه بدون کوکی → ریدایرکت به /login
 *  - API بدون کوکی (به‌جز مسیرهای عمومی) → 401 JSON
 */

// F-4 (R2): هماهنگ با src/lib/auth.ts — پیشوند __Host- فقط در تولید با فلگ صریح
const SESSION_COOKIE =
  process.env.NODE_ENV === 'production' && process.env.RAHYAR_COOKIE_HOST_PREFIX === '1'
    ? '__Host-rahyar_session'
    : 'rahyar_session'

// مسیرهای عمومی — بدون نیاز به نشست
const PUBLIC_PREFIXES = [
  '/api/auth/',        // ورود/راه‌اندازی/نشست/خروج
  '/api/health',       // مانیتورینگ
  '/api/download/',    // دانلود مستقیم APK انتشار — سفید‌لیست دقیق نام‌فایل در خود route
  '/login',
  '/manifest.webmanifest',
  '/sw.js',
  '/robots.txt',
  '/icon.svg',
  '/fonts/',
  '/api/android/',     // F2-EMU: پخش زندهٔ شبیه‌ساز برای پنل مالک
  '/emulator',         // F2-EMU: صفحهٔ پخش زندهٔ شبیه‌ساز
  '/ambient/',         // تصاویر صحنه محیطی — باید روی صفحه ورود هم دیده باشند
  '/appearance-boot.js', // بوت ظاهر پیش از paint — بدون آن تم اولیه اعمال نمی‌شود
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV !== 'production'

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // R2+ (نمایش زنده برای مالک): پنل پیش‌نمایش چت، اپ را در iframe از دامنه‌های
    // پلتفرم embed می‌کند. 'none' مانع دیدن برنامه توسط مالک می‌شد؛ به‌جای حذف
    // حفاظ، allowlist دقیق دامنه‌های پنل — همان دفاع ضد-کلیک‌جکینگ با سطح دسترسی
    // کنترل‌شده (فقط دامنه‌های رسمی پلتفرم می‌توانند embed کنند).
    "frame-ancestors 'self' https://z.ai https://*.z.ai https://*.space-z.ai",
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  // Next از CSPِ درخواست، nonce را به اسکریپت‌های رندر سرور اضافه می‌کند
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)

  const { pathname } = request.nextUrl

  // ── گیت نشست ────────────────────────────────────────────────
  const hasSessionCookie = !!request.cookies.get(SESSION_COOKIE)?.value
  if (!hasSessionCookie && !isPublic(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'برای ادامه وارد حساب شوید' },
        { status: 401 },
      )
    }
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  // فایل‌های استاتیک به CSP نیازی ندارند — از کار middleware خارج می‌شوند
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|fonts/|ambient/|appearance-boot.js).*)'],
}
