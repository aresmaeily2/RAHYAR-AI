package com.rahyarai.app;

/**
 * ویراست محصول — سورس مخصوص ویراست user (پیش‌فرض).
 * owner در src/owner/java همین کلاس را با مقادیر مالک جایگزین می‌کند.
 * هیچ رمز یا اعتبارنامه‌ای اینجا نیست — فقط برچسب ویراست و پیش‌فرض نمایشی
 * نام کاربری در صفحهٔ ورود (رمز همیشه توسط کاربر تایپ می‌شود).
 */
public final class EditionConfig {
    public static final String EDITION = "user";
    /** پیش‌فرض نمایشی فیلد نام کاربری صفحهٔ ورود — خالی = بدون پیش‌فرض */
    public static final String PREFILL_USERNAME = "";

    private EditionConfig() {}
}
