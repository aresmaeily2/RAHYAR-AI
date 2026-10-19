// ─── آزمون‌های ارتقای GU2 — هر آزمون یک یافتهٔ ممیزی را قفل می‌کند ──
import { describe, expect, test } from 'bun:test'
import { checkSetupToken } from '../../src/lib/auth'
import { classifyIp, endpointHostAllowed } from '../../src/lib/ai/providers/types'
import { rateLimitKeyed } from '../../src/lib/security'

describe('GU2-SEC1 — توکن راه‌اندازی اولیه', () => {
  test('تولید بدون توکن پیکربندی‌شده → fail-closed', () => {
    expect(checkSetupToken(undefined, { NODE_ENV: 'production' })).toBe('missing_config')
  })
  test('تولید با RAHYAR_ALLOW_OPEN_SETUP=1 → باز (صریح)', () => {
    expect(checkSetupToken(undefined, { NODE_ENV: 'production', RAHYAR_ALLOW_OPEN_SETUP: '1' })).toBe('ok')
  })
  test('توسعه بدون توکن → رفتار قبلی حفظ', () => {
    expect(checkSetupToken(undefined, { NODE_ENV: 'development' })).toBe('ok')
  })
  test('توکن درست/غلط/خالی', () => {
    const env = { NODE_ENV: 'production', RAHYAR_SETUP_TOKEN: 'abc123-secret-xyz' }
    expect(checkSetupToken('abc123-secret-xyz', env)).toBe('ok')
    expect(checkSetupToken(' abc123-secret-xyz ', env)).toBe('ok')
    expect(checkSetupToken('abc123-secret-xy', env)).toBe('invalid')
    expect(checkSetupToken('', env)).toBe('invalid')
    expect(checkSetupToken(42, env)).toBe('invalid')
  })
  test('وقتی توکن تعریف شده، در توسعه هم الزامی است', () => {
    expect(checkSetupToken(undefined, { NODE_ENV: 'development', RAHYAR_SETUP_TOKEN: 'x'.repeat(20) })).toBe('invalid')
  })
})

describe('GU2-SEC3 — گارد SSRF برای Endpoint', () => {
  test('متادیتای ابری و link-local همیشه مسدود', () => {
    expect(classifyIp('169.254.169.254')).toBe('blocked')
    expect(classifyIp('::ffff:169.254.169.254')).toBe('blocked')
    expect(classifyIp('100.100.100.200')).toBe('blocked')
    expect(classifyIp('fe80::1')).toBe('blocked')
    expect(classifyIp('fd00:ec2::254')).toBe('blocked')
    expect(classifyIp('0.0.0.0')).toBe('blocked')
    expect(endpointHostAllowed('metadata.google.internal', [], true)).toBe(false)
    expect(endpointHostAllowed('evil.example', ['169.254.169.254'], true)).toBe(false)
  })
  test('loopback/خصوصی: مجاز با allowPrivate، مسدود بدون آن', () => {
    expect(classifyIp('127.0.0.1')).toBe('private')
    expect(classifyIp('192.168.1.5')).toBe('private')
    expect(classifyIp('::1')).toBe('private')
    expect(endpointHostAllowed('localhost', ['127.0.0.1'], true)).toBe(true)
    expect(endpointHostAllowed('localhost', ['127.0.0.1'], false)).toBe(false)
    expect(endpointHostAllowed('10.0.0.8', [], false)).toBe(false)
  })
  test('آدرس عمومی مجاز', () => {
    expect(classifyIp('8.8.8.8')).toBe('public')
    expect(endpointHostAllowed('api.example.com', ['93.184.216.34'], false)).toBe(true)
  })
  test('DNS rebinding جزئی: اگر یکی از IPها مسدود باشد کل میزبان رد می‌شود', () => {
    expect(endpointHostAllowed('mixed.example', ['93.184.216.34', '169.254.169.254'], true)).toBe(false)
  })
})

describe('GU2-SEC2 — سقف ورود به ازای حساب', () => {
  test('بیستمین تلاش مجاز، بیست‌ویکمین رد', () => {
    const key = `login-acct::test-${Math.random()}`
    for (let i = 0; i < 20; i++) expect(rateLimitKeyed(key, 20, 15 * 60_000).ok).toBe(true)
    expect(rateLimitKeyed(key, 20, 15 * 60_000).ok).toBe(false)
  })
})
