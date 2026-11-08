package com.rahyarai.app;

import org.json.JSONObject;

/**
 * VoiceCommandParser — مغز دستیار صوتی حالت محلی.
 *
 * ورودی: متن تشخیص‌داده‌شده (fa/en) + زبان؛ خروجی: «کنش» JSON که رابط کاربری
 * واقعاً روی ماژول‌های خودش اجرا می‌کند (وظیفه/یادآور/مالی/برنامه/تقویم).
 *
 * قواعد طراحی:
 *  - کلاس خالص Java (بدون هیچ API اندرویدی) → روی JVM تست‌پذیر است.
 *  - هیچ عملیات حساس از صدا بی‌درنگ اجرا نمی‌شود؛ حذف همیشه confirm=true دارد
 *    و رابط کاربری باید تأیید صریح بگیرد (مأموریت مالک — بند ۳).
 *  - اعداد فارسی (۰-۹) و عربی (٠-٩) نرمال‌سازی می‌شوند.
 *  - هیچ متن فرمانی ذخیره یا ارسال نمی‌شود؛ فقط در حافظه پردازش می‌شود.
 */
public final class VoiceCommandParser {

    /** کنش‌های پشتیبانی‌شده */
    public static final String[] ACTIONS = {
        "add_task", "delete_task", "add_reminder", "plan_query",
        "add_income", "add_expense", "finance_report", "date_query", "help", "cancel", "unknown"
    };

    private VoiceCommandParser() { }

    /** نرمال‌سازی رقم فارسی/عربی به لاتین + فاصله‌های تکراری */
    public static String normalize(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder(s.length());
        boolean lastSpace = false;
        for (char c : s.toCharArray()) {
            if (c >= '۰' && c <= '۹') c = (char) ('0' + (c - '۰'));
            else if (c >= '٠' && c <= '٩') c = (char) ('0' + (c - '٠'));
            if (Character.isWhitespace(c)) {
                if (lastSpace) continue;
                lastSpace = true;
                b.append(' ');
            } else {
                lastSpace = false;
                // ZWNJ/ZWJ (نیم‌فاصله) → فاصله — تا «می‌تونی» و «می تونی» هم‌ارز شوند
                if (c == '\u200C' || c == '\u200D') { b.append(' '); lastSpace = true; continue; }
                b.append(c);
            }
        }
        return b.toString().trim();
    }

    /** حذف پیشوندهای محاوره‌ای فارسی (را/رو/هم) از عنوان */
    private static String stripFaMarkers(String t) {
        return t.replaceAll("^(وظیفه|یادآور|یادم|هزینه|درآمد)\\s*(به\\s*نام|با\\s*عنوان)?\\s*", "")
                .replaceAll("^(را|رو)\\s*", "")
                .replaceAll("\\s*(را|رو)$", "").trim();
    }

