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
