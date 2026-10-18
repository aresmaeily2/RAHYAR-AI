// ─── آزمون‌های واحد نسخه ۱٫۰ — SMS / مالی / تطبیق / i18n / قواعد ──
// اجرا: bun test tests/unit/v1-modules.test.ts

import { describe, expect, test } from 'bun:test'
import { parseSmsText, normalizeDigits, jalaliToGregorian } from '../../src/lib/sms/parser'
import {
  accountBalance,
  monthSummary,
  formatAmount,
  categoriesForType,
} from '../../src/lib/finance/core'
import { buildCsv, buildJson, buildTxt, buildExcelXml } from '../../src/lib/finance/exporters'
import { matchTask, similarity, normalizeForMatch } from '../../src/lib/assistant/match'
import { detectIntent } from '../../src/lib/assistant/router'
import { buildRuleBasedPlan } from '../../src/lib/assistant/rule-plan'
import { tf, formatNum, langDir, langBcp47 } from '../../src/i18n/core'
import { validateEndpointUrl } from '../../src/lib/ai/providers/types'
import { quotaDecision, quotaLimits } from '../../src/lib/ai/gateway'

// ── SMS ─────────────────────────────────────────────────────
describe('SMS بانکی — پارسر', () => {
  test('نرمال‌سازی ارقام فارسی/عربی', () => {
    expect(normalizeDigits('۱۲۳٤٥')).toBe('12345')
  })

  test('برداشت بانک ملت — هزینه با موجودی', () => {
    const r = parseSmsText('بانک ملت: برداشت\nمبلغ: 500,000 ریال\nموجودی: 12,000,000 ریال\nکارت 6104****1234')
    expect(r.transactions.length).toBe(1)
    const t = r.transactions[0]
    expect(t.bank).toBe('ملت')
    expect(t.type).toBe('expense')
    expect(t.amount).toBe(500000)
    expect(t.balance).toBe(12000000)
    expect(t.cardLast4).toBe('1234')
    expect(t.confidence).toBeGreaterThan(0.5)
  })

  test('واریز بانک ملی — درآمد', () => {
    const r = parseSmsText('بانک ملی ایران\nواریز مبلغ 2,500,000 ریال شبا')
    expect(r.transactions[0].type).toBe('income')
    expect(r.transactions[0].amount).toBe(2500000)
  })

  test('ارقام فارسی در پیامک', () => {
    const r = parseSmsText('بانک سامان\nمبلغ ۳۰۰٬۰۰۰ ریال خرید\nموجودی ۵٬۰۰۰٬۰۰۰ ریال')
    expect(r.transactions.length).toBe(1)
    expect(r.transactions[0].amount).toBe(300000)
  })

  test('پیامک غیربانکی نادیده گرفته می‌شود', () => {
    const r = parseSmsText('سلام خوبی؟ فردا میای؟')
    expect(r.transactions.length).toBe(0)
    expect(r.ignored).toBe(1)
  })

  test('چند پیامک با هم', () => {
    const r = parseSmsText(
      'بانک ملت برداشت مبلغ 100 ریال\n\nبانک پارسیان واریز مبلغ 200 ریال',
    )
    expect(r.transactions.length).toBe(2)
    expect(r.transactions[0].amount).toBe(100)
    expect(r.transactions[1].amount).toBe(200)
  })

  test('تبدیل جلالی→میلادی (1404/07/09 → اکتبر 2025)', () => {
    const d = jalaliToGregorian(1404, 7, 9)
    expect(d.getFullYear()).toBe(2025)
    expect(d.getMonth() + 1).toBe(10)
    expect(d.getDate()).toBe(1)
  })
})

// ── مالی ────────────────────────────────────────────────────
describe('مالی — هسته محاسبات', () => {
  const acct = 'a1'

  test('مانده حساب: افتتاحیه + درآمد − هزینه ± انتقال', () => {
    const txs = [
      { type: 'income', amount: 1000, accountId: acct },
      { type: 'expense', amount: 300, accountId: acct },
      { type: 'transfer', amount: 200, accountId: acct, toAccountId: 'a2' },
      { type: 'transfer', amount: 150, accountId: 'a2', toAccountId: acct },
    ]
    expect(accountBalance(500, acct, txs)).toBe(500 + 1000 - 300 - 200 + 150)
  })

  test('خلاصه ماه: خالص = درآمد − هزینه؛ انتقال در خالص نیست', () => {
    const now = new Date()
    const s = monthSummary([
      { type: 'income', amount: 2000, accountId: acct, category: 'salary', occurredAt: now },
      { type: 'expense', amount: 700, accountId: acct, category: 'food', occurredAt: now },
      { type: 'expense', amount: 300, accountId: acct, category: 'food', occurredAt: now },
      { type: 'transfer', amount: 500, accountId: acct, toAccountId: 'a2', category: 'transfer', occurredAt: now },
    ])
    expect(s.income).toBe(2000)
    expect(s.expense).toBe(1000)
    expect(s.net).toBe(1000)
    expect(s.byCategory[0].category).toBe('food')
    expect(s.byCategory[0].total).toBe(1000)
  })

  test('دسته‌ها بر اساس نوع', () => {
    expect(categoriesForType('income')).toContain('salary')
    expect(categoriesForType('expense')).toContain('food')
    expect(categoriesForType('transfer')).toEqual(['transfer'])
  })

  test('قالب مبلغ دوزبانه', () => {
    expect(formatAmount(1234567, 'fa')).toContain('ریال')
    expect(formatAmount(1234567, 'en')).toContain('IRR')
    expect(formatAmount(1234567, 'en')).toContain('1,234,567')
  })
})