    /**
     * تحلیل فرمان — خروجی JSON با کلیدهای:
     * action / title / amount / priority / confirm / lang
     */
    public static JSONObject parse(String raw, String lang) {
        String t = normalize(raw);
        boolean fa = "fa".equalsIgnoreCase(lang) || (lang == null && containsFa(t));
        String l = fa ? "fa" : "en";
        try {
            if (t.isEmpty()) return intent("unknown", l, null);

            // لغو/توقف — اولویت بالا (V1 بند ۴ سناریو ۴: «منصرف شدم» / «ثبت نکن»)
            if (fa && t.matches(".*(لغو|کافیه|بسه|بس کن|صرف نظر|منصرف|ثبت نکن|نریز|نمی خوام).*")) return intent("cancel", l, null);
            if (!fa && t.matches(".*(cancel|stop listening|never mind|forget it|don't (add|save|record)|do not (add|save|record)).*")) return intent("cancel", l, null);

            // راهنما
            if (fa && t.matches(".*(چیکار می تونی|چه کارایی می تونی|کمک|راهنما|چه کنای داری).*")) return intent("help", l, null);
            if (!fa && t.matches(".*(what can you do|help me|guide me).*")) return intent("help", l, null);

            // حذف وظیفه — همیشه نیازمند تأیید صریح
            if (fa && t.matches(".*(حذف کن|پاک کن).*")) {
                return intentFa("delete_task", t, l).put("confirm", true);
            }
            if (!fa && t.matches(".*(delete|remove).*task.*")) {
                String title = t.replaceFirst(".*task\\s*", "").trim();
                return new JSONObject().put("action", "delete_task").put("title", title)
                        .put("lang", l).put("confirm", true);
            }

            // برنامه روزانه
            if (fa && t.matches(".*(برنامه|کارهای|چه کارایی|چه کارهایی).*(امروز|اینجا|دارم).*|امروز.*(چی|چه).*")) {
                return intent("plan_query", l, null);
            }
            if (!fa && t.matches(".*(what('s| is)? (my )?(plan|schedule)|what do i have|my day).*")) {
                return intent("plan_query", l, null);
            }

            // گزارش مالی
            if (fa && t.matches(".*(گزارش مالی|چقدر خرج|جمع هزینه|جمع درآمد|موجودی|خرج کردم).*")) {
                return intent("finance_report", l, null);
            }
            if (!fa && t.matches(".*(financial report|finance report|how much.*(spend|spent|earned)|balance).*")) {
                return intent("finance_report", l, null);
            }

            // تاریخ/تقویم
            if (fa && t.matches(".*(تاریخ|چندمه|چه روزی|تقویم).*(امروز|بیم)?|امروز.*(چندمه|چندم|چه روزی).*")) {
                return intent("date_query", l, null);
            }
            if (!fa && t.matches(".*(what('s| is)? (the )?date|today'?s date|calendar).*")) {
                return intent("date_query", l, null);
            }

            // ثبت درآمد/هزینه — شامل عدد (V1 بند ۳: هزار/میلیون ضرب می‌شوند)
            Long amount = firstAmount(t);
            if (fa && t.matches(".*(درآمد|فروخت|فروش|دریافت|پول گرفتن?).*") && amount != null) {
                return new JSONObject().put("action", "add_income").put("amount", amount)
                        .put("title", noteAfter(t, "fa")).put("lang", l);
            }
            if (fa && t.matches(".*(هزینه|خرج|پرداخت|خرید).*") && amount != null) {
                return new JSONObject().put("action", "add_expense").put("amount", amount)
                        .put("title", noteAfter(t, "fa")).put("lang", l);
            }
            if (!fa && amount != null && t.matches(".*(income|earned|received|sold).*")) {
                return new JSONObject().put("action", "add_income").put("amount", amount)
                        .put("title", noteAfter(t, "en")).put("lang", l);
            }
            if (!fa && amount != null && t.matches(".*(expense|spent|paid|bought).*")) {
                return new JSONObject().put("action", "add_expense").put("amount", amount)
                        .put("title", noteAfter(t, "en")).put("lang", l);
            }

            // یادآور
            if (fa && t.matches(".*(یادم بیار|یادم بنداز|یادم بذار|یادآور).*(که)?\\s*.*")) {
                String title = t.replaceFirst(".*(یادم بیار|یادم بنداز|یادم بذار|یادآور)\\s*(کن\\s*)?(که\\s*)?", "").trim();
                return new JSONObject().put("action", "add_reminder").put("title", cleanTitle(title, "fa")).put("lang", l);
            }
            if (!fa && t.matches(".*remind me.*")) {
                String title = t.replaceFirst(".*remind me (to |about |that )?", "").trim();
                return new JSONObject().put("action", "add_reminder").put("title", cleanTitle(title, "en")).put("lang", l);
            }

            // وظیفه — آخرین، چون «اضافه» واژهٔ مشترک است
            String prio = priorityOf(t, fa);
            if (fa && t.matches(".*(وظیفه|کار)\\s*(اضافه|جدید|ساخت|ایجاد|ثبت|کن).*|اضافه کن.*وظیفه.*|یادداشت کن.*")) {
                String title = t.replaceFirst("^(یک\\s+)?(وظیفه|کار)\\s*(جدید\\s*)?(اضافه\\s*)?(کن\\s*)?(به\\s*نام\\s*)?", "")
                                .replaceFirst("^اضافه کن\\s*(یک\\s*)?(وظیفه|کار)\\s*", "")
                                .replaceFirst("^یادداشت کن\\s*", "")
                                .replaceFirst("(با|با اولویت)\\s*(اولویت\\s*)?(زیاد|بالا|متوسط|کم)\\s*$", "").trim();
                return new JSONObject().put("action", "add_task").put("title", cleanTitle(title, "fa"))
                        .put("priority", prio).put("lang", l);
            }
            if (!fa && t.matches(".*(add|create|new|make)\\s+(a\\s+)?task.*|^task:\\s*.*")) {
                String title = t.replaceFirst("^task:\\s*", "")
                                .replaceFirst(".*(add|create|new|make)\\s+(a\\s+)?task(\\s+(called|named|to))?\\s*", "").trim();
                return new JSONObject().put("action", "add_task").put("title", cleanTitle(title, "en"))
                        .put("priority", prio).put("lang", l);
            }

            return intent("unknown", l, null);
        } catch (Exception e) {
            return intent("unknown", l, null);
        }
    }

