# فهرست نهایی اقلام تحویل — RahyAr v2.0.0 (به‌روزشده: بازسازی Release ۲۰۲۶–۱۰–۲۱)

> این سند پس از Reset محیط و بازسازی هر دو APK امضاشدهٔ Release به‌روزرسانی شده است.
> مرجع رسمی مشخصات و هش‌ها: `docs/DELIVERY_V2/APK_BUILD_REPORT_V2.md` و فایل `rahyar-v2.0.0-sha256.txt`.

| # | قلم | محل / وضعیت |
|---|---|---|
| ۱ | APK نسخهٔ User (Release امضاشده) | `rahyar-user-v2.0.0.apk` — `com.rahyarai.app` vc20 — SHA-256 `87f0b93c…70acc3ffb` |
| ۲ | APK نسخهٔ Owner (Release امضاشده) | `rahyar-owner-v2.0.0.apk` — `com.rahyarai.app.owner` vc21 — SHA-256 `9cf533e8…603efbc7d0` |
| ۳ | مسیر دانلود کامل HTTPS | `https://preview-7317dfe8-c881-45b0-977a-9099236e9ff7.space-z.ai/api/download/<نام‌فایل>` — بدون نشست، فقط سفید‌لیست ۵ نام مشخص؛ هر مسیر دیگر 404 |
| ۴ | گزارش نهایی DOCX (فارسی RTL) | `rahyar-v2.0.0-delivery-report.docx` — تولیدشده با `scripts/gen-apk-delivery-report.js` |
| ۵ | اثر انگشت رسمی فایل‌ها | `rahyar-v2.0.0-sha256.txt` (همان مسیر دانلود) |
| ۶ | کیت امضا | `rahyar-release-signing-kit.zip.enc` — فقط رمزنگاری‌شده (AES-256-CBC/PBKDF2)؛ رمز گشایش فقط در پیام خصوصی مالک؛ نسخهٔ باز فقط در `artifacts/signing/` خارج از گیت |
| ۷ | سورس متناظر | مخزن خصوصی `aresmaeily2/HAMYAR-AI` — شاخهٔ main = `fc8a64a` (push و راستی‌آزمایی‌شده با ls-remote)؛ کد اندروید بایت‌به‌بایت برابر کامیت انتشار `6a18922` |
| ۸ | گزارش ممیزی تطبیقی | `docs/DELIVERY_V2/FEATURES_MATRIX_V2.md` |
| ۹ | ماتریس قابلیت‌ها + وضعیت آزمون | همان سند (ستون وضعیت با واژگان قراردادی) |
| ۱۰ | گزارش امنیت و نقش‌ها | `docs/DELIVERY_V2/SECURITY_REPORT_V2.md` |
| ۱۱ | راهنمای نصب و ورود | `docs/DELIVERY_V2/INSTALL_GUIDE_V2_FA.md` |
| ۱۲ | راهنمای استقرار سرور | `docs/DELIVERY_V2/DEPLOYMENT_V2_FA.md` |
| ۱۳ | گزارش آزمون‌ها | `docs/DELIVERY_V2/TEST_REPORT_V2.md` + ۴۹/۴۹ JVM و ۱۸۱/۱۸۱ وب (اجرای مجدد ۲۰۲۶–۱۰–۲۱) |
| ۱۴ | محدودیت‌های باقی‌مانده | `docs/DELIVERY_V2/LIMITATIONS_V2_FA.md` + «آزموده‌نشده روی دستگاه» برای نصب واقعی |

## وضعیت گیت‌هاب — به‌روزرسانی ۲۰۲۶–۱۰–۲۱

**Push انجام شد** — توکن fine-grained مالک در این جلسه با api.github.com تأیید شد (`login: aresmaeily2`) و push واقعی روی مخزن خصوصی `aresmaeily2/HAMYAR-AI` انجام شد:

```
git push → ed9ec2d..fc8a64a  main -> main
git ls-remote refs/heads/main → fc8a64a9c883 (تأیید سمت سرور)
```

- مخزن خصوصی است و فقط با حساب مالک دیده می‌شود؛ در صورت تمایل از Settings مخزن به `RahyAr` تغییر نام دهید.
- هیچ کلید/توکنی در تاریخچهٔ گیت نیست (بررسی شد: هیچ فایلی از `upload/` یا keystore در هیچ کامیتِ track نشده است).

## وضعیت لینک دانلود

دانلود از سرور زندهٔ خود محصول انجام می‌شود (بدون میزبان واسطهٔ شخص ثالث): مسیر `/api/download/<نام‌فایل>` با سفید‌لیست دقیق در `src/app/api/download/[file]/route.ts`؛ آدرس کامل در پیام تحویل آمده است. کیت امضا طبق دستور مالک فقط رمزنگاری‌شده روی این مسیر قرار دارد.
