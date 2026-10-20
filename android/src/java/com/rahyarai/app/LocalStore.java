package com.rahyarai.app;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * ذخیره‌سازی محلی مستقل — قلب نسخهٔ آفلاین.
 *
 * سیاست‌ها:
 *  - همهٔ داده‌ها در یک فایل JSON خصوصی اپ (filesDir) نگه‌داری می‌شود؛
 *    پس از بستن و بازکردن برنامه حفظ می‌شود.
 *  - نوشتن اتمیک (tmp + rename)؛ اگر rename شکست بخورد کپی جایگزین می‌شود.
 *  - هیچ وابستگی به شبکه، سرور یا Context اندروید ندارد (فقط File) —
 *    بنابراین روی JVM هم قابل تست است.
 *  - در صورت خرابی فایل، دادهٔ خراب «پاک نمی‌شود»؛ به‌صورت
 *    rahyar-local.json.corrupt-<زمان> نگه‌داری می‌شود (سیاست: هیچ داده‌ای
 *    بدون تأیید مالک حذف نشود) و انبار خالی آغاز می‌شود.
 *  - محتوای هر کلید یک رشتهٔ JSON معتبر است؛ کلیدها توسط RahyarBridge
 *    سفارشی‌سازی (whitelist) می‌شوند.
 */
public final class LocalStore {
    /** حداکثر اندازهٔ هر سند (توسط Bridge اعمال می‌شود) — ۲ مگابایت */
    public static final int MAX_DOC_BYTES = 2 * 1024 * 1024;
    /** حداکثر اندازهٔ کل انبار — ۱۶ مگابایت */
    public static final int MAX_TOTAL_BYTES = 16 * 1024 * 1024;

    private static final String FILE = "rahyar-local.json";

    private final File file;
    private final Object lock = new Object();
    private Map<String, String> cache;

    public LocalStore(File dir) {
        if (dir == null) throw new IllegalArgumentException("dir is required");
        if (!dir.exists()) dir.mkdirs();
        this.file = new File(dir, FILE);
    }

    public File getFile() { return file; }

    // ─── خواندن / نوشتن اسناد ───

    /** محتوای JSON یک کلید؛ در نبود کلید null برمی‌گردد. */
    public String get(String key) {
        if (key == null) return null;
        synchronized (lock) {
            return map().get(key);
        }
    }

    /** ذخیرهٔ یک سند JSON معتبر. خروجی: true = ذخیره شد. */
    public boolean put(String key, String json) {
        if (key == null || key.trim().isEmpty()) return false;
        if (json == null) return remove(key);
        if (json.getBytes(StandardCharsets.UTF_8).length > MAX_DOC_BYTES) return false;
        if (!isValidJson(json)) return false;
        synchronized (lock) {
            Map<String, String> m = map();
            m.put(key, json);
            if (!flush(m)) { // دیسک نشد → کش را به حالت قبل برگردان
                cache = null; // خواندن مجدد از دیسک
                return false;
            }
            return true;
        }
    }

    /** حذف یک کلید. true اگر حذف شد (یا از قبل نبود). */
    public boolean remove(String key) {
        if (key == null) return false;
        synchronized (lock) {
            Map<String, String> m = map();
            if (!m.containsKey(key)) return true;
            m.remove(key);
            return flush(m);
        }
    }

    /** شمارش کلیدها (برای آزمون و عیب‌یابی). */
    public int size() {
        synchronized (lock) { return map().size(); }
    }

    // ─── پشتیبان‌گیری / بازگردانی ───

    /**
     * خروجی کامل انبار به‌صورت JSON ساخت‌یافته؛ برای «اشتراک پشتیبان».
     * شامل فرادادهٔ نسخه برای سازگاری آینده. اسناد می‌توانند شیء یا آرایه باشند.
     */
    public String exportJson(String versionName) {
        synchronized (lock) {
            try {
                JSONObject root = new JSONObject();
                root.put("format", "rahyar-local-backup");
                root.put("formatVersion", 1);
                root.put("appVersion", versionName == null ? "" : versionName);
                root.put("exportedAt", System.currentTimeMillis());
                JSONObject docs = new JSONObject();
                for (Map.Entry<String, String> e : map().entrySet()) {
                    Object parsed = new JSONTokener(e.getValue()).nextValue();
                    docs.put(e.getKey(), parsed);
                }
                root.put("docs", docs);
                return root.toString();
            } catch (Exception e) {
                return null;
            }
        }
    }

