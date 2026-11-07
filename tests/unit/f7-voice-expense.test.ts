// ─── آزمون‌های F7 — مسیر مالیِ فرمان گفتاری (ایجنت ۲/۳) ──────────
// رگرسیون یافتهٔ F6: «هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن» هرگز نباید Task بسازد.
import { describe, expect, test } from 'bun:test'
import { detectIntent } from '../../src/lib/assistant/router'
import {
  parseExpensePhrase,
  parseFaAmount,
  normalizeDigits,
  formatAmount,
} from '../../src/lib/assistant/expense'
import { AssistantActionSchema } from '../../src/lib/ai/action-schema'

describe('F7 — رگرسیون intent-routing مالی (یافتهٔ F6)', () => {
  test('«هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن» → add_expense (نه add_task)', () => {
    const intent = detectIntent('هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن')
    expect(intent.kind).toBe('add_expense')
    if (intent.kind === 'add_expense') {
      expect(intent.parsed.dir).toBe('expense')
      expect(intent.parsed.amount).toBe(700000)
    }
  })
  test('«یک کار جدید برای خرید نان بساز» → add_task (بدون مبلغ، قاپیده نمی‌شود)', () => {
    expect(detectIntent('یک کار جدید برای خرید نان بساز').kind).toBe('add_task')
  })
  test('«مخارج این هفته را جمع کن و گزارش بده» → finance_report (گارد تجمیعی)', () => {
    expect(detectIntent('مخارج این هفته را جمع کن و گزارش بده').kind).toBe('finance_report')
  })
  test('«درآمد ۲ میلیون تومان ثبت کن» → add_expense income', () => {
    const intent = detectIntent('درآمد ۲ میلیون تومان ثبت کن')
    expect(intent.kind).toBe('add_expense')
    if (intent.kind === 'add_expense') {
      expect(intent.parsed.dir).toBe('income')
      expect(intent.parsed.amount).toBe(2000000)
    }
  })
  test('انگلیسی: "record an expense of 5000 toman for groceries" → add_expense', () => {
    const intent = detectIntent('record an expense of 5000 toman for groceries')
    expect(intent.kind).toBe('add_expense')
    if (intent.kind === 'add_expense') expect(intent.parsed.amount).toBe(5000)
  })
  test('یادآوری زمان‌دار مسیر خودش را دارد (بدون اسم پولی قاپیده نمی‌شود)', () => {
    expect(detectIntent('برای فردا ساعت ۹ یادآوری بگذار').kind).not.toBe('add_expense')
  })
  test('«بذار فردا ساعت ۹ به خرید بروم» → add_task (عدد بی‌واحد مبلغ نیست)', () => {
    expect(detectIntent('بذار فردا ساعت ۹ به خرید بروم').kind).toBe('add_task')
  })
  test('«یک کار جدید برای خرید نان با قیمت ۵۰۰ تومان بساز» → add_task (ثبت کار مقدم است)', () => {
    expect(detectIntent('یک کار جدید برای خرید نان با قیمت ۵۰۰ تومان بساز').kind).toBe('add_task')
  })
})

describe('F7 — پارسر مبلغ فارسی/انگلیسی', () => {
  test('ارقام فارسی ساده', () => {
    expect(parseFaAmount('هزینه ۱۲۰ تومان')).toBe(120)
    expect(parseFaAmount('۷۰۰ هزار تومان')).toBe(700000)
    expect(parseFaAmount('۲ میلیون')).toBe(2000000)
    expect(parseFaAmount('۱٫۵ ندارد جداکننده اعشار ساده — 1500 تومان')).toBe(1500)
  })
  test('ریال → تومان (قرارداد ÷۱۰ پروژه)', () => {
    expect(parseFaAmount('هزینه ۱۰۰۰ ریال')).toBe(100)
  })
  test('عدد صریح پولی مقدم بر عدد بی‌واحد است (ساعت ۹ قاپیده نمی‌شود)', () => {
    expect(parseFaAmount('هزینه خرید ۳۰۰۰ تومانی ساعت ۹')).toBe(3000)
  })
  test('بدون عدد → null', () => {
    expect(parseFaAmount('هزینه خرید')).toBeNull()
  })
  test('normalizeDigits فارسی/عربی', () => {
    expect(normalizeDigits('۱۲٣')).toBe('123')
  })
  test('formatAmount جداکنندهٔ هزارگان', () => {
    expect(formatAmount(700000)).toBe('700,000')
  })
  test('جملهٔ بدون اسم پولی یا با واژهٔ تجمیعی → null', () => {
    expect(parseExpensePhrase('فردا ساعت ۹ قرار دارم')).toBeNull()
    expect(parseExpensePhrase('مخارج این هفته را جمع کن')).toBeNull()
    expect(parseExpensePhrase('هزینه‌های ماه را گزارش بده')).toBeNull()
  })
})

describe('F7 — اسکیمای اکشن add_expense (مسیر مدل)', () => {
  test('پیشنهاد معتبر پذیرفته می‌شود', () => {
    const r = AssistantActionSchema.safeParse({ type: 'add_expense', dir: 'expense', amount: 700000, note: 'خرید' })
    expect(r.success).toBe(true)
  })
  test('مبلغ صفر/منفی رد می‌شود', () => {
    expect(AssistantActionSchema.safeParse({ type: 'add_expense', dir: 'expense', amount: 0 }).success).toBe(false)
    expect(AssistantActionSchema.safeParse({ type: 'add_expense', dir: 'expense', amount: -5 }).success).toBe(false)
  })
})
