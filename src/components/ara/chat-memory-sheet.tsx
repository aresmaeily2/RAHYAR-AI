'use client'

// ─── شیت حافظه دستیار — الگوی Memory قابل مدیریت (Copilot/ChatGPT) ──
// دوزبانه کامل — همه متن‌ها از i18n (کلید طبیعی)

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/store'
import type { MemoryT } from '@/lib/types'

export function MemorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [memories, setMemories] = useState<MemoryT[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/memory')
      .then((r) => r.json())
      .then((d) => d.memories && setMemories(d.memories))
      .catch(() => {})
  }, [open])

  async function addMemory() {
    const fact = input.trim()
    if (!fact || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'خطا')
      setMemories((m) => [d.memory as MemoryT, ...m])
      setInput('')
      toast.success(t('به حافظه‌ام اضافه شد'))
    } catch (e) {
      toast.error(e instanceof Error && e.message !== 'خطا' ? t(e.message) : t('ثبت ناموفق بود'))
    } finally {
      setBusy(false)
    }
  }

  async function removeMemory(id: string) {
    try {
      const res = await fetch('/api/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      setMemories((m) => m.filter((x) => x.id !== id))
    } catch {
      toast.error(t('حذف ناموفق بود'))
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[75dvh] w-full max-w-lg flex-col rounded-t-3xl bg-background p-5 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Brain className="h-4.5 w-4.5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold">{t('حافظه من')}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t('چیزهایی که رهیار درباره تو یاد گرفته — هر وقت بخواهی حذفشان کن')}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label={t('بستن حافظه')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* افزودن دستی */}
            <div className="mb-3 flex items-center gap-1.5 rounded-2xl border bg-card p-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMemory()}
                placeholder={t('چیزی یادش بنداز... مثل: زبان برنامه‌نویسی‌ام پایتون است')}
                maxLength={200}
                className="flex-1 bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60"
                aria-label={t('افزودن حافظه جدید')}
              />
              <button
                onClick={addMemory}
                disabled={!input.trim() || busy}
                aria-label={t('ثبت حافظه')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* فهرست خاطرات */}
            <div className="-mx-1 flex-1 space-y-1.5 overflow-y-auto px-1">
              {memories.length === 0 && (
                <p className="py-8 text-center text-xs leading-6 text-muted-foreground">
                  {t('هنوز چیزی درباره‌ات یادم نشده.')}
                  <br />
                  {t('در گفتگو چیزهایی درباره خودت بگو یا همین‌جا ثبتشان کن.')}
                </p>
              )}
              <AnimatePresence initial={false}>
                {memories.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="group flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs"
                  >
                    <span className="flex-1 leading-6">{m.fact}</span>
                    <button
                      onClick={() => removeMemory(m.id)}
                      aria-label={t('حذف این خاطره')}
                      className="text-muted-foreground/50 transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
