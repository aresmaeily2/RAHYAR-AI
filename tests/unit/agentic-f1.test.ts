// ─── F-AG1/F-AG2 — آزمون قابلیت‌های عامل جدید مأموریت نهایی ──────
// پوشش: خلاصهٔ مالی دوره‌ای (تهران/شنبه‌محور)، پیش‌نویس پیام بدون ارسال،
// یادآور متصل به سررسید کار، روتر نیت مالی — همهٔ قواعد بحرانی مأموریت.
import { describe, expect, test } from 'bun:test'
import { AssistantActionSchema, validateChatActions } from '@/lib/ai/action-schema'
import {
  aggregateSummary,
  displayAmount,
  financeRangeBounds,
  formatFinanceSummary,
  reminderAtFromDue,
} from '@/lib/finance/summary'
import { detectIntent, extractFinanceRange } from '@/lib/assistant/router'
import { replyFinanceSummary } from '@/lib/assistant/replies'

describe('financeRangeBounds — مرزهای دوره به وقت تهران', () => {
  test('امروز از نیمه‌شب تهران آغاز می‌شود', () => {
    const { start, end } = financeRangeBounds('today', new Date('2026-11-02T08:00:00Z'))
    // نیمه‌شب تهران = 20:30Z روز قبل
    expect(start.toISOString()).toBe('2026-11-01T20:30:00.000Z')
    expect(end.getTime()).toBeGreaterThanOrEqual(start.getTime())
  })
  test('هفته از شنبه آغاز می‌شود (هفتهٔ رسمی ایران)', () => {
    // 2026-11-02 دوشنبه تهران است → شنبه = 2026-10-31؛ نیمه‌شب تهران شنبه = 2026-10-30T20:30Z
    const { start } = financeRangeBounds('week', new Date('2026-11-02T08:00:00Z'))
    expect(start.toISOString()).toBe('2026-10-30T20:30:00.000Z')
  })
  test('ماه از آغاز ماه تهران آغاز می‌شود', () => {
    const { start } = financeRangeBounds('month', new Date('2026-11-02T08:00:00Z'))
    expect(start.getTime()).toBeLessThanOrEqual(new Date('2026-11-02T08:00:00Z').getTime())
    expect(start.toISOString()).toBe(financeRangeBounds('today', start).start.toISOString())
  })
})

describe('aggregateSummary — تجمیع خالص', () => {
  test('هزینه/درآمد/خالص و برترین دسته‌ها؛ انتقال حذف می‌شود', () => {
    const agg = aggregateSummary([
      { type: 'expense', amount: 500_000, category: 'food' },
      { type: 'expense', amount: 300_000, category: 'transport' },
      { type: 'expense', amount: 200_000, category: 'food' },
      { type: 'income', amount: 10_000_000, category: 'salary' },
      { type: 'transfer', amount: 999_999, category: 'other' },
    ])
    expect(agg.expense).toBe(1_000_000)
    expect(agg.income).toBe(10_000_000)
    expect(agg.net).toBe(9_000_000)
    expect(agg.count).toBe(4) // انتقال شمرده نمی‌شود
    expect(agg.topCats[0]).toEqual({ category: 'food', total: 700_000 })
  })
  test('بدون تراکنش — صفرهای تمیز', () => {
    const agg = aggregateSummary([])
    expect(agg.expense).toBe(0)
    expect(agg.count).toBe(0)
    expect(agg.topCats).toHaveLength(0)
  })
})

describe('displayAmount — درستی تومان/ریال (B-2)', () => {
  test('تومان = ریال تقسیم بر ۱۰', () => {
    expect(displayAmount(1_500_000, 'toman')).toBe(150_000)
    expect(displayAmount(1_500_000, 'irr')).toBe(1_500_000)
  })
})

