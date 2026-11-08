package com.rahyarai.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/**
 * R3-P0 §4 (مأموریت V1-P3-R3) — آزمون JVM سیاست مسیر تشخیص و رضایت آنلاین:
 *  ۱) مسیر روی‌دستگاه مقدم است و هرگز رضایت آنلاین نمی‌خواهد
 *  ۲) مسیر سیستمی (ممکن است آنلاین) فقط با رضایت صریح ذخیره‌شده شروع می‌شود
 *  ۳) نبود موتور = وضعیت صادقانه، بدون ادعای غلط
 */
public class VoiceSttPrivacyTest {

    @Test
    public void onDevicePathIsPreferredAndReported() {
        assertEquals(VoiceHelper.MODE_ON_DEVICE,
                VoiceHelper.sttEngineMode(true, true));
        assertEquals(VoiceHelper.DECISION_START_ON_DEVICE,
                VoiceHelper.sttStartDecision(VoiceHelper.MODE_ON_DEVICE, false));
        // روی‌دستگاه: رضایت آنلاین حتی اگر نباشد هم بی‌اثر است
        assertEquals(VoiceHelper.DECISION_START_ON_DEVICE,
                VoiceHelper.sttStartDecision(VoiceHelper.MODE_ON_DEVICE, true));
    }

    @Test
    public void systemServicePathRequiresExplicitOnlineConsent() {
        assertEquals(VoiceHelper.MODE_SYSTEM_SERVICE,
                VoiceHelper.sttEngineMode(true, false));
        // بدون رضایت = هیچ شنودی از مسیر سیستمی (ممکن است آنلاین)
        assertEquals(VoiceHelper.DECISION_CONSENT_REQUIRED,
                VoiceHelper.sttStartDecision(VoiceHelper.MODE_SYSTEM_SERVICE, false));
        // با رضایت صریح ذخیره‌شده = شروع مجاز
        assertEquals(VoiceHelper.DECISION_START_SYSTEM_CONSENTED,
                VoiceHelper.sttStartDecision(VoiceHelper.MODE_SYSTEM_SERVICE, true));
    }

    @Test
    public void unavailableIsHonest() {
        assertEquals(VoiceHelper.MODE_UNAVAILABLE,
                VoiceHelper.sttEngineMode(false, false));
        assertEquals(VoiceHelper.DECISION_BLOCKED_UNAVAILABLE,
                VoiceHelper.sttStartDecision(VoiceHelper.MODE_UNAVAILABLE, true));
        assertEquals(VoiceHelper.DECISION_BLOCKED_UNAVAILABLE,
                VoiceHelper.sttStartDecision(VoiceHelper.MODE_UNAVAILABLE, false));
    }

    @Test
    public void modeLabelsAreWebContractSafe() {
        // برچسب‌ها باید در JSON وضعیت UI بدون گریز خاص منتشر شوند
        String[] modes = {VoiceHelper.MODE_ON_DEVICE, VoiceHelper.MODE_SYSTEM_SERVICE, VoiceHelper.MODE_UNAVAILABLE};
        for (String m : modes) {
            String js = VoiceHelper.eventJs("rahyar-voice-engine", "{\"mode\":\"" + VoiceHelper.jsString(m) + "\"}");
            String expected = "{detail:{\"mode\":\"" + m + "\"}}";
            if (js.contains(expected)) continue;
            throw new AssertionError("mode label not JSON-safe: " + m);
        }
        // برچسب سیستمی صادقانه است — ادعای on-device ندارد
        assertEquals("system_service", VoiceHelper.MODE_SYSTEM_SERVICE);
    }
}
