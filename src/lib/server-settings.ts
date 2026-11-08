// ─── تنظیمات کاربر روی سرور (جدول Setting) — دسترسی متمرکز ─────
// همه کلیدهای تنظیمات کاربر از این فایل خوانده/نوشته می‌شوند تا
// نام کلیدها یکدست بماند (ai_*، app_lang، calendar_mode، voice_*)

import { db } from '@/lib/db'
import type { AppLang, CalendarMode } from '@/lib/types'

export type { AppLang, CalendarMode }

export const SETTING_KEYS = {
  aiEngine: 'ai_engine',
  aiEndpointUrl: 'ai_endpoint_url',
  aiEndpointKey: 'ai_endpoint_key',
  aiEndpointModel: 'ai_endpoint_model',
  appLang: 'app_lang',
  calendarMode: 'calendar_mode',
  voiceReplies: 'voice_replies',
  voiceRate: 'voice_rate',
  voiceLang: 'voice_lang',
  smsConsent: 'sms_consent',
  financeCurrency: 'finance_currency',
} as const

export async function getUserSetting(userId: string, key: string): Promise<string | null> {
  try {
    const row = await db.setting.findUnique({
      where: { userId_key: { userId, key } },
      select: { value: true },
    })
    return row?.value ?? null
  } catch {
    return null
  }
}

export async function setUserSetting(userId: string, key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value },
    update: { value },
  })
}

export async function deleteUserSetting(userId: string, key: string): Promise<void> {
  try {
    await db.setting.deleteMany({ where: { userId, key } })
  } catch {
    /* بی‌خطر */
  }
}

/** زبان رابط کاربر — پیش‌فرض فارسی (RTL + شمسی) */
export async function getUserLang(userId: string): Promise<AppLang> {
  const v = await getUserSetting(userId, SETTING_KEYS.appLang)
  return v === 'en' ? 'en' : 'fa'
}

/** حالت تقویم — پیش‌فرض شمسی؛ در زبان انگلیسی میلادی پیش‌فرض منطقی‌تر است */
export async function getCalendarMode(userId: string, lang: AppLang): Promise<CalendarMode> {
  const v = await getUserSetting(userId, SETTING_KEYS.calendarMode)
  if (v === 'jalali' || v === 'dual' || v === 'gregorian') return v
  return lang === 'en' ? 'gregorian' : 'jalali'
}

/** آیا پاسخ گفتاری دستیار فعال است؟ (پیش‌فرض: فقط بعد از استفاده از صدا روشن) */
export async function getVoiceReplies(userId: string): Promise<boolean> {
  const v = await getUserSetting(userId, SETTING_KEYS.voiceReplies)
  return v !== '0'
}

/** سرعت خواندن پاسخ صوتی — ۰٫۵ تا ۲٫۵؛ پیش‌فرض ۱ (V1 بند ۵) */
export async function getVoiceRate(userId: string): Promise<number> {
  const v = await getUserSetting(userId, SETTING_KEYS.voiceRate)
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n >= 0.5 && n <= 2.5 ? n : 1
}

/** زبان ورودی صوتی — '' = هم‌زبان رابط (خودکار)؛ 'fa' | 'en' انتخاب دستی (V1 بند ۳) */
export async function getVoiceLang(userId: string): Promise<'' | 'fa' | 'en'> {
  const v = await getUserSetting(userId, SETTING_KEYS.voiceLang)
  return v === 'fa' || v === 'en' ? v : ''
}

/** واحد نمایش مالی — «IRR» (ریال) یا «toman» (تومان)؛ پیش‌فرض ریال */
export type FinanceCurrency = 'irr' | 'toman'

export async function getFinanceCurrency(userId: string): Promise<FinanceCurrency> {
  const v = await getUserSetting(userId, SETTING_KEYS.financeCurrency)
  return v === 'toman' ? 'toman' : 'irr'
}
