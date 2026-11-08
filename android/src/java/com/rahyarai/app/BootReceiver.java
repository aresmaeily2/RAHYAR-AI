package com.rahyarai.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * پس از ری‌استارت دستگاه، هشدارهای AlarmManager پاک می‌شوند؛
 * این گیرنده یادآورهای ذخیره‌شدهٔ آخرین همگام‌سازی را دوباره زمان‌بندی می‌کند
 * (بدون هیچ درخواست شبکه‌ای — از prefs محلی).
 *
 * R3-P0 (مأموریت V1-P3-R3 §2 — اصلاح Foreground Microphone Service):
 *  - از BOOT_COMPLETED هرگز سرویس foreground نوع microphone شروع نمی‌شود؛
 *    اندروید ۱۴+ این مسیر را ممنوع می‌کند و تلاش قبلی باعث SecurityException/
 *    ForegroundServiceStartNotAllowedException می‌شد.
 *  - پس از بوت فقط «وضعیت Wake Word و رضایت قبلی» بازیابی می‌شود: اگر کاربر
 *    قبلاً رضایت داده بود، فلگ wake_restore_pending ثبت می‌شود تا دفعهٔ بعد
 *    که برنامه را باز کرد، پیام صادقانهٔ «شنود خاموش است؛ از تنظیمات روشنش کن»
 *    نمایش داده شود. شروع شنود فقط از Activity قابل مشاهده با مجوز میکروفون.
 */
public class BootReceiver extends BroadcastReceiver {
    /** خروجی سیاست بوت — فقط وضعیت بازیابی ثبت می‌شود، هیچ سرویسی شروع نمی‌شود */
    static final String WAKE_RESTORE_STATE_ONLY = "restore_state_only";
    static final String WAKE_NOTHING = "nothing";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!isBootLikeAction(action)) return;
        ReminderAlarms.rescheduleAfterBoot(context);
        // R3-P0: هیچ startForegroundService/startService برای VoiceWakeService اینجا نیست.
        String decision = bootWakePolicy(action, wakeEnabledFromProfileJson(readProfileJson(context)));
        if (WAKE_RESTORE_STATE_ONLY.equals(decision)) {
            context.getSharedPreferences("rahyar_consents", Context.MODE_PRIVATE)
                    .edit().putBoolean("wake_restore_pending", true).apply();
        }
    }

    /** خواندن پروفایل محلی — بدون هیچ شبکه‌ای؛ خطا = خاموش (fail-closed) */
    static String readProfileJson(Context context) {
        try {
            return new LocalStore(context.getFilesDir()).get("profile");
        } catch (Exception ignored) {
            return null;
        }
    }

    /**
     * F7 — خالص و JVM-آزمون‌پذیر: wakeWord فقط با true صریح روشن است؛
     * نبود/خرابی JSON هرگز سرویس را روشن نمی‌کند (هیچ شنود پنهانی شروع نمی‌شود).
     */
    public static boolean wakeEnabledFromProfileJson(String profileJson) {
        if (profileJson == null || profileJson.isEmpty()) return false;
        try {
            return new org.json.JSONObject(profileJson).optBoolean("wakeWord", false);
        } catch (Exception ignored) {
            return false;
        }
    }

    /** آیا این اکشن از جنس بوت/به‌روزرسانی بسته است؟ (خالص — JVM-آزمون‌پذیر) */
    static boolean isBootLikeAction(String action) {
        return Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || "android.intent.action.MY_PACKAGE_REPLACED".equals(action);
    }

    /**
     * R3-P0 — سیاست خالص بوت (JVM-آزمون‌پذیر):
     *  - RESTORE_STATE_ONLY: فقط فلگ «نیاز به باز کردن اپ» ثبت شود (کاربر در اپ وضعیت را می‌بیند)
     *  - NOTHING: هیچ کاری — بدون رضایت هیچ ردی از شنود باقی نمی‌ماند
     * هیچ خروجی دیگری وجود ندارد؛ «شروع سرویس» اصلاً در فضای گزینه‌ها نیست.
     */
    static String bootWakePolicy(String action, boolean wakeConsent) {
        if (!isBootLikeAction(action)) return WAKE_NOTHING;
        return wakeConsent ? WAKE_RESTORE_STATE_ONLY : WAKE_NOTHING;
    }
}
