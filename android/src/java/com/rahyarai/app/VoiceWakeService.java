package com.rahyarai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import java.util.ArrayList;

/**
 * VoiceWakeService — فعال‌ساز اختیاری Wake Word «سلام رهیار».
 *
 * R3-P0 (مأموریت V1-P3-R3 §2 — سیاست واحد شروع):
 *  - شروع سرویس فقط از مسیر «Activity قابل مشاهده + مجوز RECORD_AUDIO + رضایت ذخیره‌شدهٔ
 *    پروفایل + موتور تشخیص موجود» مجاز است — گیت واحد startGate؛ هر مسیر دیگر (از جمله
 *    BOOT_COMPLETED) رد می‌شود.
 *  - پیش از startForeground، گیت بررسی می‌شود؛ در رد مجوز یا SecurityException:
 *    سرویس شروع نمی‌شود، اعلان گمراه‌کنندهٔ «در حال شنود» هرگز ساخته نمی‌شود،
 *    خطا به شکل امن (بدون دادهٔ کاربر) ثبت می‌شود و UI به وضعیت واقعی برمی‌گردد.
 *  - در لغو مجوز در حین اجرا، چرخهٔ شنود سرویس را فوراً متوقف می‌کند.
 *
 * R3-P1 (§5 — تصمیم معماری Wake Word): تا تکمیل آزمون واقعی و اندازه‌گیری باتری،
 * بیدارباش به‌صورت پیش‌فرض غیرفعال است (WAKE_FEATURE_ENABLED=false)؛ Push-to-talk
 * (دکمهٔ میکروفون) کاملاً مستقل از این سرویس است و بی‌تأثیر می‌ماند. مستند:
 * docs/audit/V1_P3R3_WAKE_WORD_DECISION.md
 *
 * F7 (ایجنت ۲): باگ چرخهٔ شنود برطرف شد — پس از هر پایان/خطا، شنونده با تأخیر
 * قطعی (backoff) دوباره شروع می‌شود؛ برای «اجازهٔ ناکافی» دوباره‌شروعی نمی‌کنیم.
 */
public final class VoiceWakeService extends Service {

    public static final String CHANNEL_ID = "rahyar_wake";
    public static final int NOTIF_ID = 4702;
    /** عبارت‌های بیدارباش — fa و en */
    static final String[] WAKE_PHRASES = {"سلام رهیار", "سلام رهيار", "hey rahyar", "hi rahyar", "rahyar"};

    /** R3-P1: بیدارباش تا آزمون واقعی + اندازه‌گیری باتری غیرفعال است (تصمیم مستند) */
    static final boolean WAKE_FEATURE_ENABLED = false;

    /** خروجی‌های گیت واحد شروع — JVM-آزمون‌پذیر */
    static final String GATE_START_OK = "START_OK";
    static final String GATE_OFF_DISABLED = "OFF_DISABLED";
    static final String GATE_OFF_NO_CONSENT = "OFF_NO_CONSENT";
    static final String GATE_BLOCKED_NOT_FROM_ACTIVITY = "BLOCKED_NOT_FROM_ACTIVITY";
    static final String GATE_BLOCKED_NO_MIC = "BLOCKED_NO_MIC";
    static final String GATE_OFF_NO_ENGINE = "OFF_NO_ENGINE";

    /** extra مسیر شروع — فقط مقدار "activity" از HomeActivity پذیرفته است */
    static final String EXTRA_START_FROM = "rahyar_start_from";
    static final String START_FROM_ACTIVITY = "activity";

    /** کدهای خطای SpeechRecognizer — برای آزمون JVM و backoff */
    static final int ERR_NETWORK_TIMEOUT = 1;
    static final int ERR_NETWORK = 2;
    static final int ERR_AUDIO = 3;
    static final int ERR_SERVER = 4;
    static final int ERR_CLIENT = 5;
    static final int ERR_SPEECH_TIMEOUT = 6;
    static final int ERR_NO_MATCH = 7;
    static final int ERR_RECOGNIZER_BUSY = 8;
    static final int ERR_INSUFFICIENT_PERMISSIONS = 9;

    /** سقف backoff (ms) */
    static final long RESTART_MAX_MS = 30_000;
    /** تأخیر عادی چرخهٔ شنود (ms) */
    static final long RESTART_QUICK_MS = 150;

    private android.speech.SpeechRecognizer recognizer;
    private volatile boolean destroyed = false;
    private int consecutiveErrors = 0;
    private final android.os.Handler main = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable restartTask = new Runnable() {
        @Override public void run() { startListeningSafe(); }
    };

    /**
     * R3-P0 — گیت واحد شروع سرویس بیدارباش (خالص و JVM-آزمون‌پذیر).
     * ترتیب ارزیابی: غیرفعال بودن قابلیت → رضایت → مسیر Activity → مجوز میکروفون → موتور.
     * شنود فقط با START_OK مجاز است؛ هیچ ترکیب دیگری سرویس را روشن نمی‌کند.
     */
    static String startGate(boolean micGranted, boolean wakeConsent, boolean fromVisibleActivity,
                            boolean recognitionAvailable, boolean wakeFeatureEnabled) {
        if (!wakeFeatureEnabled) return GATE_OFF_DISABLED;
        if (!wakeConsent) return GATE_OFF_NO_CONSENT;
        if (!fromVisibleActivity) return GATE_BLOCKED_NOT_FROM_ACTIVITY;
        if (!micGranted) return GATE_BLOCKED_NO_MIC;
        if (!recognitionAvailable) return GATE_OFF_NO_ENGINE;
        return GATE_START_OK;
    }

