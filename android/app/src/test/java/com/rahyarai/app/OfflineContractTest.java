package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * قرارداد آفلاین — تضمین ساخت‌یافتهٔ «مستقل بودن»:
 *  ۱) هیچ URL شبکه‌ای (http/https) در هیچ فایل UI محلی وجود ندارد.
 *  ۲) هیچ fetch/XHR/WebSocket/Google-Font/Import شبکه‌ای در JS وجود ندارد.
 *  ۳) همهٔ صفحات استایل و اسکریپت را با مسیر نسبی می‌گیرند.
 *  ۴) پیش‌فرض فارسی RTL است و پوسته روی auto.
 *  ۵) پل RahyarNative در js/app.js استفاده شده و ذخیره‌سازی محلی دارد.
 * هر شکست این قرارداد یعنی نسخه «مستقل» نیست و باید در همان لحظه متوقف شود.
 */
public class OfflineContractTest {

    private Path wwwDir() {
        String p = System.getProperty("rahyar.www.dir");
        assertNotNull("rahyar.www.dir system property must be set by build.gradle", p);
        Path dir = new File(p).toPath();
        assertTrue("www assets must exist: " + dir, Files.isDirectory(dir));
        return dir;
    }

    private List<Path> allFiles(Path dir) throws Exception {
        List<Path> out = new ArrayList<>();
        Files.walk(dir).filter(Files::isRegularFile).forEach(out::add);
        return out;
    }

    private String read(Path p) throws Exception {
        return new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
    }

    @Test
    public void noExternalUrlsInAnyLocalAsset() throws Exception {
        Path dir = wwwDir();
        List<Path> files = allFiles(dir);
        assertTrue("UI assets must exist", files.size() >= 6);
        List<String> offenders = new ArrayList<>();
        for (Path p : files) {
            String c = read(p);
            // هیچ URL مطلق شبکه‌ای مجاز نیست (appassets نیز لازم نیست در سورس باشد)
            String[] needles = {"http://", "https://", "//cdn.", "//www.", "//fonts."};
            for (String n : needles) {
                if (c.contains(n)) offenders.add(p.getFileName() + " → " + n);
            }
        }
        assertTrue("external URL references found in local UI: " + offenders, offenders.isEmpty());
    }

    @Test
    public void noNetworkCallsInScripts() throws Exception {
        Path dir = wwwDir();
        List<Path> files = allFiles(dir);
        List<String> offenders = new ArrayList<>();
        for (Path p : files) {
            if (!p.toString().endsWith(".js") && !p.toString().endsWith(".html")) continue;
            String c = read(p);
            String[] calls = {"fetch(", "XMLHttpRequest", "WebSocket", "EventSource",
                    "navigator.sendBeacon", "@import", "@font-face", "googleapis", "gstatic", "unpkg", "jsdelivr"};
            for (String n : calls) {
                if (c.contains(n)) offenders.add(p.getFileName() + " → " + n);
            }
        }
        assertTrue("network-capable APIs found in local UI: " + offenders, offenders.isEmpty());
    }

    @Test
    public void pagesUseRelativeLocalResourcesAndBridge() throws Exception {
        Path dir = wwwDir();
        for (String page : new String[]{"index.html", "tasks.html", "reminders.html", "settings.html"}) {
            Path p = dir.resolve(page);
            assertTrue("missing page " + page, Files.exists(p));
            String c = read(p);
            assertTrue(page + " must link local css", c.contains("href=\"css/app.css\""));
            assertTrue(page + " must link local js", c.contains("src=\"js/app.js\""));
            assertFalse(page + " must not use absolute paths", c.contains("src=\"/"));
            assertTrue(page + " must declare charset utf-8", c.contains("charset=\"utf-8\""));
        }
        String js = read(dir.resolve("js/app.js"));
        assertTrue("app.js must use the native bridge", js.contains("RahyarNative"));
        assertTrue("app.js must persist via putDoc", js.contains("putDoc"));
        assertTrue("app.js must read via getDoc", js.contains("getDoc"));
        assertTrue("app.js must never call fetch", !js.contains("fetch("));
    }

