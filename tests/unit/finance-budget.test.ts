// ─── آزمون‌های بودجه مالی + موتور قواعد محلی (نسخه ۱٫۰) ────────
import { describe, expect, test } from 'bun:test'
import {
  budgetStatuses,
  budgetTotals,
  monthKeyOf,
  isBudgetCategory,
} from '../../src/lib/finance/budget'
import { localRulesReply, detectLangFromText } from '../../src/lib/ai/providers/local-rules'
import { AI_ENGINE_IDS, isAiEngineId } from '../../src/lib/ai/providers/types'

// ── بودجه ───────────────────────────────────────────────────
describe('بودجه مالی', () => {
  const budgets = [
    { category: 'food', monthlyLimit: 2_000_000 },
    { category: 'transport', monthlyLimit: 500_000 },
  ]

  const txs = [
    { type: 'expense', category: 'food', amount: 800_000, occurredAt: '2026-02-10T12:00:00.000Z' },
    { type: 'expense', category: 'food', amount: 900_000, occurredAt: '2026-02-15T12:00:00.000Z' },
    { type: 'expense', category: 'transport', amount: 460_000, occurredAt: '2026-02-11T12:00:00.000Z' },
    { type: 'expense', category: 'bills', amount: 300_000, occurredAt: '2026-02-12T12:00:00.000Z' }, // بدون بودجه
    { type: 'income', category: 'salary', amount: 9_000_000, occurredAt: '2026-02-01T12:00:00.000Z' }, // درآمد — بی‌تأثیر
    { type: 'expense', category: 'food', amount: 999_999, occurredAt: '2026-01-31T12:00:00.000Z' }, // ماه قبل — بی‌تأثیر
  ]

  test('مصرف هر دسته فقط از هزینه‌های همان ماه شمرده شود', () => {
    const st = budgetStatuses(budgets, txs, '2026-02')
    const food = st.find((s) => s.category === 'food')!
    expect(food.spent).toBe(1_700_000)
    expect(food.remaining).toBe(300_000)
    expect(food.over).toBe(false)
    expect(food.warn).toBe(true) // ۸۵٪ مصرف
  })

  test('عبور از سقف پرچم over می‌زند', () => {
    const st = budgetStatuses(budgets, [...txs, { type: 'expense', category: 'transport', amount: 100_000, occurredAt: '2026-02-20T12:00:00.000Z' }], '2026-02')
    const tr = st.find((s) => s.category === 'transport')!
    expect(tr.spent).toBe(560_000)
    expect(tr.over).toBe(true)
  })

  test('دسته بدون تراکنش صفر است و درآمد/انتقال بی‌تأثیر', () => {
    const st = budgetStatuses([{ category: 'shopping', monthlyLimit: 100_000 }], txs, '2026-02')
    expect(st[0].spent).toBe(0)
    expect(st[0].ratio).toBe(0)
    expect(st[0].warn).toBe(false)
  })

  test('بودجه با دسته نامعتبر یا سقف غیرمثبت نادیده گرفته می‌شود', () => {
    const st = budgetStatuses(
      [
        { category: 'salary', monthlyLimit: 5 }, // دسته درآمدی — نامعتبر
        { category: 'food', monthlyLimit: 0 }, // سقف صفر
        { category: 'food', monthlyLimit: -5 }, // منفی
      ] as never,
      txs,
      '2026-02',
    )
    expect(st.length).toBe(0)
  })

  test('جمع کل و شمار عبور', () => {
    const st = budgetStatuses(budgets, txs, '2026-02')
    const tot = budgetTotals(st)
    expect(tot.totalLimit).toBe(2_500_000)
    expect(tot.totalSpent).toBe(2_160_000)
    expect(tot.overCount).toBe(0)
  })

  test('monthKeyOf از رشته و تاریخ (مبنای تهران — GRAND-F6)', () => {
    expect(monthKeyOf('2026-02-10T12:00:00.000Z')).toBe('2026-02')
    // ۳۱ دسامبر ۲۳:۵۹ UTC = ۱ ژانویه ۰۳:۲۹ تهران → ماه تهران
    expect(monthKeyOf(new Date('2026-12-31T23:59:59.000Z'))).toBe('2027-01')
    // مرز دقیق: ۲۰:۳۰ UTC روز آخر ماه = نیم‌شب تهران ماه بعد
    expect(monthKeyOf(new Date('2026-09-30T20:29:59.000Z'))).toBe('2026-09')
    expect(monthKeyOf(new Date('2026-09-30T20:30:00.000Z'))).toBe('2026-10')
  })

  test('tehranMonthRange — مرز ماه مالی یکدست تهران (GRAND-F6)', async () => {
    const { tehranMonthRange } = await import('@/lib/persian-date')
    const r = tehranMonthRange('2026-10')
    expect(r).not.toBeNull()
    expect(r!.start.toISOString()).toBe('2026-09-30T20:30:00.000Z')
    expect(r!.end.toISOString()).toBe('2026-10-31T20:30:00.000Z')
    // ورودی نامعتبر
    expect(tehranMonthRange('2026-13')).toBeNull()
    expect(tehranMonthRange('garbage')).toBeNull()
  })

  test('فقط دسته‌های هزینه بودجه‌پذیرند', () => {
    expect(isBudgetCategory('food')).toBe(true)
    expect(isBudgetCategory('salary')).toBe(false)
    expect(isBudgetCategory('unknown-x')).toBe(false)
  })
})

// ── موتور قواعد محلی ────────────────────────────────────────
describe('موتور قواعد محلی (AIProvider)', () => {
  test('زبان از نویسه‌های پیام تشخیص داده می‌شود', () => {
    expect(detectLangFromText('سلام رهیار')).toBe('fa')
    expect(detectLangFromText('hello there')).toBe('en')
  })

  test('پاسخ سلام دوزبانه و قطعی است', () => {
    const fa = localRulesReply('سلام')
    const en = localRulesReply('Hello!')
    expect(fa).toContain('رهیار')
    expect(en).toContain('Rahyar')
  })

  test('ساعت از دستگاه — قطعی و بدون مدل', () => {
    const r = localRulesReply('ساعت چنده؟')
    expect(r).toMatch(/\d{2}:\d{2}/)
  })

  test('پاسخ پیش‌فرض راهنمای شفاف موتور محلی است', () => {
    expect(localRulesReply('یک شعر بگو')).toContain('قواعد محلی')
    expect(localRulesReply('tell me a story')).toContain('Local Rules')
  })

  test('شناسه‌های موتور — سه Provider فعال (v2.0: مدل میزبان افزوده شد)', () => {
    expect(AI_ENGINE_IDS).toEqual(['local_rules', 'openai_compatible', 'zai'])
    expect(isAiEngineId('local_rules')).toBe(true)
    expect(isAiEngineId('openai_compatible')).toBe(true)
    expect(isAiEngineId('zai')).toBe(true)
    expect(isAiEngineId('builtin')).toBe(false)
  })
})
