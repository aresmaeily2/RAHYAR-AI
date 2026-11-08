package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.Locale;

import org.junit.Test;

/**
 * R3-P0 §3 (مأموریت V1-P3-R3) — آزمون JVM منطق صف و حکم زبان TTS:
 *  ۱) متنِ زمان آماده‌نبودن موتور در صف امن می‌ماند (باگ گم‌شدن اولین پاسخ)
 *  ۲) پاسخ‌های متوالی FIFO پخش می‌شوند؛ سرریز صادقانه گزارش می‌شود
 *  ۳) حکم زبان صادقانه است (missing_data/not_supported = موفقیت قلابی ممنوع)
 */
public class VoiceTtsPolicyTest {

    // ── TtsBuffer: صف امن تا آماده‌شدن موتور ─────────────────────

    @Test
    public void queueHoldsRequestsUntilEngineReady() {
        VoiceHelper.TtsBuffer b = new VoiceHelper.TtsBuffer(VoiceHelper.MAX_TTS_QUEUE);
        b.push("پاسخ اول", "fa-IR");
        b.push("second reply", "en-US");
        assertEquals(2, b.size());
        String[] first = b.poll();
        assertEquals("پاسخ اول", first[0]);
        assertEquals("fa-IR", first[1]);
        String[] second = b.poll();
        assertEquals("second reply", second[0]);
        assertEquals("en-US", second[1]);
    }

    @Test
    public void queueIsFifo_orderedPlayback() {
        VoiceHelper.TtsBuffer b = new VoiceHelper.TtsBuffer(8);
        b.push("الف", "fa-IR");
        b.push("B", "en-US");
        b.push("ج", "fa-IR");
        assertEquals("الف", b.poll()[0]);
        assertEquals("B", b.poll()[0]);
        assertEquals("ج", b.poll()[0]);
        assertEquals(0, b.size());
    }

    @Test
    public void queueCapEvictsOldestHonestly() {
        VoiceHelper.TtsBuffer b = new VoiceHelper.TtsBuffer(2);
        b.push("one", "en-US");
        b.push("two", "en-US");
        assertEquals(1, b.push("three", "en-US")); // قدیمی‌ترین دور ریخته شد و شمرده شد
        assertEquals(2, b.size());
        assertEquals("two", b.poll()[0]);
        assertEquals("three", b.poll()[0]);
    }

    @Test
    public void queueNormalizesNulls() {
        VoiceHelper.TtsBuffer b = new VoiceHelper.TtsBuffer(4);
        b.push(null, null);
        String[] item = b.poll();
        assertEquals("", item[0]);
        assertEquals("fa-IR", item[1]);
        b.push("x", "");
        assertEquals("fa-IR", b.poll()[1]);
    }

    @Test
    public void clearEmptiesEverything_stopSpeakingSemantics() {
        VoiceHelper.TtsBuffer b = new VoiceHelper.TtsBuffer(4);
        b.push("a", "en-US");
        b.push("b", "en-US");
        b.clear();
        assertEquals(0, b.size());
        assertTrue(b.poll() == null);
    }

    @Test
    public void minCapacityIsOne() {
        VoiceHelper.TtsBuffer b = new VoiceHelper.TtsBuffer(0);
        assertEquals(0, b.push("x", "fa-IR"));
        assertEquals("x", b.poll()[0]);
    }

    // ── localeFor ───────────────────────────────────────────────

    @Test
    public void localeForParsesBcp47() {
        assertEquals(new Locale("fa", "IR"), VoiceHelper.localeFor("fa-IR"));
        assertEquals(new Locale("en", "US"), VoiceHelper.localeFor("en-US"));
        assertEquals(new Locale("fa"), VoiceHelper.localeFor("fa"));
        assertEquals(new Locale("en"), VoiceHelper.localeFor("en"));
    }

    @Test
    public void localeForDefaultsToPersian() {
        assertEquals(new Locale("fa"), VoiceHelper.localeFor(null));
        assertEquals(new Locale("fa"), VoiceHelper.localeFor(""));
        assertEquals(new Locale("fa"), VoiceHelper.localeFor("   "));
    }

    // ── languageVerdict: حکم صادقانهٔ زبان ──────────────────────

    @Test
    public void languageVerdictIsHonest() {
        assertEquals(VoiceHelper.TTS_LANG_OK, VoiceHelper.languageVerdict(android.speech.tts.TextToSpeech.LANG_AVAILABLE));
        assertEquals(VoiceHelper.TTS_LANG_OK, VoiceHelper.languageVerdict(android.speech.tts.TextToSpeech.LANG_COUNTRY_AVAILABLE));
        assertEquals(VoiceHelper.TTS_LANG_OK, VoiceHelper.languageVerdict(android.speech.tts.TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE));
        // نبود دادهٔ صدا روی دستگاه — پیام صادقانه، نه موفقیت
        assertEquals(VoiceHelper.TTS_LANG_MISSING_DATA, VoiceHelper.languageVerdict(android.speech.tts.TextToSpeech.LANG_MISSING_DATA));
        assertEquals(VoiceHelper.TTS_LANG_NOT_SUPPORTED, VoiceHelper.languageVerdict(android.speech.tts.TextToSpeech.LANG_NOT_SUPPORTED));
    }

    // ── قرارداد رویداد جدید rahyar-tts-error ────────────────────

    @Test
    public void ttsErrorEventContractIsWebSafe() {
        String js = VoiceHelper.eventJs("rahyar-tts-error", "{\"code\":\"missing_data\"}");
        assertTrue(js.contains("'rahyar-tts-error'"));
        assertTrue(js.contains("{detail:{\"code\":\"missing_data\"}}"));
        assertTrue(js.startsWith("try{"));
        assertTrue(js.endsWith("}catch(e){}"));
    }

    @Test
    public void maxQueueCapIsDocumented() {
        assertEquals(8, VoiceHelper.MAX_TTS_QUEUE);
    }
}
