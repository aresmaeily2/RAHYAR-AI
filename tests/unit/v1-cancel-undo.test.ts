// ─── آزمون‌های واحد V1-P2 — لغو پس از ثبتِ فوری (یافتهٔ P8) + زمینهٔ یادآورها (P6) ───
// فقط منطق خالص — اثر DB در اسکریپت زندهٔ v1-voice-scenarios-p2.sh سنجیده می‌شود.
import { describe, expect, test } from 'bun:test'
import {
  extractUndoable,
  undoReply,
  isShortCancel,
  MAX_CANCEL_LEN,
  UNDO_WINDOW_MS,
  type UndoableTarget,
} from '../../src/lib/assistant/cancel-undo'
import { buildChatSystemPrompt, type UpcomingReminderT } from '../../src/lib/server-ai'

describe('V1-P2: استخراج هدفِ undo از اکشن‌ها — خالص', () => {
  test('add_reminder با ok=true → هدف یادآور', () => {
    const t = extractUndoable([{ type: 'add_reminder', ok: true, reminder: { id: 'r1', message: 'تماس با دکتر' } }])
    expect(t).toEqual({ kind: 'reminder', id: 'r1', label: 'تماس با دکتر' })
  })
  test('add_task با ok=true → هدف کار', () => {
    const t = extractUndoable([{ type: 'add_task', ok: true, task: { id: 't1', title: 'خرید' } }])
    expect(t?.kind).toBe('task')
    expect(t?.id).toBe('t1')
  })
  test('آخرین اکشن اولویت دارد', () => {
    const t = extractUndoable([
      { type: 'add_task', ok: true, task: { id: 'old', title: 'قدیمی' } },
      { type: 'add_reminder', ok: true, reminder: { id: 'new', message: 'جدید' } },
    ])
    expect(t?.id).toBe('new')
  })
  test('ok=false یا بدون شناسه → null', () => {
    expect(extractUndoable([{ type: 'add_reminder', ok: false }])).toBe(null)
    expect(extractUndoable([{ type: 'add_reminder', ok: true, reminder: {} }])).toBe(null)
    expect(extractUndoable(null)).toBe(null)
    expect(extractUndoable('junk')).toBe(null)
    expect(extractUndoable([{ type: 'plan_day', ok: true }])).toBe(null)
  })
})

describe('V1-P2: مرز پیامِ انصرافِ کوتاه', () => {
  test('انصراف‌های کوتاه شناسایی می‌شوند', () => {
    for (const m of ['منصرف شدم', 'نه منصرف شدم', 'انصراف', 'بی خیال', 'cancel']) {
      expect(isShortCancel(m)).toBe(true)
    }
  })
  test('پیام بلندتر از سقف → فرمان جدید است نه انصراف', () => {
    expect(MAX_CANCEL_LEN).toBe(40)
    expect(isShortCancel('برای فردا ساعت ۹ یادآوری کن با دکتر تماس بگیرم و بعدش خرید کنم')).toBe(false)
  })
  test('پیام غیر انصرافی → false', () => {
    expect(isShortCancel('فهرست کارهایم را بخوان')).toBe(false)
  })
  test('پنجرهٔ undo منطقی است', () => {
    expect(UNDO_WINDOW_MS).toBe(10 * 60_000)
  })
})

describe('V1-P2: متن پاسخ صادقانهٔ undo', () => {
  test('فا: نام یادآور را دقیق اعلام می‌کند — ادعای «هیچ تغییری» ندارد', () => {
    const target: UndoableTarget = { kind: 'reminder', id: 'r1', label: 'تماس با دکتر' }
    const reply = undoReply('fa', target)
    expect(reply).toContain('تماس با دکتر')
    expect(reply).toContain('حذف شد')
    expect(reply).not.toContain('هیچ تغییری اعمال نشد')
  })
  test('en: نام یادآور را دقیق اعلام می‌کند', () => {
    const reply = undoReply('en', { kind: 'task', id: 't1', label: 'Buy milk' })
    expect(reply).toContain('Buy milk')
    expect(reply.toLowerCase()).toContain('removed')
  })
})

describe('V1-P2: زمینهٔ یادآورهای آینده در پرامپت (یافتهٔ P6)', () => {
  const reminders: UpcomingReminderT[] = [
    { message: 'با دکتر تماس بگیرم', remindAt: '2026-11-09T05:30:00.000Z' },
  ]
  const prompt = buildChatSystemPrompt([], [], undefined, 'fa', reminders)
  test('یادآور در پرامپت دیده می‌شود', () => {
    expect(prompt).toContain('با دکتر تماس بگیرم')
    expect(prompt).toContain('یادآورهای آیندهٔ کاربر')
  })
  test('دستورالعملِ لحاظ یادآور در پرسش برنامه اضافه شده', () => {
    expect(prompt).toContain('هم یادآورهای آیندهٔ همان روز را لحاظ کن')
  })
  test('وقتی یادآوری نیست، صادقانه خالی اعلام می‌شود', () => {
    const p2 = buildChatSystemPrompt([], [], undefined, 'fa', [])
    expect(p2).toContain('هیچ یادآور آینده‌ای ثبت نشده است')
  })
})
