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
