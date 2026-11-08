package com.rahyarai.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.WebView;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * صوت بومی — تشخیص گفتار اندروید (fa-IR/en-US) و خواندن پاسخ با TTS سیستم.
 *
 * قرارداد رویدادها (اندروید → وب، با تزریق به WebView):
 *   rahyar-voice-partial {text}     متن موقت
 *   rahyar-voice-final   {text}     نتیجهٔ قطعی
 *   rahyar-voice-error   {code}     no_match | busy | denied | unavailable | error
 *   rahyar-voice-end                پایان شنود
 *   rahyar-voice-perm    {state}    granted | denied   (پس از دیالوگ مجوز)
 *   rahyar-tts-done                 پایان واقعی خواندن (یا پایان خطای نهایی)
 *   rahyar-tts-error     {code}     init_failed | missing_data | not_supported | error
 *
 * R3-P0 §3 (مأموریت V1-P3-R3 — اصلاح TTS و چرخهٔ عمر):
 *  - درخواست‌های TTS تا آماده‌شدن موتور در صف امن (TtsBuffer) می‌مانند — متن پاسخ
 *    هرگز به‌خاطر آماده‌نبودن موتور گم نمی‌شود (باگ قبلی: emit فوری tts-done + دور ریختن متن).
 *  - پاسخ‌های متوالی با QUEUE_ADD به‌ترتیب پخش می‌شوند؛ پاسخ بعدی با قبلی تداخل نمی‌کند.
 *  - نتیجهٔ tts.setLanguage بررسی می‌شود؛ نبود صدای فارسی/انگلیسی روی دستگاه = خطای
 *    صادقانه (rahyar-tts-error) نه موفقیت قلابی.
 *  - رویداد tts-done فقط در پایان واقعی پخش یا خطای نهایی ارسال می‌شود.
 *  - stopSpeaking صف را نیز پاک می‌کند؛ destroy همهٔ callbackها و صف را ایمن می‌بندد.
 *  - همهٔ رویدادهای وب از رشتهٔ UI ارسال می‌شوند (callbackهای STT/TTS روی رشتهٔ
 *    binder می‌آیند — ارسال مستقیم به WebView روی رشتهٔ اشتباه بود).
 *
 * حریم خصوصی (بازنویسی صادقانهٔ R3-P0 §4): شنود فقط با لمس دکمهٔ میکروفون آغاز می‌شود؛
 * رهیار خودش هیچ صدایی ذخیره نمی‌کند. با این حال «سرویس گفتار سیستم‌عامل» ممکن است بسته
 * به دستگاه صدا را روی‌دستگاه یا آنلاین پردازش کند — مسیر واقعی در sttEngineMode
 * گزارش می‌شود و ادعای «صدا هرگز ارسال نمی‌شود» صحیح نیست (مستند: V1_P3R3_PRIVACY_REVIEW.md).
 *
 * یادداشت مجوز: SpeechRecognizer به RECORD_AUDIO نیاز ندارد — فرایند تشخیص
 * توسط سرویس گفتار سیستم انجام می‌شود (قرارداد پلتفرم)؛ ما با این حال مجوز را
 * صریح می‌گیریم تا سرویس‌هایی که باطن آن‌ها در همین فرایند است بدون خطا کار کنند
 * و نمایش وضعیت مجوز در UI ممکن باشد.
 */
public final class VoiceHelper implements RahyarBridge.VoiceDelegate {

    /** F2-TEST-HOOK (فقط دیباگ): ساخت همین رویداد «نتیجهٔ قطعی شنیدار» برای تزریق
     * فرمان متنی از adb روی شبیه‌ساز بدون میکروفون. مسیر اجرا (پارسر + موتور اجرای
     * app.js) کاملاً واقعی است؛ تنها مرحلهٔ STT کنار گذاشته می‌شود. در بیلد Release
     * هیچ مسیر تزریقی وجود ندارد. */
    public static String debugFinalEvent(String text) {
        return eventJs("rahyar-voice-final", "{\"text\":\"" + jsString(text) + "\"}");
    }

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

    // ── R3-P0 §3: منطق خالص TTS — JVM-آزمون‌پذیر ──

    /** ظرفیت صف TTS — پاسخ‌های متوالی؛ سرریز = قدیمی‌ترین حذف می‌شود */
    static final int MAX_TTS_QUEUE = 8;
    static final String TTS_LANG_OK = "ok";
    static final String TTS_LANG_MISSING_DATA = "missing_data";
    static final String TTS_LANG_NOT_SUPPORTED = "not_supported";

