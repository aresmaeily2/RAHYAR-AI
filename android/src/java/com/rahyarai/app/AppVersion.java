package com.rahyarai.app;

/**
 * نسخهٔ اپ — منبع واحد حقیقت (single source of truth) برای نمایش.
 * مقدارها باید با android/app/build.gradle همگام بمانند (تست OfflineContractTest
 * و فرایند ساخت این همگامی را کنترل می‌کنند).
 *
 * v2.1.0 — «محلی-اول»: ورود اصلی اپ، رابط محلی ۱۰۰٪ آفلاین است (بدون سرور،
 * بدون حساب) و اتصال به سرور مالک به ماژول اختیاری تبدیل شده است. اسپلش بومی،
 * هویت بصری رهیار و نشان دو‌تقویمی در همین نسخه اضافه شده‌اند.
 */
public final class AppVersion {
    public static final String NAME = "2.1.0";
    public static final int CODE = 21;
    public static final String PACKAGE_ID = "com.rahyarai.app";

    private AppVersion() {}
}
