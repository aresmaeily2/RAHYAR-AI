'use client'

// ─── نمای تقویم — سه حالت: شمسی / دوگانه / میلادی (نسخه ۱٫۰) ────
// معیارهای نهایی مأموریت:
//  · اعداد روزها در هر دو زبان ۳۰٪+ بزرگ‌تر و پررنگ‌تر (خوانایی از فاصله)
//  · حالت دوگانه/فارسی: عدد شمسی بزرگ، Bold، بَج شیشه‌ای، رنگ تأکید
//  · عدد میلادی زیر شمسی: انگلیسی، کوچک‌تر، کم‌رنگ‌تر
//  · خانه امروز: بسیار خواناتر — Glow + Glass + Shadow
//  · انگلیسی: فقط میلادی، فقط ارقام انگلیسی، بدون هیچ جلالی/RTL
// زبان/حالت از i18n store می‌آید؛ منطق انتخاب روز دست‌نخورده.

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAra } from '@/lib/store'
import { useClientValue } from '@/lib/client-hooks'
import { useI18n } from '@/i18n/store'
import { formatNum } from '@/i18n/core'
import { longDate, jalaliMonthName, gregorianMonthName } from '@/i18n/date'
import {
  isoToJalali,
  jalaliMonthLength,
  jalaliMonthStartWeekday,
  jalaliToIsoDate,
  tehranIsoDate,
  toJalali,
} from '@/lib/persian-date'
import type { TaskT } from '@/lib/types'
import { TaskDetail } from './task-detail'
import { QuickAddInline } from './quick-add-inline'

/** سرستون‌های هفته — شمسی: شنبه‌شروع؛ میلادی: دوشنبه‌شروع.
 *  انگلیسی همیشه میلادی است؛ WEEK_JALALI_EN حذف شد (کد مرده در Release ممنوع). */
const WEEK_JALALI_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const WEEK_GREG_FA = ['د', 'س', 'چ', 'پ', 'ج', 'ش', 'ی'] // دوشنبه‌شروع
const WEEK_GREG_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

interface Cell {
  jd: number // روز ماه نمایشی (شمسی یا میلادی)
  iso: string
  inMonth: boolean
  /** عدد روز در تقویم دیگر — فقط برای حالت دوگانه */
  otherDay?: number
}

