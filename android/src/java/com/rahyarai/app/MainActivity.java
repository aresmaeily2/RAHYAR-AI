package com.rahyarai.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;

import org.json.JSONArray;

/**
 * نمای اصلی — WebView تمام‌صفحهٔ «محصول کامل رهیار» روی سرورِ ثبت‌شدهٔ کاربر.
 * v2.0.0: پل بومی RahyarNative روی همین WebView ثبت می‌شود تا محصول وب از
 * قابلیت‌های دستگاه استفاده کند:
 *  - تشخیص گفتار بومی + TTS (VoiceHelper) — بدون ارسال صدا به هیچ سروری
 *  - یادآور سیستمی با AlarmManager (ReminderAlarms) — اعلان حتی با اپ بسته
 * رضایت‌ها:
 *  - اعلان (اندروید ۱۳+): اولین همگام‌سازی یادآور، گفت‌وگوی توضیح + درخواست سیستم
 *  - زنگ دقیق (اندروید ۱۲+): در صورت نبود مجوز، زمان‌بندی تقریبی + مسیر تنظیمات
 * نکتهٔ امنیتی: پل فقط روی WebView ای ثبت می‌شود که ناوبری‌اش به مبنای سرور
 * قفل است؛ مجوز صوتی نمی‌خواهیم (سرویس گفتار سیستم خودش مدیریت می‌کند).
 */
public class MainActivity extends Activity {
    private WebView web;
    private View offlineBox;
    private ProgressBar bar;
    private TextView statusTx;
    private String baseUrl;
    private VoiceHelper voice;

    private static final int REQ_NOTIFICATIONS = 4101;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        baseUrl = SecureStore.get(this, "endpoint");
        if (baseUrl == null) { goLogin(); return; }
        String session = SecureStore.get(this, "session");
        if (session == null) { goLogin(); return; }

