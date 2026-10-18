# گزارش فنی بازطراحی کامل UI/UX — رهیار ۴.۰ «شیشه‌ی آرام»

تاریخ: ۱۴۰۵/۰۷/۲۶ — Redesign 1.0 + Redesign 2.0
قاعده طلایی رعایت‌شده: **هیچ تغییری در منطق کسب‌وکار، APIهای موجود، مدل داده، امنیت و معماری** —
تنها افزودنی مستند: `GET /api/weather` (اختیاری، opt-in، بدون کلید).

---

## ۱) فایل‌های جدید

| فایل | نقش |
|---|---|
| `src/styles/tokens.css` | Design Tokens خام (تایپ، شعاع، فاصله، بلور، عمق، حرکت، شفافیت، خط، هاله) |
| `src/styles/themes.css` | ۸ تم × روشن/تیره + ۷ اکسنت + نگاشت shadcn |
| `src/styles/glass.css` | سه سطح شیشه + کارت/کنترل شناور + چیپ‌های توکن‌دار (داخل `@layer components`) |
| `src/styles/motion.css` | پس‌زمینه زنده، ذرات، گلبرگ/برگ، حالت تمرکز، مقیاس متن، reduced-motion |
| `src/lib/appearance.ts` | ثابت‌ها و ابزار تم/اکسنت/مقیاس متن |
| `src/lib/appearance-store.ts` | استور zustand ظاهر |
| `src/lib/feedback.ts` | صداهای UI سینتی + هپتیک + پد محیطی تمرکز |
| `src/lib/quotes.ts` | نقل‌قول روزانه قطعی (۱۴ عبارت) |
| `src/app/api/weather/route.ts` | آب‌وهوای اختیاری (Open-Meteo، کش ۳۰ دقیقه، سقف ۱۰/min، مالک‌سنجیده) |
| `src/components/ara/ambient-scene.tsx` | صحنه‌های SVG پارامتریک ۸ تم + نویز + ذرات |
| `src/components/ara/ai-orb.tsx` | اورب دستیار + نوار موج صدا |
| `src/components/ara/empty-state.tsx` | ۱۲ تصویرسازی SVG + EmptyState متحرک |
| `src/components/ara/appearance-picker.tsx` | انتخاب تم/اکسنت/اندازه متن |
| `src/components/ara/home-cards.tsx` | نوار نقل‌قول + چیپ آب‌وهوا |
| `public/appearance-boot.js` | bootstrap ظاهر (خارجی؛ بدون nonce؛ بدون تداخل hydration) |
| `public/fonts/vazirmatn-var.woff2` `estedad-var.woff2` | فونت‌های Variable خودمیزبان |

## ۲) فایل‌های بازطراحی‌شده (فهرست کامل کامپوننت‌ها)

۱. `app-shell.tsx` — سایدبار شیشه‌ای شناور، قرص فعال متحرک، داک موبایل معلق، FAB الاستیک، لوگوی اورب
۲. `today-view.tsx` — خانه جدید: هیرو + WeatherChip + QuoteStrip + نوار آمار شیشه‌ای + میانبرها + فعالیت اخیر + EmptyState
۳. `task-item.tsx` — حلقه اولویت توکن‌دار، کنتراست AA، بازخورد صوتی/هپتیک تکمیل
۴. `tasks-view.tsx` — فیلتر/برچسب شیشه‌ای، EmptyState تصویری
۵. `calendar-view.tsx` — پنل شیشه‌ای ماه، اکسنت‌های انتخاب/امروز، نقطه‌های توکن‌دار
۶. `plan-view.tsx` — کارت‌های شیشه‌ای، هیت‌مپ/نمودار توکن‌دار، EmptyState (تقویم/زنگ)
۷. `chat-view.tsx` — اورب + وضعیت زنده + VoiceWave، حباب thinking شیشه‌ای، ورودی شیشه‌ای، چیپ‌ها
۸. `focus-timer.tsx` — شیشه عمیق، هاله تنفس، صدای پایان، صدای محیطی اختیاری، `data-focus-mode`
۹. `command-palette.tsx` — شیشه عمیق، اکشن‌های توکن‌دار
۱۰. `task-detail.tsx` — شیت شیشه‌ای، اولویت‌های توکن‌دار
۱۱. `profile-dialog.tsx` — شیشه‌ای + WeatherRow + سوییچ صداها + AppearancePicker
۱۲. `quick-add.tsx` / `quick-add-inline.tsx` — میله شیشه‌ای + دکمه برند فنری
۱۳. `chat-action-chips.tsx` / `chat-memory-sheet.tsx` / `connections-dialog.tsx` / `reminder-settings-dialog.tsx` — توکن‌سازی کامل رنگ‌ها
۱۴. `ripple.tsx` — بدون تغییر منطق (سازگار با سیستم جدید)
۱۵. `motion.ts` — زبان حرکت هم‌تراز توکن‌ها + spring الاستیک
۱۶. `progress-ring.tsx` — بدون تغییر (توکن‌محور از قبل)
۱۷. `app/login/page.tsx` — صحنه محیطی + اورب + کارت شیشه‌ای
۱۸. `app/layout.tsx` — preload فونت‌ها + bootstrap ظاهر + themeColor
۱۹. `app/globals.css` — بازنویسی کامل به‌عنوان لایه اتصال
۲۰. `middleware.ts` — بدون تغییر (CSP موجود با فونت/اسکریپت خارجی سازگار بود)

