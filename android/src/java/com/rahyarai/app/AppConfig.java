package com.rahyarai.app;

/**
 * پیکربندی endpoint اپلیکیشن — هیچ آدرس ثابت توسعه‌ای (localhost:3000) در APK نیست.
 * مقصد پیش‌فرض خالی است و کاربر/مالک در صفحهٔ ورود آدرس سرور production را وارد می‌کند.
 * سیاست: فقط https (شبکهٔ cleartext در manifest و network_security_config بسته است).
 */
public final class AppConfig {
    /** حداکثر طول مجاز آدرس (محافظت ورودی) */
    public static final int MAX_URL_LEN = 300;

    private AppConfig() {}

    /** نرمال‌سازی و اعتبارسنجی آدرس سرور؛ در خطا null برمی‌گرداند. */
    public static String normalizeBaseUrl(String raw) {
        if (raw == null) return null;
        String u = raw.trim();
        if (u.isEmpty() || u.length() > MAX_URL_LEN) return null;
        if (!u.startsWith("https://")) return null; // فقط https — بدون استثنا
        // حذف اسلش انتهایی و مسیرهای اضافه
        while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
        try {
            java.net.URL url = new java.net.URL(u);
            String host = url.getHost();
            if (host == null || host.isEmpty()) return null;
            // جلوگیری از آدرس‌های داخلی به‌عنوان پیش‌فرض production (localhost/loopback/link-local)
            if (isLocalHost(host)) return null;
            return u;
        } catch (java.net.MalformedURLException e) {
            return null;
        }
    }

    /** آیا میزبان، آدرس محلی/داخلی است؟ (چنین آدرسی برای ورود رد می‌شود) */
    public static boolean isLocalHost(String host) {
        String h = host == null ? "" : host.toLowerCase(java.util.Locale.ROOT);
        return h.equals("localhost") || h.equals("127.0.0.1") || h.equals("::1")
                || h.equals("0.0.0.0") || h.endsWith(".local")
                || h.startsWith("10.") || h.startsWith("192.168.")
                || h.startsWith("169.254.") || h.startsWith("172.16.")
                || h.startsWith("172.17.") || h.startsWith("172.18.")
                || h.startsWith("172.19.") || h.startsWith("172.2")
                || h.startsWith("172.30.") || h.startsWith("172.31.");
    }

    /** آدرس API ورود از مبنای سرور */
    public static String loginUrl(String base) {
        return base + "/api/auth/login";
    }

    /** آدرس API خروج */
    public static String logoutUrl(String base) {
        return base + "/api/auth/logout";
    }

    /** آدرس ریشهٔ وب‌اپ برای WebView */
    public static String appUrl(String base) {
        return base + "/";
    }
}
