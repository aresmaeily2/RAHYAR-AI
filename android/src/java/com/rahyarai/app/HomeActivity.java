package com.rahyarai.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/**
 * خانهٔ محلی — نقطهٔ ورود نسخهٔ مستقل (v1.2.0).
 *
 * اصول:
 *  - ۱۰۰٪ آفلاین: همهٔ صفحات/استایل/اسکریپت از assets/www داخل APK بارگذاری می‌شود
 *    (WebViewAssetLoader روی مبدأ امن https://appassets.androidplatform.net —
 *    نه file:// و نه هیچ هاست خارجی).
 *  - داده‌ها با پل RahyarBridge در LocalStore (حافظهٔ خصوصی اپ) ذخیره می‌شوند و
 *    پس از بستن برنامه باقی می‌مانند.
 *  - هیچ درخواست شبکه‌ای در این مسیر انجام نمی‌شود؛ در حالت پرواز کامل است.
 *  - حالت متصل (سرور مالک) به‌صورت اختیاری و فقط از تنظیمات در دسترس است
 *    (LoginActivity → MainActivity) — نسخهٔ v1.1.0 بدون تغییر حفظ شده است.
 */
public class HomeActivity extends Activity {
    /** مبدأ امن دارایی‌های محلی — ثابت استاندارد AndroidX WebKit */
    public static final String APPASSETS_ORIGIN = "https://appassets.androidplatform.net";
    public static final String START_URL = APPASSETS_ORIGIN + "/assets/index.html";
    /** کد درخواست مجوز میکروفون — مسیر صوتی */
    static final int MIC_PERMISSION_REQUEST = 4701;

    private WebView web;
    private LocalStore store;
    private RahyarBridge bridge;
    private SplashView splash;
    private VoiceHelper voice;

    @SuppressLint("SetJavaScriptEnabled") // رابط محلی ما به JS نیاز دارد؛ مبدأ بسته است
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);
        web = findViewById(R.id.web);
        TextView verTx = findViewById(R.id.version);
        verTx.setText(getString(R.string.local_version_label, AppVersion.NAME));

        // اسپلش بومی واقعی (Canvas + ValueAnimator) — فقط شروع سرد؛
        // بازگشت به اپ (onRestart) بدون تکرار اسپلش، لمس = ردشدن فوری
        splash = findViewById(R.id.splash);
        splash.setListener(new SplashView.Listener() {
            @Override public void onSplashFinished() {
                splash.setVisibility(View.GONE);
            }
        });

        store = new LocalStore(getFilesDir());
        bridge = new RahyarBridge(
                new RahyarCore(store, AppVersion.NAME, AppVersion.CODE),
                /* اشتراک پشتیبان: Share Sheet سیستم — بدون مجوز */
                new RahyarBridge.HostAction() {
                    @Override public void run(String arg) {
                        android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_SEND);
                        i.setType("text/plain");
                        i.putExtra(android.content.Intent.EXTRA_SUBJECT, "RahyAr backup");
                        i.putExtra(android.content.Intent.EXTRA_TEXT, arg);
                        startActivity(android.content.Intent.createChooser(i, getString(R.string.share_backup)));
                    }
                },
                /* ورود اختیاری به سرور: فقط همین صفحهٔ موجود v1.1.0 باز می‌شود */
                new RahyarBridge.HostAction() {
                    @Override public void run(String arg) {
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                startActivity(new android.content.Intent(HomeActivity.this, LoginActivity.class));
                            }
                        });
                    }
                },
                /* F2-VOICE: سرویس اختیاری Wake Word — فقط با رضایت صریح از تنظیمات */
                new RahyarBridge.HostAction() {
                    @Override public void run(String arg) {
                        runOnUiThread(new Runnable() {
                            @Override public void run() {
                                Intent i = new Intent(HomeActivity.this, VoiceWakeService.class);
                                if ("on".equals(arg)) startService(i);
                                else stopService(i);
                            }
                        });
                    }
                });

        // F2-VOICE: دستیار صوتی — فقط با لمس کاربر؛ صدا هرگز ذخیره/ارسال نمی‌شود
        voice = new VoiceHelper(web, this);
        bridge.attachVoiceDelegate(voice);

        // F2-TEST-HOOK: فقط بیلد دیباگ — فرمان متنی آزمون از adb (--es rahyar_command "…")
        // همان رویداد نهایی شنیدار تزریق می‌شود؛ پارسر و اجرای ماژول‌ها واقعی‌اند.
        // --es rahyar_js "…" هم فقط برای آزمون (مثلاً تعویض زبان) — در بیلد Release
        // (FLAG_DEBUGGABLE ناموجود) هیچ‌کدام از این مسیرها کلاً حذف‌اند.
        if ((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            final String testCmd = getIntent() != null ? getIntent().getStringExtra("rahyar_command") : null;
            final String testJs = getIntent() != null ? getIntent().getStringExtra("rahyar_js") : null;
            if (testCmd != null && testCmd.trim().length() > 0) {
                web.postDelayed(new Runnable() {
                    @Override public void run() {
                        web.evaluateJavascript(VoiceHelper.debugFinalEvent(testCmd.trim()), null);
                    }
                }, 5000L);
            }
            if (testJs != null && testJs.trim().length() > 0) {
                web.postDelayed(new Runnable() {
                    @Override public void run() {
                        web.evaluateJavascript(testJs.trim(), null);
                    }
                }, 3500L);
            }
        }

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);            // حالت دوم ذخیره (کش UI)
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setAllowFileAccess(false);             // دسترسی WebView به فایل بسته
        s.setAllowContentAccess(false);          // دسترسی WebView به content:// بسته
        s.setGeolocationEnabled(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK); // اولویت با دارایی محلی

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setBackgroundColor(Color.TRANSPARENT);
        web.addJavascriptInterface(bridge, "RahyarNative");
        web.setWebViewClient(new LocalClient(loader));

        web.loadUrl(START_URL);
    }

    /** قفل ناوبری: فقط مبدأ appassets داخل WebView می‌ماند؛ هر چیز دیگر مسدود است. */
    private final class LocalClient extends WebViewClientCompat {
        private final WebViewAssetLoader loader;

        LocalClient(WebViewAssetLoader loader) { this.loader = loader; }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return loader.shouldInterceptRequest(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
            Uri u = req.getUrl();
            // هر ناوبری خارج از مبدأ محلی در WebView باز نمی‌شود (مسدود، بدون اینترنت)
            return !(APPASSETS_ORIGIN.equals(u.getScheme() + "://" + u.getHost()));
        }

        @Override
        public void onPageFinished(WebView v, String url) {
            // صفحهٔ محلی همیشه سریع رندر می‌شود — هیچ حالت بارگذاری بی‌پایان وجود ندارد
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MIC_PERMISSION_REQUEST && voice != null && grantResults.length > 0) {
            voice.onPermissionResult(grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED);
        }
    }

    @Override
    protected void onDestroy() {
        if (voice != null) voice.destroy();
        if (web != null) {
            web.loadUrl("about:blank");
            web.clearHistory();
            web.destroy();
        }
        super.onDestroy();
    }
}
