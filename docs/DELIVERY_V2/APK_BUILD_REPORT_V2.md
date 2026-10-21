# گزارش ساخت و صحت‌سنجی APKهای نسخهٔ ۲٫۰٫۰ — رهیار (دو ویراست)

تاریخ ساخت: ۲۰۲۶–۱۰–۲۱ (بازسازی) | وضعیت: Release واقعی، امضاشده، صحت‌سنجی‌شده

> **یادداشت شفاف بازسازی:** محیط ساخت پس از تحویل قبلی Reset شد و باینری‌های قبلی (هر دو APK و کلید امضا) از دست رفتند؛ بنابراین هر دو APK از **همان سورس حسابرسی‌شدهٔ v2.0.0** (`git diff 6a18922..HEAD -- android/` = خالی — بدون هیچ تغییری در کد اندروید) دوباره ساخته شدند. هش فایل‌ها و گواهی امضا نسبت به گزارش قبلی **متفاوت‌اند** (بازسازی + کلید جدید) و مقادیر همین گزارش مرجع رسمی هستند. APKهای قبلی هرگز روی دستگاه نصب نشده بودند؛ تغییر گواهی هیچ نصب موجودی را نمی‌شکند.

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
| **SHA-256 فایل (مرجع رسمی)** | `87f0b93c9a46c766d4cb348694b9155745944953567abb4b7964bff70acc3ffb` | `9cf533e8a18d11ce526db5941fcc0d73f02a778bc817906f28e5a2e71a72507e` |

مجوزها (هر دو): `INTERNET`، `POST_NOTIFICATIONS`، `SCHEDULE_EXACT_ALARM`، `RECEIVE_BOOT_COMPLETED`، `VIBRATE` — حداقلی و همگام با مهندسی v2.0.0 (پل گفتار/TTS سیستمی، یادآور AlarmManager، بوت‌گیر).

## ۲) ابزار و منبع ساخت — قابل حسابرسی

- سورس: `main` مخزن — کد اندروید دقیقاً برابر کامیت `6a18922` (انتشار v2.0.0)؛ خروجی `git diff 6a18922..HEAD -- android/` خالی است
- AGP 8.7.3 + Gradle 8.10.2 (wrapper) + JDK 21 (Temurin، `/home/z/jdk`)
- Build-Tools r34 و Platform android-34ext7_r03 — دانلود رسمی از `dl.google.com` با SHA-256 ثبت‌شده در `artifacts/reports/android-tools-provenance.txt`
- نکته: این APKها نه پوستهٔ 1.2.0 هستند و نه فایل تغییرنام‌یافته؛ badging بالا راستی‌آزمایی می‌شود و SHA هر دو با هر APK قدیمی متفاوت است.

## ۳) امضا

- کلید انتشار: RSA-4096، self-signed، `CN=RahyAr Release, O=RahyAr, L=Tehran, C=IR`
- **گواهی SHA-256 (کلید بازسازی‌شدهٔ ۲۰۲۶–۱۰–۲۱):** `bb58d25ead877bd193e91b53befca158c577e6d79ab7da5fccde998d1d2cd917` (SHA-1: `2ff7fdfce4df162c8f24e59393efb127e0a96edc`)
- الگوریتم: SHA384withRSA — اعتبار ۳۰ سال (تا ۲۰۵۶)
- طرح امضا: v2 (APK Signature Scheme v2) — `apksigner verify` = Verifies؛ `zipalign -c 4` = موفق
- کیت امضا: `rahyar-release-signing-kit.zip.enc` (keystore + keystore.properties + راهنما؛ AES-256-CBC/PBKDF2-200k) — **فقط رمزنگاری‌شده** روی لینک عمومی می‌رود؛ رمز گشایش در پیام خصوصی به مالک. نسخهٔ باز فقط در فضای کاری خارج از گیت (`artifacts/signing/`) نگهداری می‌شود. گم‌شدن کیت یعنی امکان به‌روزرسانی روی همان بسته بدون حذف/نصب مجدد وجود ندارد.

## ۴) تست

- JVM واحد: هر دو ویراست **49/49 سبز** (شامل AppConfig، OfflineContract، RahyarNativeBridge، ReminderAlarms، VoiceEvents، RahyarCore، LocalStore)
- سمت وب: 181/181 سبز (پایهٔ محصول که WebView بارگذاری می‌کند)
- نصب و اجرای واقعی روی دستگاه فیزیکی: **آزموده‌نشده روی دستگاه** — محیط ساخت بدون دستگاه/امولاتور است (صادقانه ثبت می‌شود؛ طبق دستور، ادعای بدون سند ممنوع). مانع شناخته‌شده‌ای برای نصب وجود ندارد: امضای v2 معتبر، zipalign صحیح، minSdk≥24.

## ۵) سرور و اتصال

- سرور محصول live و healthy است (`/api/health` = `{"status":"ok","database":"ok"}`)
- سیاست اتصال APK: آدرس سرور فقط https و بدون localhost؛ کاربر آن را یک‌بار در صفحهٔ ورود وارد می‌کند و در Android Keystore رمزنگاری‌شده ذخیره می‌شود. هیچ سروری داخل APK هاردکد نشده (تزریق build-time از `RAHYAR_DEFAULT_SERVER` ممکن است).
- نقش‌ها سمت سرور کنترل می‌شود (نه در UI): بدون نشست `/api/users` → 401؛ بدون نقش OWNER → 403؛ نشست با scrypt + توکن SHA-256 در DB؛ هیچ رمز/توکنی در APK نیست.

## ۶) سورس و مخزن

- Push به GitHub `aresmaeily2`: در جریان — مخزن remote فعلی `HAMYAR-AI` است؛ تلاش push با توکن موجود پس از تکمیل تحویل انجام و نتیجهٔ واقعی (موفق/خطا) صادقانه ثبت می‌شود.
- کلید امضا و رمزها عمداً خارج از گیت‌اند (`.gitignore: /android/keystore/ ، /android/keystore.properties ، /artifacts/ ، /download/`).

## ۷) فایل‌های تحویلی

| فایل | کاربرد |
|---|---|
| `rahyar-user-v2.0.0.apk` | نصب نسخهٔ کاربر |
| `rahyar-owner-v2.0.0.apk` | نصب نسخهٔ مالک |
| `rahyar-v2.0.0-sha256.txt` | اثر انگشت همهٔ فایل‌ها |
| `rahyar-v2.0.0-delivery-report.docx` | گزارش نهایی تحویل (DOCX فارسی RTL) |
| `rahyar-release-signing-kit.zip.enc` | کیت امضا — فقط رمزنگاری‌شده (رمز گشایش: پیام خصوصی مالک) |
