'use client'

// ─── Store ظاهر — تم جهان‌بینی + رنگ تأکید (reactive) ───────────
// اعمال DOM و ماندگاری در این لایه متمرکز است تا هیچ کامپوننتی
// مستقیماً با localStorage یا dataset کار نکند.

import { create } from 'zustand'
import {
  applyAccent,
  applyTheme,
  readStoredAccent,
  readStoredTheme,
  type AraAccent,
  type AraTheme,
} from './appearance'

interface AppearanceState {
  theme: AraTheme
  accent: AraAccent
  /** خواندن از localStorage در اولین فرصت کلاینت */
  hydrate: () => void
  setTheme: (t: AraTheme) => void
  setAccent: (a: AraAccent) => void
}

export const useAppearance = create<AppearanceState>((set) => ({
  theme: 'ocean',
  accent: 'teal',
  hydrate: () => {
    const t = readStoredTheme()
    const a = readStoredAccent()
    applyTheme(t)
    applyAccent(a)
    set({ theme: t, accent: a })
  },
  setTheme: (t) => {
    applyTheme(t)
    try {
      localStorage.setItem('rahyar-theme', t)
    } catch { /* بدون ماندگاری */ }
    set({ theme: t })
  },
  setAccent: (a) => {
    applyAccent(a)
    try {
      localStorage.setItem('rahyar-accent', a)
    } catch { /* بدون ماندگاری */ }
    set({ accent: a })
  },
}))
