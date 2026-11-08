// ─── آزمون‌های واحد V1-P2 — گارد صداقت (ادعای بدون اثر) ───
// یافتهٔ زندهٔ P8-7: مدل با اکشن ok:false یا بدون اکشن، ادعای «حذف شد» می‌کرد —
// CLAIMS_WRITE الگوهای حذف را پوشش نمی‌داد (اصلاح‌شده).
import { describe, expect, test } from 'bun:test'
import { guardUnbackedClaim, guardUnbackedClaimForUser, MUTATING_ACTION_TYPES } from '../../src/lib/server-ai'
import type { ChatAction } from '../../src/lib/types'

describe('V1-P2: guardUnbackedClaim — ادعای حذف بدون اثر', () => {
  test('ادعای «حذف شد» با اکشن ok:false → یادداشت صادقانه اضافه می‌شود', () => {
    const actions = [{ type: 'delete_task', ok: false, note: 'کار پیدا نشد' }] as unknown as ChatAction[]
    const out = guardUnbackedClaim("یادآور 'امتحان-کاربر۲' حذف شد.", actions, 'fa')
    expect(out).toContain('حذف شد')
    expect(out).toContain('راستی‌آزمایی صادقانه')
    expect(out).toContain('هیچ تغییری واقعاً ذخیره نشد')
  })
  test('ادعای «حذف شد» بدون هیچ اکشن → یادداشت صادقانه', () => {
    const out = guardUnbackedClaim('یادآور با موفقیت حذف شد.', [], 'fa')
    expect(out).toContain('راستی‌آزمایی صادقانه')
  })
  test('ادعای حذف با اکشن موفق ok:true → پاسخ دست‌نخورده', () => {
    const actions = [{ type: 'delete_task', ok: true }] as unknown as ChatAction[]
    const out = guardUnbackedClaim('یادآور حذف شد.', actions, 'fa')
    expect(out).toBe('یادآور حذف شد.')
  })
  test('ادعای «deleted» انگلیسی بدون اکشن → یادداشت', () => {
    const out = guardUnbackedClaim('The reminder was deleted successfully.', [], 'en')
    expect(out.toLowerCase()).toContain('honest verification')
  })
  test('ادعای ثبت با اکشن موفق → پاسخ دست‌نخورده (رفتار قبلی حفظ شده)', () => {
    const actions = [{ type: 'add_task', ok: true }] as unknown as ChatAction[]
    const out = guardUnbackedClaim('کار جدید ثبت شد.', actions, 'fa')
    expect(out).toBe('کار جدید ثبت شد.')
  })
})

describe('V1-P2: پسوند تقلیدی «(اکشن‌ها اجرا شد)» بدون اکشن', () => {
  test('پسوند بدون هیچ اکشن حذف می‌شود', () => {
    const out = guardUnbackedClaim('پس‌فردا هیچ قراری ندارید. (اکشن‌ها اجرا شد)', [], 'fa')
    expect(out).not.toContain('اکشن‌ها اجرا شد')
    expect(out).toContain('هیچ قراری ندارید')
  })
  test('پسوند با اکشن موفق حفظ می‌شود (ادعای پشتیبانی‌شده)', () => {
    const actions = [{ type: 'add_reminder', ok: true }] as unknown as ChatAction[]
    const out = guardUnbackedClaim('یادآوری ثبت شد. (اکشن‌ها اجرا شد)', actions, 'fa')
    expect(out).toContain('اکشن‌ها اجرا شد')
  })
})

describe('V1-P2: گیت پیام کنش‌محور (یافتهٔ زندهٔ S5)', () => {
  test('پرسش خواندنی که به رکورد موجود اشاره می‌کند — هشدار نمی‌گیرد', () => {
    const out = guardUnbackedClaimForUser('فهرست کارهای فردای من را بخوان', 'یادآوری تماس با دکتر ساعت 9 هم ثبت شده.', [], 'fa')
    expect(out).not.toContain('راستی‌آزمایی')
  })
  test('پیام کنش‌محور با ادعای حذف بدون اکشن — هشدار می‌گیرد', () => {
    const out = guardUnbackedClaimForUser("یادآور 'X' را حذف کن", 'یادآور X حذف شد.', [], 'fa')
    expect(out).toContain('راستی‌آزمایی')
  })
  test('پیام کنش‌محور با اکشن موفق — پاسخ دست‌نخورده', () => {
    const actions = [{ type: 'add_reminder', ok: true }] as unknown as ChatAction[]
    const out = guardUnbackedClaimForUser('فردا ساعت ۹ یادم بنداز دکتر', 'یادآوری ثبت شد.', actions, 'fa')
    expect(out).toBe('یادآوری ثبت شد.')
  })
})

describe('V1-P2: ادعای plan بدون اثر (یافتهٔ زندهٔ S6)', () => {
  test('«مرتب شد» با plan_day ok=false → هشدار صادقانه', () => {
    const actions = [{ type: 'plan_day', ok: false }] as unknown as ChatAction[]
    const out = guardUnbackedClaimForUser('برنامه‌ام را برای فردا مرتب کن', 'برنامه فردا مرتب شد.', actions, 'fa')
    expect(out).toContain('راستی‌آزمایی')
  })
  test('«مرتب شد» با plan_day ok=true → پاسخ دست‌نخورده', () => {
    const actions = [{ type: 'plan_day', ok: true }] as unknown as ChatAction[]
    const out = guardUnbackedClaimForUser('برنامه‌ام را برای فردا مرتب کن', 'برنامه فردا مرتب شد.', actions, 'fa')
    expect(out).toBe('برنامه فردا مرتب شد.')
  })
})