describe('formatFinanceSummary — متن دوزبانه با اعداد', () => {
  const agg = aggregateSummary([{ type: 'expense', amount: 1_500_000, category: 'food' }])
  test('فارسی شامل تومان و رقم فارسی است', () => {
    const s = formatFinanceSummary('fa', 'week', agg, 'toman')
    expect(s).toContain('این هفته')
    expect(s).toContain('تومان')
    expect(s).toContain('۱۵۰,۰۰۰')
  })
  test('انگلیسی LTR درست', () => {
    const s = formatFinanceSummary('en', 'week', agg, 'toman')
    expect(s).toContain('150,000')
    expect(s).toContain('toman')
  })
  test('هفتهٔ خالی — پیام صادقانه', () => {
    const s = formatFinanceSummary('fa', 'week', aggregateSummary([]), 'irr')
    expect(s).toContain('هزینه‌ای ثبت نشده')
  })
})

describe('replyFinanceSummary — پاسخ قطعی چت', () => {
  test('اعداد واقعی در پاسخ فارسی', () => {
    const s = replyFinanceSummary('fa', {
      range: 'week', expense: 2_000_000, income: 0, count: 2, topCats: [{ category: 'food', total: 1_200_000 }], currency: 'toman',
    })
    expect(s).toContain('۲۰۰,۰۰۰')
    expect(s).toContain('خوراک')
  })
})

describe('router — نیت مالی قطعی', () => {
  test('سناریوی مأموریت: «مخارج این هفته را جمع کن و گزارش بده» ← finance_report/week', () => {
    const i = detectIntent('مخارج این هفته را جمع کن و گزارش بده')
    expect(i.kind).toBe('finance_report')
    if (i.kind === 'finance_report') expect(i.range).toBe('week')
  })
  test('«گزارش مالی این ماه» ← month', () => {
    const i = detectIntent('گزارش مالی این ماه')
    expect(i.kind).toBe('finance_report')
    if (i.kind === 'finance_report') expect(i.range).toBe('month')
  })
  test('«مخارج امروز» ← today', () => {
    expect(extractFinanceRange('مخارج امروز چقدر شد؟')).toBe('today')
  })
  test('گارد ابهام: جمع مخارج + فعل ثبت ← مسیر مدل', () => {
    expect(detectIntent('مخارج این هفته را جمع کن و ثبت کن').kind).toBe('model')
  })
  test('گزارش روزانه همچنان کار می‌کند (بدون تداخل)', () => {
    expect(detectIntent('گزارش امروز چی شد؟').kind).toBe('daily_report')
  })
})

describe('اسکیمای اکشن‌های جدید', () => {
  test('finance_summary معتبر', () => {
    expect(AssistantActionSchema.safeParse({ type: 'finance_summary', range: 'week' }).success).toBe(true)
  })
  test('finance_summary با محدودهٔ نامعتبر رد می‌شود', () => {
    expect(AssistantActionSchema.safeParse({ type: 'finance_summary', range: 'year' }).success).toBe(false)
  })
  test('draft_message معتبر — بدون recipient', () => {
    const r = AssistantActionSchema.safeParse({ type: 'draft_message', body: 'سلام، فردا می‌رسیم.' })
    expect(r.success).toBe(true)
  })
  test('draft_message بدون body رد می‌شود', () => {
    expect(AssistantActionSchema.safeParse({ type: 'draft_message', recipient: 'علی' }).success).toBe(false)
  })
  test('draft_message با کانال نامعتبر رد می‌شود', () => {
    expect(AssistantActionSchema.safeParse({ type: 'draft_message', body: 'x', channel: 'sms' }).success).toBe(true)
    expect(AssistantActionSchema.safeParse({ type: 'draft_message', body: 'x', channel: 'fax' }).success).toBe(false)
  })
  test('add_task با remindBeforeMin در بازهٔ ۵ تا ۱۴۴۰', () => {
    expect(AssistantActionSchema.safeParse({ type: 'add_task', title: 'قرار', remindBeforeMin: 60 }).success).toBe(true)
    expect(AssistantActionSchema.safeParse({ type: 'add_task', title: 'قرار', remindBeforeMin: 4 }).success).toBe(false)
    expect(AssistantActionSchema.safeParse({ type: 'add_task', title: 'قرار', remindBeforeMin: 1441 }).success).toBe(false)
  })
  test('validateChatActions سقف ۸ اکشن را نگه می‌دارد', () => {
    const raw = Array.from({ length: 12 }, () => ({ type: 'finance_summary', range: 'week' }))
    const v = validateChatActions(raw)
    expect(v.valid).toHaveLength(8)
  })
})

