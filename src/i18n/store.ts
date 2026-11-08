// ─── استور i18n کلاینت — زبان، جهت، تقویم، تنظیمات سرور ────────
// زبان: localStorage (نقاشی فوری) + سرور (منبع حقیقت بین دستگاه‌ها)
// تغییر زبان: dir/lang روی <html> + فونت‌ها با data-lang + اعداد

import { create } from 'zustand'
import { fa } from './fa'
import { en } from './en'
import { tf, langDir, langBcp47, type Lang, type Translations } from './core'
import type { CalendarMode } from '@/lib/types'

export type { CalendarMode }

export type TFunc = (key: string, params?: Record<string, string | number>) => string

function makeT(lang: Lang): TFunc {
  const dict: Translations = lang === 'en' ? en : fa
  return (key, params) => {
    const out = dict[key] ?? key
    return params ? tf(out, params, lang) : out
  }
}

interface I18nState {
  lang: Lang
  t: TFunc
  dir: 'rtl' | 'ltr'
  hydrated: boolean
  calendarMode: CalendarMode
  voiceReplies: boolean
  /** سرعت خواندن صوتی — ۰٫۵ تا ۲٫۵ (پیش‌فرض ۱) — V1 بند ۵ */
  voiceRate: number
  /** زبان ورودی صوتی — '' = هم‌زبان رابط؛ 'fa' | 'en' دستی — V1 بند ۳ */
  voiceLang: '' | 'fa' | 'en'
  smsConsent: boolean
  setLang: (l: Lang) => void
  setCalendarMode: (m: CalendarMode) => void
  setVoiceReplies: (v: boolean) => void
  setVoiceRate: (r: number) => void
  setVoiceLang: (l: '' | 'fa' | 'en') => void
  setSmsConsent: (v: boolean) => void
  /** خواندن از localStorage + سرور — یک‌بار در شروع اپ */
  hydrate: () => Promise<void>
}

const LANG_KEY = 'ara-lang'

function readLocalLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return v === 'en' ? 'en' : v === 'fa' ? 'fa' : null
  } catch {
    return null
  }
}

function writeLocalLang(l: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {
    /* بی‌خطر */
  }
}

function applyHtmlAttrs(lang: Lang): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  el.dir = langDir(lang)
  el.lang = langBcp47(lang).slice(0, 2)
  el.setAttribute('data-lang', lang)
}

/** t غیرواکنشی — برای خارج از رندر (listener، helper) */
export function tStatic(key: string, lang: Lang = 'fa'): string {
  const dict = lang === 'en' ? en : fa
  return dict[key] ?? key
}

export const useI18n = create<I18nState>((set, get) => ({
  lang: 'fa',
  t: makeT('fa'),
  dir: 'rtl',
  hydrated: false,
  calendarMode: 'jalali',
  voiceReplies: true,
  voiceRate: 1,
  voiceLang: '',
  smsConsent: false,

  setLang: (l) => {
    writeLocalLang(l)
    applyHtmlAttrs(l)
    set({ lang: l, t: makeT(l), dir: langDir(l) })
    // معیار مأموریت: در زبان انگلیسی تقویم فقط میلادی است — شمسی/دوگانه معنا ندارد
    if (l === 'en' && get().calendarMode !== 'gregorian') {
      set({ calendarMode: 'gregorian' })
      fetch('/api/settings/app', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarMode: 'gregorian' }),
      }).catch(() => {})
    }
    // همگام‌سازی با سرور (پس‌زمینه؛ خطا بی‌اهمیت)
    fetch('/api/settings/app', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: l }),
    }).catch(() => {})
  },

  setCalendarMode: (m) => {
    set({ calendarMode: m })
    fetch('/api/settings/app', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendarMode: m }),
    }).catch(() => {})
  },

  setVoiceReplies: (v) => {
    set({ voiceReplies: v })
    fetch('/api/settings/app', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceReplies: v }),
    }).catch(() => {})
  },

  setVoiceRate: (r) => {
    const safe = Math.min(2.5, Math.max(0.5, Number.isFinite(r) ? r : 1))
    set({ voiceRate: safe })
    fetch('/api/settings/app', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceRate: safe }),
    }).catch(() => {})
  },

  setVoiceLang: (l) => {
    set({ voiceLang: l })
    fetch('/api/settings/app', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceLang: l }),
    }).catch(() => {})
  },

  setSmsConsent: (v) => {
    set({ smsConsent: v })
    fetch('/api/settings/app', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smsConsent: v }),
    }).catch(() => {})
  },

  hydrate: async () => {
    if (get().hydrated) return
    const local = readLocalLang()
    if (local) {
      applyHtmlAttrs(local)
      set({ lang: local, t: makeT(local), dir: langDir(local) })
    }
    try {
      // F-AG4: پیش از ورود، settings/app همیشه 401 می‌دهد و خطای کنسول می‌سازد —
      // اول وضعیت نشست (endpoint عمومی)؛ فقط با نشست واقعی تنظیمات سرور خوانده شود
      const sr = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null)
      const sj = sr?.ok ? ((await sr.json()) as { authenticated?: boolean }) : null
      if (!sj?.authenticated) {
        if (!local) applyHtmlAttrs('fa')
        set({ hydrated: true })
        return
      }
      const r = await fetch('/api/settings/app')
      if (r.ok) {
        const d = (await r.json()) as {
          lang?: Lang
          calendarMode?: CalendarMode
          voiceReplies?: boolean
          voiceRate?: number
          voiceLang?: '' | 'fa' | 'en'
          smsConsent?: boolean
        }
        // سرور منبع حقیقت بین دستگاه‌هاست؛ اگر کاربر اینجا هنوز انتخابی نکرده
        const lang = d.lang === 'en' || d.lang === 'fa' ? d.lang : get().lang
        applyHtmlAttrs(lang)
        set({
          lang,
          t: makeT(lang),
          dir: langDir(lang),
          // انگلیسی → همیشه میلادی (معیار مأموریت)؛ فارسی → انتخاب کاربر
          calendarMode: lang === 'en' ? 'gregorian' : (d.calendarMode ?? 'jalali'),
          voiceReplies: d.voiceReplies !== false,
          voiceRate: Number.isFinite(d.voiceRate) && (d.voiceRate as number) >= 0.5 && (d.voiceRate as number) <= 2.5 ? (d.voiceRate as number) : 1,
          voiceLang: d.voiceLang === 'fa' || d.voiceLang === 'en' ? d.voiceLang : '',
          smsConsent: d.smsConsent === true,
          hydrated: true,
        })
        return
      }
    } catch {
      /* آفلاین — localStorage کافی است */
    }
    set({ hydrated: true })
  },
}))
