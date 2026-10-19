import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ara/theme-provider";
import { getServerLang } from "@/lib/server-lang";

export const metadata: Metadata = {
  title: "رهیار AI — دستیار هوشمند شخصی",
  description:
    "رهیار AI؛ دستیار هوشمند شخصی برای مدیریت و انجام کارها — «از درخواست تا انجام». برنامه‌ریزی روزانه، یادآوری هوشمند و تمرکز بر آنچه مهم است.",
  keywords: ["دستیار هوشمند", "لیست کار", "بهره‌وری", "برنامه‌ریزی", "رهیار", "Rahyar AI", "AI assistant"],
  authors: [{ name: "Rahyar AI" }],
  manifest: "/manifest.webmanifest",
  applicationName: "رهیار AI",
  // ارتقای نهایی (GU-REL2): متای اشتراک‌گذاری — پیش‌نمایش درست لینک در پیام‌رسان‌ها
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "رهیار AI",
    locale: "fa_IR",
    title: "رهیار AI — از درخواست تا انجام",
    description:
      "دستیار هوشمند شخصی فارسی: برنامه‌ریزی روزانه، یادآوری هوشمند، چت عاملیت و مدیریت مالی — همه در یک جای آرام.",
  },
  twitter: {
    card: "summary",
    title: "رهیار AI — از درخواست تا انجام",
    description: "دستیار هوشمند شخصی فارسی برای مدیریت و انجام کارها",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // بدون maximumScale — زوم مرورگر باید همیشه ممکن باشد (WCAG 1.4.4)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F9FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1016" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CSP nonce از middleware (src/middleware.ts) — برای اسکریپت تزریقی
  // next-themes و bootstrap ظاهر (تم + اکسنت پیش از اولین رنگ‌آمیزی)
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // زبان کاربر از سرور — html پیش از اولین paint جهت درست دارد (بدون فلاش RTL↔LTR)
  const lang = await getServerLang();
  const dir = lang === "en" ? "ltr" : "rtl";
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        {/* فونت‌های Variable — preload برای حذف پرش متن (FOIT) */}
        <link
          rel="preload"
          href="/fonts/vazirmatn-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/estedad-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* bootstrap ظاهر — اسکریپت خارجی استاتیک (بدون نیاز به nonce،
            بدون تداخل hydration) پیش از اولین رنگ‌آمیزی اجرا می‌شود.
            آگاهانه sync است: باید قبل از paint اجرا شود. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/appearance-boot.js" />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <ThemeProvider nonce={nonce}>
          {children}
          <Toaster dir={dir} position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
