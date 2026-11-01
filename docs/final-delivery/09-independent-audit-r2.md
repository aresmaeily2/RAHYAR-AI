# 09 — ممیزی مستقل نهایی (Agent 8) — حکم و شواهد

**روش**: Agent 8 مستقل از مجری‌ها، همهٔ ادعاها را با فرمان خام از نو اجرا کرد (git خام، DB فقط-خواندنی، سرور زنده، zip استخراج‌شده) — بدون اعتماد به گزارش‌ها. بودجهٔ ۱۲ curl؛ هیچ تغییر state.

## حکم
- ارزیابی اولیه: **ACCEPT-WITH-BLOCKERS** — ۱۰/۱۲ تأیید کامل، ۱ مسدودکنندهٔ MEDIUM، ۲ مورد PARTIAL جزئی.
- **پس از رفع (همان نشست)**: مسدودکننده رفع شد → وضعیت نهایی: **ACCEPT** (راستی‌آزمایی مجدد: `push guard: OK`).

## ادعاها (نتیجهٔ ممیزی مستقل)
| # | ادعا | نتیجه | شاهد کلیدی |
|---|---|---|---|
| 1 | Git تمیز، HEAD `438d771`+، untrackهای R2 | CONFIRMED | porcelain=0؛ ignored-match سه فایل؛ route مرده حذف |
| 2 | نقشهٔ exposure | CONFIRMED* | C1/C2/C4/C5/C7/C10=0؛ C3=۲۵ (قبلاً ۲۴ نوشته بودیم — فایل ۲۵م `.dockerignore`، context بی‌خطر) |
| 3 | T1–T7 | CONFIRMED | ALL-PASS، exit 0 |
| 4 | typecheck/lint/unit | CONFIRMED | 0/0/۲۲۲=pass |
| 5 | vault + بازیابی مستقل keystore | CONFIRMED | perms 700/600؛ sha256 هر دو = `d4b7169a…` دقیقاً |
| 6 | گارد pre-push | REFUTED→**FIXED** | ابتدا exit 1 به‌خاطر C6 در `live-v2-tests.cjs` (tracked) → اسکراب C6 + commit → **push guard: OK** |
| 7 | health 200 + probes D-1 | CONFIRMED | 401 با XFH / 403 بدون XFH (fail-closed) |
| 8 | لاگین واقعی + tasks/usage | CONFIRMED | 200 + کوکی؛ tasks=0 (E2E تمیز کرده) |
| 9 | بستهٔ تحویل + zip | CONFIRMED | sha256 مطابق manifest؛ **پس از بازسازی: hard-register hits = ZERO**؛ بدون keystore/.env/.evidence/db |
| 10 | بهداشت مستندات (بدون placeholder) | CONFIRMED | grep پاک |
| 11 | sanity DB | CONFIRMED | ۱۴/۱۴ جدول؛ User=1؛ بدون leftover تست |
| 12 | صفحات وب | CONFIRMED* | / با نشست=200 + dir=rtl/fa؛ بی‌نشست=307 (رفتار درست گیت auth) |

## رفع‌های پس از ممیزی
1. **C6** (literal منفیِ ۱۲نویسه‌ای — اثبات‌شده مخالف رمزهای زندهٔ فعلی) از `scripts/live-v2-tests.cjs` اسکراب و commit شد → گارد و exposure map هر دو سبز؛ CSV به‌روز شد (C6: NA→LOCAL_CLEAN).
2. `android/rahyar-release.keystore` chmod → **600** (مشاهدهٔ ممیز).
3. zip مجدداً ساخته شد (`0e0f80062641…`) و manifest نوسازی شد — اسکن مجدد: صفر hit سخت.
4. تاریخچهٔ چت به welcome-only پاک شد (بهداشت دادهٔ تحویل).

## مشاهده‌های غیرمسدودکننده (برای نسخهٔ بعد)
- هرس دوره‌ای Sessionها (۱۲ نشست فعال) — scheduler موجود `pruneExpiredSessions` دارد؛ کافی.
- C3=۲۵ فایل در اسناد ۰۱/۰۵ اصلاح شد (۲۴→۲۵).
- C3 در zip: ۲۹۰ hit در ۲۵ فایل — همه context واژه‌نامه‌ای غیراعتبارنامه‌ای (۳ نمونه‌برداری ممیز: bun.lock متادیتا، fp_of() اسکنر، فهرست دایرکتوری‌ها) — طبق سنت رجیستر غیر-اعتبارنامه‌ای؛ چرخش C3 توسط مالک این باقی‌مانده را هم بی‌اثر می‌کند.

## محدودیت ممیزی
push واقعی اجرا نشد (ممنوعیت تغییر state) — حکم از اجرای دقیق همان ابزار hook استخراج شد. آستانهٔ ۴۰۰KB در اسکن‌ها (همان ابزار رسمی مأموریت).
