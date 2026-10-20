// ─── آزمون احراز هویت — scrypt و سیاست رمز (بخش ۴ و ۱۲ دستور) ──
import { describe, expect, test } from 'bun:test'
import {
  hashPassword,
  verifyPassword,
  isSetupPending,
  passwordPolicyOk,
  SETUP_SENTINEL,
  ownerSetupClaimData,
} from '@/lib/auth'

describe('hashPassword / verifyPassword', () => {
  test('رفت‌وبرگشت رمز درست', () => {
    const h = hashPassword('رمز-امن-۱۲۳۴')
    expect(h.startsWith('s1:')).toBe(true)
    expect(verifyPassword('رمز-امن-۱۲۳۴', h)).toBe(true)
  })
  test('رمز اشتباه رد می‌شود', () => {
    const h = hashPassword('رمز-امن-۱۲۳۴')
    expect(verifyPassword('رمز-غلط', h)).toBe(false)
  })
  test('نمک تصادفی — دو هش از یک رمز یکسان نیستند', () => {
    const a = hashPassword('same-password')
    const b = hashPassword('same-password')
    expect(a).not.toBe(b)
    expect(verifyPassword('same-password', a)).toBe(true)
    expect(verifyPassword('same-password', b)).toBe(true)
  })
  test('ورودی خراب هرگز کرش نمی‌کند', () => {
    expect(verifyPassword('x', '')).toBe(false)
    expect(verifyPassword('x', 'garbage')).toBe(false)
    expect(verifyPassword('x', 's1:zz:zz')).toBe(false)
  })
})

describe('راه‌اندازی اولیه', () => {
  test('نگه‌دارنده SETUP_REQUIRED فقط برای راه‌اندازی اولیه است', () => {
    expect(isSetupPending(SETUP_SENTINEL)).toBe(true)
    expect(isSetupPending(hashPassword('real'))).toBe(false)
    // نگه‌دارنده هرگز به‌عنوان رمز معتبر پذیرفته نمی‌شود
    expect(verifyPassword(SETUP_SENTINEL, SETUP_SENTINEL)).toBe(false)
  })
})

describe('سیاست رمز', () => {
  test('حداقل ۸ نویسه', () => {
    expect(passwordPolicyOk('12345678')).toBe(true)
    expect(passwordPolicyOk('1234567')).toBe(false)
    expect(passwordPolicyOk(undefined)).toBe(false)
    expect(passwordPolicyOk(12345678)).toBe(false)
    expect(passwordPolicyOk('x'.repeat(129))).toBe(false)
  })
})

describe('ادعای راه‌اندازی مالک (رگرسیون نصب تازه — GRAND-F1)', () => {
  test('ادعای setup نقش OWNER را تعیین می‌کند — وگرنه مالک تازه‌نصب از مدیریت کاربران قفل می‌ماند', () => {
    const data = ownerSetupClaimData('مالک', 'hashed-x')
    expect(data.role).toBe('OWNER')
    expect(data.passwordHash).toBe('hashed-x')
    expect(data.displayName).toBe('مالک')
  })
  test('خروجی فقط فیلدهای مجاز claim را دارد (بدون نشت فیلد اضافی)', () => {
    const data = ownerSetupClaimData('مالک', 'hashed-x')
    expect(Object.keys(data).sort()).toEqual(['displayName', 'passwordHash', 'role'])
  })
})
