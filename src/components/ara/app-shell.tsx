'use client'

// ─── پوسته اصلی رهیار ۴.۰ — «شیشه‌ی آرام» ────────────────────────
// سایدبار شیشه‌ای شناور + داک موبایل معلق + FAB الاستیک + صحنه محیطی.
// منطق (یادآورها، شورتکات‌ها، بارگذاری داده) دست‌نخورده مانده است.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import {
  CalendarDays,
  Command,
  ListTree,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleThemeWithReveal } from '@/lib/theme-transition'
import { useAra } from '@/lib/store'
import { useClientValue } from '@/lib/client-hooks'
import { playReminderSound, speakReminder } from '@/lib/notifications/sounds'
import { DEFAULT_REMINDER_SETTINGS, normalizeReminderSettings, type ReminderSettings } from '@/lib/notifications/settings'
import { viewFade } from './motion'
import { AraRippleLayer } from './ripple'
import { AmbientStage } from '@/components/ambient/ambient-stage'
import { ambient } from '@/lib/ambient/engine'
import { useTheme } from 'next-themes'
import { CommandPalette } from './command-palette'
import { ProfileChip } from './profile-dialog'
import { TodayView } from './today-view'
import { useI18n } from '@/i18n/store'
import { longDate } from '@/i18n/date'
import dynamic from 'next/dynamic'

/** برچسب نماها — نقشه ثابت برای ت() */
const NAV_LABELS: Record<View, string> = {
  today: 'امروز',
  tasks: 'کارها',
  calendar: 'تقویم',
  chat: 'دستیار',
  plan: 'برنامه',
  finance: 'مالی',
  settings: 'تنظیمات',
}

// تقسیم کد — نماهای غیرپیش‌فرض lazy load می‌شوند تا از باندل اولیه
// خارج بمانند؛ نمای در حال بارگذاری اسکلت شیمردار دارد
const viewFallback = () => (
  <div className="p-4 space-y-3" aria-busy="true" aria-label="در حال بارگذاری">
    <div className="ara-skeleton h-8 w-1/3 rounded-xl" />
    <div className="ara-skeleton h-24 rounded-2xl" />
    <div className="ara-skeleton h-64 rounded-2xl" />
  </div>
)

const TasksView = dynamic(() => import('./tasks-view').then((m) => m.TasksView), { loading: viewFallback, ssr: false })
const CalendarView = dynamic(() => import('./calendar-view').then((m) => m.CalendarView), { loading: viewFallback, ssr: false })
const ChatView = dynamic(() => import('./chat-view').then((m) => m.ChatView), { loading: viewFallback, ssr: false })
const PlanView = dynamic(() => import('./plan-view').then((m) => m.PlanView), { loading: viewFallback, ssr: false })
const FinanceView = dynamic(() => import('./finance-view').then((m) => m.FinanceView), { loading: viewFallback, ssr: false })
const SettingsView = dynamic(() => import('./settings-view').then((m) => m.SettingsView), { loading: viewFallback, ssr: false })
const FocusTimer = dynamic(() => import('./focus-timer').then((m) => m.FocusTimer), { ssr: false })
import type { View } from '@/lib/types'

/** ناوبری اصلی — برچسب‌ها از i18n می‌آیند (ت() در رندر) */
const NAV: Array<{ key: View; icon: typeof Sun; hint: string }> = [
  { key: 'today', icon: Sun, hint: '1' },
  { key: 'tasks', icon: ListTree, hint: '2' },
  { key: 'calendar', icon: CalendarDays, hint: '3' },
  { key: 'chat', icon: Sparkles, hint: '4' },
  { key: 'plan', icon: TrendingUp, hint: '5' },
  { key: 'finance', icon: Wallet, hint: '6' },
  { key: 'settings', icon: Settings, hint: '7' },
]

/** نمای‌های داک موبایل — ۵ نمای پرتکرار (تنظیمات از چیپ پروفایل) */
const DOCK_VIEWS: View[] = ['today', 'tasks', 'calendar', 'chat', 'finance']

