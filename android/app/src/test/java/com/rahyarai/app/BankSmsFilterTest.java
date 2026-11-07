package com.rahyarai.app;

import static org.junit.Assert.*;

import org.junit.Test;

/**
 * F5-مأموریت ۷ — تست واحد فیلتر پیامک بانکی (خالص JVM).
 * سناریوهای واقعی بانکی + پیامک‌های شخصی/غیرمالی که نباید پردازش شوند.
 */
public class BankSmsFilterTest {

    // ── کاندیدهای واقعی بانکی ──

    @Test public void deposit_from_bank_service_code() {
        String s = "500012", b = "واریز به کارت ۶۰۳۷••۱۲۳۴ مبلغ 3,500,000 ریال از خانم الف — بانک ملت";
        assertTrue(BankSmsFilter.isCandidate(s, b));
        BankSmsFilter.Parsed p = BankSmsFilter.parse(b);
        assertEquals(3500000L, p.amount);
        assertEquals("income", p.type);
        assertEquals("ملت", p.bank);
    }

    @Test public void purchase_toman() {
        String s = "98300077", b = "برداشت ۲۵۰٫۰۰۰ تومان فروشگاه اینترنتی — بانک ملی";
        assertTrue(BankSmsFilter.isCandidate(s, b));
        BankSmsFilter.Parsed p = BankSmsFilter.parse(b);
        // 250,000 تومان = 2,500,000 ریال
        assertEquals(2500000L, p.amount);
        assertEquals("expense", p.type);
        assertEquals("ملی", p.bank);
    }

    @Test public void english_sms_with_date() {
        String s = "BANK-SMS", b = "Withdrawal 50000.00 IRR at ATM — 2026/11/06 Acct *1234";
        assertTrue(BankSmsFilter.isCandidate(s, b));
        BankSmsFilter.Parsed p = BankSmsFilter.parse(b);
        assertEquals(50000L, p.amount);
        assertEquals("expense", p.type);
        assertEquals("2026/11/06", p.date);
    }

    @Test public void persian_digits_normalized() {
        BankSmsFilter.Parsed p = BankSmsFilter.parse("واریز ۱٬۵۰۰ ریال");
        assertTrue(p.amount >= 0);
    }

    // ── نباید پردازش شوند: حریم خصوصی ──

    @Test public void personal_mobile_sender_never_candidate() {
        String b = "واریز 5,000,000 ریال از آقای ب";
        assertTrue(BankSmsFilter.isPersonalMobileSender("+989121234567"));
        assertTrue(BankSmsFilter.isPersonalMobileSender("09121234567"));
        assertFalse(BankSmsFilter.isCandidate("+989121234567", b));
        assertFalse(BankSmsFilter.isCandidate("09121234567", b));
    }

    @Test public void friendly_sms_from_contact() {
        // شمارهٔ بلند معمولی (نه کد سرویس) — حتی با متن حاوی عدد، مالی نیست
        assertFalse(BankSmsFilter.isCandidate("+989125555555", "سلام، فردا می‌بینیم"));
    }

    @Test public void otp_sms_not_financial() {
        String s = "100080", b = "کد تأیید شما: 48321";
        assertFalse(BankSmsFilter.isCandidate(s, b));
    }

    @Test public void bank_sender_without_amount_not_candidate() {
        String s = "300012", b = "بانک ملت: موجودی کارت به‌روزرسانی شد";
        assertFalse(BankSmsFilter.isCandidate(s, b));
    }

    @Test public void service_sender_without_financial_body_not_candidate() {
        String s = "50001", b = "سفارش شما ارسال شد";
        assertFalse(BankSmsFilter.isCandidate(s, b));
    }

    // ── جزئیات پارسر ──

    @Test public void amount_without_unit_is_ignored() {
        assertEquals(-1L, BankSmsFilter.parse("مبلغ 12345 بدون واحد").amount);
    }

    @Test public void service_like_senders() {
        assertTrue(BankSmsFilter.isServiceLikeSender("500012"));
        assertTrue(BankSmsFilter.isServiceLikeSender("9830005"));
        assertTrue(BankSmsFilter.isServiceLikeSender("BANK-SMS"));
        assertFalse(BankSmsFilter.isServiceLikeSender("+989121234567"));
        assertFalse(BankSmsFilter.isServiceLikeSender(null));
    }
}