    /**
     * صف امن TTS — خالص و JVM-آزمون‌پذیر.
     * FIFO با ظرفیت محدود؛ سرریز = قدیمی‌ترین گفته دور ریخته می‌شود و تعدادش
     * برمی‌گردد (هیچ بی‌خبری نیست).
     */
    static final class TtsBuffer {
        private final ArrayDeque<String[]> q = new ArrayDeque<>();
        private final int cap;
        TtsBuffer(int cap) { this.cap = Math.max(1, cap); }
        /** خروجی: تعداد گفتهٔ دور ریخته‌شده برای جا باز کردن (۰ یا ۱) */
        synchronized int push(String text, String langBcp47) {
            int evicted = 0;
            if (q.size() >= cap) { q.pollFirst(); evicted = 1; }
            q.addLast(new String[]{text == null ? "" : text,
                    (langBcp47 == null || langBcp47.isEmpty()) ? "fa-IR" : langBcp47});
            return evicted;
        }
        synchronized String[] poll() { return q.pollFirst(); }
        synchronized void clear() { q.clear(); }
        synchronized int size() { return q.size(); }
    }

    /** زبان BCP-47 → Locale؛ تهی/نامعتبر = فارسی (رفتار قراردادی وب) */
    static Locale localeFor(String langBcp47) {
        if (langBcp47 == null || langBcp47.trim().isEmpty()) return new Locale("fa");
        if (langBcp47.contains("-")) {
            String[] p = langBcp47.split("-", 2);
            return new Locale(p[0], p[1]);
        }
        return new Locale(langBcp47);
    }

    /** نتیجهٔ tts.setLanguage → حکم صادقانه (ok | missing_data | not_supported) */
    static String languageVerdict(int setLanguageResult) {
        if (setLanguageResult >= TextToSpeech.LANG_AVAILABLE) return TTS_LANG_OK;
        if (setLanguageResult == TextToSpeech.LANG_MISSING_DATA) return TTS_LANG_MISSING_DATA;
        return TTS_LANG_NOT_SUPPORTED;
    }

    // ── نمونه ──

    private final WebView web;
    private final Activity activity;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private final AtomicBoolean listening = new AtomicBoolean(false);
    private final AtomicReference<String> pendingUtterance = new AtomicReference<>(null);
    private final TtsBuffer ttsBuffer = new TtsBuffer(MAX_TTS_QUEUE);
    private String lastLang = "fa-IR";
    /** سرعت خواندن — پیش‌فرض سیستم؛ با setSpeechRate از تنظیمات صوتی تغییر می‌کند */
    private volatile float speechRate = 1.0f;

    public VoiceHelper(WebView web, Activity activity) {
        this.web = web;
        this.activity = activity;
        // R3-P0 §3: آماده‌سازی زودهنگام موتور — اولین درخواستِ بلافاصله پس از شروع
        // برنامه به‌جای دور ریختن، در صف امن می‌ماند تا موتور آماده شود
        initTts();
    }

    /** تنظیم سرعت خواندن TTS — بازهٔ مجاز ۰.۵ تا ۲.۵ (خارج بازه = بی‌اثر) */
    public void setSpeechRate(float rate) {
        if (rate >= 0.5f && rate <= 2.5f) speechRate = rate;
    }

    // ── مجوز میکروفون (قرارداد VoiceDelegate) ──

