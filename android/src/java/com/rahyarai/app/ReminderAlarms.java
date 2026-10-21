package com.rahyarai.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;

/**
 * زمان‌بند بومی یادآورها — قابلیت P6 برنامهٔ اصلاحی، اکنون در v2.0.0 فعال.
 *
 * جریان: وب (app-shell هر ۳۰ ثانیه) فهرست یادآورهای فعال را با پل
 * RahyarNative.syncReminders می‌فرستد → این کلاس هشدارهای دقیق AlarmManager
 * می‌سازد → در زمان مقرر ReminderReceiver اعلان سیستمی می‌دهد — حتی اگر اپ
 * بسته باشد.
 *
 * رضایت و مجوز:
 *  - POST_NOTIFICATIONS (اندروید ۱۳+): فقط با گفت‌وگوی توضیح و تأیید کاربر
 *    (MainActivity). ردِ رضایت = بدون اعلان سیستمی؛ هشدار درون‌برنامه‌ای وب
 *    همچنان کار می‌کند.
 *  - SCHEDULE_EXACT_ALARM: اگر مجاز نباشد، زمان‌بندی «تقریبی» (setWindow)
 *    استفاده می‌شود — اعلان شاید با چند دقیقه خطا؛ هیچ کرشی رخ نمی‌دهد.
 *
 * ماندگاری: فهرست آخرین همگام‌سازی در prefs ذخیره می‌شود تا BootReceiver پس از
 * ری‌استارت دستگاه، همان‌ها را دوباره زمان‌بندی کند (بدون شبکه).
 */
public final class ReminderAlarms {

    public static final String CHANNEL_ID = "rahyar_reminders";
    public static final String PREFS = "rahyar_native_reminders";
    public static final String KEY_LAST_SYNC = "last_sync_json";
    static final int MAX_SCHEDULE = 50;

    private ReminderAlarms() {}

    // ── منطق خالص: ترکیب فهرست جدید با طرح زمان‌بندی (تست JVM) ──

    /** شناسهٔ درخواست اعلان/آلارم — از id پایدار یادآور (هش ثابت، نه random) */
    public static int requestCodeFor(String id) {
        return (id == null ? 0 : id.hashCode()) & 0x7fffffff;
    }

    // ── لایه سیستم ──

    /** همگام‌سازی کامل از JSON وب — لغو قبلی‌ها، زمان‌بندی آینده‌ها، ذخیره برای بوت */
    public static void sync(Context ctx, String json) {
        ArrayList<RahyarNativeBridge.ReminderPlan> plans =
                RahyarNativeBridge.parseReminders(json, System.currentTimeMillis());
        cancelAll(ctx); // ساده و قابل‌اعتماد: هر بار همهٔ قبلی‌ها لغو و از نو ساخته می‌شوند
        int scheduled = 0;
        for (RahyarNativeBridge.ReminderPlan p : plans) {
            if (scheduled >= MAX_SCHEDULE) break;
            scheduleOne(ctx, p.id, p.message, p.remindAtMs);
            scheduled++;
        }
        // ذخیره برای باززمان‌بندی پس از بوت — فقط طرح‌های معتبر
        try {
            JSONArray arr = new JSONArray();
            for (RahyarNativeBridge.ReminderPlan p : plans) {
                JSONObject o = new JSONObject();
                o.put("id", p.id);
                o.put("message", p.message);
                o.put("remindAtMs", p.remindAtMs);
                arr.put(o);
            }
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(KEY_LAST_SYNC, arr.toString()).apply();
        } catch (Exception ignored) {}
    }

