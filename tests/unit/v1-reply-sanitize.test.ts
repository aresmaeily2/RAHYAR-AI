// ─── آزمون‌های واحد V1-P3 — D-6: جداسازی خروجی نمایشی از payload داخلی ───
// یافتهٔ زندهٔ P8-8 (۱۲:۵۱) و S1/S5/S6 (۱۲:۵۸): JSON خام اکشن در متن پاسخ نشت کرد.
// این تست‌ها فارسی و انگلیسی، تاریخچهٔ قدیمی، پاسخ ناقص، JSON نامعتبر و پاسخ
// دارای اکشن را پوشش می‌دهند — همهٔ خالص (بدون DB).
import { describe, expect, test } from 'bun:test'
import {
  sanitizeReplyForDisplay,
  safeDisplayContent,
  displayFallback,
  HIDDEN_TECH_REPLY_FA,
  HIDDEN_TECH_REPLY_EN,
} from '../../src/lib/assistant/reply-sanitize'

describe('V1-P3 D-6: JSON اکشن داخل متن — حذف payload، حفظ نثر', () => {
  test('fa: prose + آبجکت اکشن در انتها → فقط prose می‌ماند', () => {
    const raw = 'متوجه شدم — یادآورهای قبلی را حذف می‌کنم. {"type":"delete_task","taskId":"cmw123"}'
    const out = sanitizeReplyForDisplay(raw, false)
    expect(out).toContain('متوجه شدم')
    expect(out).not.toContain('delete_task')
    expect(out).not.toContain('{')
  })
  test('fa: prose + JSON اکشن در وسط متن', () => {
    const raw = 'انجام شد {"type":"add_reminder","message":"تماس با دکتر","remindAt":"2026-11-09T05:30:00.000Z"} برای فردا'
    const out = sanitizeReplyForDisplay(raw, true)
    expect(out).toContain('انجام شد')
    expect(out).toContain('برای فردا')
    expect(out).not.toContain('remindAt')
  })
  test('en: prose + action JSON inline', () => {
    const raw = 'Done! {"type":"add_task","title":"Buy milk"} added to tomorrow.'
    const out = sanitizeReplyForDisplay(raw, false)
    expect(out).toContain('Done!')
    expect(out).toContain('added to tomorrow')
    expect(out).not.toContain('add_task')
  })
  test('آرایهٔ اکشن‌های خام هم حذف می‌شود', () => {
    const raw = 'ثبت شد [{"type":"add_task","title":"خرید"},{"type":"add_reminder","message":"جلسه"}] با موفقیت'
    const out = sanitizeReplyForDisplay(raw, false)
    expect(out).toContain('ثبت شد')
    expect(out).toContain('با موفقیت')
    expect(out).not.toContain('add_reminder')
  })
})

describe('V1-P3 D-6: کلِ پاسخ payload فنی بود', () => {
  test('تک‌شیء اکشن → خالی (caller fallback می‌گذارد)', () => {
    expect(sanitizeReplyForDisplay('{"type":"plan_day"}', false)).toBe('')
  })
  test('wrapper {reply, actions} → متن reply بازیابی می‌شود', () => {
    const raw = JSON.stringify({ reply: 'یادآور ثبت شد.', actions: [{ type: 'add_reminder', ok: true }], followups: [] })
    expect(sanitizeReplyForDisplay(raw, true)).toBe('یادآور ثبت شد.')
  })
  test('wrapper بدون reply → خالی', () => {
    const raw = JSON.stringify({ actions: [{ type: 'plan_day', ok: true }], followups: [], sources: [] })
    expect(sanitizeReplyForDisplay(raw, false)).toBe('')
  })
  test('safeDisplayContent برای پیام قدیمیِ آلوده → fallback صادقانه (بدون payload)', () => {
    const out = safeDisplayContent('{"type":"delete_task","taskId":"x"}', false)
    expect(out).not.toContain('delete_task')
    expect(out).toContain('پنهان')
    expect(out).toContain('hidden technical reply')
  })
})

describe('V1-P3 D-6: JSON نامعتبر / پاسخ ناقص — بدون کرش، بدون متن فنی', () => {
  test('JSON ناقصِ شکل-اکشن → تا انتها بریده می‌شود', () => {
    const raw = 'یادآوری ثبت شد. {"type":"add_task","title":"ناک'
    const out = sanitizeReplyForDisplay(raw, false)
    expect(out).toBe('یادآوری ثبت شد.')
  })
  test('براکت‌های شکسته و متن نامنظم → کرش نمی‌کند', () => {
    const raw = 'پاسخ {{{ ناقص [["type":"add_task" }} بی‌پایان'
    const out = sanitizeReplyForDisplay(raw, false)
    expect(typeof out).toBe('string')
    expect(out).not.toContain('add_task')
  })
  test('JSON غیر-اکشن (محتوای مشروع) دست‌نخورده می‌ماند', () => {
    const raw = 'نمونه: {"name":"علی","city":"تهران"} — مثال بود.'
    expect(sanitizeReplyForDisplay(raw, false)).toBe(raw)
  })
  test('idempotent — دوبار پاکسازی = یک‌بار', () => {
    const raw = 'متوجه شدم {"type":"delete_task","taskId":"x"} پایان'
    const once = sanitizeReplyForDisplay(raw, false)
    expect(sanitizeReplyForDisplay(once, false)).toBe(once)
  })
})

describe('V1-P3 D-6: پسوند تقلیدی «(اکشن‌ها اجرا شد)» در نمایش', () => {
  test('بدون اکشن واقعی → حذف', () => {
    const out = sanitizeReplyForDisplay('پس‌فردا هیچ قراری ندارید. (اکشن‌ها اجرا شد)', false)
    expect(out).toBe('پس‌فردا هیچ قراری ندارید.')
  })
  test('با اکشن واقعی → حفظ', () => {
    const raw = 'یادآوری ثبت شد. (اکشن‌ها اجرا شد)'
    expect(sanitizeReplyForDisplay(raw, true)).toBe(raw)
  })
})

describe('V1-P3 D-6: fallbackهای دوزبانه', () => {
  test('fa/en fallback — هیچ ادعای موفقیت ندارند', () => {
    for (const t of [displayFallback('fa'), displayFallback('fa'), HIDDEN_TECH_REPLY_FA, HIDDEN_TECH_REPLY_EN]) {
      expect(t).not.toContain('انجام شد')
      expect(t).not.toContain('ثبت شد')
      expect(t.toLowerCase()).not.toContain('done —')
    }
    expect(displayFallback('en')).toBe(HIDDEN_TECH_REPLY_EN)
    expect(displayFallback('fa')).toBe(HIDDEN_TECH_REPLY_FA)
  })
})
