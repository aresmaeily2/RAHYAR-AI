'use client'

// ─── چیپ‌های اکشن چت — نمایش نتایج عملیات دستیار ────────────

import { motion } from 'framer-motion'
import { Bell, Brain, CalendarCheck2, Check, ListTree, Star, Sunrise, Timer, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n/store'
import type { ChatMessageT } from '@/lib/types'

export function ActionChips({ message }: { message: ChatMessageT }) {
  const { t } = useI18n()
  if (message.actions.length === 0) return null
  return (
    <div className="mt-1.5 space-y-1.5">
      {message.actions.map((a, i) => {
        if (a.type === 'add_task' && a.ok && a.task) {
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="flex items-center gap-2 rounded-xl chip-accent px-3 py-2 text-xs"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="flex-1 font-medium">{a.task.title}</span>
              <span className="text-[10px] text-muted-foreground">ثبت شد</span>
            </motion.div>
          )
        }
        if (a.type === 'complete_task' && a.ok && a.task) {
          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground"
            >
              <Check className="h-3.5 w-3.5 text-primary" />
              <span className="line-through">{a.task.title}</span>
              <span className="mr-auto text-[10px] text-primary">انجام شد</span>
            </div>
          )
        }
        if (a.type === 'delete_task' && a.ok) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
              کار حذف شد
            </div>
          )
        }
        if (a.type === 'star_task' && a.ok && a.task) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl chip-warn px-3 py-2 text-xs">
              <Star className={`h-3.5 w-3.5 ${a.task.starred ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
              <span className="flex-1">{a.task.title}</span>
              <span className="text-[10px] text-muted-foreground">{a.task.starred ? t('ستاره‌دار شد') : t('ستاره برداشته شد')}</span>
            </div>
          )
        }
        if (a.type === 'snooze_task' && a.ok && a.task) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1">{a.task.title}</span>
              <span className="text-[10px] text-muted-foreground">به فردا موکول شد</span>
            </div>
          )
        }
        if (a.type === 'plan_day' && a.ok && a.plan) {
          return (
            <div key={i} className="rounded-xl chip-accent px-3 py-2 text-xs">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-primary">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                برنامه امروز چیده شد
              </div>
              <p className="leading-6 text-muted-foreground">{a.plan.summary}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <Sunrise className="h-3 w-3" />
                در نمای «برنامه» با تایم‌لاین کامل ببین
              </p>
            </div>
          )
        }
        if (a.type === 'remember' && a.ok && a.fact) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl chip-accent px-3 py-2 text-xs">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="flex-1">{a.fact}</span>
              <span className="text-[10px] text-muted-foreground">حفظ شد</span>
            </div>
          )
        }
        if (a.type === 'forget' && a.ok) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <Brain className="h-3.5 w-3.5" />
              فراموش کردم؛ از حافظه‌ام پاک شد
            </div>
          )
        }
        if (a.type === 'add_reminder' && a.ok && a.reminder) {
          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl chip-warn px-3 py-2 text-xs"
            >
              <Bell className="h-3.5 w-3.5 text-warning" />
              <span className="flex-1">{a.reminder.message}</span>
              <span className="text-[10px] text-muted-foreground" dir="ltr">
                {new Date(a.reminder.remindAt).toLocaleString('fa-IR', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )
        }
        if (a.type === 'breakdown_task' && a.ok && a.task) {
          return (
            <div key={i} className="rounded-xl chip-accent px-3 py-2 text-xs">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-primary">
                <ListTree className="h-3.5 w-3.5" />
                {a.task.title}
              </div>
              <ul className="space-y-1 pr-4 text-muted-foreground">
                {a.task.subtasks.map((s) => (
                  <li key={s.id} className="list-disc">
                    {s.title}
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        if (
          (a.type === 'update_task' ||
            a.type === 'add_task' ||
            a.type === 'complete_task' ||
            a.type === 'breakdown_task' ||
            a.type === 'star_task' ||
            a.type === 'snooze_task' ||
            a.type === 'plan_day' ||
            a.type === 'remember' ||
            a.type === 'forget') &&
          !a.ok
        ) {
          return (
            <div key={i} className="rounded-xl chip-danger px-3 py-2 text-xs">
              {a.note || t('انجام نشد')}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
