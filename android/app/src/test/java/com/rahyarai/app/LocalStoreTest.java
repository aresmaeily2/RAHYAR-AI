package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * تست واحد ذخیره‌سازی محلی — قلب حالت آفلاین (JVM، بدون دستگاه).
 * تضمین می‌کند: داده‌ها می‌مانند، نوشتن اتمیک است، فایل خراب پاک نمی‌شود.
 */
public class LocalStoreTest {

    private File tempDir() throws Exception {
        return Files.createTempDirectory("rahyar-store-test").toFile();
    }

    @Test
    public void putGetAndPersistAcrossInstances() throws Exception {
        File dir = tempDir();
        LocalStore a = new LocalStore(dir);
        assertTrue(a.put("profile", "{\"name\":\"سارا\",\"lang\":\"fa\"}"));
        assertEquals("{\"name\":\"سارا\",\"lang\":\"fa\"}", a.get("profile"));

        // نمونهٔ جدید روی همان مسیر = شبیه‌سازی بستن و بازکردن برنامه
        LocalStore b = new LocalStore(dir);
        assertEquals("{\"name\":\"سارا\",\"lang\":\"fa\"}", b.get("profile"));
        assertEquals(1, b.size());
    }

    @Test
    public void overwriteAndRemove() throws Exception {
        File dir = tempDir();
        LocalStore s = new LocalStore(dir);
        s.put("tasks", "[{\"id\":\"1\"}]");
        s.put("tasks", "[{\"id\":\"1\"},{\"id\":\"2\"}]");
        assertEquals("[{\"id\":\"1\"},{\"id\":\"2\"}]", s.get("tasks"));
        assertTrue(s.remove("tasks"));
        assertNull(s.get("tasks"));
        // حذف دوبارهٔ کلید ناموجود هم موفق است
        assertTrue(s.remove("tasks"));
    }

    @Test
    public void rejectsInvalidJsonAndNulls() throws Exception {
        File dir = tempDir();
        LocalStore s = new LocalStore(dir);
        assertFalse(s.put("profile", "not json"));
        assertFalse(s.put("profile", "{broken"));
        assertFalse(s.put(null, "{}"));
        assertFalse(s.put("", "{}"));
        assertNull(s.get(null));
        assertEquals(0, s.size());
        // اعتبار آرایه هم پذیرفته می‌شود
        assertTrue(s.put("tasks", "[]"));
    }

    @Test
    public void rejectsOversizedDoc() throws Exception {
        File dir = tempDir();
        LocalStore s = new LocalStore(dir);
        StringBuilder big = new StringBuilder("{\"x\":\"");
        while (big.length() < LocalStore.MAX_DOC_BYTES + 10) big.append('a');
        big.append("\"}");
        assertFalse(s.put("profile", big.toString()));
        assertNull(s.get("profile"));
    }

    @Test
    public void corruptFileIsNotDeletedAndStoreStartsFresh() throws Exception {
        File dir = tempDir();
        LocalStore s = new LocalStore(dir);
        assertTrue(s.put("profile", "{\"a\":1}"));
        assertTrue(s.getFile().exists());

        // خراب‌کردن عمدی فایل (شبیه‌سازی خرابی دیسک)
        Files.write(s.getFile().toPath(), "corrupted bytes !!!".getBytes(StandardCharsets.UTF_8));

        LocalStore after = new LocalStore(dir);
        assertNull(after.get("profile")); // انبار تازه آغاز می‌شود
        assertEquals(0, after.size());

        // سیاست حفظ داده: نسخهٔ خراب پاک نشده و با پسوند corrupt نگه‌داری شده است
        File[] corrupt = dir.listFiles(new java.io.FilenameFilter() {
            @Override public boolean accept(File d, String name) { return name.contains(".corrupt-"); }
        });
        assertNotNull(corrupt);
        assertTrue("corrupt backup must exist", corrupt.length >= 1);
        assertEquals("corrupted bytes !!!", new String(Files.readAllBytes(corrupt[0].toPath()), StandardCharsets.UTF_8));

        // و انبار پس از خرابی دوباره قابل‌نوشتن است
        assertTrue(after.put("reminders", "[]"));
        assertEquals("[]", after.get("reminders"));
    }

    @Test
    public void exportImportRoundTripPreservesData() throws Exception {
        File dir = tempDir();
        LocalStore s = new LocalStore(dir);
        s.put("profile", "{\"name\":\"Ali\"}");
        s.put("tasks", "[{\"id\":\"t1\",\"title\":\"خرید\"}]");

        String backup = s.exportJson("1.2.0");
        assertNotNull(backup);
        assertTrue(backup.contains("rahyar-local-backup"));
        assertTrue(backup.contains("1.2.0"));

        // بازگردانی روی انبار تازهٔ دیگر
        LocalStore fresh = new LocalStore(tempDir());
        fresh.put("reminders", "[]"); // کلید خارج از پشتیبان — نباید از بین برود
        int n = fresh.importJson(backup);
        assertEquals(2, n);
        assertEquals("[{\"id\":\"t1\",\"title\":\"خرید\"}]", fresh.get("tasks"));
        assertEquals("[]", fresh.get("reminders"));
    }

    @Test
    public void importRejectsMalformedAndForeignBackups() throws Exception {
        LocalStore s = new LocalStore(tempDir());
        assertTrue(s.importJson(null) < 0);
        assertTrue(s.importJson("{}") < 0);                                   // بدون format
        assertTrue(s.importJson("{\"format\":\"other\"}") < 0);               // فرمت بیگانه
        assertTrue(s.importJson("{\"format\":\"rahyar-local-backup\",\"docs\":\"x\"}") < 0); // docs نامعتبر
        // پشتیبان با سند خراب در میان اسناد معتبر: فقط معتبرها وارد می‌شوند
        int n = s.importJson("{\"format\":\"rahyar-local-backup\",\"docs\":{"
                + "\"profile\":{\"name\":\"ok\"},"
                + "\"bad\":123"                                            // سند غیر شیء — رد می‌شود
                + "}}");
        assertEquals(1, n);
        assertEquals("{\"name\":\"ok\"}", s.get("profile"));
    }

    @Test
    public void concurrentWritesStayConsistent() throws Exception {
        final File dir = tempDir();
        final LocalStore s = new LocalStore(dir);
        Thread[] ts = new Thread[8];
        for (int i = 0; i < ts.length; i++) {
            final int idx = i;
            ts[i] = new Thread(new Runnable() {
                @Override public void run() {
                    for (int j = 0; j < 20; j++) {
                        s.put("tasks", "[{\"w\":" + idx + ",\"j\":" + j + "}]");
                    }
                }
            });
            ts[i].start();
        }
        for (Thread t : ts) t.join();
        // فایل باید JSON معتبر باشد و یک سند tasks داشته باشد
        LocalStore verify = new LocalStore(dir);
        assertNotNull(verify.get("tasks"));
        assertTrue(LocalStore.isValidJson(verify.get("tasks")));
    }
}
