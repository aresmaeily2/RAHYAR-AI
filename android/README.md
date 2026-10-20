# Rahyar Android Client v1.1.0

کلاینت اندروید مستقل رهیار — بومی (Java 11، بدون وابستگی خارجی) + WebView از endpoint قابل‌تنظیم کاربر.

## نصب سریع (کاربر نهایی)
1. `Rahyar-Android-v1.1.0-release.apk` را روی Android 7+ (API 24+) منتقل و نصب کنید (نصب از منابع ناشناس موقتاً فعال شود).
2. اپ را باز کنید: «آدرس سرور (https)» را وارد کنید — همان دامنه‌ای که نسخهٔ وب v1.1.0 روی آن اجراست.
3. با نام کاربری/رمز خود (همان حساب نسخهٔ وب) وارد شوید.
4. نماهای محصول (امروز/تقویم/مالی/چت/تنظیمات) داخل WebView از سرور شما بارگذاری می‌شوند؛ نوار بالا وضعیت اتصال را نشان می‌دهد؛ خروج با دکمهٔ «خروج» انجام می‌شود (نشست محلی + سمت سرور باطل می‌شود).

**بدون سرور، ورود/داده ممکن نیست** — این قابلیت آفلاین معرفی نمی‌شود؛ فقط صفحهٔ آفلاین بومی با «تلاش دوباره» نمایش داده می‌شود.

## پیش‌نیاز سرور
- نسخهٔ وب v1.1.0 (`Rahyar-AI-Full-Source-v1.1.0.zip`) روی دامنهٔ https معتبر.
- راه‌اندازی سرور: `README.md` سورس وب + `docs/DEPLOYMENT.md`.

## بیلد از سورس (توسعه‌دهنده)
پیش‌نیاز: JDK 21 (JRE کافی است چون ECJ استفاده می‌شود)، build-tools 34 + platform android-34 از dl.google.com، zip.

```bash
# مسیرها در scripts/build-android-apk-v11.sh تنظیم می‌شوند:
#   BT  = .../android-build/tools/bt/android-14
#   ECJ = .../android-build/tools/ecj.jar  (repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.33.0)
#   PLAT= .../android-build/tools/plat/android-34/android.jar
bash scripts/build-android-apk-v11.sh
# خروجی: artifacts/android-build/out/Rahyar-Android-v1.1.0-{debug,release}.apk
```

- keystore release: در `backups/android-release-keystore/` (رمز تصادفی، فقط محلی). برای انتشار عمومی، مالک باید این keystore را امن نگه دارد؛ به‌روزرسانی‌های بعدی باید با همان کلید امضا شوند.
- تست واحد منطق: `javac`+`java -ea` روی `android/test/.../AppConfigTest.java` (21 بررسی) — یا با ECJ مطابق لاگ بیلد.

## ساختار
```
android/
  src/AndroidManifest.xml          — فقط مجوز INTERNET، https اجباری، supportsRtl
  src/java/com/rahyarai/app/
    AppConfig.java                 — سیاست endpoint (فقط https، رد localhost/داخلی)
    SecureStore.java               — AES-256/GCM با AndroidKeyStore برای کوکی نشست
    Api.java                       — login/logout با HttpURLConnection (تایم‌اوت، بدون لاگ حساس)
    LoginActivity.java             — ورود بومی دوزبانه (fa پیش‌فرض، values-en انگلیسی)
    MainActivity.java              — WebView + وضعیت اتصال + آفلاین + خروج
  src/res/                         — layout/strings (fa+en)/network_security_config/آیکن برداری
  test/java/com/rahyarai/app/      — تست واحد لایهٔ منطق (JDK runner)
```

## محدودیت‌های شناخته‌شده
- آزمون نصب/اجرای روی دستگاه واقعی در محیط ساخت ممکن نبود (بدون emulator/دستگاه) — پیش از استفادهٔ عمومی روی یک دستگاه واقعی آزمون شود.
- AAB (Play Store) تولید نشده — نیازمند خط لولهٔ Gradle/bundletool.
- همگام‌سازی آفلاین داده‌ها و اعلان فوری: پیاده نشده — طبق §۳ گزارش ANDROID_APK_REPORT.md.

---

## بیلد با Gradle (استاندارد — APK و AAB) — اضافه‌شده پس از بازیابی 2026-10-20

پروژه اکنون هر دو خط لوله را دارد: v11 (بدون Gradle، بالا) و **Gradle استاندارد (AGP 8.7.3 + Gradle 8.10.2)**.

### ساختار
```
android/
  settings.gradle / build.gradle / gradle.properties / gradlew + wrapper
  app/build.gradle            — سورس از src/ مپ می‌شود (کپی/انشعاب کد وجود ندارد)
  app/gradle/AndroidManifest.xml — همان مانیفست src/ بدون صفت package (الزام AGP 8)؛ با scripts/gen-gradle-manifest.sh از src/ تولید می‌شود
  app/src/test/java/com/rahyarai/app/AppConfigTest.java — تست واحد JVM (6 بررسی، JUnit4)
```

### دستور بازتولید (تکرارپذیر)
پیش‌نیاز: JDK 17+ (javac لازم است) + Android SDK (platform 34 + build-tools 34) در `ANDROID_HOME` یا `local.properties`.
```bash
cd android
./gradlew :app:assembleRelease :app:bundleRelease :app:testReleaseUnitTest \
  -Dorg.gradle.java.home=/path/to/jdk17
# خروجی: app/build/outputs/apk/release/app-release-unsigned.apk
#         app/build/outputs/bundle/release/app-release.aab
# تست:    6/6 pass (گزارش در app/build/test-results/)
```

### وضعیت امضا (مهم — تغییر نکنده تا تصمیم مالک)
- کلید release قبلی (اثر انگشت گواهی `60f762d7ee570f500780cc20e1c910e5c6baa5edbb0715dfff7f5ff1a3679810`، CN=Rahyar Release) **همراه reset محیط از دست رفت** — در repo/ZIPها نبوده است.
- خروجی‌های Gradle و v11 به‌صورت **بدون امضا** تولید می‌شوند؛ هیچ کلید جدیدی بدون تأیید مالک ساخته نمی‌شود.
- APK منتشرشده در Release v1.1.0 با همان کلید گم‌شده امضا شده (v2+v3 verify می‌شود).
- نتیجه: نصب APK بازتولیدشده روی نصبِ قبلی (به‌روزرسانی درجا) ممکن نیست؛ مالک باید یا پشتیبان keystore را بازیابی کند یا صریحاً کلید جدید را تأیید کند.
- راهنمای اتصال keystore آینده: در `app/build.gradle` یک `signingConfigs.release` با مسیر/متغیرهای env اضافه شود (رمز هرگز در repo).

### ابزارهای استفاده‌شده (منبع رسمی، هش در artifacts/reports/android-tools-provenance.txt)
- Build-Tools r34 (aapt2 2.19-10229193) — dl.google.com/android/repository/build-tools_r34-linux.zip
- Platform android-34 ext7 r03 — dl.google.com/android/repository/platform-34-ext7_r03.zip
- ECJ 3.33.0 — repo1.maven.org · bundletool 1.17.2 — github.com/google/bundletool
- Gradle 8.10.2 (services.gradle.org، SHA-256 `31c55713e40233a8303827ceb42ca48a47267a0ad4bab9177123121e71524c26`) · JDK 17.0.20.1 Temurin (adoptium)
