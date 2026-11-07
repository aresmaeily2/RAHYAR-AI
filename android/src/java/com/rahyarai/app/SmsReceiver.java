package com.rahyarai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.telephony.SmsMessage;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * F5-مأموریت ۷ — گیرندهٔ پیامک بانکی Android.
 *
 * زنجیرهٔ تصمیم (سخت‌گیرانه و قابل‌ممیزی):
 *   1) رضایت صریح کاربر (Setting: پیامک بانکی در اپ → rahyar_consents.sms_consent)
 *      — بدون رضایت: هیچ پردازشی انجام نمی‌شود (فوراً return).
 *   2) فیلتر مالی سخت (BankSmsFilter.isCandidate) — پیامک شخصی/غیرمالی
 *      هرگز وارد صف نمی‌شود و هرگز به سرور نمی‌رود.
 *   3) فقط «پیش‌نمایش» ساخته می‌شود: ثبت در صف محلی (حداکثر ۲۰ مورد) +
 *      اعلان. ثبت واقعی در مالی فقط با انتخاب حساب و تأیید کاربر انجام
 *      می‌شود (صف → اپ/سرور؛ ضدتکرار سمت سرور با هش پیامک).
 *   4) لغو رضایت → پردازش متوقف می‌شود و صف هم از تنظیمات پاک می‌شود.
 *
 * مجوز RECEIVE_SMS فقط با این رضایت درخواست می‌شود و توضیح شفاف قبل از آن
 * در UI اپ نمایش داده می‌شود.
 */
public class SmsReceiver extends BroadcastReceiver {

    public static final String PREFS = "rahyar_consents";
    public static final String KEY_CONSENT = "sms_consent";
    public static final String KEY_PENDING = "sms_pending_queue";
    public static final String CHANNEL_ID = "rahyar_bank_sms";
    static final int MAX_PENDING = 20;

    @Override
    public void onReceive(Context ctx, Intent intent) {
        // 1) دروازهٔ رضایت — بدون رضایت هیچ، حتی خواندن
        if (!ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_CONSENT, false)) {
            return;
        }
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) return;

        Object[] pdus = (Object[]) intent.getExtras() == null ? null
                : (Object[]) intent.getExtras().get("pdus");
        if (pdus == null) return;

        for (Object pdu : pdus) {
            try {
                SmsMessage msg = (Build.VERSION.SDK_INT >= 23)
                        ? SmsMessage.createFromPdu((byte[]) pdu, intent.getStringExtra("format"))
                        : SmsMessage.createFromPdu((byte[]) pdu);
                if (msg == null) continue;
                handleSms(ctx, msg.getOriginatingAddress(), msg.getMessageBody(), msg.getTimestampMillis());
            } catch (Exception e) {
                // قطعهٔ معیوب — نادیده؛ هرگز کرش نکن
            }
        }
    }

    static void handleSms(Context ctx, String sender, String body, long tsMillis) {
        if (sender == null || body == null) return;
        // 2) فیلتر مالی سخت — قبل از هر ذخیره/ارسالی
        if (!BankSmsFilter.isCandidate(sender, body)) return;

        BankSmsFilter.Parsed p = BankSmsFilter.parse(body);

        // 3) ضدتکرار محلی — همان پیامک دوباره صف نمی‌شود
        String hash = String.valueOf((sender + "|" + body).hashCode());
        JSONArray q = readQueue(ctx);
        for (int i = 0; i < q.length(); i++) {
            try {
                if (hash.equals(q.getJSONObject(i).optString("h"))) return; // تکراری
            } catch (Exception ignored) { }
        }
        if (q.length() >= MAX_PENDING) {
            // قدیمی‌ترین حذف می‌شود تا صف بی‌کران نشود (دادهٔ اصلی در پیامک‌ها می‌ماند)
            JSONArray nq = new JSONArray();
            for (int i = 1; i < q.length(); i++) {
                try { nq.put(q.getJSONObject(i)); } catch (Exception ignored) { }
            }
            q = nq;
        }

        JSONObject item = new JSONObject();
        try {
            item.put("h", hash);
            item.put("sender", sender);
            item.put("body", body);
            item.put("amount", p.amount);
            item.put("type", p.type == null ? JSONObject.NULL : p.type);
            item.put("date", p.date == null ? JSONObject.NULL : p.date);
            item.put("bank", p.bank == null ? JSONObject.NULL : p.bank);
            item.put("ts", tsMillis);
        } catch (Exception e) { return; }
        q.put(item);

        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_PENDING, q.toString()).apply();

        // 4) اعلان پیش‌نمایش (بدون ثبت؛ ثبت فقط با تأیید کاربر)
        notifyPreview(ctx, p, body);
    }

    static JSONArray readQueue(Context ctx) {
        try {
            String s = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_PENDING, null);
            return s == null ? new JSONArray() : new JSONArray(s);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /** خواندن صف پیش‌نمایش برای اپ (JSON) */
    public static JSONArray pendingQueue(Context ctx) {
        return readQueue(ctx);
    }

    /** پاک‌کردن کامل صف (همراه لغو رضایت از تنظیمات اپ) */
    public static void clearQueue(Context ctx) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_PENDING).apply();
    }

    private static void notifyPreview(Context ctx, BankSmsFilter.Parsed p, String body) {
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                nm.createNotificationChannel(new NotificationChannel(
                        CHANNEL_ID, "Bank SMS preview", NotificationManager.IMPORTANCE_DEFAULT));
            }
            String title = (p.bank != null ? p.bank : "Bank SMS")
                    + " — " + (p.type == null ? "?" : ("income".equals(p.type) ? "+" : "-"))
                    + (p.amount > 0 ? p.amount : "?");
            Notification n;
            Notification.Builder b = Build.VERSION.SDK_INT >= 26
                    ? new Notification.Builder(ctx, CHANNEL_ID)
                    : new Notification.Builder(ctx);
            b.setSmallIcon(android.R.drawable.ic_dialog_email)
                    .setContentTitle(title)
                    .setContentText(body.length() > 80 ? body.substring(0, 80) + "…" : body)
                    .setAutoCancel(true);
            n = b.build();
            nm.notify((int) (System.currentTimeMillis() & 0x7fffffff), n);
        } catch (Exception ignored) {
            // اعلان در دسترس نیست — صف محلی همچنان معتبر است
        }
    }
}
