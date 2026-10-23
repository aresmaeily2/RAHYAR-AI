// ─── آزمون‌های واحد رزولو تاریخ و سریال‌سازی کار ─────────────
// اجرا: bun test tests/unit/server-tasks.test.ts
// توجه: ماژول db را لود می‌کند ولی اتصال برقرار نمی‌شود؛ توابع خالص تست می‌شوند.

import { describe, expect, test } from 'bun:test'
import { resolveActionDueDate, resolveDueDate, sliceForCap } from '../../src/lib/server-tasks'

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

// ─── V23-FIX (تأیید مستقل ۲۰۲۶–۱۰–۲۳): نام روز هفته در مسیر اکشن مدل ───
// علت آزمون: مدل زبانی «پنجشنبه» را به روز بعدی اشتباه تبدیل می‌کرد؛
// از این پس resolveDueDate نام روز را خودش قطعی حل می‌کند.
describe('resolveDueDate — weekday names (V23-FIX)', () => {
  test('نام روز فارسی/انگلیسی → Date معتبر در پنجرهٔ ۰ تا ۶ روز', () => {
    for (const w of ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'thursday', 'saturday', 'پنج شنبه']) {
      const d = resolveDueDate(w)
      expect(d).toBeInstanceOf(Date)
      const today = new Date().toISOString().slice(0, 10)
      const diffDays = Math.round((d!.getTime() - new Date(today + 'T12:00:00Z').getTime()) / 86400000)
      expect(diffDays).toBeGreaterThanOrEqual(0)
      expect(diffDays).toBeLessThanOrEqual(6)
    }
  })

  test('روز هفته همیشه همان روز هفتهٔ خواسته‌شده است (قرارداد ۰=شنبه)', () => {
    // ساعت ۱۲ UTC → بعدازظهر تهران → شاخص روز هفتهٔ تهران پایدار است
    const idxOf = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay() // JS: 0=یکشنبه
    // نگاشت JS→محصول: شنبه=۶، یکشنبه=۰، دوشنبه=۱، سه‌شنبه=۲، چهارشنبه=۳، پنجشنبه=۴، جمعه=۵
    const productIdx = (jsDay: number) => (jsDay + 1) % 7
    const expectWeekday = (name: string, wantIdx: number) => {
      const d = resolveDueDate(name)!
      expect(productIdx(idxOf(d.toISOString().slice(0, 10)))).toBe(wantIdx)
    }
    expectWeekday('شنبه', 0)
    expectWeekday('یکشنبه', 1)
    expectWeekday('دوشنبه', 2)
    expectWeekday('سه‌شنبه', 3)
    expectWeekday('چهارشنبه', 4)
    expectWeekday('پنجشنبه', 5)
    expectWeekday('جمعه', 6)
    expectWeekday('thursday', 5)
    expectWeekday('friday', 6)
  })

  test('ورودی بی‌معنی هنوز null است (بدون مثبت کاذب)', () => {
    expect(resolveDueDate('شنبه‌ای نیست')).toBeNull()
    expect(resolveDueDate('hello world')).toBeNull()
    expect(resolveDueDate('1405-08-10')).toBeNull() // تاریخ شمسی سه‌رقمی → بیرون پنجرهٔ میلادی
  })
})

// ─── V23-FIX مرحلهٔ نهایی: گارد روز هفته در مسیر اکشن مدل ───
describe('resolveActionDueDate — weekday guard (V23-FIX)', () => {
  test('مدل تاریخ اشتباه با روز هفتهٔ ناهمخوان فرستاد → اصلاح به تاریخ قطعی پیام کاربر', () => {
    // فرض: امروز ۲۰۲۶–۱۰–۲۳ (جمعه). کاربر گفت «پنجشنبه»، مدل ۲۰۲۶–۱۰–۲۴ (شنبه) فرستاد.
    // سناریوی واقعی مشاهده‌شده در تأیید مستقل — با تزریق امروز ثابت، پیام حاوی «پنجشنبه» است
    // و در روز اجرای آزمون هم گارد باید همان روز هفتهٔ «پنجشنبه» را بدهد.
    const msg = 'لطفاً یک وظیفه با عنوان «جلسه» برای پنجشنبه ساعت ۱۸ بساز'
    const d = resolveActionDueDate('2026-10-24', msg)!
    const productIdx = (date: Date) => (date.getUTCDay() + 1) % 7 // ۰=شنبه
    expect(productIdx(d)).toBe(5) // پنجشنبه = ۵
  })

  test('مدل تاریخ درست با روز هفتهٔ همخوان فرستاد → بدون تغییر', () => {
    const msg = 'یک وظیفه برای شنبه ثبت کن'
    const d = resolveActionDueDate('2026-10-24', msg)! // ۲۰۲۶–۱۰–۲۴ شنبه است
    const productIdx = (date: Date) => (date.getUTCDay() + 1) % 7
    expect(productIdx(d)).toBe(0) // شنبه = ۰
  })

  test('پیام بدون روز هفته → رزولوی عادی مدل (فردا و…)', () => {
    expect(resolveActionDueDate('فردا', 'یک وظیفه ثبت کن')).toBeInstanceOf(Date)
    expect(resolveActionDueDate(null, 'سلام')).toBeNull()
    // پیام بدون روز هفته ولی مدل null → null
    expect(resolveActionDueDate(undefined, 'امروز هوا خوش است')).toBeNull()
  })

  test('مدل dueDate نداد ولی پیام روز هفته دارد → تاریخ قطعی از پیام', () => {
    const msg = 'وظیفهٔ «گزارش» برای چهارشنبه'
    const d = resolveActionDueDate(null, msg)!
    const productIdx = (date: Date) => (date.getUTCDay() + 1) % 7
    expect(productIdx(d)).toBe(4) // چهارشنبه = ۴
  })
})
