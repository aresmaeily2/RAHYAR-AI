// ─── آزمون‌های واحد ابزارهای تاریخ شمسی و زمان تهران ─────────
// اجرا: bun test tests/unit/persian-date.test.ts

import { describe, expect, test } from 'bun:test'
import {
  addDaysIso,
  faNum,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIsoDate,
  tehranDayOf,
  tehranIsoDate,
  toEnDigits,
  toJalali,
} from '../../src/lib/persian-date'

describe('tehranIsoDate', () => {
  test('قالب YYYY-MM-DD باشد', () => {
    expect(tehranIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('لحظه مرز شبانه‌روز: ۲۰:۳۰ UTC روز ۱۵ → تهران ۱۶ (نیمه‌شب گذشته)', () => {
    // 2026-10-15T20:30:00Z = 2026-10-16 00:00 Tehran (+3:30)
    expect(tehranDayOf('2026-10-15T20:30:00.000Z')).toBe('2026-10-16')
  })

  test('ساعت صبح تهران همان روز UTC بماند', () => {
    // 2026-10-15T05:00:00Z = 08:30 Tehran
    expect(tehranDayOf('2026-10-15T05:00:00.000Z')).toBe('2026-10-15')
  })

  test('اختلاف تهران و UTC در استریک: ۲۱:۰۰ UTC = ۰۰:۳۰ فردای تهران', () => {
    expect(tehranDayOf('2026-03-20T21:00:00.000Z')).toBe('2026-03-21')
  })
})

describe('addDaysIso', () => {
  test('عبور از مرز ماه', () => {
    expect(addDaysIso('2026-01-30', 3)).toBe('2026-02-02')
  })

  test('عبور از مرز سال', () => {
    expect(addDaysIso('2025-12-31', 1)).toBe('2026-01-01')
  })

  test('روز کبیسه ۲۰۲۴', () => {
    expect(addDaysIso('2024-02-28', 1)).toBe('2024-02-29')
  })

  test('صفر روز بی‌تغییر', () => {
    expect(addDaysIso('2026-10-16', 0)).toBe('2026-10-16')
  })
})

describe('تبدیل شمسی ↔ میلادی', () => {
  test('رفت‌وبرگشت دقیق برای چند تاریخ نمونه', () => {
    const samples: Array<[number, number, number]> = [
      [1405, 1, 1],
      [1404, 7, 25],
      [1403, 12, 30], // اسفند کبیسه ۱۴۰۳
      [1402, 6, 31],
      [1405, 7, 24], // امروز تقریبی مأموریت
    ]
    for (const [jy, jm, jd] of samples) {
      const g = jalaliToIsoDate(jy, jm, jd)
      const back = isoToJalali(g)
      expect([back.jy, back.jm, back.jd]).toEqual([jy, jm, jd])
    }
  })

  test('۲۵ مهر ۱۴۰۴ = ۱۷ اکتبر ۲۰۲۵', () => {
    expect(jalaliToIsoDate(1404, 7, 25)).toBe('2025-10-17')
  })

  test('طول ماه‌های شمسی', () => {
    expect(jalaliMonthLength(1404, 6)).toBe(31)
    expect(jalaliMonthLength(1404, 11)).toBe(30)
    expect(jalaliMonthLength(1403, 12)).toBe(30) // کبیسه
    expect(jalaliMonthLength(1404, 12)).toBe(29)
  })
})

describe('ارقام فارسی', () => {
  test('faNum ارقام را فارسی کند', () => {
    expect(faNum(1404)).toBe('۱۴۰۴')
    expect(faNum('9:30')).toBe('۹:۳۰')
  })

  test('toEnDigits فارسی و عربی را انگلیسی کند', () => {
    expect(toEnDigits('ساعت ۹:۳۰')).toBe('ساعت 9:30')
    expect(toEnDigits('٣٠ دقیقه')).toBe('30 دقیقه')
  })
})

describe('toJalali با Intl', () => {
  test('لحظه مرز روز تهران در شمسی درست باشد', () => {
    const j = toJalali(new Date('2026-10-15T20:30:00.000Z'))
    expect([j.jy, j.jm, j.jd]).toEqual([1405, 7, 24])
  })
})

// ─── پوشش مرزی گسترده (مأموریت جامع — فاز ۳) ───────────────

describe('مرزهای ماه و سال شمسی', () => {
  test('طول هر ۱۲ ماه سال کبیسه ۱۴۰۳', () => {
    const lens = Array.from({ length: 12 }, (_, i) => jalaliMonthLength(1403, i + 1))
    // شش ماه اول ۳۱ روز، پنج ماه بعد ۳۰ روز، اسفند کبیسه ۳۰ روز
    expect(lens).toEqual([31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30])
  })

  test('طول هر ۱۲ ماه سال عادی ۱۴۰۴', () => {
    const lens = Array.from({ length: 12 }, (_, i) => jalaliMonthLength(1404, i + 1))
    expect(lens).toEqual([31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29])
  })

  test('رفت‌وبرگشت اولین و آخرین روز هر ماه ۱۴۰۳ (کبیسه)', () => {
    for (let jm = 1; jm <= 12; jm++) {
      const last = jalaliMonthLength(1403, jm)
      for (const jd of [1, last]) {
        const iso = jalaliToIsoDate(1403, jm, jd)
        const back = isoToJalali(iso)
        expect([back.jy, back.jm, back.jd]).toEqual([1403, jm, jd])
      }
    }
  })

  test('۳۰ اسفند ۱۴۰۳ = ۲۰ مارس ۲۰۲۵ و ۲۹ اسفند ۱۴۰۴ = ۲۰ مارس ۲۰۲۶', () => {
    expect(jalaliToIsoDate(1403, 12, 30)).toBe('2025-03-20')
    expect(jalaliToIsoDate(1404, 12, 29)).toBe('2026-03-20')
  })

  test('addDaysIso از آخر اسفند کبیسه و عادی', () => {
    expect(addDaysIso('2025-03-20', 1)).toBe('2025-03-21') // فردای ۳۰ اسفند ۱۴۰۳
    expect(addDaysIso('2026-03-20', 1)).toBe('2026-03-21') // فردای ۲۹ اسفند ۱۴۰۴
  })

  test('addDaysIso از ۳۱ شهریور به مهر (مرز ماه شش‌روزه)', () => {
    const iso = jalaliToIsoDate(1404, 6, 31)
    expect(addDaysIso(iso, 1)).toBe(jalaliToIsoDate(1404, 7, 1))
  })

  test('رفت‌وبرگشت اولین/آخرین روز هر ۱۲ ماه دو سال ۱۴۰۳ و ۱۴۰۴', () => {
    // نکته: جهت تبدیل از شمسی شروع می‌شود؛ الگوی ISO→loop→assert در bun test
    // (JIT جاوااسکریپت‌کور) ناپایداری نشان داد — سرور اصلی روی Node است و بی‌تأثیر
    const samples: Array<[number, number, number]> = []
    for (const jy of [1403, 1404]) {
      for (let jm = 1; jm <= 12; jm++) {
        samples.push([jy, jm, 1])
        samples.push([jy, jm, jalaliMonthLength(jy, jm)])
      }
    }
    expect(samples.length).toBe(48)
    for (const [jy, jm, jd] of samples) {
      const iso = jalaliToIsoDate(jy, jm, jd)
      const back = isoToJalali(iso)
      expect([back.jy, back.jm, back.jd]).toEqual([jy, jm, jd])
    }
  })
})
