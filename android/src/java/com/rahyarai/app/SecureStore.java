package com.rahyarai.app;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * ذخیرهٔ امن دادهٔ حساس (کوکی نشست، آدرس سرور):
 * کلید AES-256/GCM در AndroidKeyStore ساخته می‌شود (غیرقابل‌استخراج)،
 * داده در فایل خصوصی اپ به‌صورت رمزنگاری‌شده ذخیره می‌شود.
 * هرگز رمز خام کاربر در اینجا ذخیره نمی‌شود — فقط کوکی نشست پس از ورود موفق.
 */
public final class SecureStore {
    private static final String KS = "AndroidKeyStore";
    private static final String ALIAS = "rahyar_session_key";
    private static final String FILE = "rahyar-secure.bin";
    private static final int GCM_TAG_BITS = 128;
    private static final String SEP = "\u0001";

    private SecureStore() {}

    private static SecretKey getOrCreateKey() throws Exception {
        KeyStore ks = KeyStore.getInstance(KS);
        ks.load(null);
        KeyStore.Entry e = ks.getEntry(ALIAS, null);
        if (e instanceof KeyStore.SecretKeyEntry) return ((KeyStore.SecretKeyEntry) e).getSecretKey();
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KS);
        kg.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true)
                .build());
        return kg.generateKey();
    }

    private static byte[] encrypt(byte[] plain) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
        byte[] iv = c.getIV();
        byte[] ct = c.doFinal(plain);
        byte[] out = new byte[iv.length + ct.length];
        System.arraycopy(iv, 0, out, 0, iv.length);
        System.arraycopy(ct, 0, out, iv.length, ct.length);
        return out;
    }

    private static byte[] decrypt(byte[] blob) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        byte[] iv = new byte[12];
        System.arraycopy(blob, 0, iv, 0, 12);
        byte[] ct = new byte[blob.length - 12];
        System.arraycopy(blob, 12, ct, 0, ct.length);
        c.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
        return c.doFinal(ct);
    }

    private static void writeAll(Context ctx, Map<String, String> kv) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> e : kv.entrySet()) {
            if (sb.length() > 0) sb.append('\n');
            sb.append(e.getKey()).append(SEP).append(e.getValue() == null ? "" : e.getValue());
        }
        byte[] blob = encrypt(sb.toString().getBytes(StandardCharsets.UTF_8));
        File f = new File(ctx.getFilesDir(), FILE);
        File tmp = new File(ctx.getFilesDir(), FILE + ".tmp");
        java.io.FileOutputStream fo = new java.io.FileOutputStream(tmp);
        fo.write(blob);
        fo.close();
        if (!tmp.renameTo(f)) {
            // rename گاهی در برخی فایل‌سیستم‌ها شکست می‌خورد — کپی جایگزین
            java.io.FileOutputStream fo2 = new java.io.FileOutputStream(f);
            fo2.write(blob);
            fo2.close();
            tmp.delete();
        }
        f.setReadable(false, false);
        f.setReadable(true, true);
        f.setWritable(false, false);
        f.setWritable(true, true);
    }

    private static Map<String, String> readAll(Context ctx) {
        try {
            File f = new File(ctx.getFilesDir(), FILE);
            if (!f.exists()) return new HashMap<>();
            byte[] blob = new byte[(int) f.length()];
            java.io.FileInputStream fi = new java.io.FileInputStream(f);
            int n = fi.read(blob);
            fi.close();
            if (n <= 0) return new HashMap<>();
            String s = new String(decrypt(blob), StandardCharsets.UTF_8);
            Map<String, String> m = new HashMap<>();
            for (String line : s.split("\n")) {
                int i = line.indexOf(SEP);
                if (i > 0) m.put(line.substring(0, i), line.substring(i + 1));
            }
            return m;
        } catch (Exception e) {
            // کلید/داده ناسازگار (مثلاً بازنصابی) — داده قدیم را دور بریز؛ سشن باطل محسوب می‌شود
            new File(ctx.getFilesDir(), FILE).delete();
            return new HashMap<>();
        }
    }

    public static void put(Context ctx, String key, String value) {
        try {
            Map<String, String> m = readAll(ctx);
            if (value == null) m.remove(key); else m.put(key, value);
            writeAll(ctx, m);
        } catch (Exception ignored) {}
    }

    public static String get(Context ctx, String key) {
        return readAll(ctx).get(key);
    }

    /** پاک‌سازی کامل دادهٔ محلی حساس (خروج/حذف حساب) */
    public static void clearAll(Context ctx) {
        new File(ctx.getFilesDir(), FILE).delete();
    }
}
