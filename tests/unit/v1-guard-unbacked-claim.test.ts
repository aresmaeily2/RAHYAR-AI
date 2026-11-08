// ─── آزمون‌های واحد V1-P2 — گارد صداقت (ادعای بدون اثر) ───
// یافتهٔ زندهٔ P8-7: مدل با اکشن ok:false یا بدون اکشن، ادعای «حذف شد» می‌کرد —
// CLAIMS_WRITE الگوهای حذف را پوشش نمی‌داد (اصلاح‌شده).
import { describe, expect, test } from 'bun:test'
import { guardUnbackedClaim, guardUnbackedClaimForUser } from '../../src/lib/server-ai'
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
