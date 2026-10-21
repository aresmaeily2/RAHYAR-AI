package com.rahyarai.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * پس از ری‌استارت دستگاه، هشدارهای AlarmManager پاک می‌شوند؛
 * این گیرنده یادآورهای ذخیره‌شدهٔ آخرین همگام‌سازی را دوباره زمان‌بندی می‌کند
 * (بدون هیچ درخواست شبکه‌ای — از prefs محلی).
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())
                && !"android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())
                && !"android.intent.action.MY_PACKAGE_REPLACED".equals(intent.getAction())) return;
        ReminderAlarms.rescheduleAfterBoot(context);
    }
}