## ۳) تصمیم‌های مهندسی مهم

1. **لایه‌بندی CSS**: قواعد سیستم داخل `@layer components` تا یوتیلیتی‌های Tailwind (مثل `fixed`)
   همیشه برنده باشند — رفع باگ «ناوبری موبایل position:relative می‌شد».
2. **اسکریپت bootstrap خارجی**: inline nonce'd در dev باعث mismatch hydration می‌شد
   (Flight payload نونس خالی) → فایل استاتیک `/appearance-boot.js` با `script-src 'self'` —
   صفر خطای hydration، بدون بازکردن CSP.
3. **دو محور مستقل تم/اکسنت**: خامِ تم (کاغذ/صحنه) جدا از خامِ اکسنت (مقیاس ۳۰۰–۷۰۰) →
   ۸×۲×۷=۱۱۲ ترکیب بدون تکرار کد.
4. **کنتراست AA**: `--primary-text` (اکسنت‌۷۰۰/۳۰۰) برای متن رنگی؛ muted-foreground به ۶۴٪ جوهر
   بالا کشیده شد؛ آلفاهای کاهنده متن حذف شدند → Lighthouse A11y از ۹۶ به **۱۰۰**.
5. **حالت تمرکز**: صرفاً یک attribute روی `<html>` — CSS مراقب آرام‌سازی است؛ منطق تایمر دست‌نخورده.
6. **External store برای آب‌وهوا**: به‌جای setState در effect (سازگار با قواعد React Compiler).
7. **getSnapshot پایدار**: تنظیمات آب‌وهوا در سطح ماژول کش می‌شوند (جلوگیری از حلقه بی‌نهایت).

## ۴) موارد اصلاح‌شده حین کار (یافته‌های آزمون مرورگری)

- کرش کلاینت «Maximum update depth» → کش پایدار تنظیم آب‌وهوا
- HMR انجماد + نشان Issue در dev → ریشه hydration → اسکریپت خارجی
- شدت بیش از حد صحنه → همه آلفاها به بازه حس ۷–۱۵٪ اصلاح شد
- هدرنگی‌های rose/amber/teal-600 پراکنده → ۱۰۰٪ توکن‌سازی شد

## ۵) ممنوعیت‌های رعایت‌شده

بدون انیمیشن شلوغ (حداکثر ۵ ذره + ۶ گلبرگ)، بدون Blur بیش از حد (سقف ۲۸px سطح ۳)،
بدون Glow اغراق‌آمیز (شدت توکن‌محور ۳۵٪)، بدون رنگ اشباع برای سطوح بزرگ،
بدون تصویر پشت متن، بدون شیشه ناخوانا (آلفای ≥ ۵۰٪ پشت متن‌های اصلی)، بدون Emoji/PNG تزئینی.