export function CalendarView() {
  const tasks = useAra((s) => s.tasks)
  const openDetail = useAra((s) => s.openDetail)
  const setCalendarPickIso = useAra((s) => s.setCalendarPickIso)
  const detailTaskId = useAra((s) => s.detailTaskId)
  const setDetailTaskId = useAra((s) => s.setDetailTaskId)
  const mounted = useClientValue(() => true, false)
  const { t, lang, dir, calendarMode } = useI18n()
  const [offset, setOffset] = useState(0) // ماه جاری + offset

  const now = useMemo(() => new Date(), [])
  const { jy, jm, jd } = useMemo(
    () => (mounted ? toJalali(now) : { jy: 1404, jm: 7, jd: 1 }),
    [mounted, now],
  )
  const gy = now.getFullYear()
  const gm = now.getMonth() + 1

  const isGreg = calendarMode === 'gregorian' || lang === 'en'
  // انگلیسی → تقویم فقط میلادی (معیار سخت مأموریت)
  const showDual = !isGreg && calendarMode === 'dual' && lang === 'fa'

  // ماه نمایش داده شده (شمسی یا میلادی) با offset
  const view = useMemo(() => {
    if (isGreg) {
      let y = gy
      let m = gm + offset
      while (m > 12) { m -= 12; y++ }
      while (m < 1) { m += 12; y-- }
      return { y, m }
    }
    let y = jy
    let m = jm + offset
    while (m > 12) { m -= 12; y++ }
    while (m < 1) { m += 12; y-- }
    return { y, m }
  }, [isGreg, gy, gm, jy, jm, offset])

  const cells = useMemo<Cell[]>(() => {
    if (!mounted) return []
    const out: Cell[] = []
    if (isGreg) {
      const first = new Date(view.y, view.m - 1, 1)
      const len = new Date(view.y, view.m, 0).getDate()
      // دوشنبه‌شروع: JS getDay یکشنبه=0 → (getDay+6)%7
      const startWd = (first.getDay() + 6) % 7
      for (let i = 0; i < startWd; i++) out.push({ jd: 0, iso: '', inMonth: false })
      for (let d = 1; d <= len; d++) {
        const iso = `${view.y}-${String(view.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const j = isoToJalali(iso)
        out.push({ jd: d, iso, inMonth: true, otherDay: showDual ? j.jd : undefined })
      }
    } else {
      const len = jalaliMonthLength(view.y, view.m)
      const startWd = jalaliMonthStartWeekday(view.y, view.m)
      for (let i = 0; i < startWd; i++) out.push({ jd: 0, iso: '', inMonth: false })
      for (let d = 1; d <= len; d++) {
        const iso = jalaliToIsoDate(view.y, view.m, d)
        out.push({ jd: d, iso, inMonth: true, otherDay: showDual ? new Date(iso + 'T12:00:00.000Z').getUTCDate() : undefined })
      }
    }
    return out
  }, [view, mounted, isGreg, showDual])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskT[]>()
    for (const t of tasks) {
      if (!t.dueDate) continue
      const key = t.dueDate.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [tasks])

  const todayIso = mounted ? tehranIsoDate() : ''
  const selected = useAra((s) => s.calendarPickIso)
  const selectedTasks = selected ? (tasksByDay.get(selected) ?? []) : []

  const weekHeaders =
    lang === 'en'
      ? WEEK_GREG_EN // انگلیسی → همیشه میلادی
      : isGreg
        ? WEEK_GREG_FA
        : WEEK_JALALI_FA

  const title = useMemo(() => {
    if (isGreg) {
      const name = lang === 'en' ? gregorianMonthName(view.m, 'en') : gregorianMonthName(view.m, 'fa')
      return `${name} ${formatNum(view.y, lang)}`
    }
    const jTitle = `${jalaliMonthName(view.m, lang)} ${formatNum(view.y, lang)}`
    if (!showDual) return jTitle
    // عنوان دوگانه: ماه(های) میلادی که این ماه شمسی را می‌پوشاند
    const firstIso = jalaliToIsoDate(view.y, view.m, 1)
    const lastIso = jalaliToIsoDate(view.y, view.m, jalaliMonthLength(view.y, view.m))
    const gm1 = new Date(firstIso + 'T12:00:00.000Z').getUTCMonth() + 1
    const gm2 = new Date(lastIso + 'T12:00:00.000Z').getUTCMonth() + 1
    const gName =
      gm1 === gm2
        ? gregorianMonthName(gm1, 'en')
        : `${gregorianMonthName(gm1, 'en').slice(0, 3)}–${gregorianMonthName(gm2, 'en').slice(0, 3)}`
    return `${jTitle} / ${gName}`
  }, [isGreg, lang, showDual, view.y, view.m])

  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div className="space-y-4 pb-4">
      {/* پنل شیشه‌ای تقویم */}
      <div className="glass-card rounded-3xl p-4">
      {/* ناوبری ماه */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOffset((o) => o + 1)}
            aria-label={t('ماه قبل')}
            className="ara-press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <PrevIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOffset((o) => o - 1)}
            aria-label={t('ماه بعد')}
            className="ara-press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <NextIcon className="h-4 w-4" />
          </button>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="glass-chip ara-press ms-1 rounded-full px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('امروز')}
            </button>
          )}
        </div>
        <h2 className="font-heading text-base font-bold">{title}</h2>
      </div>

      {/* هدر روزهای هفته */}
      <div className="grid grid-cols-7 gap-1.5 px-1">
        {weekHeaders.map((w, i) => (
          <div
            key={`${w}-${i}`}
            className={cn(
              'pb-1.5 text-center text-[11px] font-bold tracking-wide',
              i === weekHeaders.length - 1 ? 'text-destructive/70' : 'text-muted-foreground',
            )}
          >
            {w}
          </div>
        ))}
      </div>

      {/* جدول روزها */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${calendarMode}-${view.y}-${view.m}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="grid grid-cols-7 gap-1.5"
        >
          {cells.map((c, i) => {
            if (!c.inMonth) return <div key={`empty-${i}`} className="aspect-square" />
            const dayTasks = tasksByDay.get(c.iso) ?? []
            const isToday = c.iso === todayIso
            const isSelected = c.iso === selected
            const doneCount = dayTasks.filter((task) => task.status === 'done').length
            return (
              <button
                key={c.iso}
                onClick={() => setCalendarPickIso(isSelected ? null : c.iso)}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${t('روز')} ${formatNum(c.jd, lang)}`}
                className={cn(
                  'group relative flex h-16 flex-col items-center justify-start rounded-2xl pt-1.5 transition-all sm:h-[4.75rem]',
                  isSelected ? 'ring-1' : 'hover:bg-secondary/70',
                )}
                style={
                  isSelected
                    ? {
                        background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
                        boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--primary) 40%, transparent)',
                      }
                    : isToday
                      ? {
                          // خانه امروز — بسیار خواناتر: Glass + Glow + Shadow (معیار مأموریت)
                          background:
                            'linear-gradient(160deg, color-mix(in oklab, var(--primary) 16%, transparent), color-mix(in oklab, var(--secondary) 60%, transparent))',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          boxShadow:
                            'inset 0 0 0 1.5px color-mix(in oklab, var(--primary) 55%, transparent), 0 6px 20px -6px color-mix(in oklab, var(--primary) 45%, transparent), 0 2px 8px -2px color-mix(in oklab, var(--ax-ink, #000) 18%, transparent)',
                        }
                      : undefined
                }
              >
                {/* عدد اصلی — در دوگانه: شمسی بزرگ، Bold، بَج شیشه‌ای، رنگ تأکید */}
                {/* در هر دو زبان ۳۰٪+ بزرگ‌تر از قبل (۱۲/۱۳ → ۱۶/۱۷) و پررنگ‌تر */}
                <span
                  className={cn(
                    'tnum flex items-center justify-center rounded-full',
                    showDual
                      ? 'glass-chip h-7 min-w-7 px-1 text-[17px] font-extrabold'
                      : 'h-7 min-w-7 px-1 text-[16px] font-bold',
                  )}
                  style={
                    isToday
                      ? {
                          background: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          boxShadow: '0 2px 10px -2px color-mix(in oklab, var(--primary) 60%, transparent)',
                        }
                      : showDual
                        ? { color: 'var(--primary-text)' }
                        : undefined
                  }
                >
                  {formatNum(c.jd, lang)}
                </span>
                {/* عدد دوم — میلادی کوچک، خاکستری، انگلیسی (فقط دوگانه فارسی) */}
                {showDual && c.otherDay !== undefined && (
                  <span className="tnum latin-digits mt-0.5 text-[10.5px] font-semibold text-muted-foreground" dir="ltr" lang="en">
                    {c.otherDay}
                  </span>
                )}
                {/* نقطه‌های کار — حداکثر ۳ (کمی بزرگ‌تر برای خوانایی از فاصله) */}
                {dayTasks.length > 0 && (
                  <div className="mt-0.5 flex items-center gap-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <span
                        key={task.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background:
                            task.status === 'done'
                              ? 'color-mix(in oklab, var(--success) 65%, transparent)'
                              : task.priority === 1
                                ? 'var(--destructive)'
                                : task.priority === 2
                                  ? 'var(--warning)'
                                  : 'var(--muted-foreground)',
                        }}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[7px] text-muted-foreground tnum">+{formatNum(dayTasks.length - 3, lang)}</span>
                    )}
                  </div>
                )}
                {doneCount === dayTasks.length && dayTasks.length > 0 && (
                  <span
                    className="absolute bottom-1 text-[8px]"
                    style={{ color: 'color-mix(in oklab, var(--success) 85%, transparent)' }}
                  >
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>
      </div>

      {/* پنل روز انتخاب شده */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="glass-card rounded-3xl p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-bold">
                <CalendarDays className="h-4 w-4 text-primary" />
                {isoToJalali(selected).jd === jd && offset === 0 && !isGreg ? t('امروز') : longDate(selected, calendarMode, lang)}
              </h3>
              <span className="text-[11px] text-muted-foreground tnum">
                {selectedTasks.length > 0 ? `${formatNum(selectedTasks.filter((task) => task.status === 'todo').length, lang)} ${t('کارهای فعال')}` : t('آزاد')}
              </span>
            </div>

            {selectedTasks.length > 0 ? (
              <div className="space-y-1">
                {selectedTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => openDetail(task)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-secondary"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background:
                          task.status === 'done'
                            ? 'color-mix(in oklab, var(--success) 65%, transparent)'
                            : task.priority === 1
                              ? 'var(--destructive)'
                              : task.priority === 2
                                ? 'var(--warning)'
                                : 'var(--muted-foreground)',
                      }}
                    />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[13px]',
                        task.status === 'done' && 'text-muted-foreground line-through',
                      )}
                    >
                      {task.title}
                    </span>
                    {task.dueTime && (
                      <span className="shrink-0 text-[10px] text-muted-foreground tnum" dir="ltr">
                        {task.dueTime}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed px-4 py-4 text-center text-xs text-muted-foreground" style={{ borderColor: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }}>
                {t('این روز خالی است — با فیلد زیر کار اضافه کن.')}
              </p>
            )}

            {/* افزودن سریع برای این روز */}
            <QuickAddInline presetDate={selected} />
          </motion.div>
        )}
      </AnimatePresence>

      <TaskDetail taskId={detailTaskId} open={detailTaskId !== null} onOpenChange={(o) => !o && setDetailTaskId(null)} />
    </div>
  )
}
