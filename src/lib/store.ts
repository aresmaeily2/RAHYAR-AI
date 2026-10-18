// ─── Zustand Store کلاینت «رهیار» ─────────────────────────────
'use client'

import { create } from 'zustand'
import type { DailyPlan, TaskT, View } from './types'

interface AraState {
  view: View
  setView: (v: View) => void

  tasks: TaskT[]
  setTasks: (t: TaskT[]) => void
  upsertTask: (t: TaskT) => void
  removeTask: (id: string) => void

  detailTaskId: string | null
  setDetailTaskId: (id: string | null) => void
  openDetail: (t: TaskT) => void

  taskFilter: 'all' | 'active' | 'done'
  setTaskFilter: (f: 'all' | 'active' | 'done') => void
  tagFilter: string | null
  setTagFilter: (t: string | null) => void

  quickAddPulse: number
  pulseQuickAdd: () => void

  // کامند پالت ⌘K
  paletteOpen: boolean
  setPaletteOpen: (o: boolean) => void

  // تقویم: تاریخ انتخاب‌شده برای افزودن سریع
  calendarPickIso: string | null
  setCalendarPickIso: (iso: string | null) => void

  // تایمر تمرکز — کار هدف
  focusTaskId: string | null
  setFocusTaskId: (id: string | null) => void

  // برنامه ساخته‌شده توسط دستیار در چت (plan_day)
  chatPlan: DailyPlan | null
  setChatPlan: (p: DailyPlan | null) => void

  // پروفایل کاربر (پیش‌فرض محصول: علیرضا — قابل تغییر)
  userName: string
  setUserName: (n: string) => void
}

export const useAra = create<AraState>((set) => ({
  view: 'today',
  setView: (v) => set({ view: v }),

  tasks: [],
  setTasks: (t) => set({ tasks: t }),
  upsertTask: (t) =>
    set((s) => {
      const i = s.tasks.findIndex((x) => x.id === t.id)
      if (i === -1) return { tasks: [t, ...s.tasks] }
      const next = [...s.tasks]
      next[i] = t
      return { tasks: next }
    }),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  detailTaskId: null,
  setDetailTaskId: (id) => set({ detailTaskId: id }),
  openDetail: (t) => set({ detailTaskId: t.id }),

  taskFilter: 'active',
  setTaskFilter: (f) => set({ taskFilter: f }),
  tagFilter: null,
  setTagFilter: (t) => set({ tagFilter: t }),

  quickAddPulse: 0,
  pulseQuickAdd: () => set((s) => ({ quickAddPulse: s.quickAddPulse + 1, view: 'today' })),

  paletteOpen: false,
  setPaletteOpen: (o) => set({ paletteOpen: o }),

  calendarPickIso: null,
  setCalendarPickIso: (iso) => set({ calendarPickIso: iso }),

  focusTaskId: null,
  setFocusTaskId: (id) => set({ focusTaskId: id }),

  chatPlan: null,
  setChatPlan: (p) => set({ chatPlan: p }),

  userName: '',
  setUserName: (n) => set({ userName: n }),
}))
