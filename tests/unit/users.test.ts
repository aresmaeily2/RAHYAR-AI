// ─── آزمون‌های واحد لایه مدیریت کاربران (مأموریت چندکاربره) ──
// اجرا: bun test tests/unit/users.test.ts

import { describe, expect, test } from 'bun:test'
import {
  validateUsername,
  generatePassword,
  csvCell,
  csvRow,
  parseUsersCsv,
  MAX_USERS,
} from '../../src/lib/users'

describe('validateUsername — قواعد نام کاربری', () => {
  test('نام‌های معتبر پذیرفته می‌شوند', () => {
    expect(validateUsername('sara')).toBe(true)
    expect(validateUsername('ali.rezaei')).toBe(true)
    expect(validateUsername('user_01')).toBe(true)
    expect(validateUsername('user-01')).toBe(true)
  })
  test('نام‌های نامعتبر رد می‌شوند', () => {
    expect(validateUsername('ab')).toBe(false) // کوتاه
    expect(validateUsername('a'.repeat(41))).toBe(false) // بلند
    expect(validateUsername('owner')).toBe(false) // رزروشده
    expect(validateUsername('OWNER')).toBe(false) // رزروشده (case-insensitive)
    expect(validateUsername('-leading')).toBe(false) // شروع با خط تیره
    expect(validateUsername('has space')).toBe(false)
    expect(validateUsername('فارسی')).toBe(false) // فقط لاتین
    expect(validateUsername(null)).toBe(false)
    expect(validateUsername(123)).toBe(false)
  })
})

describe('generatePassword — رمز اولیه', () => {
  test('طول و تنوع کافی دارد', () => {
    for (let i = 0; i < 20; i++) {
      const p = generatePassword()
      expect(p.length).toBeGreaterThanOrEqual(12)
      expect(/[A-Z]/.test(p)).toBe(true)
      expect(/[a-z]/.test(p)).toBe(true)
      expect(/[0-9]/.test(p)).toBe(true)
      // بدون نویسه‌های گیج‌کننده
      expect(/[O0oIl1]/.test(p)).toBe(false)
    }
  })
  test('تکراری تولید نمی‌کند (احتمال عملی صفر)', () => {
    const set = new Set(Array.from({ length: 50 }, () => generatePassword()))
    expect(set.size).toBe(50)
  })
})

describe('csvCell — گارد تزریق فرمول', () => {
  test('سلول‌های خطرناک با اپستروف خنثی می‌شوند', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell('+1')).toBe("'+1")
    expect(csvCell('-1')).toBe("'-1")
    expect(csvCell('@x')).toBe("'@x")
    expect(csvCell('سالم')).toBe('سالم')
  })
  test('کوتیشن دوتایی escape می‌شود', () => {
    expect(csvRow(['a"b'])).toBe('"a""b"\r\n')
  })
})

describe('parseUsersCsv — ورود گروهی', () => {
  test('۲۰ کاربر با رمز خالی پارس می‌شوند', () => {
    const lines = ['username,displayName,password']
    for (let i = 1; i <= 20; i++) lines.push(`user${String(i).padStart(2, '0')},کاربر ${i},`)
    const { rows, errors } = parseUsersCsv(lines.join('\n'))
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(20)
    expect(rows[0].username).toBe('user01')
    expect(rows[0].password).toBe('')
  })
  test('ردیف‌های خراب به‌عنوان خطا گزارش می‌شوند نه کرش', () => {
    const { rows, errors } = parseUsersCsv('user_ok,علی,\n,x بدون نام,\nbad pw!,,,x')
    expect(rows.some((r) => r.username === 'user_ok')).toBe(true)
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })
  test('سقف ردیف رعایت می‌شود', () => {
    const many = Array.from({ length: 80 }, (_, i) => `u${i},ن,`).join('\n')
    const { rows, errors } = parseUsersCsv(many)
    expect(rows.length).toBeLessThanOrEqual(50)
    expect(errors.length).toBeGreaterThan(0)
  })
  test('CSV خالی خطا می‌دهد نه استثنا', () => {
    const { rows, errors } = parseUsersCsv('')
    expect(rows).toHaveLength(0)
    expect(errors.length).toBe(1)
  })
  test('سقف کل کاربران تعریف شده است', () => {
    expect(MAX_USERS).toBeGreaterThanOrEqual(21)
  })
})
