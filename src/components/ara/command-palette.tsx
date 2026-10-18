'use client'

// ─── کامند پالت ⌘K — جستجوی سراسری + پرش سریع + اکشن‌ها ────

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  ListTree,
  Moon,
  Plus,
  Repeat,
  Search,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAra } from '@/lib/store'
import { useClientValue } from '@/lib/client-hooks'
import { relativeDay } from '@/lib/persian-date'
import { useI18n } from '@/i18n/store'
import { cn } from '@/lib/utils'
import type { TaskT, View } from '@/lib/types'

const PRIORITY_LABEL: Record<number, string> = { 1: 'فوری', 2: 'متوسط', 3: 'کم‌اهمیت' }

const VIEWS: Array<{ key: View; label: string; icon: typeof Sun; hint: string; hintEn: string }> = [
  { key: 'today', label: 'امروز', icon: Sun, hint: '۱', hintEn: '1' },
  { key: 'tasks', label: 'همه کارها', icon: ListTree, hint: '۲', hintEn: '2' },
  { key: 'calendar', label: 'تقویم', icon: CalendarDays, hint: '۳', hintEn: '3' },
  { key: 'chat', label: 'دستیار', icon: Sparkles, hint: '۴', hintEn: '4' },
  { key: 'plan', label: 'برنامه و پیشرفت', icon: TrendingUp, hint: '۵', hintEn: '5' },
]

