'use client'

// ─── نمای امروز ۴.۰ — خانه‌ی شناور رهیار ─────────────────────────
// هیرو تایپوگرافیک + نوار آمار شیشه‌ای + میانبرهای هوشمند + فعالیت
// اخیر + بخش‌های کار. همه سطوح از سیستم Design System تغذیه می‌شوند.

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftCircle,
  Brain,
  CalendarDays,
  Flame,
  ListTree,
  Sparkles,
  Sun,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { TaskItem } from './task-item'
import { ProgressRing } from './progress-ring'
import { QuickAdd } from './quick-add'
import { TaskDetail } from './task-detail'
import { EmptyState } from './empty-state'
import { QuoteStrip, WeatherChip } from './home-cards'
import { useAra } from '@/lib/store'
import { useTaskActions } from './use-task-actions'
import { useClientValue } from '@/lib/client-hooks'
import { greeting, tehranDayOf, tehranIsoDate, todayJalaliFull } from '@/lib/persian-date'
import { listItem } from './motion'
import type { TaskT } from '@/lib/types'

type RecentAction = {
  id: string
  actionType: string
  targetType: string
  status: string
  detail: string | null
  createdAt: string
}

const ACTION_LABEL: Record<string, string> = {
  create_task: 'کار ساخته شد',
  complete_task: 'کار انجام شد',
  delete_task: 'کار حذف شد',
  update_task: 'کار به‌روز شد',
  breakdown_task: 'کار شکسته شد',
  plan_day: 'برنامه روز ساخته شد',
  memory_save: 'حافظه ثبت شد',
  reminder: 'یادآور ثبت شد',
}

