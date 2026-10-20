'use client'

// ─── برنامه و پیشرفت — هیت‌مپ فعالیت + آمار + برنامه هوشمند ──

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  CalendarCheck2,
  CheckCheck,
  Clock3,
  Flame,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { ProgressRing } from './progress-ring'
import { EmptyState } from './empty-state'
import { useAra } from '@/lib/store'
import { formatJalali, tehranIsoDate } from '@/lib/persian-date'
import type { DailyPlan, ReminderT, TaskT } from '@/lib/types'
import { useI18n } from '@/i18n/store'
import { formatNum } from '@/i18n/core'
import { cn } from '@/lib/utils'

/** حروف روز هفته — فارسی: ش ی د س چ پ ج؛ انگلیسی: M T W T F S S (شروع دوشنبه) */
const WEEKDAY_LETTERS_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const WEEKDAY_LETTERS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** کارت گزارش روزانه — قطعی و بدون مدل (بخش ۷ دستور اجرایی) */
function DailyReportCard() {
  const { t, lang } = useI18n()
  const [rep, setRep] = useState<null | {
    done: number
    remaining: number
    overdue: number
    remindersToday: number
  }>(null)
  const [expanded, setExpanded] = useState(false)
  const [details, setDetails] = useState<null | { doneTitles: string[]; overdueTitles: string[] }>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/report/daily')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.report) setRep(d.report)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!expanded || details) return
    fetch('/api/report/daily')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.report) setDetails({ doneTitles: d.report.doneTitles ?? [], overdueTitles: d.report.overdueTitles ?? [] })
      })
      .catch(() => {})
  }, [expanded, details])

  if (!rep) return null
  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <CalendarCheck2 className="h-4 w-4 text-primary" />{t('گزارش امروز')}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t('وضعیت اجرای کارهایت — محاسبه قطعی و بدون مدل.')}</p>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="rounded-lg px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary"
          aria-expanded={expanded}
        >
          {expanded ? t('بستن جزئیات') : t('جزئیات')}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          { v: rep.done, l: t('انجام‌شده'), c: 'text-primary-text' },
          { v: rep.remaining, l: t('باقی‌مانده'), c: '' },
          { v: rep.overdue, l: t('عقب‌افتاده'), c: rep.overdue > 0 ? 'text-destructive' : '' },
          { v: rep.remindersToday, l: t('یادآوری امروز'), c: '' },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-secondary/50 px-2 py-2.5">
            <p className={cn('text-lg font-extrabold tabular-nums', s.c)}>{formatNum(s.v, lang)}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      {expanded && details && (
        <div className="mt-3 space-y-2 text-[11px] leading-5">
          {details.doneTitles.length > 0 && (
            <div>
              <p className="font-bold">{t('انجام‌شده‌های امروز:')}</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {details.doneTitles.slice(0, 5).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {details.overdueTitles.length > 0 && (
            <div>
              <p className="font-bold text-destructive">{t('عقب‌افتاده‌ها:')}</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {details.overdueTitles.slice(0, 5).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {details.doneTitles.length === 0 && details.overdueTitles.length === 0 && (
            <p className="text-muted-foreground">{t('هنوز موردی برای نمایش نیست.')}</p>
          )}
        </div>
      )}
    </div>
  )
}

function useStreak(tasks: TaskT[]): number {
  return useMemo(() => {
    const days = new Set<string>()
    for (const t of tasks) {
      if (t.status === 'done' && t.completedAt) days.add(t.completedAt.slice(0, 10))
    }
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 60; i++) {
      const iso = d.toISOString().slice(0, 10)
      if (days.has(iso)) streak++
      else if (i > 0) break
      d.setDate(d.getDate() - 1)
    }
    return streak
  }, [tasks])
}

function useWeeklyStats(tasks: TaskT[], lang: 'fa' | 'en') {
  return useMemo(() => {
    const days: Array<{ label: string; count: number; iso: string }> = []
    // هفته ایرانی: شنبه تا جمعه — ۷ روز اخیر را از شنبه‌ی هفته بساز
    const today = new Date()
    const dow = today.getDay() === 6 ? 0 : today.getDay() + 1 // ۰=شنبه
    const saturday = new Date(today)
    saturday.setDate(today.getDate() - dow)
    for (let i = 0; i < 7; i++) {
      const d = new Date(saturday)
      d.setDate(saturday.getDate() + i)
      const iso = d.toISOString().slice(0, 10)
      const count = tasks.filter(
        (t) => t.status === 'done' && t.completedAt?.slice(0, 10) === iso,
      ).length
      days.push({ label: (lang === 'en' ? WEEKDAY_LETTERS_EN : WEEKDAY_LETTERS_FA)[i], count, iso })
    }
    const weekTotal = days.reduce((s, d) => s + d.count, 0)
    const allDone = tasks.filter((t) => t.status === 'done').length
    const all = tasks.length
    const rate = all > 0 ? Math.round((allDone / all) * 100) : 0
    return { days, weekTotal, rate }
  }, [tasks, lang])
}

/** هیت‌مپ ۱۵ هفته اخیر (۱۵×۷) — سبک GitHub با ترتیب هفته ایرانی */
function Heatmap({ tasks }: { tasks: TaskT[] }) {
  const { lang } = useI18n()
  const grid = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tasks) {
      if (t.status === 'done' && t.completedAt) {
        const k = t.completedAt.slice(0, 10)
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
    }
    // ۱۵ هفته × ۷ روز — ستون‌ها = هفته، ردیف‌ها = روز هفته (شنبه تا جمعه)
    const today = new Date()
    const dow = today.getDay() === 6 ? 0 : today.getDay() + 1
    const saturday = new Date(today)
    saturday.setDate(today.getDate() - (dow + 7 * 14)) // شنبه ۱۴ هفته قبل

    const weeks: Array<Array<{ iso: string; count: number }>> = []
    for (let w = 0; w < 15; w++) {
      const col: Array<{ iso: string; count: number }> = []
      for (let d = 0; d < 7; d++) {
        const day = new Date(saturday)
        day.setDate(saturday.getDate() + w * 7 + d)
        const iso = day.toISOString().slice(0, 10)
        col.push({ iso, count: counts.get(iso) ?? 0 })
      }
      weeks.push(col)
    }
    return weeks
  }, [tasks])

  const max = useMemo(() => Math.max(1, ...grid.flat().map((c) => c.count)), [grid])

  function shade(count: number): string {
    if (count === 0) return 'bg-secondary'
    return 'bg-primary' // شدت با آلفا در استایل تعیین می‌شود
  }

  function shadeAlpha(count: number): string {
    if (count === 0) return '0'
    const intensity = count / max
    if (intensity > 0.66) return '0.9'
    if (intensity > 0.33) return '0.55'
    return '0.28'
  }

  return (
    <div className="flex gap-2">
      {/* ستون روزهای هفته */}
      <div className="flex flex-col gap-[3px] pt-[1px]">
        {(lang === 'en' ? WEEKDAY_LETTERS_EN : WEEKDAY_LETTERS_FA).map((l, i) => (
          <span
            key={l}
            className={cn(
              'h-3.5 text-[8px] leading-3.5 text-muted-foreground',
              i % 2 === 1 && 'opacity-0',
            )}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="flex flex-1 gap-[3px] overflow-x-auto pb-1">
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <motion.div
                key={day.iso}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (wi * 7 + di) * 0.002, duration: 0.2 }}
                title={`${formatJalali(day.iso, { short: true })} — ${day.count} کار`}
                className={cn(
                  'h-3.5 w-3.5 rounded-[4px] transition-transform hover:scale-125',
                  shade(day.count),
                )}
                style={{ opacity: day.count === 0 ? undefined : shadeAlpha(day.count) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlanView() {
  const { t, lang } = useI18n()
  const tasks = useAra((s) => s.tasks)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [planning, setPlanning] = useState(false)
  const [reminders, setReminders] = useState<ReminderT[]>([])

  const today = tehranIsoDate()
  const streak = useStreak(tasks)
  const { days, weekTotal, rate } = useWeeklyStats(tasks, lang)

  const doneToday = tasks.filter((t) => t.status === 'done' && t.completedAt?.slice(0, 10) === today).length
  const dueToday = tasks.filter((t) => t.status === 'todo' && t.dueDate?.slice(0, 10) === today).length
  const totalToday = doneToday + dueToday
  const progress = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0

  useEffect(() => {
    fetch('/api/reminders')
      .then((r) => r.json())
      .then((d) => d.reminders && setReminders(d.reminders))
      .catch(() => {})
  }, [])

  // برنامه‌ای که دستیار در چت ساخته (plan_day) — بلافاصله نمایش
  const chatPlan = useAra((s) => s.chatPlan)
  const setChatPlan = useAra((s) => s.setChatPlan)
  useEffect(() => {
    if (chatPlan) {
      setPlan(chatPlan)
      setChatPlan(null)
    }
  }, [chatPlan, setChatPlan])

  async function makePlan() {
    if (planning) return
    setPlanning(true)
    try {
      const res = await fetch('/api/plan', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'خطا')
      setPlan(d.plan as DailyPlan)
    } catch {
      toast.error(t('ساخت برنامه ناموفق بود، دوباره تلاش کن'))
    } finally {
      setPlanning(false)
    }
  }

  const maxCount = Math.max(1, ...days.map((d) => d.count))

  return (
    <div className="space-y-5 pb-4">
      {/* ردیف آمار — تایپوگرافیک، بدون آیکون‌های شلوغ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card glass-hoverable flex items-center gap-3 rounded-2xl p-4"
        >
          <ProgressRing value={progress} size={52} stroke={6} />
          <div className="min-w-0">
            <p className="text-xs font-bold">{t('پیشرفت امروز')}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground tnum">
              {formatNum(doneToday, lang)} {t('از')} {formatNum(totalToday, lang)} {t('کار')}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card glass-hoverable flex items-center gap-3 rounded-2xl p-4"
        >
          <div>
            <p className="font-heading text-2xl font-extrabold leading-7 tnum" style={{ color: 'var(--warning)' }}>{streak}</p>
            <p className="text-[11px] text-muted-foreground">{t('روز پشت‌سرهم')}</p>
          </div>
          <Flame className="mr-auto h-5 w-5" style={{ color: 'color-mix(in oklab, var(--warning) 70%, transparent)' }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card glass-hoverable flex items-center gap-3 rounded-2xl p-4"
        >
          <div>
            <p className="font-heading text-2xl font-extrabold leading-7 tnum">{weekTotal}</p>
            <p className="text-[11px] text-muted-foreground">{t('این هفته')}</p>
          </div>
          <CheckCheck className="mr-auto h-5 w-5" style={{ color: 'color-mix(in oklab, var(--primary) 70%, transparent)' }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card glass-hoverable flex items-center gap-3 rounded-2xl p-4"
        >
          <div>
            <p className="font-heading text-2xl font-extrabold leading-7 tnum" style={{ color: 'var(--success)' }}>{rate}{lang === 'en' ? '%' : '٪'}</p>
            <p className="text-[11px] text-muted-foreground">{t('نرخ تکمیل کل')}</p>
          </div>
          <TrendingUp className="mr-auto h-5 w-5" style={{ color: 'color-mix(in oklab, var(--success) 70%, transparent)' }} />
        </motion.div>
      </div>

      {/* هیت‌مپ فعالیت */}
      <div className="glass-card rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold">{t('نقشه فعالیت')}</h2>
          <span className="text-[10px] text-muted-foreground">{t('۱۵ هفته اخیر')}</span>
        </div>
        <Heatmap tasks={tasks} />
      </div>

      {/* نمودار هفتگی */}
      <div className="glass-card rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold">{t('هفته جاری')}</h2>
          <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex h-28 items-end justify-between gap-2">
          {days.map((d, i) => {
            const isToday = d.iso === today
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground tnum">
                  {d.count > 0 ? d.count : ''}
                </span>
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: 'easeOut' }}
                  className="w-full max-w-7 origin-bottom rounded-md"
                  style={{
                    height: `${Math.max(6, (d.count / maxCount) * 72)}px`,
                    ...(isToday
                      ? {
                          background: 'var(--primary)',
                          boxShadow: '0 0 0 2px color-mix(in oklab, var(--primary) 25%, transparent)',
                        }
                      : d.count > 0
                        ? { background: 'color-mix(in oklab, var(--primary) 55%, transparent)' }
                        : { background: 'var(--secondary)' }),
                  }}
                />
                <span
                  className={cn(
                    'text-[10px]',
                    isToday ? 'font-bold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* گزارش روزانه اجرایی — قطعی */}
      <DailyReportCard />

      {/* برنامه روزانه هوشمند */}
      <div className="glass-card rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-primary" />{t('برنامه امروز من')}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t('رهیار بر اساس اولویت‌ها و سررسیدها یک برنامه منطقی می‌چیند.')}</p>
          </div>
          <button
            onClick={makePlan}
            disabled={planning}
            className="ara-float ara-float-primary flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-60"
          >
            {planning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {plan ? t('برنامه جدید') : t('چیدن برنامه')}
          </button>
        </div>

        {planning && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ara-skeleton h-14 rounded-xl" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}

        {!planning && !plan && (
          <EmptyState
            art="calendar"
            compact
            title={t('هنوز برنامه‌ای چیده نشده')}
            description={t("دکمه «چیدن برنامه» را بزن تا رهیار روزت را بر اساس اولویت‌ها سازماندهی کند.")}
          />
        )}

        {!planning && plan && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {plan.summary && (
              <p
                className="rounded-xl px-4 py-3 text-xs font-medium leading-6"
                style={{
                  background: 'color-mix(in oklab, var(--primary) 8%, transparent)',
                  color: 'var(--primary-text)',
                  boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--primary) 15%, transparent)',
                }}
              >
                {plan.summary}
              </p>
            )}
            {plan.focus && (
              <div className="flex items-center gap-2 px-1 text-xs">
                <Target className="h-3.5 w-3.5" style={{ color: 'var(--destructive)' }} />
                <span className="text-muted-foreground">{t('تمرکز امروز:')}</span>
                <span className="font-bold">{plan.focus}</span>
              </div>
            )}
            <div className="relative space-y-2 pr-4">
              <div className="absolute bottom-2 right-[7px] top-2 w-px bg-border" aria-hidden />
              {plan.blocks.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="relative rounded-xl bg-secondary/60 p-3"
                >
                  <span className="absolute -right-[21px] top-4 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" aria-hidden />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold leading-5">{b.title}</span>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground tnum" dir="ltr">
                      <Clock3 className="h-3 w-3" />
                      {b.time}
                    </span>
                  </div>
                  {b.why && <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{b.why}</p>}
                </motion.div>
              ))}
            </div>
            {plan.tip && (
              <div
                className="flex items-start gap-2 rounded-xl px-4 py-3 text-[11px] leading-5"
                style={{
                  background: 'color-mix(in oklab, var(--warning) 8%, transparent)',
                  color: 'var(--warning)',
                  boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--warning) 20%, transparent)',
                }}
              >
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {plan.tip}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* یادآوری‌های پیش‌رو */}
      <div className="glass-card rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Bell className="h-4 w-4" style={{ color: 'var(--warning)' }} />{t('یادآوری‌های پیش‌رو')}</h2>
          <span className="text-[11px] text-muted-foreground tnum">{formatNum(reminders.length, lang)} {t('یادآوری فعال')}</span>
        </div>
        {reminders.length === 0 ? (
          <EmptyState
            art="bell"
            compact
            title={t('یادآوری فعالی نداری')}
            description={t("از دستیار بخواه «یادم بنداز...» تا یادآورها همین‌جا ظاهر شوند.")}
          />
        ) : (
          <div className="space-y-1">
            {reminders.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/60">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--warning)' }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{r.message}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground tnum" dir="ltr">
                  {new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'fa-IR-u-ca-persian', {
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(r.remindAt))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
