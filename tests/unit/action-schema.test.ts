// ─── آزمون گارد اسکیمای اکشن‌های مدل (ممیزی ۳۶۰ — OWASP LLM05) ──
// تضمین: خروجی مخرب/خراب مدل هرگز بدون اعتبارسنجی به دیتابیس نمی‌رسد.
import { describe, expect, test } from 'bun:test'
import {
  AssistantActionSchema,
  LlmChatReplySchema,
  validateChatActions,
} from '@/lib/ai/action-schema'

describe('AssistantActionSchema — اکشن‌های معتبر پذیرفته می‌شوند', () => {
  test('add_task کامل', () => {
    const r = AssistantActionSchema.safeParse({
      type: 'add_task',
      title: 'خرید نان',
      priority: 1,
      tag: 'خرید',
      dueDate: 'امروز',
      dueTime: '9:30', // ساعت یک‌رقمی — قابل‌پذیرش
      repeat: 'daily',
    })
    expect(r.success).toBe(true)
  })
  test('plan_day بدون پارامتر', () => {
    expect(AssistantActionSchema.safeParse({ type: 'plan_day' }).success).toBe(true)
  })
  test('add_reminder با زمان تهران', () => {
    const r = AssistantActionSchema.safeParse({
      type: 'add_reminder',
      message: 'جلسه با تیم',
      remindAt: '2026-10-28T09:00',
    })
    expect(r.success).toBe(true)
  })
  test('remember / forget / complete_task با taskId', () => {
    expect(AssistantActionSchema.safeParse({ type: 'remember', fact: 'من گیاه‌خوارم' }).success).toBe(true)
    expect(AssistantActionSchema.safeParse({ type: 'forget', fact: 'گیاه' }).success).toBe(true)
    expect(AssistantActionSchema.safeParse({ type: 'complete_task', taskId: 'cm_123' }).success).toBe(true)
  })
})

describe('AssistantActionSchema — خروجی مخرب/خراب رد می‌شود', () => {
  test('type ناشناخته', () => {
    expect(AssistantActionSchema.safeParse({ type: 'drop_table' }).success).toBe(false)
    expect(AssistantActionSchema.safeParse({ type: 'addtask' }).success).toBe(false) // حدس ممیزی بیرونی — قرارداد واقعی underscore دارد
  })
  test('priority خارج از ۱..۳', () => {
    expect(
      AssistantActionSchema.safeParse({ type: 'add_task', title: 'x', priority: 99 }).success,
    ).toBe(false)
  })
  test('dueTime فرمت غلط', () => {
    expect(
      AssistantActionSchema.safeParse({ type: 'add_task', title: 'x', dueTime: '25:00' }).success,
    ).toBe(false)
    expect(
      AssistantActionSchema.safeParse({ type: 'add_task', title: 'x', dueTime: '<script>' }).success,
    ).toBe(false)
  })
  test('complete_task بدون taskId و بدون title', () => {
    expect(AssistantActionSchema.safeParse({ type: 'complete_task' }).success).toBe(false)
  })
  test('عنوان خالی/ناموجود برای add_task', () => {
    expect(AssistantActionSchema.safeParse({ type: 'add_task' }).success).toBe(false)
  })
  test('طول‌های غیرعادی — تزریق رکورد عظیم رد می‌شود', () => {
    expect(
      AssistantActionSchema.safeParse({ type: 'add_task', title: 'x'.repeat(201) }).success,
    ).toBe(false)
    expect(
      AssistantActionSchema.safeParse({ type: 'add_reminder', message: 'x'.repeat(301), remindAt: '2026-01-01T10:00' }).success,
    ).toBe(false)
  })
})

describe('validateChatActions — دروازهٔ اجرا', () => {
  test('ورودی غیرآرایه‌ای بی‌خطر است', () => {
    expect(validateChatActions(null).valid).toHaveLength(0)
    expect(validateChatActions('{"type":"add_task"}').valid).toHaveLength(0)
    expect(validateChatActions(undefined).rejected).toBe(0)
  })
  test('ترکیب معتبر و نامعتبر — فقط معتبرها اجرا می‌شوند و تعداد ردشده می‌آید', () => {
    const { valid, rejected } = validateChatActions([
      { type: 'plan_day' },
      { type: 'delete_everything' },
      { type: 'add_task', title: 'کار واقعی' },
      { type: 'complete_task' }, // بدون شناسه
    ])
    expect(valid).toHaveLength(2)
    expect(rejected).toBe(2)
    expect(valid.map((a) => a.type)).toEqual(['plan_day', 'add_task'])
  })
  test('سقف ۸ اکشن (دفاع LLM10)', () => {
    const flood = Array.from({ length: 30 }, () => ({ type: 'plan_day' }))
    const { valid } = validateChatActions(flood)
    expect(valid.length).toBeLessThanOrEqual(8)
  })
  test('فیلدهای ناشناس حذف می‌شوند (پالایش Zod)', () => {
    const { valid } = validateChatActions([
      { type: 'plan_day', inject: 'SELECT *', taskId: 'cm_x' } as Record<string, unknown>,
    ])
    expect(valid).toHaveLength(1)
    expect(Object.keys(valid[0]).sort()).toEqual(['type'])
  })
})

describe('LlmChatReplySchema — پوش پاسخ مدل', () => {
  test('پاسخ کامل با اکشن و پیشنهاد', () => {
    const r = LlmChatReplySchema.safeParse({
      reply: 'انجام شد!',
      actions: [{ type: 'plan_day' }],
      followups: ['برنامه امروز چیست؟'],
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.actions).toHaveLength(1)
      expect(r.data.followups).toHaveLength(1)
    }
  })
  test('پیش‌فرض‌ها: بدون actions/followups هم معتبر است', () => {
    const r = LlmChatReplySchema.safeParse({ reply: 'سلام' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.actions).toEqual([])
      expect(r.data.followups).toEqual([])
    }
  })
  test('بیش از ۸ اکشن یا بیش از ۴ پیشنهاد رد می‌شود', () => {
    expect(
      LlmChatReplySchema.safeParse({
        reply: 'x',
        actions: Array.from({ length: 9 }, () => ({ type: 'plan_day' })),
      }).success,
    ).toBe(false)
    expect(
      LlmChatReplySchema.safeParse({
        reply: 'x',
        followups: ['۱', '۲', '۳', '۴', '۵'],
      }).success,
    ).toBe(false)
  })
})
