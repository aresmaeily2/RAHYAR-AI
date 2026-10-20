package com.rahyarai.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
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

/**
 * نمای اصلی: WebView از endpoint قابل‌تنظیم (سرور production مالک) با
 * نوار وضعیت بومی + صفحهٔ آفلاین بومی + خروج بومی.
 * این اپ «WebView پورت 3000» نیست: مقصد از تنظیمات کاربر می‌آید، https اجباری است
 * و در نبود سرور، صفحهٔ خطای بومی با تلاش دوباره نمایش داده می‌شود.
 */
public class MainActivity extends Activity {
    private WebView web;
    private View offlineBox;
    private ProgressBar bar;
    private TextView statusTx;
    private String baseUrl;

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
        startActivity(new android.content.Intent(this, LoginActivity.class));
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.loadUrl("about:blank");
            web.clearCache(true);
            web.destroy();
        }
        super.onDestroy();
    }
}
