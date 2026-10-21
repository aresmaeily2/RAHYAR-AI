package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import java.util.ArrayList;

/**
 * قرارداد پل بومی v2 — جریان کامل «وب → اندروید» بدون دستگاه:
 *  ۱) capabilities JSON دقیقاً قرارداد src/lib/voice/native.ts را دارد.
 *  ۲) ورودی‌های نامعتبر (null/خالی/بزرگ/بدنویسه) هیچ‌گاه استثنا پرتاب نمی‌کنند.
 *  ۳) parseReminders فقط آینده‌ها، حداکثر ۵۰، پیام سقف ۲۰۰، ورود خراب = خالی.
 *  ۴) sanitizeLang فقط برچسب BCP-47 معتبر.
 */
public class RahyarNativeBridgeTest {

    // ── capabilities ──

    @Test
    public void capabilitiesContractMatchesWebModule() throws Exception {
        RahyarNativeBridge b = new RahyarNativeBridge(null, null, null, null, null);
        JSONObject caps = new JSONObject(b.capabilities());
        assertEquals(true, caps.getBoolean("voice"));
        assertEquals(true, caps.getBoolean("tts"));
        assertEquals(true, caps.getBoolean("reminders"));
        assertEquals(AppVersion.NAME, caps.getString("version"));
        assertTrue(b.isAndroidApp());
        assertTrue(b.appVersion().contains(AppVersion.NAME));
    }

    @Test
    public void nullHostActionsNeverThrow() {
        RahyarNativeBridge b = new RahyarNativeBridge(null, null, null, null, null);
        b.startVoiceRecognition("fa-IR");
        b.stopVoiceRecognition();
        assertEquals("", b.speak("سلام", "fa-IR"));
        b.stopSpeaking();
        b.syncReminders("[]");
    }

    // ── sanitizeLang ──

    @Test
    public void sanitizeLangAcceptsValidBcp47() {
        assertEquals("fa-IR", RahyarNativeBridge.sanitizeLang("fa-IR"));
        assertEquals("en-US", RahyarNativeBridge.sanitizeLang("en-US"));
        assertEquals("fa", RahyarNativeBridge.sanitizeLang("fa"));
    }

    @Test
    public void sanitizeLangRejectsInvalid() {
        assertNull(RahyarNativeBridge.sanitizeLang(null));
        assertNull(RahyarNativeBridge.sanitizeLang(""));
        assertNull(RahyarNativeBridge.sanitizeLang("  "));
        assertNull(RahyarNativeBridge.sanitizeLang("fa; drop table"));
        assertNull(RahyarNativeBridge.sanitizeLang("f".repeat(20)));
        assertNull(RahyarNativeBridge.sanitizeLang("<script>"));
    }

    // ── speak سقف متن ──

    @Test
    public void speakTruncatesToCap() throws Exception {
        final String[] got = new String[1];
        RahyarNativeBridge b = new RahyarNativeBridge(null, null,
                new RahyarNativeBridge.HostAction() {
                    @Override public void run(String arg) { got[0] = arg; }
                }, null, null);
        String big = "خ".repeat(1000);
        assertEquals("tts", b.speak(big, "fa-IR"));
        assertNotNull(got[0]);
        JSONArray pair = new JSONArray(got[0]);
        assertEquals(RahyarNativeBridge.MAX_SPEAK_CHARS, pair.getString(0).length());
        assertEquals("fa-IR", pair.getString(1));
    }

    @Test
    public void speakRejectsEmptyOrNull() {
        RahyarNativeBridge b = new RahyarNativeBridge(null, null,
                new RahyarNativeBridge.HostAction() {
                    @Override public void run(String arg) { throw new RuntimeException("must not run"); }
                }, null, null);
        assertEquals("", b.speak(null, "fa-IR"));
        assertEquals("", b.speak("   ", "fa-IR"));
    }

    // ── syncReminders سقف حجم ──