        web = findViewById(R.id.web);
        offlineBox = findViewById(R.id.offline_box);
        bar = findViewById(R.id.progress);
        statusTx = findViewById(R.id.status);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); // https سخت‌گیرانه
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setGeolocationEnabled(false);
        s.setMediaPlaybackRequiresUserGesture(true);

        web.setBackgroundColor(Color.TRANSPARENT);
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView v, String url) {
                bar.setVisibility(View.GONE);
                offlineBox.setVisibility(View.GONE);
                web.setVisibility(View.VISIBLE);
                statusTx.setText(getString(R.string.status_connected));
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) showOffline();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                String u = req.getUrl().toString();
                return !(u.startsWith(baseUrl)); // هر مقصد خارج از مبنای سرور در مرورگر سیستم
            }
        });

        // ── پل بومی v2 — قابلیت‌های دستگاه برای محصول کامل وب ──
        voice = new VoiceHelper(web);
        RahyarNativeBridge bridge = new RahyarNativeBridge(
                new RahyarNativeBridge.HostAction() { // شروع شنود
                    @Override public void run(String arg) { voice.startListening(arg); }
                },
                new RahyarNativeBridge.HostAction() { // توقف شنود
                    @Override public void run(String arg) { voice.stopListening(); }
                },
                new RahyarNativeBridge.HostAction() { // خواندن متن — ["text","lang"]
                    @Override public void run(String arg) {
                        try {
                            JSONArray pair = new JSONArray(arg);
                            voice.speak(pair.optString(0, ""), pair.optString(1, "fa-IR"));
                        } catch (Exception ignored) {}
                    }
                },
                new RahyarNativeBridge.HostAction() { // توقف خواندن
                    @Override public void run(String arg) { voice.stopSpeaking(); }
                },
                new RahyarNativeBridge.HostAction() { // همگام‌سازی یادآورها
                    @Override public void run(String arg) { onRemindersSync(arg); }
                }
        );
        web.addJavascriptInterface(bridge, "RahyarNative");

        // کوکی نشست (از ورود بومی) در دسترس WebView است
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);

        findViewById(R.id.logout).setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { doLogout(); }
        });
        findViewById(R.id.retry).setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { loadApp(); }
        });

        loadApp();
    }

    /** همگام‌سازی یادآورها از وب + رضایت اولیهٔ اعلان */
    private void onRemindersSync(String json) {
        if (Build.VERSION.SDK_INT >= 33 && !ReminderAlarms.notificationsAllowed(this)) {
            // اولین همگام‌سازی = لحظهٔ نیاز واقعی — گفت‌وگوی توضیح، سپس درخواست سیستم
            boolean asked = getSharedPreferences("rahyar_consents", MODE_PRIVATE).getBoolean("notif_asked", false);
            if (!asked) {
                getSharedPreferences("rahyar_consents", MODE_PRIVATE).edit().putBoolean("notif_asked", true).apply();
                new android.app.AlertDialog.Builder(this)
                        .setTitle(getString(R.string.notif_consent_title))
                        .setMessage(getString(R.string.notif_consent_msg))
                        .setPositiveButton(getString(R.string.notif_consent_yes), new android.content.DialogInterface.OnClickListener() {
                            @Override public void onClick(android.content.DialogInterface d, int w) {
                                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
                            }
                        })
                        .setNegativeButton(getString(R.string.notif_consent_no), new android.content.DialogInterface.OnClickListener() {
                            @Override public void onClick(android.content.DialogInterface d, int w) {
                                // رد رضایت = فقط هشدار درون‌برنامه‌ای — زمان‌بند بومی ساخته نمی‌شود
                                d.dismiss();
                            }
                        })
                        .setOnCancelListener(new android.content.DialogInterface.OnCancelListener() {
                            @Override public void onCancel(android.content.DialogInterface d) { /* بدون اعلان */ }
                        })
                        .show();
                return; // پس از رضایت، همگام‌سازی بعدی (۳۰ ثانیه بعد) زمان‌بندی می‌کند
            }
            // قبلاً پرسیده شده و رد شده — بدون اعلان سیستمی
            return;
        }
        // رضایت موجود (یا اندروید قدیمی‌تر) — زمان‌بندی + مسیر زنگ دقیق در صورت نیاز
        ReminderAlarms.sync(this, json);
        maybeRequestExactAlarm();
    }

    /** اگر زنگ دقیق مجاز نیست، یک‌بار مسیر تنظیمات سیستم پیشنهاد می‌شود (بدون اصرار) */
    private void maybeRequestExactAlarm() {
        if (Build.VERSION.SDK_INT < 31) return;
        android.app.AlarmManager am = (android.app.AlarmManager) getSystemService(ALARM_SERVICE);
        if (am == null || am.canScheduleExactAlarms()) return;
        boolean asked = getSharedPreferences("rahyar_consents", MODE_PRIVATE).getBoolean("exact_asked", false);
        if (asked) return;
        getSharedPreferences("rahyar_consents", MODE_PRIVATE).edit().putBoolean("exact_asked", true).apply();
        try {
            new android.app.AlertDialog.Builder(this)
                    .setTitle(getString(R.string.exact_consent_title))
                    .setMessage(getString(R.string.exact_consent_msg))
                    .setPositiveButton(getString(R.string.exact_consent_yes), new android.content.DialogInterface.OnClickListener() {
                        @Override public void onClick(android.content.DialogInterface d, int w) {
                            try {
                                startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                                        Uri.parse("package:" + getPackageName())));
                            } catch (Exception ignored) {}
                        }
                    })
                    .setNegativeButton(getString(R.string.exact_consent_no), null)
                    .show();
        } catch (Exception ignored) {}
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == REQ_NOTIFICATIONS) {
            // نتیجهٔ رضایت اعلان: اجازه = همگام‌سازی بعدی وب (۳۰ ثانیه بعد) به‌طور خودکار
            // زمان‌بندی می‌کند؛ رد = فقط هشدار درون‌برنامه‌ای (وب).
        } else {
            super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        }
    }

    private void loadApp() {
        offlineBox.setVisibility(View.GONE);
        bar.setVisibility(View.VISIBLE);
        statusTx.setText(getString(R.string.status_connecting));
        web.loadUrl(AppConfig.appUrl(baseUrl));
    }

    private void showOffline() {
        bar.setVisibility(View.GONE);
        web.setVisibility(View.GONE);
        offlineBox.setVisibility(View.VISIBLE);
        statusTx.setText(getString(R.string.status_offline));
    }

    private void doLogout() {
        final String c = SecureStore.get(this, "session");
        new Thread(new Runnable() {
            @Override public void run() {
                if (c != null) Api.logout(baseUrl, c);
                runOnUiThread(new Runnable() {
                    @Override public void run() {
                        SecureStore.clearAll(MainActivity.this);
                        ReminderAlarms.clearUserData(MainActivity.this);
                        CookieManager.getInstance().removeAllCookies(null);
                        CookieManager.getInstance().flush();
                        web.clearCache(true);
                        web.clearHistory();
                        goLogin();
                    }
                });
            }
        }).start();
    }

    private void goLogin() {
        finish();
        startActivity(new Intent(this, LoginActivity.class));
    }

    @Override
    protected void onStart() {
        super.onStart();
        ReminderReceiver.appInForeground = true;
    }

    @Override
    protected void onStop() {
        ReminderReceiver.appInForeground = false;
        super.onStop();
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (voice != null) voice.destroy();
        if (web != null) {
            web.loadUrl("about:blank");
            web.clearCache(true);
            web.destroy();
        }
        super.onDestroy();
    }
}
