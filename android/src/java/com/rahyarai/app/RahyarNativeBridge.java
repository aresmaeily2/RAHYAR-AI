package com.rahyarai.app;

import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * پل بومی v2 — قابلیت‌های اندروید در خدمت محصول کامل وب (حالت متصل).
 * در WebView سرورِ مالک (MainActivity) با نام RahyarNative ثبت می‌شود.
 *
 * امنیت:
 *  - فقط روی WebView ای ثبت می‌شود که ناوبری‌اش به مبنای سرورِ ثبت‌شدهٔ کاربر
 *    قفل است (MainActivity.shouldOverrideUrlLoading) — صفحات خارجی به آن راه ندارند.
 *  - هیچ دادهٔ خصوصی (نشست/کوکی/فایل) از این پل خارج نمی‌شود؛ فقط فرمان‌های
 *    کپسولهٔ صدا و یادآور با سقف حجم.
 *  - هر کنش به HostAction تزریق‌شده از Activity می‌رود؛ این کلاس فقط قرارداد JS
 *    و اعتبارسنجی ورودی است (تست‌پذیر روی JVM).
 *  - مجوزها فقط با رضایت صریح کاربر در Activity گرفته می‌شود
 *    (POST_NOTIFICATIONS: گفت‌وگوی توضیح قبل از درخواست سیستم).
 */
public final class RahyarNativeBridge {

    /** سقف حجم ورودی یادآورها — با سقف ۵۰ یادآور فعال سرور هم‌خوان است */
    public static final int MAX_REMINDERS_JSON = 64 * 1024;
    /** سقف طول متن برای خواندن صوتی */
    public static final int MAX_SPEAK_CHARS = 600;
    /** سقف طول برچسب زبان BCP-47 */
    public static final int MAX_LANG_LEN = 16;

    /** کنش کنترل‌شدهٔ میزبان — پیاده‌سازی توسط Activity؛ محدود به یک کار مشخص. */
    public interface HostAction {
        void run(String arg);
    }

    private final HostAction startVoice;
    private final HostAction stopVoice;
    private final HostAction speakText;
    private final HostAction stopSpeaking;
    private final HostAction syncReminders;

    public RahyarNativeBridge(HostAction startVoice, HostAction stopVoice,
                              HostAction speakText, HostAction stopSpeaking,
                              HostAction syncReminders) {
        this.startVoice = startVoice;
        this.stopVoice = stopVoice;
        this.speakText = speakText;
        this.stopSpeaking = stopSpeaking;
        this.syncReminders = syncReminders;
    }

    @JavascriptInterface
    public boolean isAndroidApp() {
        return true;
    }

    /** JSON ثابت قابلیت‌ها — قرارداد پایدار با src/lib/voice/native.ts */
    @JavascriptInterface
    public String capabilities() {
        try {
            JSONObject o = new JSONObject();
            o.put("voice", true);
            o.put("tts", true);
            o.put("reminders", true);
            o.put("version", AppVersion.NAME);
            return o.toString();
        } catch (Exception e) {
            return "{\"voice\":false,\"tts\":false,\"reminders\":false,\"version\":\"\"}";
        }
    }

    @JavascriptInterface
    public String appVersion() {
        return AppVersion.NAME + " (" + AppVersion.CODE + ")";
    }

    // ── صدا: تشخیص گفتار بومی (نتایج با رخدادهای DOM تحویل می‌شوند) ──

    @JavascriptInterface
    public void startVoiceRecognition(String langBcp47) {
        if (startVoice == null) return;
        String lang = sanitizeLang(langBcp47);
        if (lang == null) return;
        startVoice.run(lang);
    }

    @JavascriptInterface
    public void stopVoiceRecognition() {
        if (stopVoice != null) stopVoice.run("");
    }

    // ── خروجی صوتی بومی (TTS) ──

    @JavascriptInterface
    public String speak(String text, String langBcp47) {
        if (speakText == null) return "";
        if (text == null || text.trim().isEmpty()) return "";
        String t = text.length() > MAX_SPEAK_CHARS ? text.substring(0, MAX_SPEAK_CHARS) : text;
        String lang = sanitizeLang(langBcp47);
        // قرارداد یک‌آرگومانی HostAction — آرایهٔ JSON دوعنصری [متن، زبان]
        try {
            JSONArray pair = new JSONArray();
            pair.put(t);
            pair.put(lang == null ? "fa-IR" : lang);
            speakText.run(pair.toString());
        } catch (Exception ignored) {
            return "";
        }
        return "tts";
    }

