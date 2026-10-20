package com.rahyarai.app;

import android.webkit.JavascriptInterface;

/**
 * پل JS ↔ بومی برای رابط کاربری محلی (appassets).
 *
 * امنیت:
 *  - فقط برای WebView ای ثبت می‌شود که فقط از مبدأ appassets.androidplatform.net
 *    بارگذاری می‌کند (قفل ناوبری در HomeActivity) — صفحات خارجی به آن راه ندارند.
 *  - همهٔ ورودی/خروجی رشتهٔ JSON است؛ منطق واقعی در RahyarCore (تست‌پذیر روی JVM).
 *  - هیچ API اندرویدی حساس، مسیر فایل یا توکنی از این پل در دسترس JS نیست.
 *  - دو «کنش میزبان» کنترل‌شده وجود دارد (اشتراک پشتیبان، ورود سرور اختیاری)
 *    که هر دو باRunnable از HomeActivity تزریق می‌شوند و کار دیگری نمی‌کنند.
 */
public final class RahyarBridge {
    private final RahyarCore core;
    /** کنش میزبان: اشتراک‌گذاری متن پشتیبان (بدون هیچ مجوزی — Share Sheet سیستم) */
    private final HostAction shareBackupAction;
    /** کنش میزبان: بازکردن صفحهٔ اختیاری ورود به سرور (LoginActivity) */
    private final HostAction openServerLoginAction;

    /** کنش کنترل‌شدهٔ میزبان — پیاده‌سازی توسط Activity؛ محدود به یک کار مشخص. */
    public interface HostAction {
        void run(String arg);
    }

    public RahyarBridge(RahyarCore core, HostAction shareBackupAction, HostAction openServerLoginAction) {
        this.core = core;
        this.shareBackupAction = shareBackupAction;
        this.openServerLoginAction = openServerLoginAction;
    }

    // ─── دادهٔ محلی (منطق در RahyarCore) ───

    @JavascriptInterface
    public String getDoc(String key) {
        return core.getDoc(key);
    }

    @JavascriptInterface
    public String putDoc(String key, String json) {
        return core.putDoc(key, json);
    }

    @JavascriptInterface
    public String deleteDoc(String key) {
        return core.deleteDoc(key);
    }

    @JavascriptInterface
    public String exportAll() {
        return core.exportAll();
    }

    @JavascriptInterface
    public String importAll(String backupJson) {
        return core.importAll(backupJson);
    }

    @JavascriptInterface
    public String meta() {
        return core.meta();
    }

    // ─── کنش‌های میزبان (هرگز داده‌ای برنمی‌گردانند) ───

    /** اشتراک‌گذاری متن پشتیبان با Share Sheet سیستم — بدون مجوز، بدون شبکه اجباری. */
    @JavascriptInterface
    public void shareBackup(String json) {
        if (shareBackupAction != null && json != null && json.length() <= RahyarCore.MAX_IMPORT_BYTES) {
            shareBackupAction.run(json);
        }
    }

    /** بازکردن صفحهٔ اختیاری «ورود به سرور» — تنها مسیر رسیدن به حالت متصل. */
    @JavascriptInterface
    public void openServerLogin() {
        if (openServerLoginAction != null) openServerLoginAction.run("");
    }
}
