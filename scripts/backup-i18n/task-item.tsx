'use client'

// ─── ردیف کار — مینیمال بدون بوردر + چک فنری + اکشن‌های هوشمند ──

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Clock,
  Loader2,
  PauseCircle,
  Repeat,
  Sparkles,
  Star,
  Target,
  Trash2,
  AlignLeft,
  ClipboardCopy,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TaskT } from '@/lib/types'
import { REPEAT_LABEL } from '@/lib/types'
import { relativeDay } from '@/lib/persian-date'
import { useAra } from '@/lib/store'
import { feedback } from '@/lib/feedback'

interface TaskItemProps {
  task: TaskT
  onToggle: (task: TaskT) => void
  onOpenDetail: (task: TaskT) => void
  onDelete: (task: TaskT) => void
  onStar: (task: TaskT) => void
  onBreakdown: (task: TaskT) => void
  breakdownPendingId?: string | null
}

const PRIORITY_DOT: Record<number, string> = {
  1: 'var(--destructive)',
  2: 'var(--warning)',
  3: 'var(--muted-foreground)',
}

export function TaskItem({
  task,
  onToggle,
  onOpenDetail,
  onDelete,
  onStar,
  onBreakdown,
  breakdownPendingId,
}: TaskItemProps) {
  const done = task.status === 'done'
  const [burst, setBurst] = useState(false)
  const setFocusTaskId = useAra((s) => s.setFocusTaskId)
  const upsertTask = useAra((s) => s.upsertTask)
  const subDone = task.subtasks.filter((s) => s.done).length
  const dueLabel = relativeDay(task.dueDate)
  const overdue = !done && task.dueDate && dueLabel?.includes('عقب‌افتاده')

  function handleToggle() {
    if (!done) {
      setBurst(true)
      setTimeout(() => setBurst(false), 750)
      feedback('complete', 'success') // بازخورد صوتی + هپتیک تکمیل
    }
    onToggle(task)
  }

  async function snooze() {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: 'فردا' }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error()
      upsertTask(d.task as TaskT)
      toast.success('به فردا منتقل شد', { description: task.title })
    } catch {
      toast.error('انتقال ناموفق بود')
    }
  }

  async function duplicate() {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          notes: task.notes,
          priority: task.priority,
          tag: task.tag,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          repeat: task.repeat,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error()
      upsertTask(d.task as TaskT)
      toast.success('کپی ساخته شد')
    } catch {
      toast.error('کپی ناموفق بود')
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className={cn(
        'group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
        'hover:bg-secondary/60 hover:shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent)]',
        done && 'opacity-55',
      )}
    >
      {/* دکمه تکمیل فنری — حلقه با رنگ اولویت */}
      <div className="relative mt-0.5 shrink-0">
        <button
          onClick={handleToggle}
          aria-label={done ? 'علامت‌گذاری به عنوان انجام‌نشده' : 'انجام شد'}
          className={cn(
            'flex h-5.5 w-5.5 items-center justify-center rounded-full border-[1.5px] transition-all duration-200',
            done
              ? 'border-primary bg-primary text-primary-foreground'
              : 'hover:scale-110 active:scale-95',
          )}
          style={
            done
              ? undefined
              : {
                  borderColor: `color-mix(in oklab, ${PRIORITY_DOT[task.priority] ?? 'var(--muted-foreground)'} 55%, transparent)`,
                }
          }
        >
          {done && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 700, damping: 20 }}
            >
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </motion.span>
          )}
        </button>
        {burst && (
          <span className="ara-burst pointer-events-none absolute inset-0 rounded-full border-2 border-primary" />
        )}
      </div>

      {/* متن */}
      <button
        onClick={() => onOpenDetail(task)}
        className="min-w-0 flex-1 text-right"
      >
        <span
          className={cn(
            'text-sm font-medium leading-6 transition-colors',
            done && 'line-through text-muted-foreground',
          )}
        >
          {task.title}
        </span>

        {(dueLabel || task.dueTime || task.tag || task.repeat || task.subtasks.length > 0 || task.notes) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
            {task.dueTime && (
              <span className="inline-flex items-center gap-1 tnum" dir="ltr">
                <Clock className="h-3 w-3" />
                {task.dueTime}
              </span>
            )}
            {dueLabel && !task.dueTime && (
              <span className={cn(overdue && 'font-medium')} style={overdue ? { color: 'var(--destructive)' } : undefined}>
                {dueLabel}
              </span>
            )}
            {task.repeat && (
              <span className="inline-flex items-center gap-1 text-primary-text">
                <Repeat className="h-3 w-3" />
                {REPEAT_LABEL[task.repeat]}
              </span>
            )}
            {task.tag && (
              <span className="text-primary-text">#{task.tag}</span>
            )}
            {task.subtasks.length > 0 && (
              <span className="tnum">
                {subDone}/{task.subtasks.length}
              </span>
            )}
            {task.notes && !done && <AlignLeft className="h-3 w-3" />}
          </div>
        )}
      </button>

      {/* اکشن‌ها */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-35 max-md:group-hover:opacity-100">
        {!done && (
          <>
            <button
              onClick={() => {
                setFocusTaskId(task.id)
                toast('تایمر تمرکز آماده شد', { icon: '⏱️' })
              }}
              aria-label="شروع تمرکز"
              title="شروع تمرکز (پومودورو)"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              <Target className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={snooze}
              aria-label="انتقال به فردا"
              title="انتقال به فردا"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <PauseCircle className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onBreakdown(task)}
              aria-label="تجزیه هوشمند به زیرکار"
              title="تجزیه هوشمند به زیرکار"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              {breakdownPendingId === task.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </button>
          </>
        )}
        {done && (
          <button
            onClick={duplicate}
            aria-label="کپی کار"
            title="کپی این کار"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onStar(task)}
          aria-label={task.starred ? 'حذف ستاره' : 'افزودن ستاره'}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg hover:bg-secondary',
            task.starred ? 'text-warning' : 'text-muted-foreground',
          )}
        >
          <Star className={cn('h-3.5 w-3.5', task.starred && 'fill-warning stroke-warning')} />
        </button>
        <button
          onClick={() => onDelete(task)}
          aria-label="حذف کار"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}
