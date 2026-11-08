package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * R3-P0 (مأموریت V1-P3-R3 §2) — آزمون JVM گیت واحد شروع سرویس میکروفون
 * و سیاست بوت:
 *  ۱) از BOOT_COMPLETED هیچ سرویسی شروع نمی‌شود — فقط «بازیابی وضعیت»
 *  ۲) گیت واحد: بدون مجوز/رضایت/Activity قابل مشاهده/موتور → هرگز START نیست
 */
public class VoiceWakeGateTest {

    // ── BootReceiver.bootWakePolicy ──────────────────────────────

    @Test
    public void bootNeverStartsService_evenWithConsent() {
        // سیاست: خروجی هرگز «شروع سرویس» نیست — حداکثر «بازیابی وضعیت»
        String p = BootReceiver.bootWakePolicy("android.intent.action.BOOT_COMPLETED", true);
        assertEquals(BootReceiver.WAKE_RESTORE_STATE_ONLY, p);
        assertFalse("start_service must never be a boot outcome", p.startsWith("start"));
    }

    @Test
    public void bootWithoutConsentDoesNothing() {
        assertEquals(BootReceiver.WAKE_NOTHING,
                BootReceiver.bootWakePolicy("android.intent.action.BOOT_COMPLETED", false));
        assertEquals(BootReceiver.WAKE_NOTHING,
                BootReceiver.bootWakePolicy("android.intent.action.MY_PACKAGE_REPLACED", false));
        assertEquals(BootReceiver.WAKE_NOTHING,
                BootReceiver.bootWakePolicy("android.intent.action.QUICKBOOT_POWERON", false));
    }

    @Test
    public void packageReplacedWithConsentRestoresStateOnly() {
        assertEquals(BootReceiver.WAKE_RESTORE_STATE_ONLY,
                BootReceiver.bootWakePolicy("android.intent.action.MY_PACKAGE_REPLACED", true));
        assertEquals(BootReceiver.WAKE_RESTORE_STATE_ONLY,
                BootReceiver.bootWakePolicy("android.intent.action.QUICKBOOT_POWERON", true));
    }

    @Test
    public void nonBootActionsAreIgnored() {
        assertEquals(BootReceiver.WAKE_NOTHING, BootReceiver.bootWakePolicy("some.other.ACTION", true));
        assertEquals(BootReceiver.WAKE_NOTHING, BootReceiver.bootWakePolicy(null, true));
        assertEquals(BootReceiver.WAKE_NOTHING, BootReceiver.bootWakePolicy("", true));
        assertTrue(BootReceiver.isBootLikeAction("android.intent.action.BOOT_COMPLETED"));
        assertFalse(BootReceiver.isBootLikeAction("some.other.ACTION"));
        assertFalse(BootReceiver.isBootLikeAction(null));
    }

    @Test
    public void wakeConsentParsingRemainsFailClosed() {
        assertTrue(BootReceiver.wakeEnabledFromProfileJson("{\"wakeWord\":true}"));
        assertFalse(BootReceiver.wakeEnabledFromProfileJson("{}"));
        assertFalse(BootReceiver.wakeEnabledFromProfileJson(null));
        assertFalse(BootReceiver.wakeEnabledFromProfileJson("broken{"));
    }

    // ── VoiceWakeService.startGate ──────────────────────────────

    @Test
    public void wakeFeatureDisabledByDefault_R3P1() {
        // تصمیم مستند R3-P1: تا آزمون واقعی + اندازه‌گیری باتری غیرفعال
        assertFalse(VoiceWakeService.WAKE_FEATURE_ENABLED);
        assertEquals(VoiceWakeService.GATE_OFF_DISABLED,
                VoiceWakeService.startGate(true, true, true, true, false));
        // حتی با همهٔ شرایط مثبت، قابلیت خاموش = خاموش
        assertEquals(VoiceWakeService.GATE_OFF_DISABLED,
                VoiceWakeService.startGate(true, true, true, true, false));
    }

    @Test
    public void gateAllowsOnlyFullyQualifiedStart() {
        assertEquals(VoiceWakeService.GATE_START_OK,
                VoiceWakeService.startGate(true, true, true, true, true));
    }

    @Test
    public void gateRefusesWithoutConsent() {
        assertEquals(VoiceWakeService.GATE_OFF_NO_CONSENT,
                VoiceWakeService.startGate(true, false, true, true, true));
    }

    @Test
    public void gateRefusesNonActivityPaths() {
        // مثلاً BOOT یا startForegroundService بیرون از UI — حتی با رضایت و مجوز
        assertEquals(VoiceWakeService.GATE_BLOCKED_NOT_FROM_ACTIVITY,
                VoiceWakeService.startGate(true, true, false, true, true));
    }

    @Test
    public void gateRefusesWithoutMicPermission() {
        assertEquals(VoiceWakeService.GATE_BLOCKED_NO_MIC,
                VoiceWakeService.startGate(false, true, true, true, true));
    }

    @Test
    public void gateDegradesHonestlyWithoutEngine() {
        assertEquals(VoiceWakeService.GATE_OFF_NO_ENGINE,
                VoiceWakeService.startGate(true, true, true, false, true));
    }

    @Test
    public void gatePriorityOrderIsDocumented() {
        // قابلیت خاموش بر همهٔ چیز مقدم است؛ سپس رضایت، سپس مسیر Activity
        assertEquals(VoiceWakeService.GATE_OFF_DISABLED,
                VoiceWakeService.startGate(false, false, false, false, false));
        assertEquals(VoiceWakeService.GATE_OFF_NO_CONSENT,
                VoiceWakeService.startGate(false, false, false, false, true));
        assertEquals(VoiceWakeService.GATE_BLOCKED_NOT_FROM_ACTIVITY,
                VoiceWakeService.startGate(false, true, false, false, true));
    }
}
