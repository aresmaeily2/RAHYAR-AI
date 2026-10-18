// ─── آزمون تنظیمات اعلان — opt-in و نرمال‌سازی (بخش ۸ دستور) ──
import { describe, expect, test } from 'bun:test'
import {
  normalizeReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
} from '@/lib/notifications/settings'

describe('normalizeReminderSettings — پیش‌فرض‌های محافظه‌کار', () => {
  test('ورودی خالی → پیش‌فرض opt-in (اعلان مرورگر خاموش)', () => {
    const s = normalizeReminderSettings(null)
    expect(s.browserNotifications).toBe(false)
    expect(s.speech).toBe(false)
    expect(s.soundId).toBe('chime')
  })
  test('صدای نامعتبر → پیش‌فرض', () => {
    const s = normalizeReminderSettings({ soundId: 'rock-guitar' })
    expect(s.soundId).toBe(DEFAULT_REMINDER_SETTINGS.soundId)
  })
  test('صداهای معتبر پذیرفته می‌شوند', () => {
    for (const id of ['chime', 'pulse', 'beep', 'none'] as const) {
      expect(normalizeReminderSettings({ soundId: id }).soundId).toBe(id)
    }
  })
  test('بلندی صدا کلمپ می‌شود', () => {
    expect(normalizeReminderSettings({ volume: 5 }).volume).toBe(1)
    expect(normalizeReminderSettings({ volume: -2 }).volume).toBe(0)
    expect(normalizeReminderSettings({ volume: 'loud' }).volume).toBe(DEFAULT_REMINDER_SETTINGS.volume)
  })
  test('سرعت گفتار کلمپ ۰.۵ تا ۱.۵', () => {
    expect(normalizeReminderSettings({ speechRate: 3 }).speechRate).toBe(1.5)
    expect(normalizeReminderSettings({ speechRate: 0.1 }).speechRate).toBe(0.5)
  })
  test('boolean های غیر دقیق false می‌مانند (opt-in سخت‌گیر)', () => {
    expect(normalizeReminderSettings({ speech: 'yes' }).speech).toBe(false)
    expect(normalizeReminderSettings({ browserNotifications: 1 }).browserNotifications).toBe(false)
    expect(normalizeReminderSettings({ speech: true }).speech).toBe(true)
  })
})