    @Override
    public String micState() {
        if (activity == null) return "granted";
        int p = activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO);
        return p == PackageManager.PERMISSION_GRANTED ? "granted"
                : activity.shouldShowRequestPermissionRationale(Manifest.permission.RECORD_AUDIO) ? "denied"
                : "need_request";
    }

    @Override
    public void requestMic() {
        if (activity == null) return;
        activity.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 4701);
    }

    /** پاسخ دیالوگ مجوز — از onRequestPermissions نتیجهٔ اکتیویتی */
    public void onPermissionResult(boolean granted) {
        postToWeb(eventJs("rahyar-voice-perm",
                "{\"state\":\"" + (granted ? "granted" : "denied") + "\"}"));
    }

    @Override
    public boolean recognitionAvailable() {
        return SpeechRecognizer.isRecognitionAvailable(web.getContext());
    }

    // ── R3-P0 §4: مسیر تشخیص — روی‌دستگاه یا سیستمی؛ آنلاین فقط با رضایت صریح ──

    static final String MODE_ON_DEVICE = "on_device";
    /** سرویس گفتار سیستم — بسته به دستگاه می‌تواند آنلاین پردازش کند؛ برچسب صادقانه */
    static final String MODE_SYSTEM_SERVICE = "system_service";
    static final String MODE_UNAVAILABLE = "unavailable";

    static final String DECISION_START_ON_DEVICE = "START_ON_DEVICE";
    static final String DECISION_START_SYSTEM_CONSENTED = "START_SYSTEM_CONSENTED";
    static final String DECISION_CONSENT_REQUIRED = "CONSENT_REQUIRED";
    static final String DECISION_BLOCKED_UNAVAILABLE = "BLOCKED_UNAVAILABLE";

    /** خالص و JVM-آزمون‌پذیر: مسیر موتور بر اساس دسترسی دستگاه */
    static String sttEngineMode(boolean recognitionAvailable, boolean onDeviceAvailable) {
        if (onDeviceAvailable) return MODE_ON_DEVICE;
        if (recognitionAvailable) return MODE_SYSTEM_SERVICE;
        return MODE_UNAVAILABLE;
    }

    /** خالص و JVM-آزمون‌پذیر: تصمیم شروع — شنود سیستمی (ممکن است آنلاین) فقط با رضایت ذخیره‌شده */
    static String sttStartDecision(String mode, boolean onlineConsent) {
        if (MODE_ON_DEVICE.equals(mode)) return DECISION_START_ON_DEVICE;
        if (MODE_SYSTEM_SERVICE.equals(mode)) {
            return onlineConsent ? DECISION_START_SYSTEM_CONSENTED : DECISION_CONSENT_REQUIRED;
        }
        return DECISION_BLOCKED_UNAVAILABLE;
    }

    /** مسیر واقعی موتور روی این دستگاه (API 31+ → on-device در صورت وجود) */
    private String engineMode() {
        Context ctx = web.getContext();
        boolean onDevice = false;
        if (Build.VERSION.SDK_INT >= 31) {
            try { onDevice = SpeechRecognizer.isOnDeviceRecognitionAvailable(ctx); } catch (Exception ignored) { }
        }
        return sttEngineMode(SpeechRecognizer.isRecognitionAvailable(ctx), onDevice);
    }

    private boolean onlineConsentStored() {
        if (activity == null) return false;
        return activity.getSharedPreferences("rahyar_consents", Context.MODE_PRIVATE)
                .getBoolean("stt_online_consent", false);
    }

    /** ثبت/لغو رضایت شنود آنلاین — از UI (تنظیمات) یا دیالوگ بومی */
    public void setSttOnlineConsent(boolean granted) {
        if (activity == null) return;
        activity.getSharedPreferences("rahyar_consents", Context.MODE_PRIVATE).edit()
                .putBoolean("stt_online_consent", granted).apply();
    }

    /** وضعیت موتور برای UI — JSON: {available, mode, online_consent} */
    public String sttState() {
        String mode = engineMode();
        return "{\"available\":" + (MODE_UNAVAILABLE.equals(mode) ? "false" : "true")
                + ",\"mode\":\"" + jsString(mode) + "\""
                + ",\"online_consent\":" + (onlineConsentStored() ? "true" : "false") + "}";
    }

    /** ساخت recognizer بر اساس مسیر انتخاب‌شده — شکست on-device = خطای صادقانه */
    private SpeechRecognizer createRecognizerForMode(String decision) {
        Context ctx = web.getContext();
        if (DECISION_START_ON_DEVICE.equals(decision) && Build.VERSION.SDK_INT >= 31) {
            try {
                return SpeechRecognizer.createOnDeviceSpeechRecognizer(ctx);
            } catch (Exception e) {
                emitError("error");
                emitEnd();
                return null;
            }
        }
        return SpeechRecognizer.createSpeechRecognizer(ctx);
    }

    /** دیالوگ رضایت بومی برای شنود سیستمی/آنلاین — بدون رضایت، هیچ شنودی از این مسیر */
    private void showSttConsentDialog() {
        if (activity == null || activity.isFinishing()) {
            emitError("consent_declined");
            emitEnd();
            return;
        }
        final String lang = lastLang;
        activity.runOnUiThread(new Runnable() {
            @Override public void run() {
                try {
                    new android.app.AlertDialog.Builder(activity)
                            .setTitle(activity.getString(R.string.stt_consent_title))
                            .setMessage(activity.getString(R.string.stt_consent_msg))
                            .setPositiveButton(activity.getString(R.string.stt_consent_yes),
                                    new android.content.DialogInterface.OnClickListener() {
                                        @Override public void onClick(android.content.DialogInterface d, int w) {
                                            setSttOnlineConsent(true);
                                            startListening(lang); // اکنون رضایت ذخیره شده است
                                        }
                                    })
                            .setNegativeButton(activity.getString(R.string.stt_consent_no),
                                    new android.content.DialogInterface.OnClickListener() {
                                        @Override public void onClick(android.content.DialogInterface d, int w) {
                                            setSttOnlineConsent(false);
                                            emitError("consent_declined");
                                            emitEnd();
                                        }
                                    })
                            .setOnCancelListener(new android.content.DialogInterface.OnCancelListener() {
                                @Override public void onCancel(android.content.DialogInterface d) {
                                    emitError("consent_declined");
                                    emitEnd();
                                }
                            })
                            .show();
                } catch (Exception e) {
                    emitError("consent_declined");
                    emitEnd();
                }
            }
        });
    }

    // ── تشخیص گفتار ──

    @Override
    public void startListening(String langBcp47) {
        if (listening.get()) stopListening();
        // F7 (ایجنت ۲): مجوز میکروفون پیش‌شرط شنود است — بدون آن SpeechRecognizer فقط
        // «خطای عمومی» می‌دهد؛ اکنون جریان رضایت صریح اجرا می‌شود (بدون شنود پنهانی)
        String mic = micState();
        if (!"granted".equals(mic)) {
            if ("need_request".equals(mic)) {
                requestMic(); // پاسخ در rahyar-voice-perm — وب دوباره تلاش می‌کند
            } else {
                emitError("denied");
            }
            emitEnd();
            return;
        }
        // R3-P0 §4: تفکیک مسیر روی‌دستگاه/سیستمی + رضایت صریح برای مسیر آنلاین‌پذیر
        String mode = engineMode();
        String decision = sttStartDecision(mode, onlineConsentStored());
        if (DECISION_BLOCKED_UNAVAILABLE.equals(decision)) {
            emitError("unavailable");
            emitEnd();
            return;
        }
        if (DECISION_CONSENT_REQUIRED.equals(decision)) {
            showSttConsentDialog(); // بدون رضایت، هیچ شنودی از مسیر سیستمی/آنلاین
            emitEnd();
            return;
        }
        lastLang = (langBcp47 == null || langBcp47.isEmpty()) ? "fa-IR" : langBcp47;
        recognizer = createRecognizerForMode(decision);
        if (recognizer == null) return; // خطا/پایان قبلاً ارسال شده است
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { /* آماده */ }
            @Override public void onBeginningOfSpeech() { /* شروع گفتار */ }
            @Override public void onRmsChanged(float rmsdB) { /* سطح صدا — استفاده نمی‌شود */ }
            @Override public void onBufferReceived(byte[] buffer) { /* بافر خام — استفاده نمی‌شود */ }
            @Override public void onPartialResults(Bundle partialResults) {
                String t = firstText(partialResults);
                if (t != null && !t.isEmpty()) {
                    postToWeb(eventJs("rahyar-voice-partial", "{\"text\":\"" + jsString(t) + "\"}"));
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
                    postToWeb(eventJs("rahyar-voice-final", "{\"text\":\"" + jsString(t.trim()) + "\"}"));
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
        // V1 (بند ۳): تغییر زبان در میانهٔ مکالمه — روی سرویس‌های سازگار (API 33+)
        // سرویس تشخیص می‌تواند بین fa/en سوییچ کند؛ روی دستگاه‌های قدیمی‌تر بی‌اثر است
        try {
            i.putExtra("android.speech.extra.ENABLE_LANGUAGE_SWITCH", true);
        } catch (Exception ignored) { /* کلید روی پلتفرم قدیمی پشتیبانی نمی‌شود */ }
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

    @Override
    public void stopListening() {
        if (recognizer != null) {
            try { recognizer.stopListening(); } catch (Exception ignored) {}
        }
        listening.set(false);
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

    // ── ارسال رویداد به وب — همیشه از رشتهٔ UI ──

    private void postToWeb(String js) {
        ui.post(new Runnable() {
            @Override public void run() {
                try { web.evaluateJavascript(js, null); } catch (Exception ignored) {}
            }
        });
    }

    private void emitError(String code) {
        postToWeb(eventJs("rahyar-voice-error", "{\"code\":\"" + jsString(code) + "\"}"));
    }

    private void emitEnd() {
        postToWeb(eventJs("rahyar-voice-end", null));
    }

    // ── خروجی صوتی (TTS) — R3-P0 §3 ──

    public void initTts() {
        if (tts != null) return;
        tts = new TextToSpeech(web.getContext(), new TextToSpeech.OnInitListener() {
            @Override public void onInit(int status) {
                if (status == TextToSpeech.SUCCESS) {
                    ttsReady = true;
                    // صفِ مانده تا آماده‌شدن موتور — به‌ترتیب پخش می‌شود
                    String[] next = ttsBuffer.poll();
                    if (next != null) speakNow(next[0], next[1]);
                } else {
                    // شکست init = خطای نهایی برای همهٔ صف — صادقانه، بدون tts-done قلابی
                    ttsReady = false;
                    emitTtsError("init_failed");
                    ttsBuffer.clear();
                    emitTtsDone();
                }
            }
        });
        // شنوندهٔ پیشرفت یک‌بار در init ثبت می‌شود — برای همهٔ گفته‌ها معتبر است
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String utteranceId) { /* شروع پخش */ }
            @Override public void onDone(String utteranceId) { finishUtterance(utteranceId); }
            @Override public void onError(String utteranceId) { finishUtterance(utteranceId); }
            @Override public void onError(String utteranceId, int errorCode) { finishUtterance(utteranceId); }
        });
    }

    /** خواندن متن — اگر موتور آماده نیست، در صف امن می‌ماند (متن گم نمی‌شود) */
    @Override
    public void speak(String text, String langBcp47) {
        if (tts == null) initTts();
        if (tts == null || !ttsReady) {
            ttsBuffer.push(text, langBcp47);
            return; // پایان واقعی بعد از پخشِ صف — بدون tts-done الکی
        }
        speakNow(text, langBcp47);
    }

    private void speakNow(String text, String langBcp47) {
        if (text == null || text.trim().isEmpty()) {
            emitTtsDone();
            return;
        }
        try {
            Locale l = localeFor(langBcp47);
            int res = tts.setLanguage(l);
            String verdict = languageVerdict(res);
            if (!TTS_LANG_OK.equals(verdict)) {
                // صدای این زبان نصب/پشتیبانی نیست — موفقیت قلابی ممنوع (بند ۶/۷ §3)
                emitTtsError(verdict);
                emitTtsDone();
                return;
            }
            tts.setSpeechRate(speechRate);
            String id = "rahyar-tts-" + System.nanoTime();
            pendingUtterance.set(id);
            // QUEUE_ADD: پاسخ بعدی هرگز پاسخ جاری را قطع نمی‌کند (بند ۲/۹ §3)
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, id);
        } catch (Exception e) {
            pendingUtterance.set(null);
            emitTtsError("error");
            emitTtsDone();
        }
    }

    /** پایان واقعی یک گفته — سپس صف؛ اگر صف خالی است، tts-done واقعی */
    private void finishUtterance(String utteranceId) {
        String cur = pendingUtterance.get();
        if (cur != null && !cur.equals(utteranceId)) return; // گفتهٔ قدیمی/نامرتبط — بی‌اثر
        String[] next = ttsBuffer.poll();
        if (next != null) {
            speakNow(next[0], next[1]);
        } else {
            pendingUtterance.set(null);
            emitTtsDone();
        }
    }

    @Override
    public void stopSpeaking() {
        // بند ۳ §3: قطع خواندن صف را نیز پاک می‌کند — هیچ گفتهٔ پنهانی بعدی پخش نمی‌شود
        ttsBuffer.clear();
        pendingUtterance.set(null);
        if (tts != null) {
            try { tts.stop(); } catch (Exception ignored) {}
        }
        emitTtsDone();
    }

    private void emitTtsDone() {
        postToWeb(eventJs("rahyar-tts-done", null));
    }

    private void emitTtsError(String code) {
        postToWeb(eventJs("rahyar-tts-error", "{\"code\":\"" + jsString(code) + "\"}"));
    }

    /** بند ۴ §3: destroy همهٔ callbackها و صف را ایمن می‌بندد */
    public void destroy() {
        destroyRecognizer();
        ttsBuffer.clear();
        pendingUtterance.set(null);
        if (tts != null) {
            try {
                tts.setOnUtteranceProgressListener(null);
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {}
            tts = null;
            ttsReady = false;
        }
    }
}
