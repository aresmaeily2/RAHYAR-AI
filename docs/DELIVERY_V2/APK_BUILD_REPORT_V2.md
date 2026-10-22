# گزارش ساخت و صحت‌سنجی APKهای نسخهٔ ۲٫۰٫۰ — رهیار (دو ویراست)

تاریخ ساخت: ۲۰۲۶–۱۰–۲۲ (بازسازی دوم) | وضعیت: Release واقعی، امضاشده، صحت‌سنجی‌شده

> **یادداشت شفاف بازسازی دوم:** محیط ساخت پس از تحویل قبلی بار دیگر Reset شد و باینری‌ها، کلید امضا و کیت امضای پیشین از دست رفتند؛ بنابراین هر دو APK برای سومین بار از **همان سورس حسابرسی‌شدهٔ v2.0.0** ساخته شدند (`git diff 6a18922..HEAD -- android/` = خالی — بدون هیچ تغییری در کد اندروید). هش فایل‌ها و گواهی امضا نسبت به گزارش قبلی **متفاوت‌اند** (بازسازی + کلید جدید) و مقادیر همین گزارش مرجع رسمی هستند. APKهای قبلی هرگز روی دستگاه نصب نشده بودند؛ تغییر گواهی هیچ نصب موجودی را نمی‌شکند. این‌بار تحویل از طریق GOFILE (لینک‌های واقعی و تست‌شده) انجام می‌شود.

## ۱) هویت فایل‌ها (خروجی aapt2 dump badging)

| مشخصه | RahyAr User | RahyAr Owner |
|---|---|---|
| نام فایل | `rahyar-user-v2.0.0.apk` | `rahyar-owner-v2.0.0.apk` |
| شناسه بسته | `com.rahyarai.app` | `com.rahyarai.app.owner` |
| versionCode | 20 | 21 |
| versionName | 2.0.0 | 2.0.0 |
| برچسب اپ | «رهیار» | «رهیار مالک» |
| حجم | 406,345 بایت | 406,349 بایت |
| minSdk / targetSdk | 24 / 34 | 24 / 34 |
| اکتیویتی آغازین | `com.rahyarai.app.MainActivity` | `com.rahyarai.app.MainActivity` |
| **SHA-256 فایل (مرجع رسمی)** | `2a58210f1cd0fcfaa9bffde05986f3f35455ada63d21ec6068ae73d765f101db` | `fa18b1fdfbf3b996b1d5a335dd05d3e8cab6c4b714615cfcbab149a9f4222de6` |

مجوزها (هر دو): `INTERNET`، `POST_NOTIFICATIONS`، `SCHEDULE_EXACT_ALARM`، `RECEIVE_BOOT_COMPLETED`، `VIBRATE` — حداقلی و همگام با مهندسی v2.0.0 (پل گفتار/TTS سیستمی، یادآور AlarmManager، بوت‌گیر).

## ۲) ابزار و منبع ساخت — قابل حسابرسی

- سورس: `main` مخزن — کد اندروید دقیقاً برابر کامیت `6a18922` (انتشار v2.0.0)؛ خروجی `git diff 6a18922..HEAD -- android/` خالی است
- AGP 8.7.3 + Gradle 8.10.2 (wrapper) + JDK 21 (Temurin 21.0.12.1، `/home/z/jdk`)
- Build-Tools r34 و Platform android-34ext7_r03 — دانلود رسمی از `dl.google.com` با SHA-256 ثبت‌شده در `artifacts/reports/android-tools-provenance.txt`
- نکته: این APKها نه پوستهٔ 1.2.0 هستند و نه فایل تغییرنام‌یافته؛ badging بالا راستی‌آزمایی می‌شود و SHA هر دو با هر APK قدیمی متفاوت است.

## ۳) امضا

