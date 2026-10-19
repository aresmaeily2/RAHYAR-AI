# گزارش ارتقای جامع نهایی — رهیار AI (rc3 → انتشار 1.0.0)

**شناسهٔ مأموریت:** RAHYAR-GRAND-UPGRADE-01 · **تاریخ:** 2026-10-19
**بستر ورودی:** rc2 (سخت‌سازی امنیتی Red Team، گزارش `RED_TEAM_AUDIT_RC2.md`) · HEAD `2017e39`
**خروجی:** نسخهٔ 1.0.0 — HEAD `54a225d` — push شده به `aresmaeily2/HAMYAR-AI`

---

## ۱) ماتریس بازرسی ۳۶۰° (فاز صفر)

پوشش: هستهٔ امنیتی کامل (middleware/security/auth/db/schema)، لایهٔ AI کامل (gateway/server-ai/providers)، ۳۵ فایل route (نمونه‌برداری عمیق auth/chat/data/sms/weather/finance/settings + گریپ پوششی تک‌تک)، اسکیل UI و استایل‌ها، مستندات و اسکن‌های گریپ (secrets/XSS/tz).

| شناسه | محور | شدت | مکان | یافته | وضعیت |
|---|---|---|---|---|---|
| GU-SEC1 | امنیت | Low | `next.config.ts` | نبود HSTS در سرآیندهای امن | ✅ رفع شد |
| GU-PRIV1 | حریم خصوصی | Medium | `api/data/delete-all` | حق فراموشی ناقص — AiUsage/ActionLog پاک نمی‌شدند | ✅ رفع شد |
| GU-UX1 | UX | Medium | `src/app/` | نبود error boundary → خطای رندر = صفحهٔ سفید | ✅ رفع شد |
| GU-UX2 | UX | Low | `src/app/` | نبود loading سطح اپ | ✅ رفع شد |
| GU-PERF1 | کارایی/بهدهاشت مخزن | Medium | ۷ فایل ui + package.json | ۷ وابستگی و کامپوننت سنگین بی‌مصرف (recharts/day-picker/embla/resizable/input-otp/vaul/tw-animate) + کانفیگ میراث TW3 | ✅ حذف شد |
| GU-REL1 | انتشار | Medium | `package.json` | نسخه 0.2.1 در آستانهٔ انتشار 1.0.0 | ✅ ارتقا یافت |
| GU-REL2 | انتشار | Medium | `layout.tsx` | نبود OpenGraph/Twitter/metadataBase | ✅ اضافه شد |
| GU-REL3 | انتشار | Low | مستندات | نبود CHANGELOG؛ RELEASE قدیمی | ✅ ساخته/به‌روز شد |
| SEC-INFO | امنیت | Info | `ui/chart.tsx` قبلی | dangerouslySetInnerHTML استاندارد shadcn | حذف شد همراه ماژول مرده |

### یافته‌های تأیید سالم (بدون نیاز به تغییر)
- **AuthN/Z:** scrypt + `timingSafeEqual`، توکن نشست فقط به‌صورت SHA-256 در DB، کوکی HttpOnly/SameSite/Secure، ابطال نشست‌ها پس از تغییر رمز، setup اتمیک ضد TOCTOU، هم‌ترازی زمان ورود.
- **سطح API:** 34/35 مسیر `sameOriginOk` + rate limit (مسیر ۳۵ = health عمومی و throttle شده)؛ 49 فراخوانی `requireUser`؛ مالکیت در تک‌تک مسیرهای `[id]` (ضد IDOR).
- **AI:** گیت‌وی مرکزی با kill-switch، سهمیه روز/ماه/سیستمی، سقف ورودی/خروجی، trim تاریخچه، گارد فعل حذف/فراموشی، ثبت مصرف بدون محتوا، ضد تزریق با برچسب `<user_data>`.
- **ورودی/خروجی:** `readJsonSafe` با سقف بایتی واقعی، گارد فرمول CSV، فیلتر اسرار در export، ضدتکرار هش پیامک، `safeUrl`.
- **RTL/فارسی:** dir سمت سرور بدون فلاش، preload فونت متغیر، `focus-visible` سراسری، `prefers-reduced-motion` در motion.css و ambient.css.
- **اسکن اسرار:** صفر الگوی توکن/کلید در ۳۵۰ فایل track شده؛ `.env`/`db`/`upload`/`download` خارج از مخزن.

**جمع‌بندی سه‌گانه:** ریسک مرگبار جدید: صفر · فرصت بزرگ ارتقا: مرز خطا/میراث وابستگی‌ها · گلوگاه کارایی: بار اضافی مخزن (رفع شد).

## ۲) تغییرات اعمال‌شده (فاز یک — یک موج)

| کامیت | محور | شرح |
|---|---|---|
| `1835c22` | امنیت | HSTS (max-age 2 سال، includeSubDomains) |
| `c8d8288` | حریم خصوصی | پاک‌سازی کامل AiUsage + ActionLog در «پاک کن» |
| `8ad829f` | UX/a11y | `error.tsx` فارسی (تلاش مجدد/خانه، role=alert) + `loading.tsx` (motion-safe) |
| `707777c` | کارایی/بهداشت | −۷ وابستگی، −۷ کامپوننت مرده، −tailwind.config.ts (دنبالهٔ RT-7) |
| `54a225d` | انتشار | نسخه 1.0.0 + OG/Twitter/metadataBase + CHANGELOG + RELEASE به‌روز |

## ۳) دروازه‌های سبز (مدرک)

- `bun run verify` → typecheck ✓ · eslint ✓ · **155/155 tests ✓ (417 expect)**
- `bun run build` → موفق (standalone)
- اسکن اسرار → CLEAN · salt خط قرمز دست‌نخورده · baseline rc2 صفر رگرسیون
- هدرهای زنده روی سرور: `X-Frame-Options: DENY` · `nosniff` · `Referrer-Policy` · **`Strict-Transport-Security`** · CSP با nonce
- git: درخت تمیز، ۵ کامیت Conventional، push موفق `2017e39..54a225d main`

## ۴) اجرای برنامه

- **:3000** — سرور پیش‌نمایش محیط (سورس جدید، ری‌استارت خودکار پس از تغییر کانفیگ) — `health 200`، `login 200`، مسیر خصوصی `307 → /login`
- **:3100** — build production standalone (راستی‌آزمایی مستقل) — `health 200 (db ok, 6ms)`، `307`، هدرها کامل

## ۵) ریسک‌های باقی‌مانده (همگی Low/Info — برنامه رفع)

1. **Info:** کش نرخ/نشست درون‌حافظه‌ای تک‌نمونه‌ای است — در استقرار چندنمونه‌ای باید به Redis منتقل شود (فعلاً تک‌نمونه‌ای؛ در docs یادداشت شد).
2. **Low:** OG تصویر اختصاصی ندارد (پیش‌نمایش متنی در پیام‌رسان‌ها) — در نسخهٔ بعد تصویر برند ساخته شود.
3. **Low:** تغییرنام مخزن به `Rahyar` همچنان در انتظار اقدام مالک (نیاز به Administration permission یا انجام دستی).
