'use client'

// ─── همه کارها — گروه‌بندی زمانی مینیمال ─────────────────────

import { useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TaskItem } from './task-item'
import { TaskDetail } from './task-detail'
import { EmptyState } from './empty-state'
import { useAra } from '@/lib/store'
import { useTaskActions } from './use-task-actions'
import { addDaysIso, tehranIsoDate } from '@/lib/persian-date'
import type { TaskT } from '@/lib/types'
import { useI18n } from '@/i18n/store'
import { formatNum } from '@/i18n/core'
import { cn } from '@/lib/utils'

const FILTERS = [
  { key: 'active' as const, label: 'فعال' },
  { key: 'done' as const, label: 'انجام‌شده' },
  { key: 'all' as const, label: 'همه' },
]

export function TasksView() {
  const { t, lang } = useI18n()
  const tasks = useAra((s) => s.tasks)
  const taskFilter = useAra((s) => s.taskFilter)
  const setTaskFilter = useAra((s) => s.setTaskFilter)
  const tagFilter = useAra((s) => s.tagFilter)
  const setTagFilter = useAra((s) => s.setTagFilter)
  const detailTaskId = useAra((s) => s.detailTaskId)
  const setDetailTaskId = useAra((s) => s.setDetailTaskId)
  const pulseQuickAdd = useAra((s) => s.pulseQuickAdd)
  const { onToggle, onStar, onDelete, onBreakdown, openDetail } = useTaskActions()

  const today = tehranIsoDate()

  const allTags = useMemo(() => {
    const s = new Set<string>()
    tasks.forEach((t) => t.tag && s.add(t.tag))
    return Array.from(s).sort()
  }, [tasks])

  const filtered = useMemo(() => {
    let list = tasks
    if (taskFilter === 'active') list = list.filter((t) => t.status === 'todo')
    if (taskFilter === 'done') list = list.filter((t) => t.status === 'done')
    if (tagFilter) list = list.filter((t) => t.tag === tagFilter)
    return list
  }, [tasks, taskFilter, tagFilter])

  const groups = useMemo(() => {
    const g: Array<{ title: string; tasks: TaskT[]; tone?: 'rose' }> = []
    const add = (title: string, list: TaskT[], tone?: 'rose') => {
      if (list.length > 0) g.push({ title, tasks: list, tone })
    }
    if (taskFilter !== 'done') {
      add(
        t('عقب‌افتاده'),
        filtered.filter((t) => t.status === 'todo' && t.dueDate && t.dueDate.slice(0, 10) < today),
        'rose',
      )
      add(t('امروز'), filtered.filter((t) => t.dueDate?.slice(0, 10) === today))
      add(
        t('فردا'),
        filtered.filter((t) => t.dueDate?.slice(0, 10) === addDaysIso(today, 1)),
      )
      add(
        t('این هفته'),
        filtered.filter((t) => {
          const d = t.dueDate?.slice(0, 10)
          return d && d > today && d <= addDaysIso(today, 7) && d !== addDaysIso(today, 1)
        }),
      )
      add(
        t('بعداً'),
        filtered.filter((t) => t.dueDate && t.dueDate.slice(0, 10) > addDaysIso(today, 7)),
      )
      add(t('بدون تاریخ'), filtered.filter((t) => !t.dueDate))
    } else {
      add(t('انجام‌شده'), filtered)
    }
    return g
  }, [filtered, today, taskFilter, t])

  return (
    <div className="space-y-5">
      {/* فیلترها — قرص‌های شیشه‌ای */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label={t('فیلتر کارها')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={taskFilter === f.key}
            onClick={() => setTaskFilter(f.key)}
            className={cn(
              'ara-press rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
              taskFilter === f.key
                ? 'bg-foreground text-background'
                : 'glass-chip text-muted-foreground hover:text-foreground',
            )}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      {/* برچسب‌ها */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTagFilter(null)}
            className={cn(
              'ara-press rounded-full px-2.5 py-1 text-[11px] transition-colors',
              !tagFilter
                ? 'font-medium'
                : 'glass-chip text-muted-foreground',
            )}
            style={
              !tagFilter
                ? {
                    background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
                    color: 'var(--primary-text)',
                    boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--primary) 25%, transparent)',
                  }
                : undefined
            }
          >{t('همه')}</button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
              className={cn(
                'ara-press rounded-full px-2.5 py-1 text-[11px] transition-colors',
                tagFilter === t ? 'font-medium' : 'glass-chip text-muted-foreground',
              )}
              style={
                tagFilter === t
                  ? {
                      background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
                      color: 'var(--primary-text)',
                      boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--primary) 25%, transparent)',
                    }
                  : undefined
              }
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* گروه‌ها */}
      <div className="space-y-4 pb-4">
        {groups.map((grp) => (
          <section key={grp.title} className="space-y-1.5">
            <div className="flex items-center gap-2 px-1 pt-1">
              <span
                className={cn('h-1.5 w-1.5 rounded-full')}
                style={{ background: grp.tone === 'rose' ? 'var(--destructive)' : 'var(--primary)' }}
              />
              <h2 className="text-[13px] font-bold text-foreground/90">{grp.title}</h2>
              <span className="text-[11px] text-muted-foreground tnum">{grp.tasks.length}</span>
            </div>
            <div>
              <AnimatePresence initial={false}>
                {grp.tasks.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    onToggle={onToggle}
                    onOpenDetail={openDetail}
                    onDelete={onDelete}
                    onStar={onStar}
                    onBreakdown={onBreakdown}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        ))}

        {groups.length === 0 &&
          (tasks.length === 0 ? (
            <EmptyState
              art="leaf"
              title={t('هنوز کاری ثبت نکردی')}
              description={t('اولین کارت را با یک جمله بساز — مثلاً «فردا ساعت ۹ تماس با دکتر». رهیار خودش تاریخ و ساعت را می‌فهمد.')}
              action={t('افزودن اولین کار')}
              onAction={pulseQuickAdd}
            />
          ) : (
            <EmptyState
              art="search"
              title={t('با این فیلترها چیزی پیدا نشد')}
              description={t('{n} کار دیگر داری که با این فیلتر مطابقت ندارد.', { n: formatNum(tasks.length, lang) })}
              action={t('پاک‌کردن فیلترها')}
              onAction={() => {
                setTaskFilter('active')
                setTagFilter(null)
              }}
            />
          ))}
      </div>

      <TaskDetail taskId={detailTaskId} open={detailTaskId !== null} onOpenChange={(o) => !o && setDetailTaskId(null)} />
    </div>
  )
}
