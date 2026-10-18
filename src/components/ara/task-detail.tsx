'use client'

// ─── جزئیات کار — ویرایش کامل + انتخاب تکرار ────────────────

import { useEffect, useState } from 'react'
import { Check, Loader2, Plus, Repeat, Sparkles, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n/store'
import { cn } from '@/lib/utils'
import { useAra } from '@/lib/store'
import { parseQuickTask } from '@/lib/nlp'
import type { RepeatMode, TaskT } from '@/lib/types'

interface TaskDetailProps {
  taskId: string | null
  open: boolean
  onOpenChange: (o: boolean) => void
}

const REPEAT_OPTIONS: Array<{ key: RepeatMode; label: string }> = [
  { key: null, label: 'بدون تکرار' },
  { key: 'daily', label: 'هر روز' },
  { key: 'weekly', label: 'هر هفته' },
]

export function TaskDetail({ taskId, open, onOpenChange }: TaskDetailProps) {
  const { t } = useI18n()
  const tasks = useAra((s) => s.tasks)
  const upsertTask = useAra((s) => s.upsertTask)
  const removeTask = useAra((s) => s.removeTask)
  const task = tasks.find((t) => t.id === taskId) ?? null

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [tag, setTag] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [repeat, setRepeat] = useState<RepeatMode>(null)
  const [subInput, setSubInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [breakingDown, setBreakingDown] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setNotes(task.notes ?? '')
      setTag(task.tag ?? '')
      setDueTime(task.dueTime ?? '')
      setRepeat(task.repeat ?? null)
    }
  }, [task])

  if (!task) return <Sheet open={false} onOpenChange={onOpenChange}>{null}</Sheet>

  async function patch(data: Record<string, unknown>, silent = false) {
    try {
      const res = await fetch(`/api/tasks/${task!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error)
      upsertTask(d.task as TaskT)
      if (!silent) toast.success(t('ذخیره شد'))
    } catch {
      toast.error(t('ذخیره ناموفق بود'))
    }
  }

  async function saveMeta() {
    if (!title.trim()) {
      toast.error(t('عنوان نمی‌تواند خالی باشد'))
      return
    }
    setSaving(true)
    await patch({ title: title.trim(), notes, tag, dueTime: dueTime || null, repeat })
    setSaving(false)
    onOpenChange(false)
  }

  async function toggleSub(subId: string, done: boolean) {
    try {
      const res = await fetch(`/api/subtasks/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error)
      upsertTask(d.task as TaskT)
    } catch {
      toast.error(t('خطا در زیرکار'))
    }
  }

  async function addSub() {
    const v = subInput.trim()
    if (!v) return
    try {
      const res = await fetch('/api/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task!.id, title: v }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error)
      upsertTask(d.task as TaskT)
      setSubInput('')
    } catch {
      toast.error(t('افزودن زیرکار ناموفق بود'))
    }
  }

  async function deleteSub(subId: string) {
    try {
      const res = await fetch(`/api/subtasks/${subId}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error)
      upsertTask(d.task as TaskT)
    } catch {
      toast.error(t('حذف ناموفق بود'))
    }
  }

  async function breakdown() {
    setBreakingDown(true)
    try {
      const res = await fetch(`/api/tasks/${task!.id}/breakdown`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error)
      upsertTask(d.task as TaskT)
      toast.success(`${d.added} زیرکار هوشمند اضافه شد`)
    } catch {
      toast.error(t('تجزیه هوشمند ناموفق بود'))
    } finally {
      setBreakingDown(false)
    }
  }

  async function deleteTask() {
    try {
      const res = await fetch(`/api/tasks/${task!.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      removeTask(task!.id)
      onOpenChange(false)
      toast.success(t('کار حذف شد'))
    } catch {
      toast.error(t('حذف ناموفق بود'))
    }
  }

  function quickDate(mode: 'today' | 'tomorrow' | 'none') {
    if (mode === 'none') {
      patch({ dueDate: null }, true)
      return
    }
    const p = parseQuickTask(mode === 'today' ? 'امروز' : 'فردا')
    patch({ dueDate: p.dueDate }, true)
  }

  const isToday = task.dueDate?.slice(0, 10) === new Date().toISOString().slice(0, 10)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="glass-overlay w-full overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>{t('جزئیات کار')}</SheetTitle>
          <SheetDescription>{t('ویرایش جزئیات و زیرکارهای کار')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-5 pt-4">
          {/* عنوان + ستاره */}
          <div className="flex items-start gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-lg font-bold leading-8 outline-none"
              aria-label={t('عنوان کار')}
            />
            <button
              onClick={() => patch({ starred: !task.starred }, true)}
              aria-label={t('ستاره')}
              className={cn(
                'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-secondary',
                task.starred ? 'text-warning' : 'text-muted-foreground',
              )}
            >
              <Star className={cn('h-4 w-4', task.starred && 'fill-warning stroke-warning')} />
            </button>
          </div>

          {/* سررسید سریع */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => quickDate('today')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs transition-colors hover:bg-secondary',
                isToday ? 'font-medium' : 'text-muted-foreground',
              )}
              style={
                isToday
                  ? {
                      background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
                      color: 'var(--primary-text)',
                      boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--primary) 25%, transparent)',
                    }
                  : undefined
              }
            >{t('امروز')}</button>
            <button
              onClick={() => quickDate('tomorrow')}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary"
            >{t('فردا')}</button>
            <button
              onClick={() => quickDate('none')}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary"
            >{t('بدون تاریخ')}</button>
            <input
              type="date"
              value={task.dueDate?.slice(0, 10) ?? ''}
              onChange={(e) => patch({ dueDate: e.target.value || null }, true)}
              className="rounded-full bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground outline-none"
              aria-label={t('تاریخ سررسید')}
            />
          </div>

          {/* اولویت */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('اولویت')}</p>
            <div className="flex gap-1.5">
              {([1, 2, 3] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => patch({ priority: p }, true)}
                  className={cn(
                    'flex-1 rounded-xl py-2 text-xs font-medium transition-all ring-1',
                    task.priority === p
                      ? p === 1
                        ? 'text-destructive'
                        : p === 2
                          ? 'text-warning'
                          : 'text-muted-foreground'
                      : 'text-muted-foreground ring-transparent hover:ring-foreground/20',
                  )}
                  style={
                    task.priority === p
                      ? {
                          background: `color-mix(in oklab, ${
                            p === 1 ? 'var(--destructive)' : p === 2 ? 'var(--warning)' : 'var(--muted-foreground)'
                          } 10%, transparent)`,
                          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${
                            p === 1 ? 'var(--destructive)' : p === 2 ? 'var(--warning)' : 'var(--muted-foreground)'
                          } 40%, transparent)`,
                        }
                      : undefined
                  }
                >
                  {t(p === 1 ? 'فوری' : p === 2 ? 'متوسط' : 'کم‌اهمیت')}
                </button>
              ))}
            </div>
          </div>

          {/* تکرار */}
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Repeat className="h-3 w-3" />{t('تکرار — با تکمیل، نسخه بعدی خودکار ساخته می‌شود')}</p>
            <div className="flex gap-1.5">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={String(opt.key)}
                  onClick={() => {
                    setRepeat(opt.key)
                    patch({ repeat: opt.key }, true)
                  }}
                  className={cn(
                    'flex-1 rounded-xl py-2 text-xs font-medium transition-all ring-1',
                    repeat === opt.key
                      ? 'bg-primary/10 text-primary ring-primary/40'
                      : 'text-muted-foreground ring-transparent hover:ring-foreground/20',
                  )}
                >
                  {t(opt.label)}
                </button>
              ))}
            </div>
          </div>

          {/* برچسب و ساعت */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('برچسب')}</label>
              <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder={t('کار، شخصی...')} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('ساعت')}</label>
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="h-9" dir="ltr" />
            </div>
          </div>

          {/* یادداشت */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('یادداشت')}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('جزئیات، لینک‌ها، نکات...')}
              className="min-h-20 resize-none"
            />
          </div>

          {/* زیرکارها */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                زیرکارها {task.subtasks.length > 0 && `(${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length})`}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={breakdown}
                disabled={breakingDown}
                className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
              >
                {breakingDown ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                تجزیه هوشمند
              </Button>
            </div>

            <div className="space-y-0.5">
              {task.subtasks.map((s) => (
                <div key={s.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/70">
                  <button
                    onClick={() => toggleSub(s.id, !s.done)}
                    aria-label={t('تکمیل زیرکار')}
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all',
                      s.done
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40 hover:border-primary',
                    )}
                  >
                    {s.done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                  </button>
                  <span className={cn('flex-1 text-sm', s.done && 'line-through text-muted-foreground')}>
                    {s.title}
                  </span>
                  <button
                    onClick={() => deleteSub(s.id)}
                    aria-label={t('حذف زیرکار')}
                    className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5">
              <Input
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSub()}
                placeholder={t('زیرکار جدید...')}
                className="h-9"
              />
              <Button size="icon" onClick={addSub} disabled={!subInput.trim()} className="h-9 w-9 shrink-0" aria-label={t('افزودن زیرکار')}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* اکشن‌های پایانی */}
          <div className="flex gap-2 border-t pt-4">
            <Button onClick={saveMeta} disabled={saving} className="flex-1 gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              ذخیره تغییرات
            </Button>
            <Button variant="outline" onClick={deleteTask} className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" />{t('حذف')}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