- کلید انتشار: RSA-4096، self-signed، `CN=RahyAr Release, O=RahyAr, L=Tehran, C=IR`
- **گواهی SHA-256 (کلید بازسازی‌شدهٔ ۲۰۲۶–۱۰–۲۲):** `26eadb2d95f7c59e4bac14077852b7b9d40c2c108888d9a660a443d158c31843` (SHA-1: `76feaf49e2b57a8dd1e166d6bac9548575abdfc0`)
- الگوریتم: SHA384withRSA — اعتبار ۳۰ سال (تا ۲۰۵۶)
- طرح امضا: v2 (APK Signature Scheme v2) — `apksigner verify` = Verifies؛ `zipalign -c 4` = موفق
- کیت امضا: `rahyar-release-signing-kit.zip.enc` (keystore + keystore.properties + گواهی + راهنما؛ AES-256-CBC/PBKDF2-200k) — **فقط رمزنگاری‌شده** روی GOFILE می‌رود؛ رمز گشایش در پیام خصوصی به مالک. نسخهٔ باز فقط در فضای کاری خارج از گیت (`artifacts/signing/` و `backups/`) نگهداری می‌شود. گم‌شدن کیت یعنی امکان به‌روزرسانی روی همان بسته بدون حذف/نصب مجدد وجود ندارد.

## ۴) تست

- JVM واحد: هر دو ویراست **49/49 سبز** (AppConfig، OfflineContract، RahyarNativeBridge، ReminderAlarms، VoiceEvents، RahyarCore، LocalStore) — خروجی واقعی gradle این جلسه: `tests=49 failures=0 errors=0` برای هر دو flavor
- سمت وب: 181/181 سبز (پایهٔ محصول که WebView بارگذاری می‌کند)
- نصب و اجرای واقعی روی دستگاه فیزیکی: **آزموده‌نشده روی دستگاه** — محیط ساخت بدون دستگاه/امولاتور است (صادقانه ثبت می‌شود؛ طبق دستور، ادعای بدون سند ممنوع). مانع شناخته‌شده‌ای برای نصب وجود ندارد: امضای v2 معتبر، zipalign صحیح، minSdk≥24.

## ۵) سرور و اتصال

- سیاست اتصال APK: آدرس سرور فقط https و بدون localhost؛ کاربر آن را یک‌بار در صفحهٔ ورود وارد می‌کند و در Android Keystore رمزنگاری‌شده ذخیره می‌شود. هیچ سروری داخل APK هاردکد نشده (تزریق build-time از `RAHYAR_DEFAULT_SERVER` ممکن است).
- نقش‌ها سمت سرور کنترل می‌شود (نه در UI): بدون نشست `/api/users` → 401؛ بدون نقش OWNER → 403؛ نشست با scrypt + توکن SHA-256 در DB؛ هیچ رمز/توکنی در APK نیست.

## ۶) سورس و مخزن

- مخزن remote: `aresmaeily2/HAMYAR-AI` (خصوصی). وضعیت push در هر جلسه به‌صورت واقعی (موفق/خطا) در گزارش تحویل ثبت می‌شود؛ در نبود اعتبارنامهٔ معتبر، سورس کامل با نام `rahyar-source-v2.0.0.zip` (با مانیفست و اسکن امنیتی) از طریق GOFILE و Workspace تحویل می‌شود.
- کلید امضا و رمزها عمداً خارج از گیت‌اند (`.gitignore: /android/keystore/ ، /android/keystore.properties ، /artifacts/ ، /download/ ، backups/`).

## ۷) فایل‌های تحویلی (GOFILE — لینک‌های تست‌شده در پیام تحویل)

| فایل | کاربرد |
|---|---|
| `rahyar-user-v2.0.0.apk` | نصب نسخهٔ کاربر |
| `rahyar-owner-v2.0.0.apk` | نصب نسخهٔ مالک |
| `rahyar-source-v2.0.0.zip` | سورس کامل HEAD با مانیفست |
| `rahyar-v2.0.0-sha256.txt` | اثر انگشت همهٔ فایل‌ها (SHA256SUMS) |
| `rahyar-v2.0.0-delivery-report.docx` | گزارش نهایی تحویل (DOCX فارسی RTL) |
| `rahyar-release-signing-kit.zip.enc` | کیت امضا — فقط رمزنگاری‌شده (رمز گشایش: پیام خصوصی مالک) |
| `RahyAr-v2.0.0-bundle.zip` | همهٔ موارد بالا در یک فایل (دانلود یکجا) |
