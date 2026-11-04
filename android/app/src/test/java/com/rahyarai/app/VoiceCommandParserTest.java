package com.rahyarai.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.assertFalse;

import org.json.JSONObject;
import org.junit.Test;

/**
 * تست واحد مغز دستیار صوتی — فرمان‌های فارسی و انگلیسی → کنش واقعی ماژول‌ها.
 * هر مورد همان مسیری است که رابط کاربری پس از تشخیص گفتار طی می‌کند.
 */
public class VoiceCommandParserTest {

    private static JSONObject fa(String t) { return VoiceCommandParser.parse(t, "fa"); }
    private static JSONObject en(String t) { return VoiceCommandParser.parse(t, "en"); }

    private static String act(JSONObject o) { return o.optString("action", ""); }

    // ── فارسی: وظیفه ──
    @Test public void faAddTask() {
        JSONObject o = fa("وظیفه اضافه کن گزارش ماهانه");
        assertEquals("add_task", act(o));
        assertEquals("گزارش ماهانه", o.optString("title"));
        assertEquals("fa", o.optString("lang"));
    }
    @Test public void faAddTaskPriority() {
        JSONObject o = fa("یک وظیفه جدید به نام تماس با بانک با اولویت زیاد");
        assertEquals("add_task", act(o));
        assertEquals("high", o.optString("priority"));
        assertTrue(o.optString("title").contains("تماس با بانک"));
    }
    @Test public void faNoteStyle() {
        JSONObject o = fa("یادداشت کن خرید نان");
        assertEquals("add_task", act(o));
        assertEquals("خرید نان", o.optString("title"));
    }

    // ── فارسی: یادآور ──
    @Test public void faAddReminder() {
        JSONObject o = fa("یادم بیار که دارو بخورم");
        assertEquals("add_reminder", act(o));
        assertTrue(o.optString("title").contains("دارو بخورم"));
    }

    // ── فارسی: مالی ──
    @Test public void faAddExpensePersianDigits() {
        JSONObject o = fa("هزینه خرید خواروبار ۱۲۰ تومان");
        assertEquals("add_expense", act(o));
        assertEquals(120L, o.optLong("amount"));
    }
    @Test public void faAddIncome() {
        JSONObject o = fa("درآمد فروش ۲۵۰ تومان");
        assertEquals("add_income", act(o));
        assertEquals(250L, o.optLong("amount"));
    }
    @Test public void faFinanceReport() {
        assertEquals("finance_report", act(fa("گزارش مالی این ماه")));
    }

    // ── فارسی: برنامه/تقویم/لغو/راهنما ──
    @Test public void faPlanQuery() {
        assertEquals("plan_query", act(fa("برنامه امروز چیست")));
    }
    @Test public void faDateQuery() {
        assertEquals("date_query", act(fa("امروز چندمه")));
    }
    @Test public void faCancel() {
        assertEquals("cancel", act(fa("لغو")));
    }
    @Test public void faHelp() {
        assertEquals("help", act(fa("چیکار می‌تونی بکنی")));
    }

    // ── فارسی: حذف نیازمند تأیید صریح ──
    @Test public void faDeleteRequiresConfirm() {
        JSONObject o = fa("وظیفه گزارش ماهانه را حذف کن");
        assertEquals("delete_task", act(o));
        assertEquals(true, o.optBoolean("confirm"));
    }

    // ── انگلیسی ──
    @Test public void enAddTask() {
        JSONObject o = en("add task submit quarterly report");
        assertEquals("add_task", act(o));
        assertEquals("submit quarterly report", o.optString("title"));
    }
    @Test public void enAddReminder() {
        JSONObject o = en("remind me to call the dentist");
        assertEquals("add_reminder", act(o));
        assertTrue(o.optString("title").contains("call the dentist"));
    }
    @Test public void enAddExpense() {
        JSONObject o = en("expense groceries 42");
        assertEquals("add_expense", act(o));
        assertEquals(42L, o.optLong("amount"));
    }
    @Test public void enAddIncome() {
        JSONObject o = en("income from sales 150");
        assertEquals("add_income", act(o));
        assertEquals(150L, o.optLong("amount"));
    }
    @Test public void enFinanceReport() {
        assertEquals("finance_report", act(en("how much did I spend")));
    }
    @Test public void enPlanQuery() {
        assertEquals("plan_query", act(en("what's my plan today")));
    }
    @Test public void enDateQuery() {
        assertEquals("date_query", act(en("what's the date today")));
    }
    @Test public void enDeleteRequiresConfirm() {
        JSONObject o = en("delete task groceries");
        assertEquals("delete_task", act(o));
        assertEquals(true, o.optBoolean("confirm"));
    }

    // ── نرمال‌سازی و ناشناخته ──
    @Test public void persianDigitsNormalize() {
        assertEquals("هزینه 123", VoiceCommandParser.normalize("هزینه ۱۲۳"));
        assertEquals("reminder 7", VoiceCommandParser.normalize("reminder ٧"));
    }
    @Test public void unknownStaysUnknown() {
        assertEquals("unknown", act(fa("آب و هوا فردا چطوره")));
        assertEquals("unknown", act(en("play some music")));
        assertFalse("unknown".equals(act(fa("گزارش مالی"))));
    }
    @Test public void emptyInput() {
        assertEquals("unknown", act(VoiceCommandParser.parse("", "fa")));
        assertEquals("unknown", act(VoiceCommandParser.parse(null, "fa")));
    }
}