    @Test
    public void defaultShellIsPersianRtlAndThemeAuto() throws Exception {
        Path dir = wwwDir();
        for (String page : new String[]{"index.html", "tasks.html", "reminders.html", "settings.html"}) {
            String c = read(dir.resolve(page));
            assertTrue(page + " must default to lang=fa", c.contains("lang=\"fa\""));
            assertTrue(page + " must default to dir=rtl", c.contains("dir=\"rtl\""));
            assertTrue(page + " must use auto theme", c.contains("data-theme=\"auto\""));
        }
        String js = read(dir.resolve("js/app.js"));
        assertTrue("fa dictionary must exist", js.contains("fa: {"));
        assertTrue("en dictionary must exist", js.contains("en: {"));
        // فارسی پیش‌فرض است
        assertTrue("default lang must be fa", js.contains("'fa'"));
    }

    @Test
    public void offlineBadgeAndLocalModeWordingExist() throws Exception {
        Path dir = wwwDir();
        String js = read(dir.resolve("js/app.js"));
        // پیام روشن حالت آفلاین — طبق پذیرش مأموریت
        assertTrue(js.contains("offline"));
        assertTrue(js.contains("قابلیت‌های محلی فعال") || js.contains("local features active"));
        // راهنمای سه‌گانهٔ قابلیت‌ها باید در UI باشد
        String idx = read(dir.resolve("index.html"));
        assertTrue(idx.contains("featuresLocal"));
        assertTrue(idx.contains("featuresNet"));
    }

    @Test
    public void appVersionMatchesGradleContract() throws Exception {
        // همگامی AppVersion با build.gradle — منبع واحد حقیقت (v2.0.0 دو ویراست)
        // build.gradle در android/app — از rahyar.www.dir بازگشت می‌کنیم به ریشهٔ مخزن اندروید
        Path dir = wwwDir(); // .../android/src/www
        Path gradle = dir.getParent().getParent().resolve("app/build.gradle");
        assertTrue("build.gradle must exist at " + gradle, Files.exists(gradle));
        String g = read(gradle);
        assertTrue("user flavor must be versionCode 20", g.contains("versionCode 20"));
        assertTrue("user flavor must be versionName 2.0.0", g.contains("versionName '2.0.0'"));
        assertTrue("owner flavor must be versionCode 21", g.contains("versionCode 21"));
        assertTrue("owner flavor must be versionName 2.0.0-owner", g.contains("versionName '2.0.0-owner'"));
        assertEquals("AppVersion.NAME", "2.0.0", AppVersion.NAME);
        assertEquals("AppVersion.CODE", 20, AppVersion.CODE);
        assertEquals("AppVersion.PACKAGE_ID", "com.rahyarai.app", AppVersion.PACKAGE_ID);
    }

    @Test
    public void homeStartUrlMapsToRealAssetFile() throws Exception {
        // رگرسیون: START_URL باید به فایلی واقعی در دارایی‌های محلی اشاره کند
        // (assets.srcDirs محتوای پوشه را در ریشهٔ assets می‌گذارد —
        //  یعنی /assets/<نسبت> باید مستقیم زیر www/ موجود باشد)
        Path dir = wwwDir();
        Path home = dir.getParent().resolve("java/com/rahyarai/app/HomeActivity.java");
        assertTrue("HomeActivity.java must exist", Files.exists(home));
        String src = read(home);
        // APPASSETS_ORIGIN = "<literal>"
        int o = src.indexOf("APPASSETS_ORIGIN = \"");
        assertTrue("APPASSETS_ORIGIN must be defined", o >= 0);
        String or = src.substring(o + "APPASSETS_ORIGIN = \"".length());
        String origin = or.substring(0, or.indexOf('"'));
        // START_URL = <expr> "<literal>"  (ممکن است با + به origin چسبیده باشد)
        int i = src.indexOf("START_URL = ");
        assertTrue("START_URL constant must be defined", i >= 0);
        String rest = src.substring(i);
        int a = rest.indexOf('"'), b = rest.indexOf('"', a + 1);
        String url = origin + rest.substring(a + 1, b);
        assertTrue("START_URL must be the local appassets origin",
                url.startsWith("https://appassets.androidplatform.net/assets/"));
        String rel = url.substring("https://appassets.androidplatform.net/assets/".length());
        assertTrue("START_URL must not escape the asset root: " + rel, !rel.contains(".."));
        assertTrue("start page must exist in www assets: " + rel, Files.exists(dir.resolve(rel)));
    }
}
