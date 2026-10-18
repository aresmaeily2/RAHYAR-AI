// ─── آزمون AI Gateway — سقف مصرف قابل‌پیش‌بینی (بخش ۶ و ۱۲ دستور) ──
import { describe, expect, test } from 'bun:test'
import {
  quotaDecision,
  quotaLimits,
  isTransientError,
  quotaMessage,
} from '@/lib/ai/gateway'

const L = {
  userDaily: 5,
  userMonthly: 50,
  systemDaily: 10,
  maxInputChars: 1000,
  maxOutputChars: 500,
}

describe('quotaDecision — سقف مصرف', () => {
  test('درون سقف‌ها مجاز است', () => {
    const d = quotaDecision({ userToday: 4, userMonth: 40, systemToday: 9 }, L)
    expect(d.allow).toBe(true)
  })

  test('سقف روزانه کاربر → رد با reason درست', () => {
    const d = quotaDecision({ userToday: 5, userMonth: 40, systemToday: 9 }, L)
    expect(d.allow).toBe(false)
    if (!d.allow) {
      expect(d.reason).toBe('user_daily')
      expect(d.resetHours).toBeGreaterThanOrEqual(1)
      expect(d.resetHours).toBeLessThanOrEqual(24)
    }
  })

  test('سقف ماهانه کاربر → رد', () => {
    const d = quotaDecision({ userToday: 1, userMonth: 50, systemToday: 9 }, L)
    expect(d.allow).toBe(false)
    if (!d.allow) {
      expect(d.reason).toBe('user_monthly')
      expect(d.resetHours).toBeGreaterThanOrEqual(1)
    }
  })

  test('سقف روزانه سامانه → رد (حتی اگر کاربر سهمیه داشت)', () => {
    const d = quotaDecision({ userToday: 1, userMonth: 1, systemToday: 10 }, L)
    expect(d.allow).toBe(false)
    if (!d.allow) expect(d.reason).toBe('system_daily')
  })

  test('۰ یعنی بی‌سقف — رفتار قابل‌پیش‌بینی', () => {
    const zero = { userDaily: 0, userMonthly: 0, systemDaily: 0, maxInputChars: 1000, maxOutputChars: 500 }
    const d = quotaDecision({ userToday: 99999, userMonth: 99999, systemToday: 99999 }, zero)
    expect(d.allow).toBe(true)
  })

  test('اولویت گاردها: روزانه کاربر قبل از ماهانه', () => {
    const d = quotaDecision({ userToday: 5, userMonth: 50, systemToday: 10 }, L)
    expect(d.allow).toBe(false)
    if (!d.allow) expect(d.reason).toBe('user_daily')
  })
})

describe('quotaLimits — پیش‌فرض‌های محافظه‌کار', () => {
  test('بدون env، سقف‌های پیش‌فرض فعال‌اند', () => {
    const l = quotaLimits()
    expect(l.userDaily).toBeGreaterThan(0)
    expect(l.systemDaily).toBeGreaterThan(0)
    expect(l.maxInputChars).toBeGreaterThan(0)
  })
})

describe('isTransientError — تلاش مجدد فقط برای خطای گذرا', () => {
  test('خطای شبکه گذرا شناخته می‌شود', () => {
    expect(isTransientError(new Error('fetch failed'))).toBe(true)
    expect(isTransientError(new Error('ECONNRESET at socket'))).toBe(true)
    expect(isTransientError(new Error('timeout of 30s exceeded'))).toBe(true)
  })
  test('خطای منطقی گذرا نیست', () => {
    expect(isTransientError(new Error('Invalid JSON structure'))).toBe(false)
    expect(isTransientError(new Error('quota'))).toBe(false)
  })
})

describe('quotaMessage — پیام شفاف فارسی', () => {
  test('پیام سقف روزانه بازنشانی و حالت بدون مدل را می‌گوید', () => {
    const m = quotaMessage('user_daily', 7)
    expect(m).toContain('سهمیه')
    expect(m).toContain('۷')
    expect(m).toContain('بدون مدل')
  })
  test('پیام سهمیه سامانه متفاوت است', () => {
    expect(quotaMessage('system_daily', 3)).toContain('کل سامانه')
  })
})
