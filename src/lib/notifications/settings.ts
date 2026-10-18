// ─── تنظیمات اعلان — اعتبارسنجی خالص (آزمون‌پذیر) ────────────
// انتخاب صدای اعلان، بلندی صدا، گفتار محلی و مجوز مرورگر.
// هیچ مقدار پیش‌فرضی بدون صریح بودن کاربر فعال نمی‌شود (opt-in).

export type ReminderSoundId = 'chime' | 'pulse' | 'beep' | 'none'

export interface ReminderSettings {
  soundId: ReminderSoundId
  volume: number // 0..1
  speech: boolean // گفتار محلی (Web Speech API) — فقط با انتخاب کاربر
  speechRate: number // 0.5..1.5
  browserNotifications: boolean // اعلان مرورگر فقط با انتخاب کاربر
}

export const SOUND_IDS: ReminderSoundId[] = ['chime', 'pulse', 'beep', 'none']

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  soundId: 'chime',
  volume: 0.8,
  speech: false,
  speechRate: 1,
  browserNotifications: false, // opt-in: فقط با انتخاب صریح کاربر
}

export function normalizeReminderSettings(raw: unknown): ReminderSettings {
  const o = (raw ?? {}) as Partial<ReminderSettings>
  const soundId = SOUND_IDS.includes(o.soundId as ReminderSoundId)
    ? (o.soundId as ReminderSoundId)
    : DEFAULT_REMINDER_SETTINGS.soundId
  const clamp = (v: number, lo: number, hi: number, d: number) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d
  return {
    soundId,
    volume: clamp(Number(o.volume), 0, 1, DEFAULT_REMINDER_SETTINGS.volume),
    speech: o.speech === true,
    speechRate: clamp(Number(o.speechRate), 0.5, 1.5, DEFAULT_REMINDER_SETTINGS.speechRate),
    browserNotifications: o.browserNotifications === true,
  }
}
