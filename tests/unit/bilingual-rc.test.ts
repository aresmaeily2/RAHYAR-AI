// ─── آزمون‌های دوزبانه‌سازی نسخه ۱٫۰ RC ─────────────────────────
// پاسخ‌های قطعی دستیار، پیام سهمیه و برنامه‌ساز قاعده‌محل باید در
// هر دو زبان کاملاً مستقل باشند (معیار پذیرش: رابط‌های fa/en مستقل).

import { describe, expect, test } from 'bun:test'
import {
  replyTaskAdded,
  replyDailyReport,
  replyTaskDone,
  replyTaskNotFound,
  replyFocusStarted,
  replyHelp,
  replyTaskList,
  replyFallback,
} from '../../src/lib/assistant/replies'
import { quotaMessage } from '../../src/lib/ai/gateway'
import { buildRuleBasedPlan } from '../../src/lib/assistant/rule-plan'
import { formatNum } from '../../src/i18n/core'
import { longDate, monthTitle } from '../../src/i18n/date'
import type { TaskT } from '../../src/lib/types'

describe('پاسخ‌های قطعی دستیار — دوزبانه', () => {
  test('ثبت کار: فارسی و انگلیسی جدا', () => {
    const fa = replyTaskAdded('fa', 'تماس با دکتر', true)
    const en = replyTaskAdded('en', 'doctor call', true)
    expect(fa).toContain('ثبت شد')
    expect(fa).toContain('تماس با دکتر')
    expect(fa).toContain('سررسید')
    expect(en).toContain('Saved')
    expect(en).toContain('doctor call')
    expect(en).not.toMatch(/[\u0600-\u06FF]/)
  })

  test('گزارش روز: اعداد و پیام در هر دو زبان', () => {
    const fa = replyDailyReport('fa', { done: 2, remaining: 3, overdue: 1 })
    const en = replyDailyReport('en', { done: 2, remaining: 3, overdue: 1 })
    expect(fa).toContain('گزارش امروز')
    expect(fa).toContain('۲')
    expect(en).toContain("Today's report")
    expect(en).toContain('2 done')
    expect(en).not.toMatch(/[\u0600-\u06FF]/)
  })

  test('تکمیل/نیافتن/تمرکز/راهنما — انگلیسی بدون هیچ حرف فارسی', () => {
    for (const s of [
      replyTaskDone('en', 'buy milk'),
      replyTaskNotFound('en'),
      replyFocusStarted('en'),
      replyHelp('en'),
      replyFallback('en'),
    ]) {
      expect(s).not.toMatch(/[\u0600-\u06FF]/)
    }
    expect(replyTaskDone('fa', 'خرید شیر')).toContain('انجام شد')
    expect(replyHelp('fa')).toContain('ثبت کار')
  })

  test('لیست کارها — شماره‌گذاری در هر دو زبان', () => {
    const fa = replyTaskList('fa', ['الف', 'ب'])
    const en = replyTaskList('en', ['a', 'b'])
    expect(fa).toContain('۱. الف')
    expect(en).toContain('1. a')
    expect(replyTaskList('en', [])).toContain('no active tasks')
    expect(replyTaskList('fa', [])).toContain('فعلاً کار فعالی نداری')
  })
})

describe('پیام سهمیه — دوزبانه', () => {
  test('سهمیه روزانه کاربر', () => {
    const fa = quotaMessage('user_daily', 5, 'fa')
    const en = quotaMessage('user_daily', 5, 'en')
    expect(fa).toContain('سهمیه')
    expect(fa).toContain('۵')
    expect(en).toContain('daily AI quota')
    expect(en).toContain('5 hours')
    expect(en).not.toMatch(/[\u0600-\u06FF]/)
  })

  test('سهمیه ماهانه و سامانه', () => {
    expect(quotaMessage('user_monthly', 12, 'en')).toContain('monthly AI quota')
    expect(quotaMessage('system_daily', 3, 'en')).toContain('system-wide daily quota')
    expect(quotaMessage('user_monthly', 12, 'fa')).toContain('ماهانه')
  })
})

describe('برنامه‌ساز قاعده‌محل — دوزبانه', () => {
  const mk = (over: Partial<TaskT>): TaskT => ({
    id: 't1',
    title: 'کار آزمون',
    notes: null,
    priority: 2,
    status: 'todo',
    starred: false,
    tag: null,
    dueDate: null,
    dueTime: null,
    repeat: null,
    createdAt: new Date().toISOString(),
    subtasks: [],
    ...over,
  })

  test('خلاصه و زمان‌ها در انگلیسی لاتین‌اند', () => {
    const plan = buildRuleBasedPlan(
      [mk({ title: 'Review notes', dueTime: '09:30', priority: 1 })],
      'en',
    )
    expect(plan.summary).toContain('1 active tasks')
    expect(plan.summary).not.toMatch(/[۰-۹]/)
    expect(plan.blocks[0]?.time).toBe('09:30')
    expect(plan.blocks[0]?.why).not.toMatch(/[\u0600-\u06FF]/)
  })

  test('فارسی: ارقام فارسی و چراغ فارسی', () => {
    const plan = buildRuleBasedPlan(
      [mk({ title: 'مرور نوت‌ها', dueTime: '09:30', priority: 1 })],
      'fa',
    )
    expect(plan.summary).toContain('۱')
    expect(plan.blocks[0]?.time).toContain('۰۹:۳۰')
    expect(plan.blocks[0]?.why).toContain('فوری')
  })
})

describe('تاریخ — انگلیسی همیشه میلادی', () => {
  test('longDate در en هیچ جلالی/رقم فارسی نشان نمی‌دهد', () => {
    const s = longDate('2026-10-18', 'dual', 'en')
    expect(s).not.toMatch(/[\u0600-\u06FF]/)
    expect(s).not.toContain('Mehr')
    expect(s).toContain('October')
  })

  test('monthTitle dual در fa شمسی بزرگ + ماه میلادی انگلیسی است', () => {
    const s = monthTitle('dual', 'fa', 1405, 7, 2026, 10)
    expect(s).toContain('مهر')
    expect(s).toContain('۱۴۰۵')
    expect(s).toContain('October')
  })

  test('formatNum — فارسی/انگلیسی', () => {
    expect(formatNum(25, 'fa')).toBe('۲۵')
    expect(formatNum(25, 'en')).toBe('25')
  })
})
