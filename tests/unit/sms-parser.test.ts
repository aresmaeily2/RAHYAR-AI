// ─── آزمون پارسر پیامک بانکی — رگرسیون B-1/B-2 (مأموریت R2) ──
// B-1: تاریخ میلادی yyyy/mm/dd نباید به ~۱۴ ماه آینده بیفتد
// B-2: «تومان» همسایهٔ همان مبلغ باید ×۱۰ شود حتی وقتی پیامک «ریال» هم دارد
import { describe, test, expect } from 'bun:test'
import { parseSmsText, normalizeDigits, jalaliToGregorian } from '@/lib/sms/parser'

describe('sms parser — normalizeDigits', () => {
  test('Persian/Arabic digits and separators normalize to Latin', () => {
    expect(normalizeDigits('۱٬۲۳۴')).toBe('1,234')
    expect(normalizeDigits('٠٩')).toBe('09')
  })
})

describe('sms parser — B-1 Gregorian dates', () => {
  test('Gregorian yyyy/mm/dd parses as the real date (not ~14 months ahead)', () => {
    const res = parseSmsText(
      ['بانک پارسیان', 'برداشت از کارت 6104********1234', 'مبلغ: 250,000 ریال', '2025/10/01 12:30'].join('\n'),
    )
    expect(res.transactions.length).toBe(1)
    const tx = res.transactions[0]
    expect(tx.type).toBe('expense')
    expect(tx.amount).toBe(250_000)
    expect(tx.cardLast4).toBe('1234')
    expect(tx.occurredAt).not.toBeNull()
    const y = tx.occurredAt!.getFullYear()
    const mo = tx.occurredAt!.getMonth() + 1
    const d = tx.occurredAt!.getDate()
    expect([y, mo, d]).toEqual([2025, 10, 1])
  })

  test('Gregorian dd/mm/yyyy (day-first) also parses correctly', () => {
    const res = parseSmsText('بانک ملت خرید مبلغ 100,000 ریال 01/10/2025 09:15')
    expect(res.transactions.length).toBe(1)
    const tx = res.transactions[0]
    expect([tx.occurredAt!.getFullYear(), tx.occurredAt!.getMonth() + 1, tx.occurredAt!.getDate()]).toEqual([2025, 10, 1])
  })
})

describe('sms parser — B-2 mixed Toman/Rial units', () => {
  test('Toman adjacent to the amount is multiplied by 10 even when balance mentions Rial', () => {
    const res = parseSmsText(
      'بانک سامان برداشت مبلغ 320,000 تومان موجودی 4,500,000 ریال 1404/05/12 10:00',
    )
    expect(res.transactions.length).toBe(1)
    const tx = res.transactions[0]
    expect(tx.type).toBe('expense')
    expect(tx.amount).toBe(3_200_000)
  })

  test('Rial-adjacent amount stays unmultiplied', () => {
    const res = parseSmsText('بانک ملت واریز مبلغ 1,500,000 ریال موجودی 8,250,000 ریال 1404/07/09 14:23')
    expect(res.transactions.length).toBe(1)
    const tx = res.transactions[0]
    expect(tx.type).toBe('income')
    expect(tx.amount).toBe(1_500_000)
    // جلالی 1404/07/09 → 2025-10-01
    const g = jalaliToGregorian(1404, 7, 9)
    expect(tx.occurredAt!.toDateString()).toBe(g.toDateString())
  })
})

describe('sms parser — safety', () => {
  test('Non-bank spam is ignored', () => {
    const res = parseSmsText('جلوهٔ ویژه امروز: تخفیف ۵۰٪ فروشگاه آنلاین\nکد: SALE50')
    expect(res.transactions.length).toBe(0)
    expect(res.ignored).toBeGreaterThan(0)
  })
})
