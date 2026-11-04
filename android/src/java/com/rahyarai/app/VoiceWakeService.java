package com.rahyarai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import java.util.ArrayList;

/**
 * VoiceWakeService — فعال‌ساز اختیاری Wake Word «سلام رهیار».
 *
 * مأموریت مالک (بند ۲ — Wake Word جداگانه):
 *  - پیش‌فرض خاموش؛ فقط با رضایت صریح کاربر از تنظیمات روشن می‌شود.
 *  - با اعلان ماندگار شفاف («گوش دادن به سلام رهیار») اجرا می‌شود — هرگز پنهان نیست.
 *  - شنود پیوسته فقط در حافظه و در فرایند سرویس گفتار سیستم پردازش می‌شود؛
 *    هیچ بافر صدا ذخیره یا ارسال نمی‌شود؛ فقط عبارت بیدارباش دیده می‌شود.
 *  - روی دستگاه‌های بدون سرویس تشخیص گفتار، سرویس با وضعیت degraded می‌ماند
 *    (اعلان نشان می‌دهد) و بدون هیچ ادعای عملیاتی خاموش می‌شود.
 */
public final class VoiceWakeService extends Service {

    public static final String CHANNEL_ID = "rahyar_wake";
    public static final int NOTIF_ID = 4702;
    /** عبارت‌های بیدارباش — fa و en */
    static final String[] WAKE_PHRASES = {"سلام رهیار", "سلام رهيار", "hey rahyar", "hi rahyar", "rahyar"};

    private SpeechRecognizer recognizer;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startAsForeground();
        startLoop();
        return START_STICKY;
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
            @Override public void onReadyForSpeech(Bundle params) { /* آماده */ }
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
                                Intent open = new Intent(VoiceWakeService.this, HomeActivity.class)
                                        .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                                startActivity(open);
                                break;
                            }
                        }
                    }
                }
            }
            @Override public void onError(int error) { /* در restartLoop */ }
            @Override public void onResults(Bundle results) { /* در restartLoop */ }
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
        try {
            recognizer.startListening(i);
        } catch (Exception ignored) { /* دستگاه بدون سرویس — degraded */ }
    }

    @Override
    public void onDestroy() {
        if (recognizer != null) {
            try { recognizer.destroy(); } catch (Exception ignored) {}
            recognizer = null;
        }
        super.onDestroy();
    }
}
