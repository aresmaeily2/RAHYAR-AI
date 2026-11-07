# F7_ANDROID_RELEASE — ساخت، امضا و اثبات بازتولید (Agent 2)

- **چرخه:** F7 · **تاریخ:** 2026-11-07 · **HEAD پایه:** `5630814`


## ۱. چهار APK از HEAD F7 (v2.3.0 — vc26/27)

| APK | package | versionCode | امضا |
|---|---|---|---|
| Rahyar-user-v2.3.0-release.apk | com.rahyarai.app | 26 | CN=RahyAr RSA-4096 — SHA256 `79496581…5dc088ce` |
| Rahyar-owner-v2.3.0-release.apk | com.rahyarai.app.owner | 27 | همان گواهی |
| Rahyar-user-v2.3.0-debug.apk | com.rahyarai.app | 26 | Android Debug |
| Rahyar-owner-v2.3.0-debug.apk | com.rahyarai.app.owner | 27 | Android Debug |

- minSdk 24 / targetSdk 34 / compileSdk 34 (aapt2 badging ثبت شد)
- **fail-closed حفظ شد:** بدون `android/keystore.properties` (خارج Git، gitignored) ساخت Release خطا می‌دهد
- گواهی جدید F7 (تغییر گواهی نسبت به APKهای v2.2.0 گمشدهٔ میزکار — مسیر ارتقا از v2.2.0 نیازمند حذف/نصب تازه است؛ **صادقانه مستند**، مثل F5)

## ۲. بازتولیدپذیری

`assembleUserRelease` دوبار → **SHA-256 یکسان** (`662a26dd…`) — بستهٔ بایت‌به‌بایت تکرارپذیر.

## ۳. JVM tests

**۱۷۶/۱۷۶** در هر دو فلیور (shامل ۲۳ تست VoiceCommandParser، قرارداد رویدادهای صوتی، OfflineContract (نسخهٔ 2.3.0 به‌روز شد)، BankSmsFilter ۱۱/۱۱، LocalStore، و `VoiceWakeRestartTest` جدید).

## ۴. نصب/اجرای دستگاه — صادقانه BLOCKED

`/dev/kvm` غایب (2026-11-07) و دستگاه فیزیکی موجود نیست ⇒ نصب/اجرای زندهٔ این چرخه انجام نشد و **هیچ ادعای «تست روی دستگاه» ثبت نمی‌شود**. شواهد F4/F6 (crash-free 3/3 روی API24 با KVM میزبان) تاریخی‌اند و برای F7 ارتقا نیافته‌اند.