    /**
     * F7 — تأخیر دوباره‌شروعیِ قطعی (خالص — JVM آزمون‌پذیر).
     * خروجی -۱ = دوباره‌شروعی ممنوع (مثلاً اجازهٔ ناکافی).
     */
    static long nextRestartDelayMs(int errorCode, int consecutiveErrors) {
        if (errorCode == ERR_INSUFFICIENT_PERMISSIONS) return -1;
        if (errorCode == ERR_NO_MATCH || errorCode == ERR_SPEECH_TIMEOUT || errorCode == ERR_CLIENT) {
            return RESTART_QUICK_MS; // پایان عادی چرخهٔ شنود
        }
        // خطای شبکه/سرور/صدا/مشغول — backoff نمایی تا سقف
        long delay = 1_000;
        for (int i = 0; i < Math.min(consecutiveErrors, 6); i++) delay *= 2;
        return Math.min(delay, RESTART_MAX_MS);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        destroyed = false;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String gate = startGate(
                hasMicPermission(),
                wakeConsentFromProfile(),
                startedFromVisibleActivity(intent),
                SpeechRecognizer.isRecognitionAvailable(this),
                WAKE_FEATURE_ENABLED);
        if (!GATE_START_OK.equals(gate)) {
            // R3-P0 بند ۶: بدون اعلان گمراه‌کنندهٔ «در حال شنود»؛ وضعیت واقعی = متوقف
            Log.w("RahyarWake", "start refused by gate: " + gate);
            stopSelf();
            return START_NOT_STICKY;
        }
        try {
            startAsForeground();
        } catch (SecurityException | IllegalStateException e) {
            // R3-P0 بند ۶: رد مجوز/محدودیت پلتفرم → بدون سرویس، بدون اعلان، خطای امن
            Log.w("RahyarWake", "foreground start rejected: " + e.getClass().getSimpleName());
            stopSelf();
            return START_NOT_STICKY;
        }
        startLoop();
        return START_STICKY;
    }

    private boolean hasMicPermission() {
        return checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
    }

    private boolean wakeConsentFromProfile() {
        return BootReceiver.wakeEnabledFromProfileJson(BootReceiver.readProfileJson(this));
    }

    private boolean startedFromVisibleActivity(Intent intent) {
        return intent != null && START_FROM_ACTIVITY.equals(intent.getStringExtra(EXTRA_START_FROM));
    }

    private void startAsForeground() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID,
                    getString(R.string.wake_channel), NotificationManager.IMPORTANCE_LOW);
            ch.setDescription(getString(R.string.wake_desc));
            nm.createNotificationChannel(ch);
        }
        Intent open = new Intent(this, HomeActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 1, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentTitle(getString(R.string.wake_title))
                .setContentText(getString(R.string.wake_body))
                .setContentIntent(pi)
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 30) {
            startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(NOTIF_ID, n);
        }
    }

    private void startLoop() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            // دستگاه بدون سرویس تشخیص — سرویس فقط اعلان وضعیت را نشان می‌دهد
            return;
        }
        if (recognizer != null) return;
        recognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { consecutiveErrors = 0; }
            @Override public void onBeginningOfSpeech() { /* شروع گفتار */ }
            @Override public void onRmsChanged(float rmsdB) { /* — */ }
            @Override public void onBufferReceived(byte[] buffer) { /* ذخیره/ارسال نمی‌شود */ }
            @Override public void onEndOfSpeech() { /* — */ }
            @Override public void onEvent(int eventType, Bundle params) { /* — */ }
            @Override public void onPartialResults(Bundle partialResults) {
                ArrayList<String> list = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (list == null) return;
                for (String s : list) {
                    if (s != null) {
                        String low = s.toLowerCase(java.util.Locale.ROOT);
                        for (String w : WAKE_PHRASES) {
                            if (low.contains(w.toLowerCase(java.util.Locale.ROOT))) {
                                // V1 (بند ۷): علاوه بر بازکردن اپ، اپ باید بداند که «بیدارباش» بوده —
                                // HomeActivity رویداد rahyar-wake را به UI محلی تزریق می‌کند
                                Intent open = new Intent(VoiceWakeService.this, HomeActivity.class)
                                        .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                                        .putExtra("rahyar_wake", "1");
                                startActivity(open);
                                break;
                            }
                        }
                    }
                }
                scheduleRestart(RESTART_QUICK_MS); // شنود پیوسته ادامه دارد
            }
            @Override public void onError(int error) {
                long d = nextRestartDelayMs(error, consecutiveErrors);
                consecutiveErrors++;
                scheduleRestart(d);
            }
            @Override public void onResults(Bundle results) {
                scheduleRestart(RESTART_QUICK_MS); // پایان چرخه — دوباره گوش بده
            }
        });
        startListeningSafe();
    }

    private void startListeningSafe() {
        if (destroyed || recognizer == null) return;
        // R3-P0 بند ۸: لغو مجوز در حین اجرا → توقف فوری سرویس (بدون چرخهٔ بی‌فایده)
        if (!hasMicPermission()) {
            Log.w("RahyarWake", "mic permission revoked — stopping service");
            stopSelf();
            return;
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
        try {
            recognizer.startListening(i);
        } catch (Exception ignored) { /* دستگاه بدون سرویس — degraded */ }
    }

    /** زمان‌بندی دوباره‌شروعی — تأخیر -۱ یعنی ممنوع (degrade صادقانه) */
    private void scheduleRestart(long delayMs) {
        if (destroyed) return;
        if (delayMs < 0) return;
        main.removeCallbacks(restartTask);
        main.postDelayed(restartTask, delayMs);
    }

    @Override
    public void onDestroy() {
        destroyed = true;
        main.removeCallbacks(restartTask);
        if (recognizer != null) {
            try { recognizer.destroy(); } catch (Exception ignored) {}
            recognizer = null;
        }
        super.onDestroy();
    }
}
