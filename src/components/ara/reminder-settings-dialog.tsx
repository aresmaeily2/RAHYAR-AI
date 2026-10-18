'use client'

import { useI18n } from '@/i18n/store'
// ─── تنظیمات یادآور: صدا، گفتار محلی، مجوز اعلان (بخش ۸ دستور) ──
// همه گزینه‌ها opt-in؛ وضعیت مجوز مرورگر واقعی نمایش داده می‌شود.

import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, Loader2, Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  normalizeReminderSettings,
  type ReminderSettings,
  type ReminderSoundId,
} from '@/lib/notifications/settings'
import { hasPersianVoice, playReminderSound, speakReminder } from '@/lib/notifications/sounds'
import { useClientValue } from '@/lib/client-hooks'

const SOUNDS: Array<{ id: ReminderSoundId; label: string }> = [
  { id: 'chime', label: 'زنگ آرام' },
  { id: 'pulse', label: 'ضرب ملایم' },
  { id: 'beep', label: 'بوق کوتاه' },
  { id: 'none', label: 'بی‌صدا' },
]

type PermissionState = 'unsupported' | 'granted' | 'denied' | 'default'

function readPermission(): PermissionState {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission as PermissionState
  } catch {
    return 'unsupported'
  }
}

export function ReminderSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t, lang } = useI18n()
  const [settings, setSettings] = useState<ReminderSettings>(normalizeReminderSettings(null))
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [faVoice, setFaVoice] = useState(false)
  // وضعیت مجوز فقط-کلاینت بدون setState در effect
  const permission = useClientValue(readPermission, 'default' as PermissionState)

  useEffect(() => {
    if (!open || loaded) return
    fetch('/api/notification-settings')
      .then((r) => r.json())
      .then((d) => setSettings(normalizeReminderSettings(d?.settings)))
      .catch(() => {})
      .finally(() => {
        setLoaded(true)
        setFaVoice(hasPersianVoice())
      })
  }, [open, loaded])

  async function save(next: ReminderSettings) {
    setSettings(next)
    setBusy(true)
    try {
      const res = await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error()
      toast.success(t('تنظیمات یادآور ذخیره شد'))
    } catch {
      toast.error(t('ذخیره تنظیمات ناموفق بود'))
    } finally {
      setBusy(false)
    }
  }

  async function requestPermission() {
    try {
      if (!('Notification' in window)) return
      const p = await Notification.requestPermission()
      if (p === 'granted') toast.success(t('مجوز اعلان داده شد'))
      else toast(t('مجوز اعلان داده نشد — می‌توانی بعداً از تنظیمات مرورگر بدهی'))
      // بازخوانی وضعیت با رفرش نرم
      window.location.reload()
    } catch {
      toast.error(t('درخواست مجوز ناموفق بود'))
    }
  }

  const permLabel: Record<PermissionState, { fa: string; en: string }> = {
    unsupported: {
      fa: 'مرورگرت اعلان پشتیبانی نمی‌کند (فقط توست داخلی فعال می‌ماند)',
      en: 'Your browser does not support notifications (in-app toast stays active)',
    },
    granted: { fa: 'مجوز اعلان داده شده ✓', en: 'Notification permission granted ✓' },
    denied: {
      fa: 'مجوز اعلان رد شده — از تنظیمات مرورگر قابل تغییر است',
      en: 'Notification permission denied — change it in browser settings',
    },
    default: { fa: 'مجوز اعلان هنوز پرسیده نشده', en: 'Notification permission not asked yet' },
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-right">{t('یادآور و صدا')}</DialogTitle>
          <DialogDescription className="text-right">{t('صدا، گفتار محلی و مجوز اعلان مرورگر — همه اختیاری و قابل لغو.')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* انتخاب صدا */}
          <div className="rounded-xl bg-secondary/50 px-3 py-2.5">
            <p className="flex items-center gap-2 text-xs font-medium">
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />{t('صدای یادآوری')}</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {SOUNDS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    const next = { ...settings, soundId: s.id }
                    setSettings(next)
                    playReminderSound(next) // پیش‌نمایش
                    void save(next)
                  }}
                  className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors hover:bg-secondary aria-[current=true]:border-primary/50 aria-[current=true]:bg-primary/10"
                  aria-current={settings.soundId === s.id}
                >
                  {t(s.label)}
                  {settings.soundId === s.id && <Check className="h-3 w-3 text-primary" />}
                </button>
              ))}
            </div>
            {settings.soundId !== 'none' && (
              <div className="mt-2">
                <label htmlFor="vol" className="text-[10px] text-muted-foreground">
                  بلندی صدا: {Math.round(settings.volume * 100)}٪
                </label>
                <input
                  id="vol"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={settings.volume}
                  onChange={(e) => setSettings({ ...settings, volume: Number(e.target.value) })}
                  onMouseUp={() => save(settings)}
                  onTouchEnd={() => save(settings)}
                  className="w-full accent-[var(--primary)]"
                />
              </div>
            )}
          </div>

          {/* گفتار محلی */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium">{t('خواندن یادآوری با صدا')}</p>
              <p className="text-[10px] text-muted-foreground">
                {t('گفتار محلی دستگاه (بدون سرویس ابری)')}{lang === 'en' ? (faVoice ? ' — Persian voice available ✓' : ' — no Persian voice on this device; text is shown') : (faVoice ? ' — صدای فارسی موجود ✓' : ' — صدای فارسی در این دستگاه پیدا نشد؛ متن نمایش داده می‌شود')}
              </p>
            </div>
            <Switch
              checked={settings.speech}
              aria-label={t('خواندن یادآوری با صدا')}
              disabled={busy}
              onCheckedChange={(v) => {
                const next = { ...settings, speech: v }
                save(next)
                if (v) speakReminder(lang === 'en' ? 'This is a sample Rahyar reminder.' : 'این یک نمونه یادآوری رهیار است.', next)
              }}
            />
          </div>
          {settings.speech && (
            <div className="px-1">
              <label htmlFor="rate" className="text-[10px] text-muted-foreground">
                سرعت گفتار: {settings.speechRate.toFixed(1)}×
              </label>
              <input
                id="rate"
                type="range"
                min={0.5}
                max={1.5}
                step={0.1}
                value={settings.speechRate}
                onChange={(e) => setSettings({ ...settings, speechRate: Number(e.target.value) })}
                onMouseUp={() => save(settings)}
                onTouchEnd={() => save(settings)}
                className="w-full accent-[var(--primary)]"
              />
            </div>
          )}

          {/* مجوز اعلان مرورگر */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />{t('اعلان مرورگر')}</p>
              <p className="text-[10px] text-muted-foreground">{lang === 'en' ? permLabel[permission].en : permLabel[permission].fa}</p>
            </div>
            {permission === 'granted' ? (
              <BellOff className="h-4 w-4 text-primary" aria-hidden />
            ) : (
              <button
                onClick={requestPermission}
                disabled={permission === 'unsupported'}
                className="rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-secondary disabled:opacity-50"
              >{t('درخواست مجوز')}</button>
            )}
          </div>

          <p className="rounded-xl border bg-background/50 px-3 py-2 text-[10px] leading-4 text-muted-foreground">
            صادقانه: اعلان مرورگر فقط وقتی تب رهیار باز (یا به‌صورت PWA نصب‌شده) کار می‌کند.
            یادآوری تضمین‌شده هنگام خاموشی دستگاه نیاز به اعلان سرور به دور (Web Push) دارد که
            نیازمند پیکربندی مالک است — مستند: <span dir="ltr">docs/REMINDERS_PLATFORMS.md</span>
          </p>

          {busy && (
            <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground" role="status">
              <Loader2 className="h-3 w-3 animate-spin" />{t('در حال ذخیره…')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
