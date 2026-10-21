package com.rahyarai.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.text.method.HideReturnsTransformationMethod;
import android.text.method.PasswordTransformationMethod;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

/**
 * ورود بومی — نام کاربری/رمز → POST /api/auth/login روی سرور قابل‌تنظیم.
 * در موفقیت: کوکی نشست در SecureStore (AndroidKeyStore/AES-GCM) ذخیره و
 * برای WebView ثبت می‌شود؛ هیچ رمزی ذخیره نمی‌شود.
 */
public class LoginActivity extends Activity {
    private EditText userEt, passEt, endpointEt;
    private Button loginBtn;
    private ProgressBar progress;
    private TextView errorTx, endpointTx;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        userEt = findViewById(R.id.username);
        passEt = findViewById(R.id.password);
        endpointEt = findViewById(R.id.endpoint);
        loginBtn = findViewById(R.id.login);
        progress = findViewById(R.id.progress);
        errorTx = findViewById(R.id.error);
        endpointTx = findViewById(R.id.endpoint_label);

        String savedEndpoint = SecureStore.get(this, "endpoint");
        endpointEt.setText(AppConfig.initialEndpoint(savedEndpoint));
        // پیش‌فرض نمایشی ویراست (user: خالی — owner: «owner») — رمز هرگز پیش‌فرض ندارد
        if (userEt.getText().length() == 0 && EditionConfig.PREFILL_USERNAME != null) {
            userEt.setText(EditionConfig.PREFILL_USERNAME);
        }

        loginBtn.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { doLogin(); }
        });

        // حالت دوم (جایگزین): رابط محلی آفلاین — بدون سرور، بدون حساب
        findViewById(R.id.local_mode_link).setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                startActivity(new Intent(LoginActivity.this, HomeActivity.class));
            }
        });
    }

    private void doLogin() {
        final String endpoint = AppConfig.normalizeBaseUrl(endpointEt.getText().toString());
        final String user = userEt.getText().toString().trim().toLowerCase(java.util.Locale.ROOT);
        final String pass = passEt.getText().toString();
        errorTx.setVisibility(View.GONE);

        if (endpoint == null) {
            errorTx.setText(getString(R.string.err_endpoint));
            errorTx.setVisibility(View.VISIBLE);
            return;
        }
        if (user.isEmpty() || pass.isEmpty()) {
            errorTx.setText(getString(R.string.err_empty));
            errorTx.setVisibility(View.VISIBLE);
            return;
        }
        setBusy(true);
        final String fEndpoint = endpoint;
        new Thread(new Runnable() {
            @Override public void run() {
                final Api.LoginResult r = Api.login(fEndpoint, user, pass);
                runOnUiThread(new Runnable() {
                    @Override public void run() { onLoginResult(fEndpoint, user, r); }
                });
            }
        }).start();
    }

    private void onLoginResult(String endpoint, String user, Api.LoginResult r) {
        setBusy(false);
        if (r.ok) {
            SecureStore.put(this, "endpoint", endpoint);
            SecureStore.put(this, "session", r.sessionCookie);
            SecureStore.put(this, "username", user);
            // ثبت کوکی برای WebView (دامنهٔ همان سرور)
            try {
                android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
                String cookieHeader = "rahyar_session=" + r.sessionCookie + "; Path=/; Secure";
                java.net.URL u = new java.net.URL(endpoint);
                cm.setCookie(u.getProtocol() + "://" + u.getHost() + "/", cookieHeader);
                cm.flush();
            } catch (Exception ignored) {}
            startActivity(new Intent(this, MainActivity.class));
            finish();
            return;
        }
        String msg;
        if ("network".equals(r.error)) msg = getString(R.string.err_network);
        else if ("rate_limited".equals(r.error)) msg = getString(R.string.err_rate);
        else if ("http_401".equals(r.error) || "http_403".equals(r.error)) msg = getString(R.string.err_credentials);
        else msg = getString(R.string.err_generic);
        errorTx.setText(msg);
        errorTx.setVisibility(View.VISIBLE);
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
    }

    private void setBusy(boolean busy) {
        progress.setVisibility(busy ? View.VISIBLE : View.GONE);
        loginBtn.setEnabled(!busy);
        userEt.setEnabled(!busy);
        passEt.setEnabled(!busy);
        endpointEt.setEnabled(!busy);
    }
}