describe('V1-P3 D-7: افعال به‌روزرسانی (یافتهٔ زندهٔ P6 سناریوهای P — «تغییر دادم» بدون اثر)', () => {
  test('«تغییر دادم» با update_task ok=false → یادداشت صادقانه', () => {
    const actions = [{ type: 'update_task', ok: false, note: 'کار پیدا نشد' }] as unknown as ChatAction[]
    const out = guardUnbackedClaim('تماس با دکتر را به ساعت ۱۰:۰۰ فردا تغییر دادم.', actions, 'fa')
    expect(out).toContain('تغییر دادم')
    expect(out).toContain('راستی‌آزمایی صادقانه')
    expect(out).toContain('هیچ تغییری واقعاً ذخیره نشد')
  })
  test('«اصلاح کردم» / «جابه‌جا کردم» بدون اکشن → یادداشت', () => {
    expect(guardUnbackedClaim('یادآور را اصلاح کردم.', [], 'fa')).toContain('راستی‌آزمایی')
    expect(guardUnbackedClaim('جلسه را جابه‌جا کردم.', [], 'fa')).toContain('راستی‌آزمایی')
    expect(guardUnbackedClaim('به‌روزرسانی شد.', [], 'fa')).toContain('راستی‌آزمایی')
  })
  test('en: updated / changed / rescheduled بدون اکشن → یادداشت', () => {
    for (const r of ['The task was updated successfully.', 'Your schedule changed.', 'It has been rescheduled to 9am.']) {
      expect(guardUnbackedClaim(r, [], 'en').toLowerCase()).toContain('honest verification')
    }
  })
  test('«تغییر دادم» با update_task ok=true → پاسخ دست‌نخورده', () => {
    const actions = [{ type: 'update_task', ok: true }] as unknown as ChatAction[]
    const out = guardUnbackedClaim('ساعت یادآور را تغییر دادم.', actions, 'fa')
    expect(out).not.toContain('راستی‌آزمایی')
  })
  test('«جابه‌جا کردم» با snooze_task ok=true → دست‌نخورده (پشتوانهٔ هم‌دسته)', () => {
    const actions = [{ type: 'snooze_task', ok: true }] as unknown as ChatAction[]
    expect(guardUnbackedClaim('کار برای فردا جابه‌جا کردم.', actions, 'fa')).not.toContain('راستی‌آزمایی')
  })
  test('گیت پیام کنش‌محور: «اصلاح کن» هم کنش‌محور است', () => {
    const out = guardUnbackedClaimForUser('یادآور دکتر را اصلاح کن', 'اصلاح شد.', [], 'fa')
    expect(out).toContain('راستی‌آزمایی')
  })
  test('فرمان آینده/پرسش → false-positive ندارد («تغییر بدهم؟»، «برای لغو بنویسید»)', () => {
    expect(guardUnbackedClaim('می‌خواهید ساعت را تغییر بدهم؟', [], 'fa')).not.toContain('راستی‌آزمایی')
    expect(guardUnbackedClaim('برای لغو بنویسید انصراف.', [], 'fa')).not.toContain('راستی‌آزمایی')
  })
})

describe('V1-P3 D-7: ارزیابی جداگانهٔ هر دستهٔ ادعا (چند اکشن)', () => {
  test('ادعای حذف بدون پشتوانه + ادعای ساختِ پشتیبانی‌شده → یادداشت (فقط حذف بی‌پشتوانه است)', () => {
    const actions = [{ type: 'add_task', ok: true }] as unknown as ChatAction[]
    const out = guardUnbackedClaim('کار قدیمی حذف شد و کار جدید ثبت شد.', actions, 'fa')
    expect(out).toContain('راستی‌آزمایی')
    expect(out).toContain('حذف شد')
  })
  test('«لغو شد» در مسیر مدل هرگز پشتوانه ندارد → یادداشت صادقانه', () => {
    expect(guardUnbackedClaim('ثبت هزینه لغو شد.', [], 'fa')).toContain('راستی‌آزمایی')
    expect(guardUnbackedClaim('The reminder was cancelled.', [], 'en').toLowerCase()).toContain('honest verification')
  })
  test('«انجام شد» با اکشن تغییردهندهٔ موفق → دست‌نخورده؛ بدون اکشن → یادداشت', () => {
    const okDel = [{ type: 'delete_task', ok: true }] as unknown as ChatAction[]
    expect(guardUnbackedClaim('انجام شد — کار «خرید» حذف شد.', okDel, 'fa')).not.toContain('راستی‌آزمایی')
    expect(guardUnbackedClaim('انجام شد.', [], 'fa')).toContain('راستی‌آزمایی')
    expect(guardUnbackedClaim('Done — task removed.', [], 'en').toLowerCase()).toContain('honest verification')
  })
  test('فهرست مرجع اکشن‌های تغییردهنده صادر شده و کامل است', () => {
    for (const t of ['add_task', 'add_reminder', 'remember', 'breakdown_task', 'complete_task', 'update_task', 'delete_task', 'star_task', 'snooze_task', 'plan_day']) {
      expect(MUTATING_ACTION_TYPES).toContain(t as (typeof MUTATING_ACTION_TYPES)[number])
    }
  })
})
