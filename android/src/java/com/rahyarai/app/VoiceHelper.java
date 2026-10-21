package com.rahyarai.app;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.WebView;

import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * صوت بومی — تشخیص گفتار اندروید (fa-IR/en-US) و خواندن پاسخ با TTS سیستم.
 *
 * قرارداد رویدادها (اندروید → وب، با تزریق به WebView):
 *   rahyar-voice-partial {text}   متن موقت
 *   rahyar-voice-final   {text}   نتیجهٔ قطعی
 *   rahyar-voice-error   {code}   no_match | busy | denied | unavailable | error
 *   rahyar-voice-end              پایان شنود
 *   rahyar-tts-done      {id}     پایان خواندن
 *
 * یادداشت مجوز: SpeechRecognizer به RECORD_AUDIO نیاز ندارد — فرایند تشخیص
 * توسط سرویس گفتار سیستم انجام می‌شود (قرارداد پلتفرم)؛ صدا هیچ‌گاه به سرور
 * رهیار ارسال یا ذخیره نمی‌شود.
 */
public final class VoiceHelper {

    /** JS رویداد — خالص و تست‌پذیر (خروجی باید evaluateJavascript-safe باشد) */
    static String eventJs(String name, String detailJson) {
        String d = detailJson == null || detailJson.isEmpty() ? "{}" : detailJson;
        return "try{window.dispatchEvent(new CustomEvent('" + name + "',{detail:" + d + "}))}catch(e){}";
    }

    /** متن امن JS — گریز نقل‌قول و بک‌اسلش و خط جدید */
    static String jsString(String raw) {
        if (raw == null) return "";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c == '\\' || c == '"') b.append('\\').append(c);
            else if (c == '\n') b.append("\\n");
            else if (c == '\r') b.append("\\r");
            else if (c == '\'') b.append("\\'");
            else if (c < 0x20) b.append(' ');
            else b.append(c);
        }
        return b.toString();
    }

    private final WebView web;
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private final AtomicBoolean listening = new AtomicBoolean(false);
    private String lastLang = "fa-IR";

    public VoiceHelper(WebView web) {
        this.web = web;
    }

    // ── تشخیص گفتار ──

    public void startListening(String langBcp47) {
        if (listening.get()) stopListening();
        if (!SpeechRecognizer.isRecognitionAvailable(web.getContext())) {
            emitError("unavailable");
            emitEnd();
            return;
        }
        lastLang = (langBcp47 == null || langBcp47.isEmpty()) ? "fa-IR" : langBcp47;
        recognizer = SpeechRecognizer.createSpeechRecognizer(web.getContext());
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { /* آماده */ }
            @Override public void onBeginningOfSpeech() { /* شروع گفتار */ }
            @Override public void onRmsChanged(float rmsdB) { /* سطح صدا — استفاده نمی‌شود */ }
            @Override public void onBufferReceived(byte[] buffer) { /* بافر خام — استفاده نمی‌شود */ }
            @Override public void onPartialResults(Bundle partialResults) {
                String t = firstText(partialResults);
                if (t != null && !t.isEmpty()) {
                    web.evaluateJavascript(eventJs("rahyar-voice-partial", "{\"text\":\"" + jsString(t) + "\"}"), null);
                }
            }
            @Override public void onEvent(int eventType, Bundle params) { /* رویداد جانبی */ }
            @Override public void onEndOfSpeech() { /* پایان گفتار — نتیجه در راه است */ }

            @Override public void onError(int error) {
                listening.set(false);
                switch (error) {
                    case SpeechRecognizer.ERROR_NO_MATCH:
                    case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                        emitError("no_match");
                        break;
                    case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                        emitError("busy");
                        break;
                    case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                        emitError("denied");
                        break;
                    case SpeechRecognizer.ERROR_CLIENT:
                        emitError("error");
                        break;
                    default:
                        emitError("error");
                        break;
                }
                emitEnd();
                destroyRecognizer();
            }

            @Override public void onResults(Bundle results) {
                listening.set(false);
                String t = firstText(results);
                if (t != null && !t.trim().isEmpty()) {
                    web.evaluateJavascript(eventJs("rahyar-voice-final", "{\"text\":\"" + jsString(t.trim()) + "\"}"), null);
                } else {
                    emitError("no_match");
                }
                emitEnd();
                destroyRecognizer();
            }
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lastLang);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lastLang);
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        listening.set(true);
        try {
            recognizer.startListening(i);
        } catch (Exception e) {
            listening.set(false);
            emitError("error");
            emitEnd();
            destroyRecognizer();
        }
    }

    public void stopListening() {
        if (recognizer != null) {
            try { recognizer.stopListening(); } catch (Exception ignored) {}
        }
    }

    private void destroyRecognizer() {
        if (recognizer != null) {
            try { recognizer.destroy(); } catch (Exception ignored) {}
            recognizer = null;
        }
    }

    private static String firstText(Bundle b) {
        if (b == null) return null;
        ArrayList<String> list = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (list == null || list.isEmpty()) return null;
        return list.get(0);
    }

    private void emitError(String code) {
        web.evaluateJavascript(eventJs("rahyar-voice-error", "{\"code\":\"" + jsString(code) + "\"}"), null);
    }

    private void emitEnd() {
        web.evaluateJavascript(eventJs("rahyar-voice-end", null), null);
    }

    // ── خروجی صوتی (TTS) ──

    public void initTts() {
        if (tts != null) return;
        tts = new TextToSpeech(web.getContext(), new TextToSpeech.OnInitListener() {
            @Override public void onInit(int status) {
                ttsReady = (status == TextToSpeech.SUCCESS);
            }
        });
    }

    /** خواندن متن — شناسهٔ گفته برای رویداد پایان */
    public void speak(String text, String langBcp47) {
        if (tts == null) initTts();
        if (tts == null || !ttsReady) {
            // TTS هنوز آماده نیست — یک‌بار دیگر در فراخوان بعدی آماده می‌شود
            emitTtsDone();
            return;
        }
        try {
            Locale l;
            if (langBcp47 != null && langBcp47.contains("-")) {
                String[] p = langBcp47.split("-", 2);
                l = new Locale(p[0], p[1]);
            } else {
                l = new Locale(langBcp47 == null || langBcp47.isEmpty() ? "fa" : langBcp47);
            }
            tts.setLanguage(l);
            String id = "rahyar-tts-" + System.nanoTime();
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String utteranceId) { /* شروع */ }
                @Override public void onDone(String utteranceId) { emitTtsDone(); }
                @Override public void onError(String utteranceId) { emitTtsDone(); }
            });
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
        } catch (Exception e) {
            emitTtsDone();
        }
    }

    public void stopSpeaking() {
        if (tts != null) {
            try { tts.stop(); } catch (Exception ignored) {}
        }
        emitTtsDone();
    }

    private void emitTtsDone() {
        web.evaluateJavascript(eventJs("rahyar-tts-done", null), null);
    }

    public void destroy() {
        destroyRecognizer();
        if (tts != null) {
            try { tts.stop(); tts.shutdown(); } catch (Exception ignored) {}
            tts = null;
            ttsReady = false;
        }
    }
}
