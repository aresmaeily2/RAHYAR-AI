'use client'

// ─── تایمر تمرکز پومودورو — ۲۵ دقیقه تمرکز / ۵ دقیقه استراحت ──

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Coffee, Pause, PartyPopper, Play, RotateCcw, Target, X, AudioLines } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAra } from '@/lib/store'
import { playUiSound, startAmbientSound, stopAmbientSound } from '@/lib/feedback'
import { ambient as ambientEngine } from '@/lib/ambient/engine'

type Mode = 'focus' | 'break'

const DURATION: Record<Mode, number> = { focus: 25 * 60, break: 5 * 60 }

export function FocusTimer() {
  const focusTaskId = useAra((s) => s.focusTaskId)
  const setFocusTaskId = useAra((s) => s.setFocusTaskId)
  const tasks = useAra((s) => s.tasks)
  const upsertTask = useAra((s) => s.upsertTask)

  const [mode, setMode] = useState<Mode>('focus')
  const [running, setRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(DURATION.focus)
  const [sessions, setSessions] = useState(0)
  const [ambient, setAmbient] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const task = tasks.find((t) => t.id === focusTaskId) ?? null

  const stop = useCallback(() => {
    setRunning(false)
    // حالت تمرکز خاموش — رابط به ریتم عادی برمی‌گردد (از طریق Engine)
    ambientEngine.setFocus(false)
    stopAmbientSound()
    setAmbient(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const finish = useCallback(() => {
    stop()
    playUiSound('timerEnd')
    if (mode === 'focus') {
      const next = sessions + 1
      setSessions(next)
      toast.success('۲۵ دقیقه تمرکز تمام شد! ۵ دقیقه استراحت کن', {
        duration: 8000,
        icon: <Coffee className="h-4 w-4 text-primary" />,
      })
      setMode('break')
      setSecondsLeft(DURATION.break)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('رهیار — تمرکز تمام شد', { body: '۲۵ دقیقه کار عالی! وقت استراحت است.', dir: 'rtl', lang: 'fa' })
      }
    } else {
      toast('استراحت تمام شد — آماده‌ای برای یک تمرکز دیگر؟', { duration: 8000 })
      setMode('focus')
      setSecondsLeft(DURATION.focus)
    }
  }, [mode, sessions, stop])

  useEffect(() => {
    if (!running) return
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finish()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [running, finish])

  useEffect(() => {
    if (!focusTaskId) {
      stop()
      setMode('focus')
      setSecondsLeft(DURATION.focus)
    }
  }, [focusTaskId, stop])

  async function completeTask() {
    if (!task) return
    stop()
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error()
      upsertTask(d.task)
      toast.success('آفرین! کار انجام شد', {
        icon: <PartyPopper className="h-4 w-4 text-primary" />,
      })
      setFocusTaskId(null)
    } catch {
      toast.error('عملیات ناموفق بود')
    }
  }

  function toggleRun() {
    if (running) {
      stop()
    } else {
      setRunning(true)
      // حالت تمرکز روشن — Engine محیط را ساکت می‌کند (موشن کمتر، نور کمتر)
      ambientEngine.setFocus(true)
      playUiSound('tap')
    }
  }

  function toggleAmbient() {
    if (ambient) {
      stopAmbientSound()
      setAmbient(false)
    } else {
      const ok = startAmbientSound()
      setAmbient(ok)
      if (!ok) toast.error('صدای محیطی در دسترس نیست')
    }
  }

  const total = DURATION[mode]
  const pct = 1 - secondsLeft / total
  const mm = Math.floor(secondsLeft / 60)
  const ss = secondsLeft % 60

  const size = 132
  const stroke = 7
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r

  return (
    <AnimatePresence>
      {focusTaskId && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="glass-overlay fixed bottom-24 left-4 z-40 w-80 rounded-3xl p-4 md:bottom-6"
          role="dialog"
          aria-label="تایمر تمرکز"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'flex items-center gap-1 text-[10px] font-bold',
                  mode === 'focus' ? 'text-primary-text' : 'text-warning',
                )}
              >
                {mode === 'focus' ? <Target className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                {mode === 'focus' ? 'زمان تمرکز' : 'زمان استراحت'}
                {sessions > 0 && mode === 'focus' && (
                  <span className="text-muted-foreground tnum">· {sessions} جلسه</span>
                )}
              </p>
              {task ? (
                <p className="mt-0.5 truncate text-xs font-medium">{task.title}</p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">بدون کار مشخص — تمرکز آزاد</p>
              )}
            </div>
            <button
              onClick={() => setFocusTaskId(null)}
              aria-label="بستن تایمر"
              className="ara-press flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-4">
            {/* حلقه — با هاله تنفس هنگام اجرا */}
            <div className="relative shrink-0" style={{ width: size, height: size }}>
              {running && (
                <span
                  className="ara-breathe absolute inset-2 rounded-full"
                  style={{
                    background: `radial-gradient(circle, color-mix(in oklab, ${
                      mode === 'focus' ? 'var(--primary)' : 'var(--warning)'
                    } 22%, transparent), transparent 70%)`,
                  }}
                  aria-hidden
                />
              )}
              <svg width={size} height={size} className="-rotate-90 relative">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-secondary" />
                <motion.circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ}
                  className={cn(mode === 'focus' ? 'stroke-primary' : 'stroke-warning')}
                  animate={{ strokeDashoffset: circ - pct * circ }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ filter: running ? 'drop-shadow(0 0 6px color-mix(in oklab, currentColor 40%, transparent))' : undefined }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-heading text-2xl font-extrabold tnum" dir="ltr">
                  {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* کنترل‌ها */}
            <div className="flex flex-1 flex-col gap-2">
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                onClick={toggleRun}
                className={cn(
                  'ara-float flex h-10 items-center justify-center gap-1.5 rounded-2xl text-xs font-bold',
                  mode === 'focus'
                    ? 'ara-float-primary'
                    : 'ara-glow-amber',
                )}
                style={
                  mode === 'break'
                    ? { background: 'linear-gradient(145deg, var(--warning), color-mix(in oklab, var(--warning) 75%, #ffffff))', color: '#451a03' }
                    : undefined
                }
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? 'توقف' : 'شروع'}
              </motion.button>
              {/* صدای محیطی — اختیاری؛ فقط هنگام اجرا */}
              <button
                onClick={toggleAmbient}
                disabled={!running && !ambient}
                aria-pressed={ambient}
                aria-label={ambient ? 'قطع صدای محیطی' : 'صدای محیطی آرام'}
                title="صدای محیطی آرام (مثل باران دور)"
                className={cn(
                  'ara-press flex h-9 items-center justify-center gap-1.5 rounded-xl text-[11px] font-medium transition-colors disabled:opacity-35',
                  ambient ? 'text-primary-text' : 'glass-chip text-muted-foreground',
                )}
                style={
                  ambient
                    ? {
                        background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
                        boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--primary) 25%, transparent)',
                      }
                    : undefined
                }
              >
                <AudioLines className={cn('h-3.5 w-3.5', ambient && 'ara-live-dot')} />
                {ambient ? 'محیطی روشن' : 'صدای محیطی'}
              </button>
              <button
                onClick={() => {
                  stop()
                  setSecondsLeft(DURATION[mode])
                }}
                className="glass-chip ara-press flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-secondary-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                صفر
              </button>
              {task && mode === 'focus' && (
                <button
                  onClick={completeTask}
                  className="ara-float flex h-9 items-center justify-center rounded-xl text-xs font-medium text-primary-text"
                >
                  انجام شد!
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