    @JavascriptInterface
    public void stopSpeaking() {
        if (stopSpeaking != null) stopSpeaking.run("");
    }

    // ── یادآورها: همگام‌سازی با AlarmManager (اعلان سیستمی) ──

    /**
     * آرایهٔ یادآورهای فعال [{id, message, remindAt(ISO)}] — همان خروجی
     * GET /api/reminders. قرارداد: فقط آینده، حداکثر ۵۰، بدون خطای پرتابی.
     */
    @JavascriptInterface
    public void syncReminders(String jsonArray) {
        if (syncReminders == null) return;
        if (jsonArray == null || jsonArray.isEmpty() || jsonArray.length() > MAX_REMINDERS_JSON) return;
        syncReminders.run(jsonArray);
    }

    /** پالایش برچسب زبان — فقط حروف/خط/رقم/ناحیه، سقف ۱۶ نویسه */
    static String sanitizeLang(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (s.isEmpty() || s.length() > MAX_LANG_LEN) return null;
        if (!s.matches("[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*")) return null;
        return s;
    }

    // ── منطق خالص همگام‌سازی (تست JVM بدون اندروید) ──

    /** طرح زمان‌بندی از JSON خام — خالص و تست‌پذیر */
    public static final class ReminderPlan {
        public final String id;
        public final String message;
        public final long remindAtMs;

        public ReminderPlan(String id, String message, long remindAtMs) {
            this.id = id;
            this.message = message;
            this.remindAtMs = remindAtMs;
        }
    }

    /**
     * تبدیل JSON یادآورها به طرح زمان‌بندی:
     *  - فقط یادآورهای آینده (بیش از ۰ ثانیه از اکنون)
     *  - حداکثر ۵۰ مورد
     *  - پیام سقف ۲۰۰ نویسه (هم‌خوان با cleanText سرور)
     *  - ورودی خراب = فهرست خالی (هرگز استثنا)
     */
    public static java.util.ArrayList<ReminderPlan> parseReminders(String json, long nowMs) {
        java.util.ArrayList<ReminderPlan> out = new java.util.ArrayList<>();
        if (json == null || json.isEmpty()) return out;
        try {
            JSONArray arr = new JSONArray(json);
            int n = Math.min(arr.length(), 50);
            for (int i = 0; i < n; i++) {
                JSONObject r = arr.optJSONObject(i);
                if (r == null) continue;
                String id = r.optString("id", "");
                String msg = r.optString("message", "");
                String at = r.optString("remindAt", "");
                if (id.isEmpty() || msg.isEmpty() || at.isEmpty()) continue;
                long ms = parseIso(at);
                if (ms <= nowMs) continue;
                if (msg.length() > 200) msg = msg.substring(0, 200);
                out.add(new ReminderPlan(id, msg, ms));
            }
        } catch (Exception ignored) {
            // ورودی خراب — فهرست خالی؛ هرگز کرش
        }
        return out;
    }

    /** ISO-8601 (با/بدون میلی‌ثانیه و منطقه) → epoch ms؛ بدون منطقه = UTC؛ خطا = ۰ */
    static long parseIso(String iso) {
        try {
            String s = iso == null ? "" : iso.trim();
            if (s.isEmpty()) return 0;
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                try {
                    return java.time.Instant.parse(s).toEpochMilli();
                } catch (Exception zoneless) {
                    // بدون منطقه — قرارداد سرور UTC است (Prisma ISO)
                    return java.time.Instant.parse(s + "Z").toEpochMilli();
                }
            }
            // مسیر قدیمی (API 24/25) — ساده و UTC
            String t = s.replace("Z", "+00:00");
            java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US);
            f.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            f.setLenient(true);
            java.util.Date d = f.parse(t);
            if (d == null) return 0;
            long base = d.getTime();
            int dot = t.indexOf('.');
            if (dot > 0) {
                StringBuilder frac = new StringBuilder();
                for (int i = dot + 1; i < t.length() && Character.isDigit(t.charAt(i)); i++) frac.append(t.charAt(i));
                if (frac.length() > 0) {
                    int millis = Integer.parseInt(frac.substring(0, Math.min(3, frac.length())));
                    base += millis;
                }
            }
            return base;
        } catch (Exception e) {
            return 0;
        }
    }
}
