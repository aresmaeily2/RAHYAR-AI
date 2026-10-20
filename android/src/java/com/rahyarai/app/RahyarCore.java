package com.rahyarai.app;

import org.json.JSONObject;

/**
 * هستهٔ پل محلی — بدون هیچ کلاس اندرویدی تا روی JVM تست‌پذیر باشد.
 * قواعد امنیتی:
 *  - فقط کلیدهای سفارشی‌شده (whitelist) قابل نوشتن‌اند: profile / tasks / reminders
 *  - هر سند باید JSON معتبر و کمتر از MAX_DOC_BYTES باشد
 *  - هیچ مسیر فایل، هیچ متد بازتابی (reflection) و هیچ توکنی از این پل بیرون نمی‌رود
 */
public final class RahyarCore {
    /** کلیدهای مجاز — توسعهٔ آینده فقط با بازبینی امنیتی */
    public static final String[] ALLOWED_KEYS = {"profile", "tasks", "reminders"};
    public static final int MAX_IMPORT_BYTES = 8 * 1024 * 1024;

    private final LocalStore store;
    private final String versionName;
    private final int versionCode;

    public RahyarCore(LocalStore store, String versionName, int versionCode) {
        this.store = store;
        this.versionName = versionName == null ? "" : versionName;
        this.versionCode = versionCode;
    }

    /** اعتبار کلید: فقط حروف کوچک a-z و زیرخط، حداکثر ۳۲ نویسه. */
    public static boolean isAllowedKey(String key) {
        if (key == null || key.isEmpty() || key.length() > 32) return false;
        for (String ok : ALLOWED_KEYS) if (ok.equals(key)) return true;
        return false;
    }

    /** خواندن سند؛ در نبود، رشتهٔ خالی (سازگار با JS). */
    public String getDoc(String key) {
        if (!isAllowedKey(key)) return "";
        String v = store.get(key);
        return v == null ? "" : v;
    }

    /** نوشتن سند؛ پاسخ JSON استاندارد {"ok":..,"error":".."} */
    public String putDoc(String key, String json) {
        String err = null;
        if (!isAllowedKey(key)) err = "bad_key";
        else if (json == null || json.trim().isEmpty()) err = "empty";
        else if (json.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > LocalStore.MAX_DOC_BYTES) err = "too_large";
        else if (!LocalStore.isValidJson(json)) err = "bad_json";
        if (err != null) return fail(err);
        return store.put(key, json) ? ok() : fail("write_failed");
    }

    public String deleteDoc(String key) {
        if (!isAllowedKey(key)) return fail("bad_key");
        return store.remove(key) ? ok() : fail("write_failed");
    }

    /** کل انبار برای پشتیبان‌گیری. */
    public String exportAll() {
        String s = store.exportJson(versionName);
        return s == null ? fail("export_failed") : s;
    }

    /** بازگردانی پشتیبان؛ تعداد اسناد بازگردانی‌شده یا خطا. */
    public String importAll(String backupJson) {
        if (backupJson == null
                || backupJson.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > MAX_IMPORT_BYTES) {
            return fail("bad_backup");
        }
        int n = store.importJson(backupJson);
        if (n < 0) return fail("bad_backup");
        try { return new JSONObject().put("ok", true).put("imported", n).toString(); }
        catch (Exception e) { return fail("export_failed"); }
    }

    /** فرادادهٔ اپ برای نمایش «درباره». */
    public String meta() {
        try {
            return new JSONObject()
                    .put("app", "RahyAr")
                    .put("packageId", "com.rahyarai.app")
                    .put("versionName", versionName)
                    .put("versionCode", versionCode)
                    .put("mode", "local")
                    .put("keys", new org.json.JSONArray(ALLOWED_KEYS))
                    .toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    // ─── پاسخ‌های استاندارد ───
    static String ok() { return "{\"ok\":true}"; }
    static String fail(String err) {
        try { return new JSONObject().put("ok", false).put("error", err).toString(); }
        catch (Exception e) { return "{\"ok\":false}"; }
    }
}