    // ── کمکی‌ها ──

    private static boolean containsFa(String t) {
        for (char c : t.toCharArray()) if (c >= '\u0600' && c <= '\u06FF') return true;
        return false;
    }

    private static String priorityOf(String t, boolean fa) {
        if (fa) {
            if (t.matches(".*(ضروری|فوری|مهم|اولویت زیاد|اولویت بالا).*")) return "high";
            if (t.matches(".*(اولویت کم|کم اهمیت).*")) return "low";
            if (t.matches(".*(اولویت متوسط|معمولی).*")) return "med";
            return "";
        }
        if (t.matches(".*(urgent|important|high priority).*")) return "high";
        if (t.matches(".*(low priority|minor).*")) return "low";
        if (t.matches(".*(medium priority|normal).*")) return "med";
        return "";
    }

    /**
     * اولین مبلغ — V1 بند ۳ (مبلغ و واحد پول): «۱۵۰ هزار تومان» = ۱۵۰٬۰۰۰؛
     * «۲ میلیون» = ۲٬۰۰۰٬۰۰۰. ضریب پس از عدد (هزار/میلیون/thousand/million)
     * اعمال می‌شود؛ بدون ضریب همان عدد.
     */
    static Long firstAmount(String t) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{1,12})\\s*(میلیون|هزار|million|thousand)?").matcher(t);
        if (!m.find()) return null;
        long v = Long.parseLong(m.group(1));
        String unit = m.group(2);
        if (unit == null) return v;
        if (unit.equals("میلیون") || unit.equals("million")) v *= 1_000_000L;
        else if (unit.equals("هزار") || unit.equals("thousand")) v *= 1_000L;
        return v;
    }

    /** توضیح پس از مبلغ — از اولین عدد به بعد حذف و کلمات ربط پاک می‌شود */
    private static String noteAfter(String t, String lang) {
        String s = t.replaceFirst("\\s*\\d{1,12}.*$", "").trim();
        return cleanTitle(s, lang);
    }

    private static String cleanTitle(String title, String lang) {
        String s = normalize(title);
        if ("fa".equals(lang)) {
            s = s.replaceAll("^(که|رو|را|با عنوان|یک)\\s+", "")
                 .replaceAll("\\s*(را|رو|برام|برای من)$", "")
                 .replaceAll("^(وظیفه|یادآور|یادم)\\s+(که\\s+)?", "").trim();
        } else {
            s = s.replaceAll("^(that |to |a |an |the )\\s*", "")
                 .replaceAll("\\s*(please|for me)$", "").trim();
        }
        if (s.length() > 120) s = s.substring(0, 120);
        return s;
    }

    private static JSONObject intentFa(String action, String t, String lang) {
        String title = t.replaceFirst(".*(حذف کن|پاک کن)\\s*", "")
                        .replaceFirst("^(وظیفه|کار|یادآور)\\s*", "")
                        .replaceAll("^(را|رو)\\s*", "").trim();
        try {
            return new JSONObject().put("action", action).put("title", cleanTitle(title, lang)).put("lang", lang);
        } catch (Exception e) {
            return intent(action, lang, null);
        }
    }

    private static JSONObject intent(String action, String lang, String title) {
        try {
            JSONObject o = new JSONObject().put("action", action).put("lang", lang);
            if (title != null) o.put("title", title);
            return o;
        } catch (Exception e) {
            return new JSONObject();
        }
    }
}
