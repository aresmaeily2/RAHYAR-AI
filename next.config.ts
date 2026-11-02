import type { NextConfig } from "next";

/**
 * سرآیندهای امنیتی — سخت‌سازی در سطح پاسخ‌های HTTP.
 * CSP با nonce به middleware منتقل شد (src/middleware.ts) تا unsafe-inline
 * و unsafe-eval از اسکریپت‌ها حذف شود؛ اینجا فقط سرآیندهای بدون nonce.
 */
const securityHeaders = [
  // R2+: X-Frame-Options حذف شد — CSP frame-ancestors در src/proxy.ts نقش آن را
  // با allowlist دقیق (فقط دامنه‌های پنل چت) ایفا می‌کند؛ DENY مانع دیدن برنامهٔ
  // مالک در پنل پیش‌نمایش می‌شد. دفاع ضد-کلیک‌جکینگ حفظ شده، فقط دقیق‌تر.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)" },
  // ارتقای نهایی (GU-SEC1): اجبار HTTPS در مرورگر پس از اولین بازدید امن —
  // روی HTTP محلی توسط مرورگرها نادیده گرفته می‌شود؛ در انتشار HTTPS بی‌ضرر و مؤثر است.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // GRAND-F4 (SEC-F9): جداسازی زمینهٔ مرورگر — کوست صفر، بهرهٔ دفاعی واقعی
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // پیش‌نمایش Workspace: اجازهٔ بارگذاری منابع dev از دامنهٔ Preview و لوکال‌هاست
  // (رفع انسداد /_next/* در Next 16 برای host های غیر localhost — فقط اثر dev)
  allowedDevOrigins: ["localhost", "*.localhost", "127.0.0.1", "*.space-z.ai"],
  // P0-6R FINAL (امنیتی): جلوگیری از ورود اسکریپت‌های ابزاری/آزمون به خروجی standalone —
  // فایل‌های scripts/ حامل داده‌های era-شواهد بودند و توسط file-tracing کپی می‌شدند.
  outputFileTracingExcludes: {
    "*": ["./scripts/**/*", "./tests/**/*", "./docs/**/*", "./download/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  typescript: {
    // خطاهای نوع نباید بی‌صدا نادیده گرفته شوند (رفع A7) — tsc بخشی از گیت کیفیت است
    ignoreBuildErrors: false,
  },
  // ممیزی ۳۶۰: StrictMode فعال شد (React 19) — نشت افکت/تایمر WebAudio/اتصال
  // SSE در توسعه آشکار می‌شود. فقط حالت توسعه دوبار فراخوانی می‌کند؛ بیلد
  // تولید بی‌تأثیر است.
  reactStrictMode: true,
};

export default nextConfig;
