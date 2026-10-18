'use client'

// ─── هوک مشترک اکشن‌های کار — با Undo حذف ───────────────────

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useAra } from '@/lib/store'
import { useI18n } from '@/i18n/store'
import { ambient } from '@/lib/ambient/engine'
import type { TaskT } from '@/lib/types'

export function useTaskActions() {
  const { t } = useI18n()
  const upsertTask = useAra((s) => s.upsertTask)
  const removeTask = useAra((s) => s.removeTask)
  const openDetail = useAra((s) => s.openDetail)

  const onToggle = useCallback(
    async (task: TaskT) => {
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: task.status === 'done' ? 'todo' : 'done' }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error)
        upsertTask(d.task as TaskT)
        // اعلام معنایی موفقیت به AmbientEngine — جشن کوتاه Orb (گلو)
        if ((d.task as TaskT).status === 'done') ambient.setOrb('glow')
      } catch {
        toast.error(t('عملیات ناموفق بود'))
      }
    },
    [upsertTask],
  )

  const onStar = useCallback(
    async (task: TaskT) => {
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ starred: !task.starred }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error)
        upsertTask(d.task as TaskT)
      } catch {
        toast.error(t('عملیات ناموفق بود'))
      }
    },
    [upsertTask],
  )

  const onDelete = useCallback(
    async (task: TaskT) => {
      // حذف خوش‌بینانه + Undo
      removeTask(task.id)
      toast(t('کار حذف شد'), {
        description: task.title,
        action: {
          label: t('برگردان'),
          onClick: async () => {
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
                  starred: task.starred,
                  repeat: task.repeat,
                }),
              })
              const d = await res.json()
              if (res.ok) upsertTask(d.task as TaskT)
            } catch {
              toast.error('بازگردانی ناموفق بود')
            }
          },
        },
      })
      try {
        const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error()
      } catch {
        upsertTask(task)
        toast.error(t('حذف ناموفق بود'))
      }
    },
    [removeTask, upsertTask],
  )

  const onBreakdown = useCallback(
    (task: TaskT) => {
      openDetail(task)
    },
    [openDetail],
  )

  return { onToggle, onStar, onDelete, onBreakdown, openDetail }
}
