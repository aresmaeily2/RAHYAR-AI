// ─── آزمون‌های واحد F2-AG (مأموریت تکمیلی §۳) +Voice ───────────
// فقط منطق خالص (تست‌های unit اتصال DB برقرار نمی‌کنند — اثر DB در
// اسکریپت زندهٔ fag2-scenarios-live.ts با راستی‌آزمایی سخت سنجیده می‌شود).
import { describe, expect, test } from 'bun:test'
import { CONFIRM_RE, CANCEL_RE } from '../../src/lib/assistant/pending-action'
import { REMINDER_VERBS } from '../../src/lib/assistant/router'
import { speechInputSupported, speechOutputSupported, hasVoiceFor } from '../../src/lib/voice/speech'

describe('F2-AG: ماشین-وضعیت تأیید — الگوهای تأیید/انصراف', () => {
  test('تأیید: بله/تأیید/حتما/yes/confirm', () => {
    for (const m of ['بله', 'بله حذفش کن', 'تأیید', 'تایید می کنم', 'حتماً', 'yes', 'Confirm it']) {
      expect(CONFIRM_RE.test(m)).toBe(true)
    }
  })
  test('تأییدِ نیمه‌جمله نباید اشتباهی بخورد (مرز واژه)', () => {
    expect(CONFIRM_RE.test('بلندتر بنویس')).toBe(false)
    expect(CONFIRM_RE.test('حذفش کن')).toBe(false) // بدون «بله» → تأیید نیست
  })
  test('انصراف: انصراف/لغو/نه/cancel', () => {
    for (const m of ['انصراف', 'لغو', 'نه', 'بی خیال', 'cancel', 'Nevermind']) {
      expect(CANCEL_RE.test(m)).toBe(true)
    }
  })
  test('«نه» در ابتدای جملهٔ عادی نباید انصراف بخورد مگر پیام مستقل باشد', () => {
    // الگو فقط ابتدای پیام را می‌بیند — «نه» مستقل انصراف است:
    expect(CANCEL_RE.test('نه')).toBe(true)
    // اما «نمیدونم» شروع‌شده با «ن» جور درنمی‌آید:
    expect(CANCEL_RE.test('نمیدونم')).toBe(false)
  })
})

describe('F2-AG: گارد سخت‌گیرانهٔ یادآور — REMINDER_VERBS صادر می‌شود', () => {
  test('افعال یادآوری فارسی شناسایی می‌شوند', () => {
    expect(REMINDER_VERBS.test('یک ساعت قبل یادم بنداز')).toBe(true)
    expect(REMINDER_VERBS.test('لطفا یادآوری کن')).toBe(true)
  })
  test('پیام بدون فعل یادآوری → گارد add_task تنهایی کافی است', () => {
    expect(REMINDER_VERBS.test('قرار فردا را به تقویم اضافه کن')).toBe(false)
  })
})

describe('Voice: کاهش-lایق در محیط بدون مرورگر (سندباکس)', () => {
  test('بدون window/شناخت گفتار → false و نه exception', () => {
    expect(speechInputSupported()).toBe(false)
    expect(speechOutputSupported()).toBe(false)
    expect(hasVoiceFor('fa')).toBe(false)
    expect(hasVoiceFor('en')).toBe(false)
  })
})
