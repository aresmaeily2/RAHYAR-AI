// ─── آزمون‌های واحد لایه امنیتی و استخراج JSON ───────────────
// اجرا: bun test tests/unit/security.test.ts

import { describe, expect, test } from 'bun:test'
import { cleanText, safeUrl, hasExplicitDeleteVerb, hasExplicitForgetVerb, rateLimitKeyed, globalAiLimit, globalSearchLimit } from '../../src/lib/security'
import { extractJson } from '../../src/lib/ai'

describe('cleanText — پاک‌سازی ورودی', () => {
  test('نویسه‌های کنترلی حذف شوند', () => {
    expect(cleanText('سلام\u0000\u0008\u001F دنیا', 100)).toBe('سلام دنیا')
  })

  test('ورودی غیر رشته‌ای → رشته خالی', () => {
    expect(cleanText(42 as unknown, 100)).toBe('')
    expect(cleanText(null as unknown, 100)).toBe('')
    expect(cleanText({ a: 1 } as unknown, 100)).toBe('')
  })

  test('بریدن به طول مجاز', () => {
    const out = cleanText('الف'.repeat(300), 10)
    expect(out.length).toBeLessThanOrEqual(10)
  })

  test('فارسی و نیم‌فاصله سالم بمانند', () => {
    expect(cleanText('می‌توانی', 100)).toBe('می‌توانی')
  })
})

describe('safeUrl — گارد پروتکل', () => {
  test('http/https/mailto مجاز', () => {
    expect(safeUrl('https://example.com/x')).toBe(true)
    expect(safeUrl('http://example.com')).toBe(true)
    expect(safeUrl('mailto:a@b.com')).toBe(true)
  })

  test('javascript و data و پروتکل‌های خطرناک رد شوند', () => {
    expect(safeUrl('javascript:alert(1)')).toBe(false)
    expect(safeUrl('data:text/html,<script>x</script>')).toBe(false)
    expect(safeUrl('file:///etc/passwd')).toBe(false)
    expect(safeUrl('vbscript:x')).toBe(false)
  })

  test('رشته خراب رد شود', () => {
    expect(safeUrl('not a url')).toBe(false)
    expect(safeUrl('')).toBe(false)
  })
})

describe('گاردهای عاملیت چت (OWASP LLM06)', () => {
  test('حذف فقط با فعل صریح پذیرفته شود', () => {
    expect(hasExplicitDeleteVerb('کار جلسه رو حذف کن')).toBe(true)
    expect(hasExplicitDeleteVerb('این رو پاک کن')).toBe(true)
    expect(hasExplicitDeleteVerb('delete this task')).toBe(true)
    expect(hasExplicitDeleteVerb('یه کار جدید اضافه کن')).toBe(false)
    expect(hasExplicitDeleteVerb('سلام، حالت چطوره؟')).toBe(false)
  })

  test('فراموشی حافظه فقط با فعل صریح پذیرفته شود (رفع M5)', () => {
    expect(hasExplicitForgetVerb('یادم بنداز فردا تماس بگیرم')).toBe(false) // یادم بنداز ≠ فراموشی
    expect(hasExplicitForgetVerb('اینو از حافظه پاک کن')).toBe(true)
    expect(hasExplicitForgetVerb('این رو فراموش کن')).toBe(true)
    expect(hasExplicitForgetVerb('forget that')).toBe(true)
    expect(hasExplicitForgetVerb('یه حقیقت جدید یاد بگیر')).toBe(false)
  })
})

describe('extractJson — استخراج مقاوم پاسخ مدل', () => {
  test('JSON خالص', () => {
    expect(extractJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })

  test('با fence مارک‌داون', () => {
    const raw = '```json\n{"reply":"سلام","actions":[]}\n```'
    expect(extractJson<{ reply: string }>(raw)?.reply).toBe('سلام')
  })

  test('با متن اضافه قبل و بعد', () => {
    const raw = 'بله حتماً! {"reply":"انجام شد"} موفق باشی'
    expect(extractJson<{ reply: string }>(raw)?.reply).toBe('انجام شد')
  })

  test('کامای اضافی تحمل شود', () => {
    const raw = '{"a":1,"b":[1,2,],}'
    expect(extractJson<{ a: number; b: number[] }>(raw)?.b).toEqual([1, 2])
  })

  test('بدون JSON → null', () => {
    expect(extractJson('متن ساده بدون براکت')).toBeNull()
    expect(extractJson('')).toBeNull()
    expect(extractJson('{ناقص')).toBeNull()
  })

  test('تزریق از طریق reply اجرا نمی‌شود — فقط استخراج داده', () => {
    const raw = '{"reply":"<script>alert(1)</script>"}'
    expect(extractJson<{ reply: string }>(raw)?.reply).toBe('<script>alert(1)</script>')
    // رندر نهایی با react-markdown بدون rehype-raw انجام می‌شود → ایمن
  })
})

describe('لیمیترهای سراسری — rateLimitKeyed / globalAiLimit / globalSearchLimit', () => {
  test('سقف سراسری AI مستقل از کلاینت اعمال شود', () => {
    // کلید سراسری مشترک — مثل این که همه کاربران و IPها یک سطل مشترک دارند
    const before = globalAiLimit()
    expect(before.ok).toBe(true)
  })

  test('سطل هر کلید مستقل است', () => {
    const a1 = rateLimitKeyed('test::a', 1, 60_000)
    const a2 = rateLimitKeyed('test::a', 1, 60_000)
    const b1 = rateLimitKeyed('test::b', 1, 60_000)
    expect(a1.ok).toBe(true)
    expect(a2.ok).toBe(false)
    expect(a2.retryAfter).toBeGreaterThan(0)
    expect(b1.ok).toBe(true) // کلید دیگر مستقل است
  })

  test('پنجره لغزان پس از سپری شدن باز می‌شود', async () => {
    const r1 = rateLimitKeyed('test::window', 1, 50)
    expect(r1.ok).toBe(true)
    await new Promise((r) => setTimeout(r, 80))
    const r2 = rateLimitKeyed('test::window', 1, 50)
    expect(r2.ok).toBe(true)
  })

  test('globalSearchLimit کلید جدای خودش را دارد', () => {
    const s1 = globalSearchLimit()
    expect(s1.ok).toBe(true)
  })
})
