# گزارش ساخت و صحت‌سنجی APKهای نسخهٔ ۲٫۰٫۰ — رهیار (دو ویراست)

تاریخ ساخت: ۲۰۲۶–۱۰–۲۱ | وضعیت: Release واقعی، امضاشده، صحت‌سنجی‌شده

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
| SHA-256 فایل | `78fffdbb922847db159eb5015ef0fc0fc20021acbed088d339387e637e59b523` | `9fd87170f2353ea034684e5db0e49cafe08d92bc4c9a455b03d742603efbc7d0` |

مجوزها (هر دو): `INTERNET`، `POST_NOTIFICATIONS`، `SCHEDULE_EXACT_ALARM`، `RECEIVE_BOOT_COMPLETED`، `VIBRATE` — حداقلی و همگام با مهندسی v2.0.0 (پل گفتار/TTS سیستمی، یادآور AlarmManager، بوت‌گیر).

## ۲) ابزار و منبع ساخت — قابل حسابرسی

- سورس: commit `5fa3648` (محصول v2.0.0) + `6a18922` (پیکربندی امضا/توزیع) — همان شاخهٔ main مخزن
- AGP 8.7.3 + Gradle 8.10.2 + JDK 21 (Temurin)
- Build-Tools r34 و Platform android-34ext7_r03 — دانلود رسمی از `dl.google.com` با SHA-256 ثبت‌شده در `artifacts/reports/android-tools-provenance.txt`
- نکته: این APKها نه پوستهٔ 1.2.0 هستند و نه فایل تغییرنام‌یافته؛ badging بالا راستی‌آزمایی می‌شود و SHA هر دو با هر APK قدیمی متفاوت است.

## ۳) امضا

- کلید انتشار: RSA-4096، self-signed، `CN=RahyAr Release, O=RahyAr, L=Tehran, C=IR`
- گواهی SHA-256: `14c8f6a5f66f5c99b8f664dd2888a42e4ef809e8a83363a87c76f8255fc473b5` (SHA-1: `90f8e3a8a3a6674dcd7b46ebc6ffa70879f50f6d`)
- الگوریتم: SHA384withRSA — اعتبار تا ۱۴۱۰/۰۷ (2056-10-13)
- طرح امضا: v2 (APK Signature Scheme v2) — با minSdk 24 (اندروید ۷) سازگار و کافی؛ `apksigner verify` = Verifies؛ `zipalign -c 4` = موفق
- کیت امضا: `rahyar-release-signing-kit.zip` (keystore + keystore.properties + راهنما) — فقط نزد مالک نگه داشته شود؛ گم‌شدن آن یعنی امکان به‌روزرسانی روی همان بسته بدون حذف/نصب مجدد وجود ندارد.

## ۴) تست

- JVM واحد: هر دو ویراست 49/49 سبز (شامل AppConfig، OfflineContract، RahyarNativeBridge، ReminderAlarms، VoiceEvents، RahyarCore، LocalStore)
- سمت وب: 181/181 سبز (پایهٔ محصول که WebView بارگذاری می‌کند)
- نصب و اجرای واقعی روی دستگاه فیزیکی: **آزموده‌نشده روی دستگاه** — محیط ساخت بدون دستگاه/امولاتور است (صادقانه ثبت می‌شود؛ طبق دستور، ادعای بدون سند ممنوع). مانع شناخته‌شده‌ای برای نصب وجود ندارد: امضای v2 معتبر، zipalign صحیح، minSdk≥24.

## ۵) سرور و اتصال

- سرور محصول در محیط استقرار فعلی live و healthy است (`/api/health` = `{"status":"ok","database":"ok"}`)
- سیاست اتصال APK: آدرس سرور فقط https و بدون localhost؛ کاربر آن را یک‌بار در صفحهٔ ورود وارد می‌کند و در Android Keystore رمزنگاری‌شده ذخیره می‌شود. هیچ سروری داخل APK هاردکد نشده (تزریق build-time از `RAHYAR_DEFAULT_SERVER` ممکن است).
- نقش‌ها سمت سرور کنترل می‌شود (نه در UI): بدون نشست `/api/users` → 401 (پروب زنده)، بدون نقش OWNER → 403؛ نشست با scrypt + توکن SHA-256 در DB؛ هیچ رمز/توکنی در APK نیست.

## ۶) سورس و مخزن

- تاریخچهٔ کامل در `rahyar-v2.0.0-source.bundle` (git bundle — با `git bundle verify` و `git clone rahyar-v2.0.0-source.bundle` قابل بازیابی) — SHA-256: `6ed2d3d7b4976ff64fdc35e41ad6f5624f054fc6e7506edb2a55f3b3e21fc1b7`
- Push به GitHub `aresmaeily2/RahyAr`: **انجام نشد** — محیط ساخت هیچ اعتبارنامهٔ GitHub ندارد (خطا: `could not read Username for 'https://github.com'`). دستور معادل پس از ایجاد مخزن خالی:
  ```bash
  git remote add rahyar https://github.com/aresmaeily2/RahyAr.git
  git push rahyar main
  ```
- کلید امضا و رمزها عمداً خارج از گیت‌اند (`.gitignore`).

## ۷) فایل‌های تحویلی

| فایل | کاربرد |
|---|---|
| `rahyar-user-v2.0.0.apk` | نصب نسخهٔ کاربر |
| `rahyar-owner-v2.0.0.apk` | نصب نسخهٔ مالک |
| `rahyar-v2.0.0-sha256.txt` | اثر انگشت همهٔ فایل‌ها |
| `rahyar-release-signing-kit.zip` | کلید امضا + رمز + راهنما (محرمانه) |
| `rahyar-v2.0.0-source.bundle` | سورس کامل با تاریخچهٔ گیت |