    @Test
    public void syncRemindersRejectsOversize() {
        final boolean[] ran = {false};
        RahyarNativeBridge b = new RahyarNativeBridge(null, null, null, null,
                new RahyarNativeBridge.HostAction() {
                    @Override public void run(String arg) { ran[0] = true; }
                });
        StringBuilder big = new StringBuilder("[");
        for (int i = 0; i < 3000; i++) big.append("{\"id\":\"x\",\"message\":\"م\",\"remindAt\":\"2030-01-01T00:00:00Z\"},");
        big.append("{\"id\":\"y\",\"message\":\"م\",\"remindAt\":\"2030-01-01T00:00:00Z\"}]");
        b.syncReminders(big.toString());
        assertFalse("oversize input must be dropped", ran[0]);
    }

    // ── parseReminders ──

    @Test
    public void parseRemindersKeepsOnlyFuture() {
        long now = 1_800_000_000_000L; // ~2027
        String json = "[" +
                "{\"id\":\"a\",\"message\":\"آینده\",\"remindAt\":\"2030-01-01T00:00:00Z\"}," +
                "{\"id\":\"b\",\"message\":\"گذشته\",\"remindAt\":\"2020-01-01T00:00:00Z\"}," +
                "{\"id\":\"c\",\"message\":\"الان دقیقاً\",\"remindAt\":\"2027-01-15T05:20:00Z\"}" + // == now
                "]";
        ArrayList<RahyarNativeBridge.ReminderPlan> plans = RahyarNativeBridge.parseReminders(json, now);
        assertEquals(1, plans.size());
        assertEquals("a", plans.get(0).id);
    }

    @Test
    public void parseRemindersCapsAtFiftyAndTrimsMessage() {
        long now = 0L;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < 60; i++) {
            if (i > 0) sb.append(',');
            sb.append("{\"id\":\"r").append(i).append("\",\"message\":\"")
              .append("پیام طولانی ").append("خ".repeat(250))
              .append("\",\"remindAt\":\"2030-01-01T00:00:00Z\"}");
        }
        sb.append(']');
        ArrayList<RahyarNativeBridge.ReminderPlan> plans = RahyarNativeBridge.parseReminders(sb.toString(), now);
        assertEquals(50, plans.size());
        assertTrue(plans.get(0).message.length() <= 200);
    }

    @Test
    public void parseRemindersMalformedReturnsEmpty() {
        assertEquals(0, RahyarNativeBridge.parseReminders(null, 0).size());
        assertEquals(0, RahyarNativeBridge.parseReminders("", 0).size());
        assertEquals(0, RahyarNativeBridge.parseReminders("not json", 0).size());
        assertEquals(0, RahyarNativeBridge.parseReminders("{\"id\":1}", 0).size());
        assertEquals(0, RahyarNativeBridge.parseReminders("[{\"message\":\"بدون شناسه\",\"remindAt\":\"2030-01-01T00:00:00Z\"}]", 0).size());
    }

    @Test
    public void parseIsoHandlesIso8601() {
        // 2030-01-01T00:00:00Z = 1893456000000
        assertEquals(1893456000000L, RahyarNativeBridge.parseIso("2030-01-01T00:00:00.000Z"));
        assertEquals(1893456000000L, RahyarNativeBridge.parseIso("2030-01-01T00:00:00Z"));
        // بدون منطقه — UTC تفسیر می‌شود (قرارداد سرور)
        assertEquals(1893456000000L, RahyarNativeBridge.parseIso("2030-01-01T00:00:00"));
        assertEquals(0, RahyarNativeBridge.parseIso("garbage"));
        assertEquals(0, RahyarNativeBridge.parseIso(""));
    }

    @Test
    public void requestCodeIsStableAndNonNegative() {
        int a = ReminderAlarms.requestCodeFor("reminder-id-123");
        int b = ReminderAlarms.requestCodeFor("reminder-id-123");
        int c = ReminderAlarms.requestCodeFor("other-reminder");
        assertEquals(a, b);
        assertTrue(a >= 0);
        assertTrue(ReminderAlarms.requestCodeFor(null) >= 0);
        org.junit.Assert.assertNotEquals(a, c);
    }
}
