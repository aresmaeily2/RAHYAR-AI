// ─── آزمون‌های واحد پارسر زبان طبیعی فارسی ───────────────────
// اجرا: bun test tests/unit/nlp.test.ts

import { describe, expect, test } from 'bun:test'
import { parseQuickTask } from '../../src/lib/nlp'
import { addDaysIso, tehranIsoDate } from '../../src/lib/persian-date'

describe('parseQuickTask — تاریخ نسبی', () => {
  test('«فردا» → فردای تهران', () => {
    const p = parseQuickTask('فردا تماس با دکتر')
    expect(p.dueDate).toBe(addDaysIso(tehranIsoDate(), 1))
    expect(p.title).toContain('تماس با دکتر')
    expect(p.title).not.toContain('فردا')
  })

  test('«پس فردا» → دو روز بعد', () => {
    const p = parseQuickTask('پس فردا خرید کاغذ')
    expect(p.dueDate).toBe(addDaysIso(tehranIsoDate(), 2))
  })

  test('«امروز» → امروز', () => {
    const p = parseQuickTask('امروز جلسه مهم دارم')
    expect(p.dueDate).toBe(tehranIsoDate())
  })
})

describe('parseQuickTask — ساعت', () => {
  test('«ساعت ۹» → ۰۹:۰۰', () => {
    const p = parseQuickTask('فردا ساعت ۹ تماس با بانک')
    expect(p.dueTime).toBe('09:00')
  })

  test('«ساعت ۲۱ و ۳۰» → ۲۱:۳۰', () => {
    const p = parseQuickTask('ساعت ۲۱ و ۳۰ قرص بخور')
    expect(p.dueTime).toBe('21:30')
  })

  test('«ساعت ۹ شب» → ۲۱:۰۰ (تبدیل صبح/شب)', () => {
    const p = parseQuickTask('ساعت ۹ شب مطالعه')
    expect(p.dueTime).toBe('21:00')
  })

  test('ساعت نامعتبر ۲۵ → رد شود', () => {
    const p = parseQuickTask('ساعت ۲۵ جلسه')
    expect(p.dueTime).toBeUndefined()
  })
})

describe('parseQuickTask — اولویت و تکرار و برچسب', () => {
  test('«فوری» → اولویت ۱ و حذف از عنوان', () => {
    const p = parseQuickTask('ارسال گزارش فوری')
    expect(p.priority).toBe(1)
    expect(p.title).not.toContain('فوری')
  })

  test('«کم‌اهمیت» → اولویت ۳', () => {
    const p = parseQuickTask('مرتب کردن کمد کم اهمیت')
    expect(p.priority).toBe(3)
  })

  test('«هر روز» → تکرار روزانه', () => {
    const p = parseQuickTask('۳۰ دقیقه مطالعه هر روز')
    expect(p.repeat).toBe('daily')
  })

  test('«هفتگی» → تکرار هفتگی', () => {
    const p = parseQuickTask('خرید هفتگی خانه')
    expect(p.repeat).toBe('weekly')
  })

  test('برچسب #کار استخراج و از عنوان حذف شود', () => {
    const p = parseQuickTask('#کار نوشتن گزارش')
    expect(p.tag).toBe('کار')
    expect(p.title).not.toContain('#')
  })
})

describe('parseQuickTask — مقاومت', () => {
  test('متن خالی و کوتاه نترکد', () => {
    const p = parseQuickTask('  ')
    expect(p.title).toBe('')
  })

  test('ارقام فارسی در ساعت پشتیبانی شود', () => {
    const p = parseQuickTask('ساعت ۱۴:۴۵ جلسه')
    expect(p.dueTime).toBe('14:45')
  })

  test('عنوان بدون توکن تشخیصی دست‌نخورده بماند', () => {
    const p = parseQuickTask('نوشتن پایان‌نامه')
    expect(p.title).toBe('نوشتن پایان‌نامه')
    expect(p.dueDate).toBeUndefined()
    expect(p.dueTime).toBeUndefined()
  })
})

describe('parseQuickTask — انگلیسی (نسخه ۱٫۰ دوزبانه)', () => {
  test('tomorrow + at + am/pm', () => {
    const p = parseQuickTask('Add buy milk tomorrow at 8am')
    expect(p.dueDate).toBeDefined()
    expect(p.dueTime).toBe('08:00')
    expect(p.title.toLowerCase()).toContain('buy milk')
    expect(p.title).not.toContain('tomorrow')
    expect(p.title).not.toContain('8am')
  })

  test('today + pm', () => {
    const p = parseQuickTask('call the bank today at 3:30pm')
    expect(p.dueDate).toBeDefined()
    expect(p.dueTime).toBe('15:30')
  })

  test('بدون قید صریح، عدد معمولی ساعت نیست (بدون مثبت کاذب)', () => {
    const p = parseQuickTask('buy 2 milks and 3 breads')
    expect(p.dueTime).toBeUndefined()
  })

  test('اولویت و تکرار انگلیسی', () => {
    const p = parseQuickTask('urgent: water the plants every day')
    expect(p.priority).toBe(1)
    expect(p.repeat).toBe('daily')
  })

  test('روز هفته انگلیسی', () => {
    const p = parseQuickTask('meeting with team monday')
    expect(p.dueDate).toBeDefined()
    expect(p.title.toLowerCase()).not.toContain('monday')
  })
})

describe('parseQuickTask — عنوان نقل‌قولی و قالب گفتاری (v2.1.0)', () => {
  test('«با عنوان X» گیومه‌دار → عنوان فقط X است نه جملهٔ کامل', () => {
    const p = parseQuickTask('یک وظیفه با عنوان «گزارش فروش 1154» برای فردا اضافه کن')
    expect(p.title).toBe('گزارش فروش 1154')
    expect(p.dueDate).toBe(addDaysIso(tehranIsoDate(), 1))
  })

  test('کوتیشن دوتایی انگلیسی هم پذیرفته می‌شود', () => {
    const p = parseQuickTask('add task "review PR 42" tomorrow at 5pm')
    expect(p.title).toBe('review PR 42')
    expect(p.dueTime).toBe('17:00')
  })

  test('«با عنوان X» بدون گیومه → برش تا قید زمان', () => {
    const p = parseQuickTask('یه کار با عنوان تماس با insurance برای فردا')
    expect(p.title).toBe('تماس با insurance')
    expect(p.dueDate).toBe(addDaysIso(tehranIsoDate(), 1))
  })

  test('فعل پایانی «اضافه کن» حذف می‌شود (مسیر بدون گیومه)', () => {
    const p = parseQuickTask('خرید نان را برای امروز اضافه کن')
    expect(p.title).not.toContain('اضافه کن')
    expect(p.title).toContain('خرید نان')
    expect(p.dueDate).toBe(tehranIsoDate())
  })

  test('عنوان ساده دست‌نخورده می‌ماند (بدون مثبت کاذب)', () => {
    const p = parseQuickTask('فردا تماس با دکتر')
    expect(p.title).toContain('تماس با دکتر')
  })
})
