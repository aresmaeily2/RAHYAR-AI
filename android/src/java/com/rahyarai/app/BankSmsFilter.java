package com.rahyarai.app;

/**
 * F5-مأموریت ۷ — فیلتر پیامک بانکی (خالص، JVM-پذیر، بدون وابستگی اندروید).
 *
 * سیاست حریم خصوصی (سخت‌گیرانه):
 *  - فقط پیامکی که «فرستندهٔ سرویس‌مانند» و «متن مالی» هر دو را داشته باشد
 *    کاندید پردازش است؛ پیامک شخصی/عادی هرگز وارد صف نمی‌شود و هرگز به
 *    سرور ارسال نمی‌شود.
 *  - شمارهٔ موبایل شخصی (09xxxxxxxxx / +98 9xxxxxxxxx) همیشه غیرمالی است.
 *  - تشخیص «بانک» واقعیِ قطعی بدون فهرست رسمی ممکن نیست؛ این فیلتر
 *    «کاندید» پیدا می‌کند و ثبت نهایی فقط پس از پیش‌نمایش و تأیید کاربر
 *    در اپ/سرور انجام می‌شود (ضدتکرار سمت سرور با هش پیامک).
 */
public final class BankSmsFilter {

    private BankSmsFilter() {}

    public static class Parsed {
        public final long amount;      // -1 = مبلغ تشخیص داده نشد
        public final String type;      // income | expense | null
        public final String date;      // رشتهٔ تاریخ یافت‌شده یا null
        public final String bank;      // نام بانک یافت‌شده یا null
        Parsed(long amount, String type, String date, String bank) {
            this.amount = amount; this.type = type; this.date = date; this.bank = bank;
        }
    }

    /** شمارهٔ موبایل شخصی؟ (09… یا +989…) — همیشه کنار گذاشته می‌شود */
    public static boolean isPersonalMobileSender(String sender) {
        if (sender == null) return false;
        String s = sender.trim().replace(" ", "");
        if (s.startsWith("+")) s = s.substring(1);
        if (s.startsWith("0098")) s = s.substring(4);
        if (s.startsWith("98") && s.length() == 12) s = s.substring(2);
        return s.matches("09\\d{9}");
    }

    /**
     * فرستندهٔ سرویس‌مانند؟ — عدد کوتاه (کد پیامکی بانک‌ها/سرویس‌ها مثل 50001،
     * 300012، 9830005…) یا نام کوتاه حرفی. شمارهٔ بلند شخصی/معمولی نیست.
     */
    public static boolean isServiceLikeSender(String sender) {
        if (sender == null) return false;
        String s = sender.trim();
        if (s.startsWith("+")) s = s.substring(1);
        if (s.startsWith("0098")) s = s.substring(4);
        if (s.isEmpty()) return false;
        if (s.matches("\\d{1,10}") && !s.matches("0\\d{10}")) return true; // کد عددی کوتاه
        // نام حرفی کوتاه (مثل BANK-SMS) — بدون @ و بدون شمارهٔ بلند
        return s.matches("[A-Za-z\\-]{2,12}") && !s.contains("@");
    }

    /** متن، نشانهٔ مالی دارد؟ (واریز/برداشت/خرید/موجودی/… با مبلغ و واحد پول) */
    public static boolean isFinancialBody(String body) {
        return parse(body).type != null && parse(body).amount > 0;
    }

    /** کاندید پردازش؟ فرستندهٔ سرویس‌مانند + متن مالی — نه شخصی، نه عادی */
    public static boolean isCandidate(String sender, String body) {
        if (isPersonalMobileSender(sender)) return false;
        if (!isServiceLikeSender(sender)) return false;
        return isFinancialBody(body);
    }

    /** کلیدواژهٔ بانک‌های شناخته‌شده برای نمایش نام (تشخیص قطعی بانک نیست) */
    private static final String[] BANKS = {
        "ملی", "ملت", "صادرات", "سپه", "تجارت", "پاسارگاد", "کشاورزی", "اقتصاد",
        "رسالت", "انصار", "سامان", "پارسیان", "کارآفرین", "آینده", "دی", "گردشگری",
        "CityBank", "Chase", "HSBC", "Barclays", "Wells Fargo", "Revolut", "Monzo",
    };

    private static String findBank(String body) {
        for (String b : BANKS) if (body.contains(b)) return b;
        return null;
    }

    /**
     * تحلیل متن پیامک — مبلغ (با حذف جداکننده‌ها)، نوع و تاریخ.
     * پشتیبانی از ارقام فارسی/عربی هم انجام می‌شود (۰-۹ / ٠-٩).
     */
    public static Parsed parse(String body) {
        if (body == null || body.isEmpty()) return new Parsed(-1, null, null, null);
        String s = normalizeDigits(body);

        long amount = -1;
        // جداکننده‌های هزارگان: کاما لاتین، ٬ (عربی) و ٫ (کاربرد غیررسمی فارسی)؛
        // بخش اعشاری اختیاری [.٫] — مثل "3,500,000 ریال"، "۲۵۰٫۰۰۰ تومان"، "50000.00 IRR"
        java.util.regex.Matcher m = java.util.regex.Pattern
            .compile("(\\d{1,3}(?:[,٬٫]\\d{3})+|\\d{4,15})(?:[٫.]\\d{1,3})?\\s*(ریال|تومان|rial|toman|IRR|IRT)",
                    java.util.regex.Pattern.CASE_INSENSITIVE)
            .matcher(s);
        if (m.find()) {
            String num = m.group(1).replaceAll("[,٬٫. ]", "");
            try {
                long v = Long.parseLong(num);
                String unit = m.group(2).toLowerCase(java.util.Locale.ROOT);
                // تومان → ریال (×۱۰) برای مقایسهٔ یکدست با ثبت دستی کاربر
                if (unit.contains("toman") || unit.contains("تومان")) v *= 10;
                amount = v;
            } catch (NumberFormatException ignored) { }
        }

        String type = null;
        if (java.util.regex.Pattern.compile("واریز|افزایش موجودی|دریافت|deposit|credit|received",
                java.util.regex.Pattern.CASE_INSENSITIVE).matcher(s).find()) {
            type = "income";
        }
        if (java.util.regex.Pattern.compile("برداشت|خرید|پرداخت|کسر|کارت به کارت از|انتقال از|withdraw|purchase|payment|debit",
                java.util.regex.Pattern.CASE_INSENSITIVE).matcher(s).find()) {
            type = "expense";
        }

        String date = null;
        java.util.regex.Matcher dm = java.util.regex.Pattern
            .compile("\\d{2,4}[/.-]\\d{1,2}[/.-]\\d{1,2}").matcher(s)
            ;
        if (dm.find()) date = dm.group();

        return new Parsed(amount, type, date, findBank(body));
    }

    /** یکسان‌سازی ارقام فارسی/عربی به لاتین */
    static String normalizeDigits(String s) {
        StringBuilder b = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            if (c >= '۰' && c <= '۹') b.append((char) ('0' + (c - '۰')));
            else if (c >= '٠' && c <= '٩') b.append((char) ('0' + (c - '٠')));
            else b.append(c);
        }
        return b.toString();
    }
}