describe('reminderAtFromDue — تبدیل تهران‌محور یادآور متصل', () => {
  test('سررسید ۰۹:۰۰ تهران با یادآوری ۶۰ دقیقه قبل', () => {
    // سه‌شنبه 2026-11-03 09:00 تهران = 05:30Z → یادآوری 04:30Z
    const due = new Date('2026-11-03T12:00:00.000Z')
    const at = reminderAtFromDue(due, '09:00', 60, new Date('2026-11-02T08:00:00Z'))
    expect(at?.toISOString()).toBe('2026-11-03T04:30:00.000Z')
  })
  test('سررسید گذشته ← null (گارد مسیر REST)', () => {
    const due = new Date('2020-01-01T12:00:00.000Z')
    expect(reminderAtFromDue(due, '09:00', 60, new Date('2026-11-02T08:00:00Z'))).toBeNull()
  })
  test('ساعت نامعتبر ← null', () => {
    const due = new Date('2026-11-03T12:00:00.000Z')
    expect(reminderAtFromDue(due, '25:99', 60, new Date('2026-11-02T08:00:00Z'))).toBeNull()
  })
})

// ── F-AG3: گارد مأموریت + نرمال‌سازی زمان یادآور ──
import { parseRemindAtFlexible } from '@/lib/finance/summary'
import { detectMissionPattern } from '@/lib/assistant/router'

describe('parseRemindAtFlexible — تفسیر تهران‌محور', () => {
  test('پسوند Z مدل → تفسیر به وقت تهران (نه UTC)', () => {
    // مدل برای «۹ صبح تهران» 2026-11-03T09:00Z فرستاده → باید 05:30Z شود
    const d = parseRemindAtFlexible('2026-11-03T09:00:00.000Z')
    expect(d?.toISOString()).toBe('2026-11-03T05:30:00.000Z')
  })
  test('برهنه بدون آفست → تهران', () => {
    const d = parseRemindAtFlexible('2026-11-03T09:00')
    expect(d?.toISOString()).toBe('2026-11-03T05:30:00.000Z')
  })
  test('آفست صریح → همان', () => {
    const d = parseRemindAtFlexible('2026-11-03T09:00+03:30')
    expect(d?.toISOString()).toBe('2026-11-03T05:30:00.000Z')
  })
})

describe('detectMissionPattern — الگوهای اثر واقعی الزامی', () => {
  test('سناریوی ۵ مأموریت ← event_reminder', () => {
    expect(detectMissionPattern('قرار فردا را به تقویم اضافه کن و یک ساعت قبل یادآوری کن.')).toBe('event_reminder')
  })
  test('سناریوی ۴ مأموریت ← draft', () => {
    expect(detectMissionPattern('یک پیام آماده کن و قبل از ارسال، متنش را به من نشان بده.')).toBe('draft')
  })
  test('سناریوی ۳ مأموریت ← plan', () => {
    expect(detectMissionPattern('برای فردا سه کار مهم من را برنامه‌ریزی کن.')).toBe('plan')
  })
  test('چت معمولی ← null', () => {
    expect(detectMissionPattern('سلام، حالت چطوره؟')).toBeNull()
    expect(detectMissionPattern('مخارج این هفته را جمع کن و گزارش بده.')).toBeNull()
  })
})