/** فشرده‌سازی برچسب زمان — «۳ دقیقه پیش» */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'همین حالا'
  if (m < 60) return `${m} دقیقه پیش`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ساعت پیش`
  return `${Math.floor(h / 24)} روز پیش`
}

function Section({
  title,
  tasks,
  emptyHint,
  tone,
  onRescheduleAll,
}: {
  title: string
  tasks: TaskT[]
  emptyHint?: string
  tone?: 'rose' | 'amber' | 'plain'
  onRescheduleAll?: () => void
}) {
  const { onToggle, onStar, onDelete, onBreakdown, openDetail } = useTaskActions()

  const toneDot =
    tone === 'rose' ? 'bg-destructive' : tone === 'amber' ? 'bg-warning' : 'bg-primary'

  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2 px-1 pt-1">
        <span className={cnDot(toneDot)} />
        <h2 className="text-[13px] font-bold text-foreground/90">{title}</h2>
        <span className="text-[11px] text-muted-foreground tnum">{tasks.length}</span>
        {onRescheduleAll && tasks.length > 0 && (
          <button
            onClick={onRescheduleAll}
            className="ara-press mr-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-primary-text"
          >
            <ArrowLeftCircle className="h-3 w-3" />
            انتقال همه به امروز
          </button>
        )}
      </div>
      <div>
        <AnimatePresence initial={false}>
          {tasks.map((t, i) => (
            <motion.div key={t.id} variants={listItem(i)} initial="initial" animate="animate" exit="exit">
              <TaskItem
                task={t}
                onToggle={onToggle}
                onOpenDetail={openDetail}
                onDelete={onDelete}
                onStar={onStar}
                onBreakdown={onBreakdown}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && emptyHint && (
          <p className="px-3 py-3 text-[11px] text-muted-foreground">{emptyHint}</p>
        )}
      </div>
    </section>
  )
}

function cnDot(dot: string) {
  return `h-1.5 w-1.5 shrink-0 rounded-full ${dot}`
}

/** کارت آمار شیشه‌ای — قابل کلیک برای پرش به نما */
function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
  onClick,
  delay = 0,
}: {
  label: string
  value: number | string
  suffix?: string
  icon: typeof Sun
  tone?: 'rose' | 'amber' | 'plain'
  onClick?: () => void
  delay?: number
}) {
  const color =
    tone === 'rose'
      ? 'var(--destructive)'
      : tone === 'amber'
        ? 'var(--warning)'
        : 'var(--primary)'
  return (
    <motion.button
      variants={listItem(delay)}
      initial="initial"
      animate="animate"
      onClick={onClick}
      className="glass-card glass-hoverable group rounded-2xl p-3 text-right"
    >
      <span
        className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg"
        style={{
          background: `color-mix(in oklab, ${color} 12%, transparent)`,
          color,
        }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex items-baseline gap-1">
        <span className="font-heading text-xl font-extrabold tnum leading-none">{value}</span>
        {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
      </span>
      <span className="mt-1 block text-[10.5px] text-muted-foreground">{label}</span>
    </motion.button>
  )
}

/** میانبر شناور — پرش سریع به دستیار/تمرکز/تقویم/برنامه */
function ShortcutCard({
  label,
  hint,
  icon: Icon,
  onClick,
  delay = 0,
}: {
  label: string
  hint: string
  icon: typeof Sun
  onClick: () => void
  delay?: number
}) {
  return (
    <motion.button
      variants={listItem(delay)}
      initial="initial"
      animate="animate"
      onClick={onClick}
      className="glass-card glass-hoverable group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-right"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
        style={{
          background: 'linear-gradient(140deg, color-mix(in oklab, var(--primary) 16%, transparent), color-mix(in oklab, var(--ax-300) 10%, transparent))',
          color: 'var(--primary-text)',
        }}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-bold">{label}</span>
        <span className="block truncate text-[10px] text-muted-foreground">{hint}</span>
      </span>
    </motion.button>
  )
}

function MountedGreeting() {
  const userName = useAra((s) => s.userName)
  const g = useClientValue(() => {
    const base = greeting()
    return userName ? `${base}، ${userName}` : base
  }, 'سلام')
  return <span className="ara-gradient-text">{g}</span>
}

function useStreak(tasks: TaskT[]): number {
  return useMemo(() => {
    // روزهای انجام به وقت تهران — نه UTC
    const days = new Set<string>()
    for (const t of tasks) {
      if (t.status === 'done' && t.completedAt) days.add(tehranDayOf(t.completedAt))
    }
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 60; i++) {
      const iso = tehranIsoDate(d)
      if (days.has(iso)) {
        streak++
      } else if (i > 0) {
        break
      }
      d.setDate(d.getDate() - 1)
    }
    return streak
  }, [tasks])
}

/** خلاصه هوشمند صبح — قطعی و بدون هزینه مدل */
function useDigest(tasks: TaskT[], overdue: TaskT[], dueToday: TaskT[], starred: TaskT[]) {
  return useMemo(() => {
    const parts: string[] = []
    const urgent = [...overdue, ...dueToday].filter((t) => t.priority === 1)
    if (urgent.length > 0) {
      parts.push(`«${urgent[0].title}» را اول همه انجام بده`)
    } else if (starred.length > 0) {
      parts.push(`با «${starred[0].title}» شروع کن`)
    } else if (dueToday.length > 0) {
      parts.push(`«${dueToday[0].title}» اولین کار امروزت است`)
    } else if (overdue.length === 0) {
      parts.push('برنامه سبکی داری — وقت خوبی برای شروع یک کار بزرگ است')
    }
    if (overdue.length > 0) {
      parts.push(`${overdue.length} کار عقب‌افتاده داری`)
    }
    return parts.join(' · ')
  }, [tasks, overdue, dueToday, starred])
}

export function TodayView() {
  const tasks = useAra((s) => s.tasks)
  const detailTaskId = useAra((s) => s.detailTaskId)
  const setDetailTaskId = useAra((s) => s.setDetailTaskId)
  const upsertTask = useAra((s) => s.upsertTask)
  const setView = useAra((s) => s.setView)
  const setFocusTaskId = useAra((s) => s.setFocusTaskId)

  const [recent, setRecent] = useState<RecentAction[]>([])
  const [memoryCount, setMemoryCount] = useState<number | null>(null)

  const today = tehranIsoDate()

  // فعالیت اخیر + شمار حافظه — یک‌بار در ورود به خانه
  useEffect(() => {
    let alive = true
    fetch('/api/report/daily')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.actions) setRecent(d.actions.slice(0, 4))
      })
      .catch(() => {})
    fetch('/api/memory')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && Array.isArray(d?.memories)) setMemoryCount(d.memories.length)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const starred = useMemo(() => tasks.filter((t) => t.starred && t.status === 'todo'), [tasks])
  const dueToday = useMemo(
    () => tasks.filter((t) => t.status === 'todo' && t.dueDate?.slice(0, 10) === today),
    [tasks, today],
  )
  const overdue = useMemo(
    () => tasks.filter((t) => t.status === 'todo' && t.dueDate && t.dueDate.slice(0, 10) < today),
    [tasks, today],
  )
  const noDate = useMemo(
    () => tasks.filter((t) => t.status === 'todo' && !t.dueDate && !t.starred),
    [tasks],
  )
  const doneTodayCount = useMemo(
    () => tasks.filter((t) => t.status === 'done' && t.completedAt && tehranDayOf(t.completedAt) === today).length,
    [tasks, today],
  )

  const totalToday = dueToday.length + doneTodayCount
  const progress = totalToday > 0 ? Math.round((doneTodayCount / totalToday) * 100) : 0
  const streak = useStreak(tasks)
  const digest = useDigest(tasks, overdue, dueToday, starred)

  async function rescheduleOverdue() {
    let ok = 0
    for (const t of overdue) {
      try {
        const res = await fetch(`/api/tasks/${t.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dueDate: today }),
        })
        const d = await res.json()
        if (res.ok) {
          upsertTask(d.task as TaskT)
          ok++
        }
      } catch {
        /* ادامه */
      }
    }
    if (ok > 0) toast.success(`${ok} کار به امروز منتقل شد`)
  }

  return (
    <div className="space-y-6">
      {/* ─── هیرو تایپوگرافیک ─── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
        className="flex items-start justify-between gap-6 px-1 pt-2"
        aria-label="خلاصه امروز"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">{todayJalaliFull()}</p>
            <WeatherChip />
          </div>
          <h1 className="mt-1 truncate font-heading text-[26px] font-extrabold leading-10 sm:text-3xl">
            <MountedGreeting />
          </h1>
          {digest && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] leading-6 text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{digest}</span>
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            {streak > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold"
                style={{
                  background: 'color-mix(in oklab, var(--warning) 10%, transparent)',
                  color: 'var(--warning)',
                }}
              >
                <Flame className="h-3 w-3" />
                {streak} روز پشت‌سرهم
              </span>
            )}
            {overdue.length > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold"
                style={{
                  background: 'color-mix(in oklab, var(--destructive) 10%, transparent)',
                  color: 'var(--destructive)',
                }}
              >
                {overdue.length} عقب‌افتاده
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 pt-1">
          <ProgressRing value={progress} size={84} stroke={7} sublabel="امروز" />
        </div>
      </motion.section>

      {/* ─── نقل‌قول روز ─── */}
      <QuoteStrip />

      {/* ─── نوار آمار شیشه‌ای ─── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="خلاصه وضعیت">
        <StatCard
          label="سررسید امروز"
          value={dueToday.length}
          icon={Sun}
          onClick={() => setView('tasks')}
          delay={0}
        />
        <StatCard
          label="عقب‌افتاده"
          value={overdue.length}
          icon={ListTree}
          tone={overdue.length > 0 ? 'rose' : 'plain'}
          onClick={() => setView('tasks')}
          delay={1}
        />
        <StatCard
          label="زنجیره انجام"
          value={streak}
          suffix="روز"
          icon={Flame}
          tone={streak > 0 ? 'amber' : 'plain'}
          delay={2}
        />
        <StatCard
          label="حافظه دستیار"
          value={memoryCount ?? '—'}
          icon={Brain}
          onClick={() => setView('chat')}
          delay={3}
        />
      </section>

      {/* ─── میانبرهای شناور ─── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="میانبرها">
        <ShortcutCard
          label="دستیار AI"
          hint="از درخواست تا انجام"
          icon={Sparkles}
          onClick={() => setView('chat')}
          delay={0}
        />
        <ShortcutCard
          label="تمرکز"
          hint="جلسه یک‌نفره آرام"
          icon={Timer}
          onClick={() => setFocusTaskId('__free__')}
          delay={1}
        />
        <ShortcutCard
          label="تقویم"
          hint="نمای ماه شمسی"
          icon={CalendarDays}
          onClick={() => setView('calendar')}
          delay={2}
        />
        <ShortcutCard
          label="اهداف و برنامه"
          hint="مسیر هفته پیش‌رو"
          icon={Target}
          onClick={() => setView('plan')}
          delay={3}
        />
      </section>

      {/* ─── افزودن سریع ─── */}
      <QuickAdd />

      {/* ─── فعالیت اخیر ─── */}
      {recent.length > 0 && (
        <motion.section
          variants={listItem(2)}
          initial="initial"
          animate="animate"
          className="glass-card rounded-3xl p-4"
          aria-label="فعالیت اخیر"
        >
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-[12.5px] font-bold">فعالیت اخیر</h2>
          </div>
          <ul className="space-y-1">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-[11.5px] transition-colors hover:bg-secondary/60">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--primary)' }} />
                <span className="font-medium">{ACTION_LABEL[a.actionType] ?? a.actionType}</span>
                {a.detail && <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.detail}</span>}
                <time className="shrink-0 text-[10px] text-muted-foreground tnum">{timeAgo(a.createdAt)}</time>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* ─── بخش‌های کار ─── */}
      <div className="space-y-4 pb-4">
        {overdue.length > 0 && (
          <Section title="عقب‌افتاده" tasks={overdue} tone="rose" onRescheduleAll={rescheduleOverdue} />
        )}
        <Section
          title="سررسید امروز"
          tasks={dueToday}
          emptyHint="برای امروز چیزی ثبت نشده — از فیلد بالا اضافه کن یا از دستیار بخواه."
        />
        {starred.length > 0 && <Section title="ستاره‌دار" tasks={starred} tone="amber" />}
        <Section title="بدون تاریخ" tasks={noDate} emptyHint="همه کارها برنامه دارند." />

        {dueToday.length === 0 && overdue.length === 0 && starred.length === 0 && noDate.length === 0 && (
          <EmptyState
            art="sun"
            title="همه‌چیز مرتب است"
            description="کاری برای انجام باقی نمانده. می‌توانی از دستیار بخواهی برنامه‌ای برایت بچیند یا روز را با تمرکز شروع کنی."
            action="گفتگو با دستیار"
            onAction={() => setView('chat')}
          />
        )}
      </div>

      {/* شیت جزئیات */}
      <TaskDetail taskId={detailTaskId} open={detailTaskId !== null} onOpenChange={(o) => !o && setDetailTaskId(null)} />
    </div>
  )
}