    /**
     * بازگردانی از خروجی JSON. فقط اسناد معتبر (شیء/آرایه) جایگزین/افزوده می‌شوند؛
     * کلیدهای ناموجود در پشتیبان دست‌نخورده می‌مانند (ادغام محافظه‌کارانه —
     * هیچ دادهٔ محلی بدون پشتیبان دور ریخته نمی‌شود).
     */
    public int importJson(String backupJson) {
        if (backupJson == null) return -1;
        try {
            JSONObject root = new JSONObject(backupJson);
            if (!"rahyar-local-backup".equals(root.optString("format"))) return -1;
            JSONObject docs = root.optJSONObject("docs");
            if (docs == null) return -1;
            int n = 0;
            synchronized (lock) {
                Map<String, String> m = map();
                java.util.Iterator<String> it = docs.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    Object v = docs.opt(k);
                    if (v instanceof JSONObject || v instanceof JSONArray) {
                        String doc = v.toString();
                        if (doc.getBytes(StandardCharsets.UTF_8).length <= MAX_DOC_BYTES) {
                            m.put(k, doc);
                            n++;
                        }
                    }
                }
                if (!flush(m)) return -1;
            }
            return n;
        } catch (Exception e) {
            return -1;
        }
    }

    // ─── ابزار داخلی ───

    private Map<String, String> map() {
        if (cache != null) return cache;
        cache = load();
        return cache;
    }

    private Map<String, String> load() {
        Map<String, String> m = new LinkedHashMap<>();
        try {
            if (!file.exists() || file.length() == 0) return m;
            byte[] buf = new byte[(int) file.length()];
            FileInputStream fi = new FileInputStream(file);
            int total = 0, n;
            while ((n = fi.read(buf, total, buf.length - total)) > 0) total += n;
            fi.close();
            JSONObject root = new JSONObject(new String(buf, 0, total, StandardCharsets.UTF_8));
            JSONObject docs = root.optJSONObject("docs");
            if (docs == null) return m;
            java.util.Iterator<String> it = docs.keys();
            while (it.hasNext()) {
                String k = it.next();
                Object v = docs.opt(k);
                // سند می‌تواند شیء یا آرایه باشد — هر دو نوع پشتیبانی می‌شوند
                if (v instanceof JSONObject || v instanceof JSONArray) {
                    m.put(k, v.toString());
                }
            }
        } catch (Exception e) {
            // فایل خراب — هرگز حذف نمی‌شود؛ نسخهٔ خراب نگه‌داری می‌شود
            keepCorruptCopy();
            return new LinkedHashMap<>();
        }
        return m;
    }

    private void keepCorruptCopy() {
        try {
            File bad = new File(file.getParentFile(), FILE + ".corrupt-" + System.currentTimeMillis());
            FileInputStream fi = new FileInputStream(file);
            FileOutputStream fo = new FileOutputStream(bad);
            byte[] buf = new byte[8192];
            int n;
            while ((n = fi.read(buf)) > 0) fo.write(buf, 0, n);
            fi.close(); fo.close();
        } catch (Exception ignored) { /* بهترین تلاش */ }
    }

    /** نوشتن اتمیک انبار روی دیسک. اسناد شیء یا آرایه پشتیبانی می‌شوند. */
    private boolean flush(Map<String, String> m) {
        try {
            JSONObject docs = new JSONObject();
            for (Map.Entry<String, String> e : m.entrySet()) {
                Object parsed = new JSONTokener(e.getValue()).nextValue();
                if (!(parsed instanceof JSONObject) && !(parsed instanceof JSONArray)) return false;
                docs.put(e.getKey(), parsed);
            }
            JSONObject root = new JSONObject();
            root.put("format", "rahyar-local-store");
            root.put("formatVersion", 1);
            root.put("savedAt", System.currentTimeMillis());
            root.put("docs", docs);
            byte[] data = root.toString().getBytes(StandardCharsets.UTF_8);
            if (data.length > MAX_TOTAL_BYTES) return false;
            File tmp = new File(file.getParentFile(), FILE + ".tmp");
            FileOutputStream fo = new FileOutputStream(tmp);
            fo.write(data);
            fo.flush();
            fo.getFD().sync();
            fo.close();
            if (!tmp.renameTo(file)) {
                // برخی فایل‌سیستم‌ها rename روی فایل موجود را رد می‌کنند
                FileOutputStream fo2 = new FileOutputStream(file);
                fo2.write(data);
                fo2.flush();
                fo2.getFD().sync();
                fo2.close();
                tmp.delete();
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** بررسی اعتبار JSON (شیء یا آرایه در ریشه). */
    static boolean isValidJson(String s) {
        try {
            String t = s.trim();
            if (t.startsWith("{")) { new JSONObject(t); return true; }
            if (t.startsWith("[")) { new JSONArray(t); return true; }
            return false;
        } catch (Exception e) {
            return false;
        }
    }
}
