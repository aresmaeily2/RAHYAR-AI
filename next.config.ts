import type { NextConfig } from "next";

/**
 * سرآیندهای امنیتی — سخت‌سازی در سطح پاسخ‌های HTTP.
 * CSP با nonce به middleware منتقل شد (src/middleware.ts) تا unsafe-inline
 * و unsafe-eval از اسکریپت‌ها حذف شود؛ اینجا فقط سرآیندهای بدون nonce.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
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
  reactStrictMode: false,
};

export default nextConfig;