describe('مالی — خروجی‌ها', () => {
  const accounts = [{ name: 'نقدی', kind: 'cash', openingAmount: 0, currency: 'IRR', balance: 900 }]
  const txs = [
    { type: 'expense', amount: 500, category: 'food', note: 'ناهار', occurredAt: new Date('2025-10-09T12:30:00'), account: { name: 'نقدی' } },
  ]
  test('CSV با BOM و سرستون فارسی', () => {
    const csv = buildCsv(txs)
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('هزینه')
    expect(csv).toContain('نوع')
    expect(csv).toContain('500')
  })
  test('Excel XML معتبر', () => {
    const xml = buildExcelXml(accounts, txs)
    expect(xml).toContain('<Workbook')
    expect(xml).toContain('تراکنش‌ها')
    expect(xml).not.toContain('<raw')
  })
  test('JSON و TXT', () => {
    expect(JSON.parse(buildJson(accounts, txs)).transactions.length).toBe(1)
    expect(buildTxt(accounts, txs)).toContain('رهیار')
  })
})

// ── تطبیق فازی ──────────────────────────────────────────────
describe('تطبیق فازی عنوان کار', () => {
  test('نرمال‌سازی ی/ک و اعراب', () => {
    expect(normalizeForMatch('جلسهٔ ياران')).toContain('یاران')
  })
  test('تطبیق زیررشته', () => {
    expect(similarity('جلسه با تیم', 'جلسه با تیم طراحی')).toBeGreaterThan(0.5)
  })
  test('بهترین تطبیق و آستانه', () => {
    const tasks = [
      { id: '1', title: 'خرید نان' },
      { id: '2', title: 'جلسه با تیم طراحی' },
    ]
    expect(matchTask('جلسه با تیم انجام شد', tasks)?.id).toBe('2')
    expect(matchTask('چیز کاملا بی‌ربط', tasks)).toBeNull()
  })
})

// ── مسیریاب نیت ─────────────────────────────────────────────
describe('مسیریاب نیت — نیت‌های تازه', () => {
  test('تکمیل: «جلسه با تیم انجام شد»', () => {
    const i = detectIntent('جلسه با تیم انجام شد')
    expect(i.kind).toBe('complete_task')
    if (i.kind === 'complete_task') expect(i.rawTitle).toContain('جلسه')
  })
  test('تمرکز: «شروع تمرکز»', () => {
    expect(detectIntent('شروع تمرکز').kind).toBe('start_focus')
    expect(detectIntent('pomodoro please').kind).toBe('start_focus')
  })
  test('راهنما', () => {
    expect(detectIntent('چیکار می‌تونی بکنی؟').kind).toBe('help')
  })
  test('انگلیسی لیست', () => {
    expect(detectIntent('what are my tasks today').kind).toBe('list_today')
  })
  test('ثبت همچنان کار می‌کند', () => {
    expect(detectIntent('ثبت کن فردا تماس').kind).toBe('add_task')
  })
})

// ── برنامه قاعده‌محل ────────────────────────────────────────
describe('برنامه‌ساز قاعده‌محلی', () => {
  test('ترتیب: فوری اول + بلوک‌های زمانی', () => {
    const plan = buildRuleBasedPlan([
      { id: '1', title: 'کار عادی', priority: 2, status: 'todo', starred: false, notes: null, tag: null, dueDate: null, dueTime: null, repeat: null, createdAt: '', completedAt: null, subtasks: [] },
      { id: '2', title: 'کار فوری', priority: 1, status: 'todo', starred: false, notes: null, tag: null, dueDate: null, dueTime: null, repeat: null, createdAt: '', completedAt: null, subtasks: [] },
    ])
    expect(plan.blocks[0].taskId).toBe('2')
    expect(plan.blocks[0].why).toContain('فوری')
    expect(plan.blocks.length).toBe(2)
  })
})

// ── i18n ────────────────────────────────────────────────────
describe('i18n — هسته', () => {
  test('tf جایگزینی متغیر + ارقام فارسی', () => {
    expect(tf('{n} کار', { n: 12 }, 'fa')).toBe('۱۲ کار')
    expect(tf('{n} tasks', { n: 12 }, 'en')).toBe('12 tasks')
  })
  test('فرمت عدد و جهت', () => {
    expect(formatNum(145, 'fa')).toBe('۱۴۵')
    expect(formatNum(145, 'en')).toBe('145')
    expect(langDir('fa')).toBe('rtl')
    expect(langDir('en')).toBe('ltr')
    expect(langBcp47('en')).toBe('en-US')
  })
})

// ── Provider ────────────────────────────────────────────────
describe('AIProvider — قراردادها', () => {
  test('اعتبارسنجی Endpoint', () => {
    expect(validateEndpointUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/v1')
    expect(validateEndpointUrl('http://localhost:11434/v1')).toContain('11434')
    expect(validateEndpointUrl('ftp://x')).toBeNull()
    expect(validateEndpointUrl('javascript:alert(1)')).toBeNull()
    expect(validateEndpointUrl('not a url')).toBeNull()
    expect(validateEndpointUrl('https://u:p@host.com')).toBeNull()
  })
})

// ── سهمیه ───────────────────────────────────────────────────
describe('سهمیه Gateway — منطق خالص', () => {
  test('سقف روزانه', () => {
    const d = quotaDecision({ userToday: 60, userMonth: 60, systemToday: 60 }, quotaLimits())
    expect(d.allow).toBe(false)
    if (!d.allow) expect(d.reason).toBe('user_daily')
  })
  test('صفر = بی‌سقف', () => {
    const d = quotaDecision({ userToday: 9999, userMonth: 9999, systemToday: 9999 }, { ...quotaLimits(), userDaily: 0, userMonthly: 0, systemDaily: 0 })
    expect(d.allow).toBe(true)
  })
})