/** مرکز یادآوری: هر ۳۰ ثانیه بررسی + صدای انتخابی + گفتار محلی + اعلان */
function useReminderCenter() {
  const shown = useRef(new Set<string>())
  const settingsRef = useRef<ReminderSettings>(DEFAULT_REMINDER_SETTINGS)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // تنظیمات یادآور فقط با انتخاب کاربر فعال می‌شود (opt-in)
    fetch('/api/notification-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.settings) settingsRef.current = normalizeReminderSettings(d.settings)
      })
      .catch(() => {})

    async function check() {
      try {
        const res = await fetch('/api/reminders')
        const d = await res.json()
        if (!d.reminders) return
        const now = Date.now()
        for (const r of d.reminders as Array<{ id: string; message: string; remindAt: string }>) {
          const at = new Date(r.remindAt).getTime()
          if (at <= now && !shown.current.has(r.id)) {
            shown.current.add(r.id)
            const st = settingsRef.current
            playReminderSound(st)
            speakReminder(r.message, st)
            // هشدار زنده دستیار — تپش کوتاه Orb (پالس)
            ambient.setOrb('pulse')
            import('sonner').then(({ toast }) =>
              toast('یادآوری رهیار', {
                description: r.message,
                duration: 12000,
              }),
            )
            if (st.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
              const n = new Notification(document.documentElement.dataset.lang === 'en' ? 'Rahyar — reminder' : 'رهیار — یادآوری', { body: r.message, dir: 'rtl', lang: 'fa' })
              n.onclick = () => {
                window.focus()
                n.close()
              }
            }
            fetch('/api/reminders', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: r.id }),
            }).catch(() => {})
          }
        }
      } catch {
        /* بی‌صدا */
      }
    }

    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])
}

/** شورتکات‌های کیبورد سراسری */
function useShortcuts() {
  const setView = useAra((s) => s.setView)
  const setPaletteOpen = useAra((s) => s.setPaletteOpen)
  const paletteOpen = useAra((s) => s.paletteOpen)
  const pulseQuickAdd = useAra((s) => s.pulseQuickAdd)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (typing || paletteOpen) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case '1':
          setView('today')
          break
        case '2':
          setView('tasks')
          break
        case '3':
          setView('calendar')
          break
        case '4':
          setView('chat')
          break
        case '5':
          setView('plan')
          break
        case 'n':
        case 'ن':
          e.preventDefault()
          pulseQuickAdd()
          break
        case '/':
          e.preventDefault()
          setPaletteOpen(true)
          break
        case 'd':
        case 'د':
          toggleThemeWithReveal(setTheme, theme)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setView, setPaletteOpen, paletteOpen, pulseQuickAdd, theme, setTheme])
}

