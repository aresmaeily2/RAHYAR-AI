package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.io.File;
import java.nio.file.Files;

/**
 * تست واحد پل محلی (منطق RahyarCore) — مرز امنیتی JS ↔ داده.
 */
public class RahyarCoreTest {

    private RahyarCore coreIn(File dir) {
        return new RahyarCore(new LocalStore(dir), "1.2.0", 12);
    }

    @Test
    public void keyWhitelistIsEnforced() {
        assertTrue(RahyarCore.isAllowedKey("profile"));
        assertTrue(RahyarCore.isAllowedKey("tasks"));
        assertTrue(RahyarCore.isAllowedKey("reminders"));
        assertFalse(RahyarCore.isAllowedKey("session"));
        assertFalse(RahyarCore.isAllowedKey("endpoint"));
        assertFalse(RahyarCore.isAllowedKey("../escape"));
        assertFalse(RahyarCore.isAllowedKey("Profile"));      // حساس به بزرگی حرف
        assertFalse(RahyarCore.isAllowedKey(null));
        assertFalse(RahyarCore.isAllowedKey(""));
        assertFalse(RahyarCore.isAllowedKey("x1234567890123456789012345678901")); // >32
    }

    @Test
    public void putGetThroughCore() throws Exception {
        RahyarCore c = coreIn(Files.createTempDirectory("core").toFile());
        assertEquals("{\"ok\":true}", c.putDoc("profile", "{\"name\":\"رضا\"}"));
        assertEquals("{\"name\":\"رضا\"}", c.getDoc("profile"));
        // کلید ناموجود → رشتهٔ خالی (قرارداد JS)
        assertEquals("", c.getDoc("reminders"));
    }

    @Test
    public void rejectsBadKeysJsonAndEmpty() throws Exception {
        RahyarCore c = coreIn(Files.createTempDirectory("core").toFile());
        assertEquals("{\"ok\":false,\"error\":\"bad_key\"}", c.putDoc("hack", "{}"));
        assertEquals("{\"ok\":false,\"error\":\"bad_json\"}", c.putDoc("profile", "junk"));
        assertEquals("{\"ok\":false,\"error\":\"empty\"}", c.putDoc("profile", "  "));
        assertEquals("{\"ok\":false,\"error\":\"bad_key\"}", c.deleteDoc("nope"));
        // هیچ داده‌ای نوشته نشده
        assertEquals("", c.getDoc("profile"));
        assertEquals("", c.getDoc("hack"));
    }

    @Test
    public void oversizedDocRejectedWithCode() throws Exception {
        RahyarCore c = coreIn(Files.createTempDirectory("core").toFile());
        StringBuilder big = new StringBuilder("{\"x\":\"");
        while (big.length() < LocalStore.MAX_DOC_BYTES + 100) big.append('ا');
        big.append("\"}");
        assertEquals("{\"ok\":false,\"error\":\"too_large\"}", c.putDoc("tasks", big.toString()));
    }

    @Test
    public void exportImportBridgeFormat() throws Exception {
        RahyarCore c = coreIn(Files.createTempDirectory("core").toFile());
        c.putDoc("tasks", "[{\"id\":\"1\"}]");
        String backup = c.exportAll();
        // ترتیب کلیدها در org.json تضمین‌شده نیست — محتوا بررسی می‌شود نه ترتیب
        assertTrue(backup, backup.contains("\"format\":\"rahyar-local-backup\""));
        assertTrue(backup, backup.contains("\"tasks\""));

        RahyarCore other = coreIn(Files.createTempDirectory("core2").toFile());
        String res = other.importAll(backup);
        assertTrue(res, res.contains("\"ok\":true") && res.contains("\"imported\":1"));
        assertEquals("[{\"id\":\"1\"}]", other.getDoc("tasks"));

        // پشتیبان خراب → خطای استاندارد
        assertEquals("{\"ok\":false,\"error\":\"bad_backup\"}", other.importAll("garbage"));
        assertEquals("{\"ok\":false,\"error\":\"bad_backup\"}", other.importAll(null));
    }

    @Test
    public void metaExposesOnlySafeFields() throws Exception {
        RahyarCore c = coreIn(Files.createTempDirectory("core").toFile());
        String m = c.meta();
        assertTrue(m.contains("\"app\":\"RahyAr\""));
        assertTrue(m.contains("\"versionName\":\"1.2.0\""));
        assertTrue(m.contains("\"versionCode\":12"));
        assertTrue(m.contains("\"packageId\":\"com.rahyarai.app\""));
        assertTrue(m.contains("\"mode\":\"local\""));
        // هیچ مسیر فایل یا دادهٔ حساس در meta نیست
        assertFalse(m.contains("/data/"));
        assertFalse(m.contains("token"));
    }
}
