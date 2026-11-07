// ─── آزمون‌های F7 — PDF فارسی (Gate D) ──────────────────────────
import { describe, expect, test } from 'bun:test'
import { buildFinancePdfFaHtml } from '../../src/lib/finance/pdf-fa'

const accs = [{ name: 'بانک ملت', kind: 'bank', openingAmount: 1000000, currency: 'IRR', balance: 1700000 }]
const txs = [
  { type: 'expense', amount: 700000, category: 'other', note: 'خرید', occurredAt: '2026-11-07T10:00:00.000Z', account: { name: 'بانک ملت' } },
  { type: 'income', amount: 1400000, category: 'other', note: 'حقوق', occurredAt: '2026-11-07T11:00:00.000Z', account: { name: 'بانک ملت' } },
]

describe('F7 — گزارش مالی PDF فارسی راست‌چین', () => {
  test('HTML شامل عنوان فارسی و RTL است', () => {
    const html = buildFinancePdfFaHtml(accs, txs, [], new Date('2026-11-07T12:00:00Z'))
    expect(html).toContain('dir="rtl" lang="fa"')
    expect(html).toContain('رهیار AI — گزارش مالی')
    expect(html).toContain('حساب‌ها و مانده‌ها')
    expect(html).toContain('تراکنش‌ها')
  })
  test('نام حساب و یادداشت فارسی بدون تغییر (بدون «?») در HTML هستند', () => {
    const html = buildFinancePdfFaHtml(accs, txs, [], new Date('2026-11-07T12:00:00Z'))
    expect(html).toContain('بانک ملت')
    expect(html).toContain('خرید')
    expect(html).toContain('حقوق')
    // گارد ضدفتادگی «?» — در خروجی HTML نباید جایگزین فارسی وجود داشته باشد
    expect(html).not.toContain('????')
  })
  test('مبلغ‌ها با جداکنندهٔ فارسی (٬) و جمع کل درست', () => {
    const html = buildFinancePdfFaHtml(accs, txs, [], new Date('2026-11-07T12:00:00Z'))
    expect(html).toContain('1٬400٬000')
    expect(html).toContain('700٬000')
    expect(html).toContain('1٬700٬000') // ماندهٔ حساب
  })
  test('رنگ‌بندی نوع تراکنش: درآمد سبز، هزینه سرخ', () => {
    const html = buildFinancePdfFaHtml(accs, txs, [], new Date('2026-11-07T12:00:00Z'))
    expect(html).toContain('#047857')
    expect(html).toContain('#b91c1c')
  })
  test('ورودی خالی — هیچ استثنایی و حالت خالی صادقانه', () => {
    const html = buildFinancePdfFaHtml([], [], [], new Date('2026-11-07T12:00:00Z'))
    expect(html).toContain('حسابی ثبت نشده است')
    expect(html).toContain('تراکنشی ثبت نشده است')
  })
})
