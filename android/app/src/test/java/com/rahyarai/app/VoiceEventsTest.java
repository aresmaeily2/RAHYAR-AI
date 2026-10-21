package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * قرارداد رویدادهای صوتی بومی — رشته‌های JS باید evaluateJavascript-safe باشند.
 * نام رخدادها دقیقاً باید با src/lib/voice/native.ts و speech.ts هم‌خوان بماند.
 */
public class VoiceEventsTest {

    @Test
    public void eventNamesMatchWebContract() {
        // قرارداد وب: rahyar-voice-partial / final / error / end + rahyar-tts-done
        String[] names = {"rahyar-voice-partial", "rahyar-voice-final", "rahyar-voice-error", "rahyar-voice-end", "rahyar-tts-done"};
        for (String n : names) {
            String js = VoiceHelper.eventJs(n, null);
            assertTrue(js.contains("'" + n + "'"));
            assertTrue(js.startsWith("try{"));
            assertTrue(js.endsWith("}catch(e){}"));
        }
    }

    @Test
    public void eventWithDetailEmbedsJson() {
        String js = VoiceHelper.eventJs("rahyar-voice-final", "{\"text\":\"سلام\"}");
        assertTrue(js.contains("{detail:{\"text\":\"سلام\"}}"));
    }

    @Test
    public void jsStringEscapesQuotesAndNewlines() {
        assertEquals("سلام عادی", VoiceHelper.jsString("سلام عادی"));
        // نقل‌قول دوتایی → با بک‌اسلش امن می‌شود
        assertEquals("با \\\"کوت\\\"", VoiceHelper.jsString("با \"کوت\""));
        assertEquals("خط\\nجدید", VoiceHelper.jsString("خط\nجدید"));
        assertEquals("بک\\\\اسلش", VoiceHelper.jsString("بک\\اسلش"));
        assertEquals("تک\\'کوت", VoiceHelper.jsString("تک'کوت"));
        // نویسه‌های کنترلی به فاصله امن تبدیل می‌شوند
        assertEquals("a b", VoiceHelper.jsString("a\u0000b"));
        assertEquals("", VoiceHelper.jsString(null));
    }

    @Test
    public void jsStringOutputIsSingleLineSafe() {
        String nasty = "متن\" با ' نقل و \\n واقعی\nو \\";
        String js = VoiceHelper.jsString(nasty);
        assertFalse(js.contains("\n"));
    }
}
