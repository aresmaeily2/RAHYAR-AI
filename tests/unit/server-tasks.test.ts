// ─── آزمون‌های واحد رزولو تاریخ و سریال‌سازی کار ─────────────
// اجرا: bun test tests/unit/server-tasks.test.ts
// توجه: ماژول db را لود می‌کند ولی اتصال برقرار نمی‌شود؛ توابع خالص تست می‌شوند.

import { describe, expect, test } from 'bun:test'
import { resolveDueDate, sliceForCap } from '../../src/lib/server-tasks'

describe('resolveDueDate', () => {
  test('ورودی خالی → null', () => {
    expect(resolveDueDate(null)).toBeNull()
    expect(resolveDueDate('')).toBeNull()
    expect(resolveDueDate(undefined)).toBeNull()
  })

  test('کلمات نسبی فارسی', () => {
    expect(resolveDueDate('امروز')).toBeInstanceOf(Date)
    expect(resolveDueDate('فردا')).toBeInstanceOf(Date)
    expect(resolveDueDate('پس‌فردا')).toBeInstanceOf(Date)
    expect(resolveDueDate('پس فردا')).toBeInstanceOf(Date)
  })

  test('قالب استاندارد YYYY-MM-DD', () => {
    const d = resolveDueDate('2026-10-20')
    expect(d?.toISOString().slice(0, 10)).toBe('2026-10-20')
    // ظهر UTC برای پایداری مرز روز
    expect(d?.getUTCHours()).toBe(12)
  })

  test('قالب کامل با زمان — فقط بخش تاریخ برداشته شود', () => {
    const d = resolveDueDate('2026-10-20T14:30')
    expect(d?.toISOString().slice(0, 10)).toBe('2026-10-20')
  })

  test('تاریخ نامعتبر → null (رفع A5: قبلاً Invalid Date و خطای ۵۰۰ بود)', () => {
    expect(resolveDueDate('9999-99-99')).toBeNull()
    expect(resolveDueDate('2023-02-29')).toBeNull() // ۲۰۲۳ کبیسه نیست
    expect(resolveDueDate('1403-05-20')).toBeNull() // تاریخ شمسی رد شود
    expect(resolveDueDate('nonsense')).toBeNull()
  })

  test('۳۱ اسفند ۱۴۰۳ (کبیسه شمسی = ۲۰ مارس ۲۰۲۵) پذیرفته شود به‌صورت میلادی', () => {
    // ورودی میلادی است؛ فقط صحت ساختار بررسی می‌شود
    expect(resolveDueDate('2025-03-20')).toBeInstanceOf(Date)
  })
})

describe('sliceForCap — سقف زیرکار (رفع A2/H2)', () => {
  test('فضای کافی → همه عبور کنند', () => {
    const items = ['a', 'b', 'c']
    expect(sliceForCap(items, 0)).toEqual(['a', 'b', 'c'])
  })

  test('نزدیک سقف → فقط به اندازه جا', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    expect(sliceForCap(items, 28)).toEqual(['a', 'b'])
  })

  test('در سقف → خالی', () => {
    expect(sliceForCap(['a'], 30)).toEqual([])
  })

  test('بیش از سقف موجود → خالی (بدون منفی)', () => {
    expect(sliceForCap(['a', 'b'], 35)).toEqual([])
  })

  test('سقف پیش‌فرض ۳۰ و قابل تغییر', () => {
    expect(sliceForCap(['a', 'b', 'c'], 0, 2)).toEqual(['a', 'b'])
  })
})
