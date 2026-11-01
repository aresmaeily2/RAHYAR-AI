# 07 — شواهد اجرای زنده و Preview (Agent 7 + Agent 0)

## اجرای واقعی و قابل تعامل — وضعیت فعلی
- **اپ روی سرور تولیدی standalone در `:3000` در حال اجراست** (health 200، database ok) — Workspace Preview پلتفرم به همین پورت نگاشت می‌شود؛ پنل Preview سمت مالک همان را به‌صورت تعاملی نشان می‌دهد.
- حساب آزمایشی: `owner` — رمز در `download/RahyAr_R2_Final/rahyar-preview-credentials.txt` (خارج از git/گزارش/آرشیو سورس).

## شواهد ثبت‌شده (download/RahyAr_R2_Final/evidence/)
| فایل | محتوا |
|---|---|
| `rahyar-desktop-run.webm` (۲۸s) | ویدئوی اجرای زنده: ورود → امروز → دستیار (پاسخ واقعی مدل) → ساخت/حذف کار → تقویم جلالی → مالی → تنظیمات → تعویض زبان |
| `rahyar-mobile-run.webm` | اجرای موبایل ۳۹۰×۸۴۴ |
| `01-today-fa.png` … `08-mobile-390-fa.png` | ۸ اسکرین‌شات از مسیرهای بالا (RTL، جلالی، EN/LTR، موبایل) |
| `e2e-result.json` | خروجی ماشینی: aiIsRealModel=true، overflow=0، pageErrors=0، langAfterRestore=fa |

## صادقانه دربارهٔ «لینک Preview»
- سرور تعاملی از داخل sandbox روی :3000 پاسخ می‌دهد و کل مسیرهای اصلی با مرورگر واقعی (Chromium headless) تمرین و ثبت شد.
- **استخراج URL عمومی از داخل sandbox ممکن نیست** (تأیید دوباره در R2؛ نشست قبل: هر سه candidate → 404 بیرونی). URL قطعی را فقط پنل Workspace مالک می‌دهد (B-3 در backlog). این محدودیتِ پلتفرم است، نه محصول؛ same-origin app برای همان مسیر اصلاح و با probe تأیید شد (P-A/P-B).
- «Open in New Tab» سمت کلاینت مالک است.

## آنچه E2E اثبات می‌کند
1. ورود واقعی با session کوکی؛ 2. پاسخ **واقعیِ** مدل میزبان (نه قواعد محلی)؛ 3. CRUD کار از UI + API با تمیزکاری کامل؛ 4. تقویم جلالی؛ 5. مالی؛ 6. تعویض زبان fa↔en با dir صحیح و بازگشت پایدار؛ 7. موبایل بدون سرریز؛ 8. صفر pageerror / failed-request در کل مسیر.

## محدودیت‌های اجرای فعلی
- ویدئو به‌جای mp4 با **WebM** است (ffmpeg sandbox بدون muxer تصویری) — در Chrome/Firefox/Edge مستقیم پخش می‌شود.
- دو خط 401 در کنسول = probe نشستِ صفحهٔ ورود پیش از لاگین (رفتار درست 401 است).
- APK جدید قابل ساخت نبود (SDK نیست) — بخش ۶.
