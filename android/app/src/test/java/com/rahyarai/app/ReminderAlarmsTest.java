package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.util.ArrayList;

/**
 * قرارداد زمان‌بند بومی یادآورها — لایهٔ خالص (بدون Context/AlarmManager):
 *  ۱) فرمت ذخیرهٔ prefs ↔ طرح زمان‌بندی رفت‌وبرگشت دارد.
 *  ۲) باززمان‌بندی فقط آینده‌ها را برمی‌دارد و از سقف ۵۰ عبور نمی‌کند.
 *  ۳) ورودی خراب = فهرست خالی (هرگز کرش) — چون اعلان یادآور حیاتی است.
 */
public class ReminderAlarmsTest {

    @Test
    public void prefsRoundTrip() {
        ArrayList<RahyarNativeBridge.ReminderPlan> plans = new ArrayList<>();
        plans.add(new RahyarNativeBridge.ReminderPlan("id-1", "جلسه با تیم", 1893456000000L));
        plans.add(new RahyarNativeBridge.ReminderPlan("id-2", "پرداخت قبض", 1893542400000L));
        // ساخت JSON همان‌طور که ReminderAlarms.sync ذخیره می‌کند
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < plans.size(); i++) {
            if (i > 0) sb.append(',');
            RahyarNativeBridge.ReminderPlan p = plans.get(i);
            sb.append("{\"id\":\"").append(p.id).append("\",\"message\":\"").append(p.message)
              .append("\",\"remindAtMs\":").append(p.remindAtMs).append('}');
        }
        sb.append(']');
        ArrayList<RahyarNativeBridge.ReminderPlan> back = ReminderAlarms.parsePrefs(sb.toString());
        assertEquals(2, back.size());
        assertEquals("id-1", back.get(0).id);
        assertEquals("جلسه با تیم", back.get(0).message);
        assertEquals(1893456000000L, back.get(0).remindAtMs);
    }

    @Test
    public void parsePrefsMalformedIsSafe() {
        assertEquals(0, ReminderAlarms.parsePrefs(null).size());
        assertEquals(0, ReminderAlarms.parsePrefs("").size());
        assertEquals(0, ReminderAlarms.parsePrefs("garbage{").size());
        assertEquals(0, ReminderAlarms.parsePrefs("[{\"id\":\"\",\"remindAtMs\":5}]").size());
        assertEquals(0, ReminderAlarms.parsePrefs("[{\"id\":\"x\",\"remindAtMs\":0}]").size());
    }

    @Test
    public void parsePrefsCapsAtFifty() {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < 80; i++) {
            if (i > 0) sb.append(',');
            sb.append("{\"id\":\"r").append(i).append("\",\"message\":\"م\",\"remindAtMs\":").append(1000L + i).append('}');
        }
        sb.append(']');
        assertEquals(50, ReminderAlarms.parsePrefs(sb.toString()).size());
    }

    @Test
    public void requestCodeContract() {
        // کد درخواست باید پایدار، نامنفی و برای شناسه‌های متفاوت متمایز در عمل باشد
        int a1 = ReminderAlarms.requestCodeFor("user-a:reminder-1");
        int a2 = ReminderAlarms.requestCodeFor("user-a:reminder-1");
        int b = ReminderAlarms.requestCodeFor("user-b:reminder-1");
        assertEquals(a1, a2);
        assertTrue(a1 >= 0);
        assertTrue(b >= 0);
    }
}
