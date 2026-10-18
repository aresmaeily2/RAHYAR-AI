'use client'

// ─── افزودن سریع هوشمند — تشخیص زنده فارسی ──────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CornerDownLeft, Loader2, Plus, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/store'
import { cn } from '@/lib/utils'
import { parseQuickTask, STANDARD_TAGS } from '@/lib/nlp'
import { useAra } from '@/lib/store'
import { REPEAT_LABEL } from '@/lib/types'
import type { TaskT } from '@/lib/types'

const PRIORITY_LABEL: Record<number, string> = { 1: 'فوری', 2: 'متوسط', 3: 'کم‌اهمیت' }

export function QuickAdd() {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const upsertTask = useAra((s) => s.upsertTask)
  const pulse = useAra((s) => s.quickAddPulse)

  useEffect(() => {
    if (pulse > 0) {
      inputRef.current?.focus()
    }
  }, [pulse])

  const parsed = useMemo(() => {
    const v = value.trim()
    if (v.length < 3) return null
    return parseQuickTask(v)
  }, [value])

  const smartTokens = useMemo(() => {
    if (!parsed) return []
    const out: string[] = []
    if (parsed.dueDate) out.push(t('تاریخ شناسایی شد'))
    if (parsed.dueTime) out.push(`ساعت ${parsed.dueTime}`)
    if (parsed.priority) out.push(t(PRIORITY_LABEL[parsed.priority]))
    if (parsed.tag) out.push(`#${parsed.tag}`)
    if (parsed.repeat) out.push(REPEAT_LABEL[parsed.repeat])
    return out
  }, [parsed])

  async function submit() {
    const v = value.trim()
    if (!v || creating) return
    setCreating(true)
    try {
      const p = parseQuickTask(v)
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: p.title,
          dueDate: p.dueDate,
          dueTime: p.dueTime,
          priority: p.priority,
          tag: p.tag,
          repeat: p.repeat ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'خطا')
      upsertTask(data.task as TaskT)
      setValue('')
      toast.success(t('کار جدید ثبت شد'), { description: data.task.title })
    } catch {
      toast.error(t('ثبت کار ناموفق بود'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'glass-card flex items-center gap-2 rounded-2xl px-4 transition-all',
          'focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_7%,transparent),var(--shadow-soft)]',
        )}
      >
        <Plus className="h-4.5 w-4.5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={t('چه کاری؟ مثلاً: هر روز ساعت ۹ ورزش — مهم')}
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          aria-label={t('افزودن کار جدید')}
        />
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 520, damping: 18 }}
          onClick={submit}
          disabled={!value.trim() || creating}
          aria-label={t('ثبت کار')}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
            value.trim()
              ? 'ara-float-primary text-primary-foreground'
              : 'text-muted-foreground/40',
          )}
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
        </motion.button>
      </div>

      {/* پیش‌نمایش تشخیص هوشمند */}
      {smartTokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-primary-text">{t('رهیار فهمید:')}</span>
          {smartTokens.map((t) => (
            <span
              key={t}
              className="rounded-full px-2 py-0.5 font-medium"
              style={{
                background: 'color-mix(in oklab, var(--primary) 8%, transparent)',
                color: 'var(--primary-text)',
                boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--primary) 16%, transparent)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* برچسب‌های پیشنهادی */}
      {value.trim().length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 pt-0.5">
          {STANDARD_TAGS.slice(0, 5).map((tag) => (
            <button
              key={tag}
              onClick={() => setValue(`#${t(tag)} `)}
              className="ara-press glass-chip rounded-full px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-primary-text"
            >
              #{t(tag)}
            </button>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground">
            <Repeat className="h-3 w-3" />{t('یا بنویس «هر روز/هر هفته» برای کار تکرارشونده')}</span>
        </div>
      )}
    </div>
  )
}