    /** زمان‌بندی یک یادآور — دقیق اگر مجاز، وگرنه پنجرهٔ تقریبی ۵ دقیقه‌ای */
    static void scheduleOne(Context ctx, String id, String message, long atMs) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmPendingIntent(ctx, id, message);
        boolean exact = true;
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) exact = false;
        try {
            if (exact) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi);
            } else {
                am.setWindow(AlarmManager.RTC_WAKEUP, atMs, 5 * 60_000L, pi);
            }
        } catch (SecurityException se) {
            // مجوز exact سلب شده بین بررسی و اجرا — تقریبی
            try {
                am.setWindow(AlarmManager.RTC_WAKEUP, atMs, 5 * 60_000L, pi);
            } catch (Exception ignored) {}
        } catch (Exception ignored) {}
    }

    static PendingIntent alarmPendingIntent(Context ctx, String id, String message) {
        Intent i = new Intent(ctx, ReminderReceiver.class);
        i.setAction("com.rahyarai.app.REMINDER_FIRE");
        i.putExtra("id", id);
        i.putExtra("message", message);
        int code = requestCodeFor(id);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(ctx, code, i, flags);
    }

    /** لغو همهٔ زمان‌بندی‌های فعلی — بر اساس ذخیرهٔ قبلی prefs */
    public static void cancelAll(Context ctx) {
        String prev = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_LAST_SYNC, null);
        if (prev == null || prev.isEmpty()) return;
        ArrayList<RahyarNativeBridge.ReminderPlan> prevPlans = parsePrefs(prev);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        for (RahyarNativeBridge.ReminderPlan p : prevPlans) {
            try { am.cancel(alarmPendingIntent(ctx, p.id, p.message)); } catch (Exception ignored) {}
        }
    }

    /** فرمت ذخیرهٔ prefs ({id,message,remindAtMs}) → طرح */
    static ArrayList<RahyarNativeBridge.ReminderPlan> parsePrefs(String json) {
        ArrayList<RahyarNativeBridge.ReminderPlan> out = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(json);
            int n = Math.min(arr.length(), MAX_SCHEDULE);
            for (int i = 0; i < n; i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                String id = o.optString("id", "");
                String msg = o.optString("message", "");
                long at = o.optLong("remindAtMs", 0);
                if (id.isEmpty() || at <= 0) continue;
                out.add(new RahyarNativeBridge.ReminderPlan(id, msg, at));
            }
        } catch (Exception ignored) {}
        return out;
    }

    /** باززمان‌بندی پس از بوت — از prefs، فقط آینده‌ها */
    public static void rescheduleAfterBoot(Context ctx) {
        String saved = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_LAST_SYNC, null);
        if (saved == null || saved.isEmpty()) return;
        long now = System.currentTimeMillis();
        ArrayList<RahyarNativeBridge.ReminderPlan> plans = parsePrefs(saved);
        int scheduled = 0;
        for (RahyarNativeBridge.ReminderPlan p : plans) {
            if (p.remindAtMs <= now) continue;
            if (scheduled >= MAX_SCHEDULE) break;
            scheduleOne(ctx, p.id, p.message, p.remindAtMs);
            scheduled++;
        }
    }

    // ── اعلان ──

    public static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID,
                ctx.getString(R.string.reminder_channel),
                NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(ctx.getString(R.string.reminder_channel_desc));
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
    }

    /** آیا اعلان سیستمی مجاز است؟ (اندروید ۱۳+: POST_NOTIFICATIONS) */
    public static boolean notificationsAllowed(Context ctx) {
        if (Build.VERSION.SDK_INT < 33) return true; // قبل از ۱۳ پیش‌فرض مجاز
        return ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }

    /** اعلان یادآور — اگر مجاز؛ همیشه بدون استثنا */
    public static void postReminderNotification(Context ctx, String id, String message) {
        if (!notificationsAllowed(ctx)) return;
        ensureChannel(ctx);
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            b = new Notification.Builder(ctx, CHANNEL_ID);
        } else {
            b = new Notification.Builder(ctx);
        }
        b.setSmallIcon(R.drawable.ic_launcher)
                .setContentTitle(ctx.getString(R.string.reminder_notif_title))
                .setContentText(message == null || message.isEmpty() ? ctx.getString(R.string.reminder_notif_fallback) : message)
                .setStyle(new Notification.BigTextStyle().bigText(message))
                .setAutoCancel(true)
                .setDefaults(Notification.DEFAULT_ALL);
        try {
            nm.notify(requestCodeFor(id), b.build());
        } catch (Exception ignored) {}
    }

    /** ری‌ست کامل (خروج کاربر) — لغو آلارم‌ها و پاک‌کردن prefs */
    public static void clearUserData(Context ctx) {
        cancelAll(ctx);
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
    }
}
