package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * F7 (ایجنت ۲) — آزمون JVM منطق جدید صوتی:
 *  ۱) backoff دوباره‌شروعی VoiceWakeService (باگ چرخهٔ شنود — «restartLoop» بودن)
 *  ۲) بازگرداندن Wake Word از پروفایل (بوت/شروع اپ — fail-closed)
 */
public class VoiceWakeRestartTest {

    // ── nextRestartDelayMs ──────────────────────────────────────

    @Test
    public void noMatchRestartsQuickly() {
        assertEquals(VoiceWakeService.RESTART_QUICK_MS,
                VoiceWakeService.nextRestartDelayMs(VoiceWakeService.ERR_NO_MATCH, 0));
        assertEquals(VoiceWakeService.RESTART_QUICK_MS,
                VoiceWakeService.nextRestartDelayMs(VoiceWakeService.ERR_SPEECH_TIMEOUT, 3));
    }

    @Test
    public void insufficientPermissionsNeverRestarts() {
        // بدون اجازهٔ میکروفون، شنود دوباره شروع نمی‌شود — هیچ چرخهٔ بی‌فایده‌ای
        assertEquals(-1L, VoiceWakeService.nextRestartDelayMs(
                VoiceWakeService.ERR_INSUFFICIENT_PERMISSIONS, 0));
    }

    @Test
    public void networkErrorBacksOffExponentiallyWithCap() {
        assertEquals(1_000L, VoiceWakeService.nextRestartDelayMs(VoiceWakeService.ERR_NETWORK, 0));
        assertEquals(2_000L, VoiceWakeService.nextRestartDelayMs(VoiceWakeService.ERR_NETWORK, 1));
        assertEquals(4_000L, VoiceWakeService.nextRestartDelayMs(VoiceWakeService.ERR_SERVER, 2));
        // سقف ۳۰ ثانیه — چرخهٔ بی‌نهایت طولانی نمی‌شود
        assertEquals(VoiceWakeService.RESTART_MAX_MS,
                VoiceWakeService.nextRestartDelayMs(VoiceWakeService.ERR_RECOGNIZER_BUSY, 10));
    }

    // ── wakeEnabledFromProfileJson ──────────────────────────────

    @Test
    public void wakeWordOnlyWithExplicitTrue() {
        assertTrue(BootReceiver.wakeEnabledFromProfileJson("{\"wakeWord\":true}"));
        assertFalse(BootReceiver.wakeEnabledFromProfileJson("{\"wakeWord\":false}"));
        // پیش‌فرض: خاموش — نبود کلید هرگز شنود شروع نمی‌کند (عدم ضبط پنهانی)
        assertFalse(BootReceiver.wakeEnabledFromProfileJson("{\"name\":\"Ali\"}"));
        assertFalse(BootReceiver.wakeEnabledFromProfileJson("{}"));
    }

    @Test
    public void corruptOrMissingProfileStaysOff() {
        assertFalse(BootReceiver.wakeEnabledFromProfileJson(null));
        assertFalse(BootReceiver.wakeEnabledFromProfileJson(""));
        assertFalse(BootReceiver.wakeEnabledFromProfileJson("not-json{"));
        assertFalse(BootReceiver.wakeEnabledFromProfileJson("[1,2,3]"));
    }
}
