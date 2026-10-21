package com.rahyarai.app;

/**
 * نسخهٔ اپ — منبع واحد حقیقت (single source of truth) برای نمایش.
 * مقدارها باید با android/app/build.gradle همگام بمانند (تست OfflineContractTest
 * و فرایند ساخت این همگامی را کنترل می‌کنند).
 *
 * v2.0.0 — «محصول کامل»: کلاینت تمام‌صفحهٔ محصول وب رهیار (چت AI واقعی،
 * صوت بومی، یادآور سیستمی، مالی، تقویم، تنظیمات) + حالت آفلاین محلی به‌عنوان
 * جایگزین دوم.
 */
public final class AppVersion {
    public static final String NAME = "2.0.0";
    public static final int CODE = 20;
    public static final String PACKAGE_ID = "com.rahyarai.app";

    private AppVersion() {}
}
