import type { Config } from "tailwindcss";

/**
 * پیکربندی legacy — Tailwind v4 (CSS-first) فعال است:
 *   globals.css ← @import "tailwindcss" + @import "tw-animate-css"
 * پس این فایل دیگر در خط لوله PostCSS بارگذاری نمی‌شود و فقط برای
 * ابزارهایی که هنوز مسیر config می‌خوانند نگه داشته شده است.
 *
 * ممیزی ۳۶۰ (رفع یافتهٔ وابستگی غایب): ایمپورت «tailwindcss-animate»
 * حذف شد — این بسته در package.json وجود ندارد (جایگزین آن tw-animate-css
 * است که از طریق CSS ایمپورت می‌شود) و ایمپورتِ غایب در typecheck/بیلد
 * ریسک شکست داشت.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
