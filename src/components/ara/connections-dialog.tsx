'use client'

import { useI18n } from '@/i18n/store'
// ─── اتصال‌های بیرونی + شفافیت کامل (بخش‌های ۱۰ و ۱۱ دستور) ──
// هر اتصال: وضعیت واقعی + ۶ افشای الزامی. فعال‌سازی فقط با پیکربندی مالک.

import { useSyncExternalStore } from 'react'
import { Calendar, Info, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ConnectionSpec } from '@/lib/connections/catalog'

const ICONS: Record<string, typeof Mail> = {
  email: Mail,
  calendar: Calendar,
  telegram: MessageCircle,
  whatsapp: Phone,
}

type ConnResponse = { connections: ConnectionSpec[]; note: string }

// ── استور کوچک واکشی (بدون setState در effect — الگوی useSyncExternalStore) ──
let cache: ConnResponse | null = null
let started = false
const listeners = new Set<() => void>()

function loadConnections(): void {
  if (started) return
  started = true
  fetch('/api/connections')
    .then((r) => (r.ok ? r.json() : null))
    .then((d: ConnResponse | null) => {
      if (d?.connections) {
        cache = d
        listeners.forEach((l) => l())
      }
    })
    .catch(() => {
      started = false
    })
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  loadConnections()
  return () => {
    listeners.delete(l)
  }
}

const FALLBACK: ConnResponse = {
  connections: [],
  note: 'هیچ اتصال بیرونی در این نسخه فعال نیست؛ فعال‌سازی نیازمند حساب و مجوز مالک و پیکربندی رسمی ارائه‌دهنده است.',
}

/** برچسب‌های شش‌گانه افشا — دوزبانه با کلید طبیعی */
const DISCLOSURE_KEYS = [
  'دسترسی لازم',
  'داده جمع‌آوری‌شده',
  'محل پردازش',
  'ارسال به مدل AI؟',
  'ذخیره‌سازی',
  'قطع و حذف',
] as const

export function ConnectionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useI18n()
  const data = useSyncExternalStore(subscribe, () => cache, () => null) ?? FALLBACK

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-right">{t('اتصال‌های بیرونی')}</DialogTitle>
          <DialogDescription className="text-right">{t('برای هر اتصال دقیقاً مشخص است چه دسترسی‌ای می‌خواهد، چه داده‌ای می‌بیند و چطور قطع می‌شود.')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-[11px] leading-5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">{t(data.note)}</p>
          </div>

          {data.connections.map((c) => {
            const Icon = ICONS[c.id] ?? Info
            return (
              <details key={c.id} className="group rounded-xl bg-secondary/50 px-3 py-2.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="block text-xs font-medium">{t(c.title)}</span>
                      <span className="block text-[10px] text-muted-foreground">{t(c.subtitle)}</span>
                    </span>
                  </span>
                  <span className="chip-warn rounded-full px-2 py-0.5 text-[9px] font-bold">{t('نیازمند پیکربندی مالک')}</span>
                </summary>
                <dl className="mt-2.5 space-y-2 border-t pt-2.5 text-[11px] leading-5">
                  {([
                    [DISCLOSURE_KEYS[0], c.access],
                    [DISCLOSURE_KEYS[1], c.dataCollected],
                    [DISCLOSURE_KEYS[2], c.processing],
                    [DISCLOSURE_KEYS[3], c.sentToModel],
                    [DISCLOSURE_KEYS[4], c.storage],
                    [DISCLOSURE_KEYS[5], c.revocation],
                  ] as const).map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-bold text-foreground/80">{t(k)}</dt>
                      <dd className="text-muted-foreground">{t(v)}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="font-bold text-foreground/80">{t('مسیر رسمی پیاده‌سازی')}</dt>
                    <dd className="text-muted-foreground">{t(c.officialPath)}</dd>
                  </div>
                </dl>
              </details>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
