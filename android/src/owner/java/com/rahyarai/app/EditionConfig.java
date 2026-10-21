package com.rahyarai.app;

/**
 * ویراست محصول — سورس مخصوص ویراست owner.
 * فقط برچسب ویراست و پیش‌فرض نمایشی «owner» در صفحهٔ ورود؛
 * هیچ رمز، توکن یا اعتبارنامه‌ای در APK نیست (الزام بند ۴ و ۵ دستور).
 */
public final class EditionConfig {
    public static final String EDITION = "owner";
    /** پیش‌فرض نمایشی فیلد نام کاربری صفحهٔ ورود برای ویراست مالک */
    public static final String PREFILL_USERNAME = "owner";

    private EditionConfig() {}
}
