package com.rahyarai.app;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * لایهٔ API — بدون هیچ وابستگی خارجی (HttpURLConnection).
 * سیاست: تایم‌اوت مشخص، بدون لاگ‌کردن توکن/رمز، فقط https (سیاست شبکهٔ manifest).
 */
public final class Api {
    public static final int TIMEOUT_MS = 12000;

    private Api() {}

    /** نتیجهٔ ورود — هیچ رمزی در این شیء نگه داشته نمی‌شود */
    public static class LoginResult {
        public final boolean ok;
        public final String error;         // پیام خطای عمومی (بدون جزئیات حساس)
        public final String sessionCookie; // مقدار کوکی rahyar_session در موفقیت
        public final int httpCode;
        public LoginResult(boolean ok, String error, String sessionCookie, int httpCode) {
            this.ok = ok; this.error = error; this.sessionCookie = sessionCookie; this.httpCode = httpCode;
        }
    }

    /** استخراج مقدار کوکی rahyar_session از هدر Set-Cookie */
    static String extractSessionCookie(Map<String, List<String>> headers) {
        if (headers == null) return null;
        for (Map.Entry<String, List<String>> e : headers.entrySet()) {
            if (e.getKey() == null || !e.getKey().equalsIgnoreCase("set-cookie")) continue;
            for (String v : e.getValue()) {
                if (v == null) continue;
                String first = v.split(";", 2)[0].trim();
                int eq = first.indexOf('=');
                if (eq > 0 && first.substring(0, eq).trim().equals("rahyar_session")) {
                    return first.substring(eq + 1).trim();
                }
            }
        }
        return null;
    }

    /** ساده‌ترین استخراج ok/error از پاسخ JSON بدون وابستگی (فقط دو فیلد شناخته‌شده) */
    static String jsonField(String body, String field) {
        if (body == null) return null;
        String key = "\"" + field + "\"";
        int k = body.indexOf(key);
        if (k < 0) return null;
        int c = body.indexOf(':', k + key.length());
        if (c < 0) return null;
        int i = c + 1;
        while (i < body.length() && (body.charAt(i) == ' ' || body.charAt(i) == '\t')) i++;
        if (i < body.length() && body.charAt(i) == '"') {
            int end = body.indexOf('"', i + 1);
            return end < 0 ? null : body.substring(i + 1, end);
        }
        int end = i;
        while (end < body.length() && "truefalsenull0123456789.-".indexOf(body.charAt(end)) >= 0) end++;
        return body.substring(i, end);
    }

    public static LoginResult login(String baseUrl, String username, String password) {
        String body = "{\"username\":\"" + esc(username) + "\",\"password\":\"" + esc(password) + "\"}";
        Result r = post(AppConfig.loginUrl(baseUrl), body, "application/json");
        if (r.networkError) return new LoginResult(false, "network", null, 0);
        boolean ok = "true".equals(jsonField(r.body, "ok")) && r.code == 200;
        String cookie = extractSessionCookie(r.headers);
        if (ok && cookie != null) return new LoginResult(true, null, cookie, r.code);
        String err = jsonField(r.body, "error");
        if (r.code == 429) err = "rate_limited";
        return new LoginResult(false, err == null ? ("http_" + r.code) : err, null, r.code);
    }

    public static boolean logout(String baseUrl, String sessionCookie) {
        Result r = post(AppConfig.logoutUrl(baseUrl), "{}", "application/json");
        return !r.networkError && (r.code == 200 || r.code == 204 || r.code == 401);
    }

    // ─── ابزار داخلی ───
    static class Result {
        final int code; final String body;
        final Map<String, List<String>> headers; final boolean networkError;
        Result(int code, String body, Map<String, List<String>> headers, boolean networkError) {
            this.code = code; this.body = body; this.headers = headers; this.networkError = networkError;
        }
    }

    private static String esc(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder();
        for (char ch : s.toCharArray()) {
            if (ch == '"' || ch == '\\') b.append('\\').append(ch);
            else if (ch < 0x20) b.append(' ');
            else b.append(ch);
        }
        return b.toString();
    }

    private static Result post(String urlStr, String jsonBody, String contentType) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            if (!"https".equalsIgnoreCase(url.getProtocol())) {
                return new Result(0, null, null, true);
            }
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(TIMEOUT_MS);
            conn.setReadTimeout(TIMEOUT_MS);
            conn.setInstanceFollowRedirects(false); // جلوگیری از ریدایرکت غیرمنتظره
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", contentType);
            conn.setRequestProperty("Accept", "application/json");
            OutputStream os = conn.getOutputStream();
            os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
            os.close();
            int code = conn.getResponseCode();
            InputStream is = (code >= 400 ? conn.getErrorStream() : conn.getInputStream());
            String body = is == null ? "" : readAll(is);
            return new Result(code, body, conn.getHeaderFields(), false);
        } catch (Exception e) {
            return new Result(0, null, null, true);
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String readAll(InputStream is) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
        is.close();
        return bo.toString("UTF-8");
    }
}