export function CommandPalette() {
  const { t: translate, lang } = useI18n()
  const t = (k: string) => translate(k)
  const open = useAra((s) => s.paletteOpen)
  const setOpen = useAra((s) => s.setPaletteOpen)
  const setView = useAra((s) => s.setView)
  const tasks = useAra((s) => s.tasks)
  const upsertTask = useAra((s) => s.upsertTask)
  const removeTask = useAra((s) => s.removeTask)
  const setDetailTaskId = useAra((s) => s.setDetailTaskId)
  const setFocusTaskId = useAra((s) => s.setFocusTaskId)
  const pulseQuickAdd = useAra((s) => s.pulseQuickAdd)
  const { theme, setTheme } = useTheme()
  const mounted = useClientValue(() => true, false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      } else if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  async function toggleTask(t: TaskT) {
    try {
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: t.status === 'done' ? 'todo' : 'done' }),
      })
      const d = await res.json()
      if (res.ok) upsertTask(d.task as TaskT)
    } catch {
      /* بی‌صدا */
    }
  }

  async function deleteTask(t: TaskT) {
    try {
      const res = await fetch(`/api/tasks/${t.id}`, { method: 'DELETE' })
      if (res.ok) removeTask(t.id)
    } catch {
      /* بی‌صدا */
    }
  }

  async function duplicateTask(t: TaskT) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: t.title,
          notes: t.notes,
          priority: t.priority,
          tag: t.tag,
          dueDate: t.dueDate,
          dueTime: t.dueTime,
          repeat: t.repeat,
        }),
      })
      const d = await res.json()
      if (res.ok) upsertTask(d.task as TaskT)
    } catch {
      /* بی‌صدا */
    }
  }

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === 'todo').slice(0, 30),
    [tasks],
  )
  const doneTasks = useMemo(() => tasks.filter((t) => t.status === 'done').slice(0, 10), [tasks])

  return (
    <AnimatePresence>
      {open && mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('کامند پالت')}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="glass-overlay w-full max-w-xl overflow-hidden rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label={t('کامند پالت رهیار')} loop className="[&_[cmdk-input]]:outline-none">
              <div className="flex items-center gap-2.5 border-b px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Command.Input
                  autoFocus
                  placeholder={t('جستجو یا دستور... (کار، نما، تم)')}
                  className="h-13 w-full bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <kbd className="shrink-0 rounded-md border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ESC
                </kbd>
              </div>
              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-xs text-muted-foreground">{t('چیزی پیدا نشد')}</Command.Empty>

                <Command.Group heading="کارهای فعال" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                  {activeTasks.map((t) => (
                    <Item
                      key={t.id}
                      value={`task-active-${t.id} ${t.title} ${t.tag ?? ''}`}
                      onSelect={() => {
                        setDetailTaskId(t.id)
                        setOpen(false)
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background:
                            t.priority === 1
                              ? 'var(--destructive)'
                              : t.priority === 2
                                ? 'var(--warning)'
                                : 'var(--muted-foreground)',
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                      {t.dueDate && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {relativeDay(t.dueDate, lang)}
                        </span>
                      )}
                      <span className="shrink-0 text-[10px] text-muted-foreground/60">
                        {translate(PRIORITY_LABEL[t.priority])}
                      </span>
                    </Item>
                  ))}
                  {activeTasks.length === 0 && (
                    <p className="px-3 py-2 text-[11px] text-muted-foreground">{t('کار فعالی نداری')}</p>
                  )}
                </Command.Group>

                <Command.Group heading="اکشن‌های سریع" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                  <Item
                    value="new-task کار جدید افزودن"
                    onSelect={() => {
                      setOpen(false)
                      pulseQuickAdd()
                    }}
                  >
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="flex-1">{t('کار جدید...')}</span>
                    <kbd className="rounded-md border bg-secondary px-1.5 text-[10px] text-muted-foreground">N</kbd>
                  </Item>
                  {VIEWS.map((v) => {
                    const Icon = v.icon
                    return (
                      <Item
                        key={v.key}
                        value={`view-${v.key} ${v.label}`}
                        onSelect={() => {
                          setView(v.key)
                          setOpen(false)
                        }}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{t('برو به')} {t(v.label)}</span>
                        <kbd className="rounded-md border bg-secondary px-1.5 text-[10px] text-muted-foreground">{lang === 'en' ? v.hintEn : v.hint}</kbd>
                      </Item>
                    )
                  })}
                  <Item
                    value="theme تم تیره روشن"
                    onSelect={() => {
                      setTheme(theme === 'dark' ? 'light' : 'dark')
                      setOpen(false)
                    }}
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="flex-1">{t('تغییر تم')}</span>
                    <kbd className="rounded-md border bg-secondary px-1.5 text-[10px] text-muted-foreground">D</kbd>
                  </Item>
                </Command.Group>

                {doneTasks.length > 0 && (
                  <Command.Group heading="انجام‌شده" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                    {doneTasks.map((t) => (
                      <Item key={t.id} value={`task-done-${t.id} ${t.title}`} onSelect={() => {
                        setDetailTaskId(t.id)
                        setOpen(false)
                      }}>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary/70" />
                        <span className="min-w-0 flex-1 truncate text-muted-foreground line-through">
                          {t.title}
                        </span>
                      </Item>
                    ))}
                  </Command.Group>
                )}

                {activeTasks.length > 0 && (
                  <Command.Group heading="روی کارها" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                    {activeTasks.slice(0, 6).map((t) => (
                      <div key={t.id} className="flex items-center gap-1 px-1 py-0.5" data-value={`act-${t.id}`}>
                        <span className="min-w-0 flex-1 truncate px-1.5 text-[11px] text-muted-foreground">
                          {t.title}
                        </span>
                        <IconAct
                          label="انجام شد"
                          onClick={() => toggleTask(t)}
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        />
                        <IconAct
                          label="تمرکز روی این کار"
                          onClick={() => {
                            setFocusTaskId(t.id)
                            setView('today')
                            setOpen(false)
                          }}
                          icon={<Target className="h-3.5 w-3.5" />}
                        />
                        <IconAct
                          label="کپی"
                          onClick={() => duplicateTask(t)}
                          icon={<ClipboardCopy className="h-3.5 w-3.5" />}
                        />
                        <IconAct
                          label="حذف"
                          onClick={() => deleteTask(t)}
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          danger
                        />
                      </div>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Item({
  value,
  children,
  onSelect,
}: {
  value: string
  children: React.ReactNode
  onSelect?: () => void
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-sm transition-colors data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"
    >
      {children}
    </Command.Item>
  )
}

function IconAct({
  onClick,
  icon,
  label,
  danger,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary',
        danger && 'hover:bg-destructive/10 hover:text-destructive',
      )}
    >
      {icon}
    </button>
  )
}
