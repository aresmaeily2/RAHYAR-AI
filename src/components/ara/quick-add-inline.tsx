'use client'

// ─── افزودن سریع درون‌خطی برای تاریخ مشخص (تقویم) ───────────

import { useState } from 'react'
import { CornerDownLeft, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/store'
import { cn } from '@/lib/utils'
import { useAra } from '@/lib/store'
import { EASE_STANDARD } from './motion'
import type { TaskT } from '@/lib/types'

export function QuickAddInline({ presetDate }: { presetDate: string }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [creating, setCreating] = useState(false)
  const upsertTask = useAra((s) => s.upsertTask)

  async function submit() {
    const v = value.trim()
    if (!v || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: v, dueDate: presetDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error)
      upsertTask(data.task as TaskT)
      setValue('')
      toast.success(t('ثبت شد'), { description: data.task.title })
    } catch {
      toast.error(t('ثبت ناموفق بود'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <motion.div
      className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-1.5 transition-colors focus-within:bg-secondary"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_STANDARD }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={t('کار جدید برای این روز...')}
        className="h-8 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
        aria-label={t('افزودن کار به این روز')}
      />
      <button
        onClick={submit}
        disabled={!value.trim() || creating}
        aria-label={t('ثبت')}
        className={cn(
          'flex h-6.5 w-6.5 items-center justify-center rounded-lg transition-all',
          value.trim() ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground/40',
        )}
      >
        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CornerDownLeft className="h-3.5 w-3.5" />}
      </button>
    </motion.div>
  )
}
