# Change Log — رهیار AI (Rahyar AI)

## [1.0.1-gu2] — 2026-10-19 (NOT READY FOR RELEASE)
### Security
- First-run owner setup requires `RAHYAR_SETUP_TOKEN` in production (GU2-SEC1)
- Per-account login rate limit (GU2-SEC2)
- SSRF guard on OpenAI-compatible endpoint; redirects not followed; no response-body reflection (GU2-SEC3)
- Safe `TRUST_PROXY_HEADERS=0` default; screenshots with user data untracked
### Fixed
- Data import: invalid dates no longer cause 500 + partial import; writes are atomic (GU2-DATA1)
- Persian dual calendar: Gregorian sub-date keeps Latin digits, slightly larger (GU2-I18N1)
### Tests
- 10 new regression tests (165 total). See docs/GRAND_UPGRADE_GU2.md

تمام تغییرات قابل توجه این پروژه در این فایل ثبت می‌شود.
قالب بر پایهٔ [Keep a Changelog](https://keepachangelog.com/) و نسخه‌بندی معنایی (SemVer).

## [1.0.0] — 2026-10-19 — انتشار نهایی

نسخهٔ کامل انتشار؛ بر بستر سخت‌سازی امنیتی rc2 (گزارش `docs/RED_TEAM_AUDIT_RC2.md`) و موج ارتقای نهایی «مأموریت ارتقای جامع» (گزارش `docs/GRAND_UPGRADE_RC3.md`).

### امنیت
- سرآیند `Strict-Transport-Security` (max-age=63072000، includeSubDomains) به مجموعهٔ سرآیندهای امن اضافه شد — GU-SEC1.
- سقف خروجی/ورودی مدل، سهمیه‌بندی و ثبت مصرف بدون محتوا (میراث rc2) — بدون تغییر و مجدداً راستی‌آزمایی‌شده.

### حریم خصوصی
- «پاک‌سازی کامل داده» اکنون فراداده‌های شخصی مصرف مدل (AiUsage) و دفتر اقدامات (ActionLog) را هم حذف می‌کند — حق فراموشی کامل‌تر (GDPR) — GU-PRIV1.

### تجربهٔ کاربری و دسترس‌پذیری
- مرز خطای سراسری اپ (`error.tsx`): به‌جای صفحهٔ سفید، پیام فارسی + تلاش مجدد + بازگشت به خانه — GU-UX1.
- اسکلت بارگذاری سطح اپ (`loading.tsx`) با پشتیبانی `prefers-reduced-motion` — GU-UX2.

### کارایی و بهداشت مخزن
- حذف ۷ وابستگی بدون مصرف (recharts، react-day-picker، embla-carousel-react، react-resizable-panels، input-otp، vaul، tailwindcss-animate) و ۷ کامپوننت UI بی‌استفاده + کانفیگ میراث Tailwind v3 — دنبالهٔ پاک‌سازی RT-7 — GU-PERF1.

### انتشار
- نسخهٔ پکیج از `0.2.1` به `1.0.0` — GU-REL1.
- متای OpenGraph/Twitter/metadataBase برای پیش‌نمایش درست لینک در پیام‌رسان‌ها — GU-REL2.
- مستندات انتشار و راهنمای اجرا به‌روزرسانی شد — GU-REL3.

## [1.0.0-rc2] — 2026-10-19 — سخت‌سازی امنیتی (Red Team + Blue Team)

- RT-1 (High): اعتماد به سرآیندهای پروکسی fail-closed شد (ضد دورزدن سقف نرخ با XFF جعلی).
- RT-2/3 (Medium): گارد فرمول‌نویسی CSV در خروجی‌ها؛ حذف کلید Endpoint از `data/export`.
- RT-4..6 (Low): محدودسازی `/health`، کش‌های باندشده آب‌وهوا، `trimChatHistory` مشترک هر دو مسیر چت.
- RT-7: حذف ۱۳ وابستگی بدون مصرف.
- گزارش کامل ۱۸ بندی: `docs/RED_TEAM_AUDIT_RC2.md`.

## [1.0.0-rc1] — 2026-10-19 — نخستین کاندید انتشار

- نخستین نسخهٔ کامل: چت عاملیت با استریم، مسیریاب نیت قطعی، کارها/زیرکارها، تقویم شمسی، مالی شخصی، ورود پیامک بانکی، حافظه بلندمدت، یادآوری صوتی، لایهٔ تجربهٔ محیطی (Ambient)، PWA فارسی RTL.
