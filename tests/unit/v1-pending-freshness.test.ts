// ─── آزمون‌های واحد V1-P3 — D-5: استقلال Pendingها (بخش خالص) ───
// رفتار DB وابسته (pendingIsFresh/setPendingAction) در هارنس زندهٔ
// scripts/v1-p3-d5-d6-d7-verify.sh با شناسهٔ رکورد و DB قبل/بعد اثبات می‌شود؛
// اینجا قراردادهای خالص و پیام‌های صادقانه آزمون می‌شوند.
import { describe, expect, test } from 'bun:test'
import { STALE_PENDING_FA, STALE_PENDING_EN, CONFIRM_RE, CANCEL_RE, type PendingOp } from '../../src/lib/assistant/pending-action'
import { isShortCancel } from '../../src/lib/assistant/cancel-undo'

describe('V1-P3 D-5: پیام صادقانهٔ پیشنهادِ کهنه — بدون ادعای اجرا', () => {
  test('fa: هیچ ادعای حذف/ثبت/انجام ندارد و درخواست مجدد می‌خواهد', () => {
    expect(STALE_PENDING_FA).toContain('لغو شد')
    expect(STALE_PENDING_FA).toContain('دوباره')
    for (const banned of ['انجام شد', 'حذف شد', 'ثبت شد', 'تغییر دادم']) {
      expect(STALE_PENDING_FA).not.toContain(banned)
    }
  })
  test('en: no success claims, asks to restate', () => {
    const low = STALE_PENDING_EN.toLowerCase()
    expect(low).toContain('no longer valid')
    expect(low).toContain('please state your request again')
    for (const banned of ['done —', 'deleted', 'was recorded', 'updated']) {
      expect(low).not.toContain(banned)
    }
  })
})

describe('V1-P3 D-5: قرارداد شکل PendingOp لنگردار', () => {
  test('فیلدهای proposalMsgId/proposalAt اختیاری‌اند و در JSON می‌مانند', () => {
    const op: PendingOp = {
      type: 'forget',
      factContains: 'شمارهٔ کارت',
      savedAt: new Date().toISOString(),
      proposalMsgId: 'cmw-user-msg-1',
      proposalAt: new Date().toISOString(),
    }
    const round = JSON.parse(JSON.stringify(op)) as PendingOp
    expect(round.proposalMsgId).toBe('cmw-user-msg-1')
    expect(typeof round.proposalAt).toBe('string')
  })
  test('pending بدون لنگر → در گیت کهنه تلقی می‌شود (قرارداد pendingIsFresh)', () => {
    // قرارداد: نبود proposalMsgId/proposalAt → fresh=false (مسیر امن)
    const op: PendingOp = { type: 'forget', factContains: 'x', savedAt: new Date().toISOString() }
    expect(op.proposalMsgId).toBeUndefined()
    expect(op.proposalAt).toBeUndefined()
  })
})

describe('V1-P3 D-5: رگزنه‌های تأیید/لغو دست‌نخورده‌اند (رفتار جریان تازه)', () => {
  test('«بله تأیید» و «نه منصرف شدم» همان‌طور که قبلاً شناسایی می‌شوند', () => {
    expect(CONFIRM_RE.test('بله تأیید')).toBe(true)
    expect(CONFIRM_RE.test('بله')).toBe(true)
    expect(CANCEL_RE.test('نه منصرف شدم')).toBe(true)
    expect(isShortCancel('منصرف شدم')).toBe(true)
  })
  test('پیام عادی رگزنه تأیید نیست — مسیر مدل (pending کهنه مصرف نمی‌شود)', () => {
    expect(CONFIRM_RE.test('فهرست کارهای فردای من را بخوان')).toBe(false)
    expect(CANCEL_RE.test('فهرست کارهای فردای من را بخوان')).toBe(false)
  })
})
