package com.rahyarai.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * پس از ری‌استارت دستگاه، هشدارهای AlarmManager پاک می‌شوند؛
 * این گیرنده یادآورهای ذخیره‌شدهٔ آخرین همگام‌سازی را دوباره زمان‌بندی می‌کند
 * (بدون هیچ درخواست شبکه‌ای — از prefs محلی).
 *
 * F7 (ایجنت ۲): اگر کاربر قبلاً Wake Word را در تنظیمات روشن کرده بود،
 * سرویس شنود بیدارباش هم پس از بوت/به‌روزرسانی دوباره راه می‌افتد
 * (پیش از این تنظیم فقط ظاهری بود و پس از ری‌استارت از دست می‌رفت).
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())
                && !"android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())
                && !"android.intent.action.MY_PACKAGE_REPLACED".equals(intent.getAction())) return;
        ReminderAlarms.rescheduleAfterBoot(context);
        // F7: بازگرداندن Wake Word فقط با رضایت ذخیره‌شدهٔ خود کاربر (پیش‌فرض: خاموش)
        if (wakeEnabledFromProfileJson(readProfileJson(context))) {
            Intent svc = new Intent(context, VoiceWakeService.class);
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                context.startForegroundService(svc);
            } else {
                context.startService(svc);
            }
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
}
