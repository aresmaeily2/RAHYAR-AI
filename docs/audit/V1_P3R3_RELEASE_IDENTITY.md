# V1-P3-R3 — هویت انتشار (Release Identity) — بند ۷ مأموریت

**وضعیت نهایی: RELEASE UPGRADE = BLOCKED (کلید release در محیط اجرا از دست رفته؛ طبق دستور مالک هیچ کلید جدیدی ساخته نشد). بیلد Debug برای پذیرش دستگاهی ساخته و ثبت شد.**

## ۱. مرجع هویت (از گزارش‌های P2/P3)

| مرجع | مقدار |
|---|---|
| گواهی release | `CN=RahyAr, O=RahyAr, C=IR` |
| SHA-256 گواهی (ثبت‌شده در V1_P2_FINAL_REPORT.md §84) | `598facd4333df143612fde4bf4d3bc7990ec4a71005a3f7ff582e82c19b16d2c` |
| محل keystore | `backups/android-release-keystore/rahyar-release.keystore` (خارج از Git، chmod 600) |

## ۲. وضعیت واقعی این محیط (صادقانه)

- پوشهٔ `backups/` و همهٔ محتویات آن + `artifacts/android-build/tools/` + `artifacts/credentials/` + APKهای v2.4.0 قبلی در بازیافت/بازنشانی sandbox از بین رفتند (رفتار مستند محیط از فازهای قبلی: پروسه‌ها و مسیرهای untracked بین جلسات ماندگار نیستند).
- **هیچ keystore یا APK امضاشده با گواهی مرجع در این محیط موجود نیست.**
- طبق بند ۷ مأموریت (اگر کلید قبلی وجود ندارد: توقف ارتقا، ساخت کلید جدید ممنوع، درخواست بازیابی از مالک):
  - اسکریپت v14 با سیاست fail-closed ساخته شد — هرگز کلید تولید نمی‌کند.
  - probe واقعی: `bash scripts/build-android-apk-v14.sh --release` با نبود کلید → `exit 42` + پیام `RELEASE_KEY_MISSING_OR_MISMATCH` — بدون تولید هیچ کلیدی (`evidence/r3_release_gate_probe.txt`).

## ۳. خروجی انتخاب‌شده (بند ۷.۹ — بازتولید بی‌دلیل ممنوع)

انتخاب: فقط **Debug دو فلیور (user vc28 + owner vc29)** از HEAD شاخهٔ r3 — برای پذیرش دستگاهی اصلاحات P0/P1 مالک. دلیل: release بدون کلید مرجع ممنوع است و ۴ APK قدیمی بدون دلیل بازتولید نمی‌شوند.

| APK (از همین درخت r3) | SHA-256 |
|---|---|
| (در commit نهایی ثبت می‌شود — به evidence/r3_build_sha256.txt مراجعه کنید؛ کلید debug هر اجرا ephemeral است و SHA بین اجراها تغییر می‌کند — این طبیعی و مستند است) | |

نکتهٔ امضا: APKهای debug با **کلید debug موقتیِ همان اجرا** امضا شده‌اند (fail-closed، رمز فقط در حافظهٔ همان اجرا). این APKها «هویت ارتقایی» ندارند و فقط برای نصب/آزمون تازهٔ دستگاهی مالک‌اند — نه انتشار.

## ۴. چک‌های خط لولهٔ v14 (همهٔ اجراها OK)

- منبع نسخه از `android/app/build.gradle` خوانده شد: VN=2.4.0، vc28/vc29
- badging: package/label/minSdk 24/targetSdk 34 صحیح؛ permissions داخل APK = ۹ = منبع (`MANIFEST PERMISSION COUNT MISMATCH` در غیر این صورت exit)
- `fgs-type: microphone OK` — سرویس Wake با `foregroundServiceType="microphone"` داخل APK
- apksigner verify روی هر APK اجرا شد

## ۵. مسئلهٔ دو مانیفست (بند ۷ — «مستند یا حذف»)

- **منبع حقیقت یگانه:** `android/app/gradle/AndroidManifest.xml` (خط لولهٔ v13/v14 از همین می‌سازد)
- `android/src/AndroidManifest.xml` — مانیفست کهنهٔ دوران v1.1.0 که با محصول فعلی هم‌خوان نیست؛ با برچسب `RETIRED-MANIFEST (R3-P1 §7)` مستند شد (حذف نشد تا bundleهای قدیمیِ تحویلی مرجع نشکند)
- `scripts/gen-gradle-manifest.sh` — خطرناک بود (بازتولید مانیفست واقعی از نسخهٔ کهنه)؛ **بازنشسته شد**: اجرای آن عمداً fail می‌شود با پیام «single source of truth»

## ۶. درخواست از مالک (برای برداشتن BLOCKED)

1. بازیابی `rahyar-release.keystore` + `rahyar-release-password.txt` (نسخهٔ P2/P3 با گواهی `598facd4…`) از هر محل نگهداری بیرون از این sandbox (مثلاً رایانهٔ شخصی/مدیریت رمز مالک) و قرار دادن در `backups/android-release-keystore/`
2. پس از آن: `bash scripts/build-android-apk-v14.sh --release` → گواهی به‌طور خودکار با مرجع تطبیق داده می‌شود؛ در صورت تطابق، APK release ارتقایی (نصب بدون حذف روی v2.4.0 قبلی) ساخته می‌شود.
3. اگر کلید اصلی به هر دلیل غیرقابل بازیابی است: تصمیم کلید جدید باید صریحاً از مالک بیاید (گواهی تغییر می‌کند → نصب روی نسخهٔ فعلی فقط با حذف نصب ممکن است؛ کاربرانِ در حال استفاده باید مطلع شوند).
