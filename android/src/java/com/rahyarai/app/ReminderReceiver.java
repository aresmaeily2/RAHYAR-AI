package com.rahyarai.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * دریافت هشدار یادآور در زمان مقرر.
 *  - اگر اپ در پیش‌زمینه است: فقط رخداد به WebView (اعلان دوبل نمی‌سازد)
 *  - در غیر این صورت: اعلان سیستمی (اگر مجوز اعلان با رضایت داده شده باشد)
 */
public class ReminderReceiver extends BroadcastReceiver {

    /** وضعیت پیش‌زمینه — از MainActivity (پروسهٔ مشترک) تنظیم می‌شود */
    public static volatile boolean appInForeground = false;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"com.rahyarai.app.REMINDER_FIRE".equals(intent.getAction())) return;
        String id = intent.getStringExtra("id");
        String message = intent.getStringExtra("message");
        if (id == null || id.isEmpty()) return;
        if (appInForeground) {
            // اپ باز است — وب خودش هشدار زنده می‌دهد (پنجرهٔ ۱۵ دقیقه‌ای + صدای انتخابی)
            return;
        }
        ReminderAlarms.postReminderNotification(context, id, message);
    }
}