export function AppShell() {
  const view = useAra((s) => s.view)
  const setView = useAra((s) => s.setView)
  const setTasks = useAra((s) => s.setTasks)
  const setPaletteOpen = useAra((s) => s.setPaletteOpen)
  const pulseQuickAdd = useAra((s) => s.pulseQuickAdd)
  const setUserName = useAra((s) => s.setUserName)
  const t = useI18n((s) => s.t)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  useReminderCenter()
  useShortcuts()

  useEffect(() => {
    // سوییچ جلوه‌ها اکنون مالکیت AmbientEngine است — init کلید
    // ara-effects را می‌خواند و صفات محیطی را اعمال می‌کند
    ambient.init()
    void useI18n.getState().hydrate() // زبان/تقویم/تنظیمات از localStorage+سرور
    // خوش‌آمد زنده دستیار — نفس عمیق کوتاه در ورود (خودبازگشت به idle)
    ambient.setOrb('breathing')
  }, [])

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.name) setUserName(d.profile.name)
      })
      .catch(() => {})
  }, [setUserName])

  useEffect(() => {
    let alive = true
    fetch('/api/tasks')
      .then((r) => {
        if (r.status === 401) {
          window.location.replace('/login')
          throw new Error('unauthenticated')
        }
        if (!r.ok) throw new Error('tasks fetch failed')
        return r.json()
      })
      .then((d) => {
        if (!alive) return
        if (d.tasks) setTasks(d.tasks)
        setLoadError(false)
      })
      .catch(() => {
        if (alive) setLoadError(true)
      })
      .finally(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [setTasks, reloadTick])

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-dvh">
      <AmbientStage />

      {/* GRAND-F3: skip-link — دسترسی مستقیم کیبورد به محتوای اصلی */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:end-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground"
      >
        {t('پرش به محتوای اصلی')}
      </a>

      {/* حالت خطای بارگذاری — پیام + تلاش دوباره */}
      {loadError && (
        <div
          role="alert"
          className="glass-chip relative z-30 mx-auto mt-3 flex max-w-md items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs text-foreground"
        >
          <span>{t('همگام‌سازی کارها ناموفق بود — اتصال را بررسی کن.')}</span>
          <button
            onClick={() => setReloadTick((tick) => tick + 1)}
            className="ara-press shrink-0 rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground transition-all hover:opacity-90"
          >
            {t('تلاش دوباره')}
          </button>
        </div>
      )}

      <div className="relative z-10 mx-auto flex max-w-6xl">
        {/* سایدبار شیشه‌ای شناور — دسکتاپ */}
        <aside className="glass-card sticky top-4 mx-3 my-4 hidden h-[calc(100dvh-2rem)] w-60 shrink-0 flex-col rounded-3xl px-3.5 py-5 md:flex">
          {/* لوگو — اورب برند با تنفس */}
          <div className="flex items-center gap-2.5 px-1.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
              <span
                className="ara-breathe absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(140deg, var(--primary), var(--ax-300))',
                  filter: 'blur(8px)',
                  opacity: 0.5,
                }}
              />
              <span
                className="relative flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{
                  background: 'linear-gradient(140deg, var(--primary), var(--primary-strong))',
                  boxShadow: 'inset 0 1px 0 color-mix(in oklab, #ffffff 30%, transparent)',
                }}
              >
                <Sparkles className="h-4.5 w-4.5" style={{ color: 'var(--ax-on)' }} />
              </span>
            </div>
            <div>
              <p className="font-heading text-lg font-extrabold leading-5">{t('رهیار')}</p>
              <p className="text-[10px] text-muted-foreground">{t('دستیار هوشمند شخصی')}</p>
            </div>
          </div>

          {/* جستجو / پالت */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="glass-chip ara-float mt-5 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-all hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-start">{t('جستجو...')}</span>
            <kbd className="flex items-center gap-0.5 rounded-md border bg-background/60 px-1.5 py-0.5 text-[9px]">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* نویگیشن — قرص فعال متحرک */}
          <nav className="mt-4 space-y-0.5" aria-label={t('ناوبری اصلی')}>
            {NAV.map((item) => {
              const Icon = item.icon
              const active = view === item.key
              const label = t(NAV_LABELS[item.key])
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-colors',
                    active
                      ? 'font-bold text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="desktop-nav-pill"
                      className="absolute inset-0 rounded-xl bg-secondary"
                      style={{
                        boxShadow:
                          'inset 0 1px 0 color-mix(in oklab, #ffffff 12%, transparent), 0 0 0 1px color-mix(in oklab, var(--primary) 10%, transparent)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon className={cn('relative h-4 w-4', active && 'text-primary')} />
                  <span className="relative flex-1 text-start">{label}</span>
                  <kbd className="relative text-[9px] text-muted-foreground/50">{item.hint}</kbd>
                </button>
              )
            })}
          </nav>

          {/* دکمه کار جدید */}
          <button
            onClick={pulseQuickAdd}
            className="ara-float mt-4 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-primary-text"
          >
            <Plus className="h-4 w-4" />
            {t('کار جدید')}
            <kbd className="ms-auto text-[9px] text-muted-foreground/50">N</kbd>
          </button>

          <div className="mt-auto flex items-center justify-between gap-1 px-1.5">
            <p className="text-[10px] text-muted-foreground">
              {loaded ? t('همگام‌سازی شده') : t('در حال بارگذاری...')}
            </p>
            <ProfileChip />
            <ThemeButton />
          </div>
        </aside>

        {/* محتوای اصلی */}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-28 outline-none md:pb-6">
          {/* هدر شیشه‌ای */}
          <header className="ara-glass sticky top-0 z-20 rounded-b-3xl">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2 md:hidden">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(140deg, var(--primary), var(--primary-strong))',
                    boxShadow: 'inset 0 1px 0 color-mix(in oklab, #ffffff 25%, transparent)',
                  }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: 'var(--ax-on)' }} />
                </span>
                <p className="font-heading font-extrabold">{t('رهیار')}</p>
              </div>
              {/* دکمه پالت برای موبایل */}
              <button
                onClick={() => setPaletteOpen(true)}
                aria-label={t('جستجو')}
                className="ara-press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary md:hidden"
              >
                <Search className="h-4 w-4" />
              </button>
              <div className="me-auto flex items-center gap-1">
                <span className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-muted-foreground sm:flex">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <MountedDate />
                </span>
                <div className="md:hidden">
                  <ThemeButton />
                </div>
              </div>
            </div>
          </header>

          {/* نماها */}
          <div className="px-4 pt-3 sm:px-6">
            {!loaded ? (
              <div className="space-y-3 pt-2" aria-hidden>
                <div className="ara-skeleton h-24 rounded-2xl" />
                <div className="ara-skeleton h-12 rounded-2xl" style={{ animationDelay: '80ms' }} />
                <div className="ara-skeleton h-14 rounded-2xl" style={{ animationDelay: '160ms' }} />
                <div className="ara-skeleton h-14 rounded-2xl" style={{ animationDelay: '240ms' }} />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={view} variants={viewFade} initial="initial" animate="animate" exit="exit">
                  {view === 'today' && <TodayView />}
                  {view === 'tasks' && <TasksView />}
                  {view === 'calendar' && <CalendarView />}
                  {view === 'chat' && <ChatView />}
                  {view === 'plan' && <PlanView />}
                  {view === 'finance' && <FinanceView />}
                  {view === 'settings' && <SettingsView />}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>

      {/* داک ناوبری شناور — موبایل */}
      <nav
        className="glass-card fixed inset-x-3 bottom-3 z-30 rounded-[1.65rem] md:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom) - 12px, 0px)' }}
        aria-label={t('ناوبری موبایل')}
      >
        <div className="flex items-stretch justify-around px-1 py-2">
          {DOCK_VIEWS.map((key) => {
            const item = NAV.find((n) => n.key === key)!
            const Icon = item.icon
            const active = view === key
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'ara-press relative flex min-w-12 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[9.5px] font-medium transition-colors',
                  active ? 'text-primary-text' : 'text-muted-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'color-mix(in oklab, var(--primary) 12%, transparent)',
                      boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--primary) 18%, transparent)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative h-5 w-5" />
                <span className="relative">{t(NAV_LABELS[key])}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* دکمه شناور کار جدید — موبایل، فشار الاستیک */}
      <motion.button
        onClick={pulseQuickAdd}
        aria-label="کار جدید"
        whileTap={{ scale: 0.88, rotate: -6 }}
        transition={{ type: 'spring', stiffness: 520, damping: 18 }}
        className="ara-float ara-float-primary fixed bottom-24 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full md:hidden"
      >
        <Plus className="h-6 w-6" style={{ color: 'var(--ax-on)' }} />
      </motion.button>

      <CommandPalette />
      <FocusTimer />
      <AraRippleLayer />
    </div>
    </MotionConfig>
  )
}

function ThemeButton() {
  const { theme, setTheme } = useTheme()
  const t = useI18n((s) => s.t)
  const mounted = useClientValue(() => true, false)
  if (!mounted) return <div className="h-8 w-8" />
  return (
    <button
      onClick={(e) =>
        toggleThemeWithReveal(setTheme, theme, { x: e.clientX, y: e.clientY })
      }
      aria-label={theme === 'dark' ? t('تغییر به تم روشن') : t('تغییر به تم تیره')}
      className="ara-float flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:inline" />
    </button>
  )
}

function MountedDate() {
  const lang = useI18n((s) => s.lang)
  const mode = useI18n((s) => s.calendarMode)
  const d = useClientValue(() => longDate(new Date().toISOString().slice(0, 10), mode, lang), '…')
  return <span>{d}</span>
}
