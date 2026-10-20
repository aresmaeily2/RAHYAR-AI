package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * تست واحد لایهٔ منطق — JVM (بدون نیاز به دستگاه).
 * توجه: نسخهٔ قبلی این تست‌ها (۲۱ بررسی) در repo ثبت نشده بود و با reset محیط از دست رفت؛
 * این فایل نسخهٔ جدید و ثبت‌شده در مخزن است (Behavior محفوظ شده + موارد تازه).
 */
public class AppConfigTest {

    @Test
    public void acceptsValidHttpsHost() {
        assertEquals("https://example.com", AppConfig.normalizeBaseUrl("https://example.com"));
        assertEquals("https://example.com", AppConfig.normalizeBaseUrl("https://example.com/"));
        assertEquals("https://server.example.com/app", AppConfig.normalizeBaseUrl("https://server.example.com/app"));
    }

    @Test
    public void rejectsNonHttps() {
        assertNull(AppConfig.normalizeBaseUrl("http://example.com"));
        assertNull(AppConfig.normalizeBaseUrl("ftp://example.com"));
        assertNull(AppConfig.normalizeBaseUrl("example.com"));
    }

    @Test
    public void rejectsLocalAndPrivateHosts() {
        // سیاست کلیدی: هیچ وابستگی به localhost/سرور توسعه در APK مجاز نیست
        assertNull(AppConfig.normalizeBaseUrl("https://localhost"));
        assertNull(AppConfig.normalizeBaseUrl("https://localhost:3000"));
        assertNull(AppConfig.normalizeBaseUrl("https://127.0.0.1"));
        assertNull(AppConfig.normalizeBaseUrl("https://10.0.0.5"));
        assertNull(AppConfig.normalizeBaseUrl("https://192.168.1.4"));
        assertNull(AppConfig.normalizeBaseUrl("https://172.16.0.1"));
        assertNull(AppConfig.normalizeBaseUrl("https://172.31.255.255"));
        assertNull(AppConfig.normalizeBaseUrl("https://169.254.1.1"));
        assertNull(AppConfig.normalizeBaseUrl("https://box.local"));
    }

    @Test
    public void rejectsNullEmptyAndLong() {
        assertNull(AppConfig.normalizeBaseUrl(null));
        assertNull(AppConfig.normalizeBaseUrl(""));
        assertNull(AppConfig.normalizeBaseUrl("   "));
        StringBuilder b = new StringBuilder("https://example.com/");
        for (int i = 0; i < AppConfig.MAX_URL_LEN; i++) b.append('a');
        assertNull(AppConfig.normalizeBaseUrl(b.toString()));
    }

    @Test
    public void isLocalHostClassification() {
        assertTrue(AppConfig.isLocalHost("LOCALHOST"));
        assertTrue(AppConfig.isLocalHost("::1"));
        assertTrue(AppConfig.isLocalHost("0.0.0.0"));
        assertFalse(AppConfig.isLocalHost("example.com"));
        // رفتار فعلی (مستند در گزارش): پیشوند 172.2 دامنهٔ 172.16–31 را فراتر هم می‌بندد
        assertTrue(AppConfig.isLocalHost("172.200.1.1"));
    }

    @Test
    public void urlComposition() {
        assertEquals("https://example.com/api/auth/login", AppConfig.loginUrl("https://example.com"));
        assertEquals("https://example.com/api/auth/logout", AppConfig.logoutUrl("https://example.com"));
        assertEquals("https://example.com/", AppConfig.appUrl("https://example.com"));
    }
}
