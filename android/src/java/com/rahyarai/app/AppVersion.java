package com.rahyarai.app;

/**
 * نسخهٔ اپ — منبع واحد حقیقت (single source of truth) برای نمایش.
 * مقدارها باید با android/app/build.gradle همگام بمانند (تست OfflineContractTest
 * و فرایند ساخت این همگامی را کنترل می‌کنند).
 */
public final class AppVersion {
    public static final String NAME = "1.2.0";
    public static final int CODE = 12;
    public static final String PACKAGE_ID = "com.rahyarai.app";

    private AppVersion() {}
}
