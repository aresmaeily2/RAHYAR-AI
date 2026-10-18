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
  smsConsent: boolean
  setLang: (l: Lang) => void
  setCalendarMode: (m: CalendarMode) => void
  setVoiceReplies: (v: boolean) => void
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
      const r = await fetch('/api/settings/app')
      if (r.ok) {
        const d = (await r.json()) as {
          lang?: Lang
          calendarMode?: CalendarMode
          voiceReplies?: boolean
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
