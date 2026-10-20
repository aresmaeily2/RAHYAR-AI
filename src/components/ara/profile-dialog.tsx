'use client'

import { useI18n } from '@/i18n/store'
// ─── پروفایل و حساب — نام، رمز، خروج، تنظیمات اعلان و اتصال‌ها ──

import { useEffect, useState } from 'react'
import {
  Bell,
  Check,
  CloudSun,
  KeyRound,
  Loader2,
  LogOut,
  PencilLine,
  Plug,
  Sparkles,
  Volume2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useAra } from '@/lib/store'
import { useClientValue } from '@/lib/client-hooks'
import { ReminderSettingsDialog } from './reminder-settings-dialog'
import { ConnectionsDialog } from './connections-dialog'
import { AppearancePicker } from './appearance-picker'
import { readSoundEnabled, setSoundEnabled, playUiSound } from '@/lib/feedback'
import { ambient } from '@/lib/ambient/engine'
import { readWeatherSetting, saveWeatherSetting, DEFAULT_SETTING, type WeatherSetting } from './home-cards'

// ─── سوییچ جلوه‌های زنده (حالت کم‌مصرف) ─────────────────────
const EFFECTS_KEY = 'ara-effects'

export function readEffectsEnabled(): boolean {
  try {
    return localStorage.getItem(EFFECTS_KEY) !== '0'
  } catch {
    return true
  }
}

export function applyEffectsClass(enabled: boolean): void {
  // سازگاری قدیمی — اکنون مسیر Engine؛ صفات data-ambient و کلاس
  // ara-no-fx هر دو از همین‌جا اعمال می‌شوند
  ambient.setEffects(enabled)
}

/** ردیف تنظیم آب‌وهوا — در پروفایل و تنظیمات کامل استفاده می‌شود */
export function WeatherRow() {
  const { t } = useI18n()
  const initial = useClientValue(readWeatherSetting, DEFAULT_SETTING)
  const [state, setState] = useState<WeatherSetting | null>(null)
  const s = state ?? initial
  return (
    <div className="rounded-xl bg-secondary/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CloudSun className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">{t('آب‌وهوا در خانه')}</p>
            <p className="text-[10px] text-muted-foreground">{t('اختیاری — منبع: Open-Meteo (بدون تبلیغ، بدون کلید)')}</p>
          </div>
        </div>
        <Switch
          checked={s.enabled}
          aria-label={t('نمایش آب‌وهوا در خانه')}
          onCheckedChange={(v) => {
            const next = { ...s, enabled: v }
            setState(next)
            saveWeatherSetting(next)
          }}
        />
      </div>
      {s.enabled && (
        <input
          value={s.city}
          onChange={(e) => {
            const next = { ...s, city: e.target.value }
            setState(next)
            saveWeatherSetting(next)
          }}
          placeholder={t('نام شهر؛ مثلاً تهران')}
          maxLength={40}
          className="mt-2 w-full rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={t('نام شهر برای آب‌وهوا')}
        />
      )}
    </div>
  )
}

export function EffectsRow() {
  const { t } = useI18n()
  // مقدار فقط-کلاینت بدون setState در effect (قانون react-hooks/set-state-in-effect)
  const effects = useClientValue(readEffectsEnabled, true)
  const sound = useClientValue(readSoundEnabled, true)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">{t('جلوه‌های پس‌زمینه زنده')}</p>
            <p className="text-[10px] text-muted-foreground">{t('برای مصرف کمتر باتری/پردازنده خاموش کن')}</p>
          </div>
        </div>
        <Switch
          checked={effects}
          aria-label={t('جلوه‌های پس‌زمینه زنده')}
          onCheckedChange={(v) => {
            ambient.setEffects(v)
            toast.success(v ? 'جلوه‌ها روشن شد' : 'حالت کم‌مصرف فعال شد')
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">{t('صداهای رابط')}</p>
            <p className="text-[10px] text-muted-foreground">{t('تیک کوتاه برای ثبت، تکمیل و تایمر')}</p>
          </div>
        </div>
        <Switch
          checked={sound}
          aria-label={t('صداهای رابط')}
          onCheckedChange={(v) => {
            setSoundEnabled(v)
            if (v) playUiSound('success')
            toast.success(v ? 'صداها روشن شد' : 'صداها خاموش شد')
          }}
        />
      </div>
    </div>
  )
}

/** ردیف حساب نشست — نام کاربری + خروج (عمومی برای تنظیمات) */
export function AccountRow({ username }: { username: string }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.replace('/login')
    } catch {
      toast.error(t('خروج ناموفق بود'))
      setBusy(false)
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
        <div>
          <p className="text-xs font-medium">{t('حساب')}: {username}</p>
          <p className="text-[10px] text-muted-foreground">{t('پایان نشست در این مرورگر')}</p>
        </div>
      </div>
      <button
        onClick={logout}
        disabled={busy}
        className="rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {busy ? '…' : t('خروج')}
      </button>
    </div>
  )
}

export function PasswordRow() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'خطا')
      toast.success(t('رمز عوض شد'))
      setCurrent('')
      setNext('')
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error && e.message !== 'خطا' ? t(e.message) : t('تغییر رمز ناموفق بود'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="rounded-xl bg-secondary/50 px-3 py-2.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{t('تغییر رمز')}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">{open ? t('بستن') : t('بازکردن')}</span>
      </button>
      {open && (
        <div className="mt-2.5 space-y-2">
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={t('رمز فعلی')}
            className="w-full rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <input
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={t('رمز جدید (حداقل ۸ نویسه)')}
            className="w-full rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <button
            onClick={save}
            disabled={busy || next.length < 8 || !current}
            className="w-full rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? t('در حال تغییر…') : t('ذخیره رمز جدید')}
          </button>
        </div>
      )}
    </div>
  )
}

export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n()
  const userName = useAra((s) => s.userName)
  const setUserName = useAra((s) => s.setUserName)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [connOpen, setConnOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(userName)
      fetch('/api/auth/session')
        .then((r) => r.json())
        .then((d) => setUsername(d?.user?.username ?? ''))
        .catch(() => {})
    }
  }, [open, userName])

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'خطا')
      setUserName(d.profile.name)
      toast.success(t('پروفایل ذخیره شد'))
      onOpenChange(false)
    } catch {
      toast.error(t('ذخیره ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-overlay max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-right">{t('پروفایل و حساب')}</DialogTitle>
            <DialogDescription className="text-right">{t('نام نمایشی، امنیت حساب، اعلان‌ها و اتصال‌های بیرونی.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <label htmlFor="profile-name" className="sr-only">{t('نام من')}</label>
            <input
              id="profile-name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              maxLength={40}
              placeholder={t('نام تو')}
              className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm outline-none transition-all focus:border-primary/40 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_7%,transparent)]"
            />
            <button
              onClick={save}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              ذخیره نام
            </button>
            <AppearancePicker />
            <WeatherRow />
            <EffectsRow />
            {username && <AccountRow username={username} />}
            <PasswordRow />
            <div className="flex gap-2">
              <button
                onClick={() => setNotifOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2 text-[11px] font-medium transition-colors hover:bg-secondary"
              >
                <Bell className="h-3.5 w-3.5" />{t('یادآور و صدا')}</button>
              <button
                onClick={() => setConnOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2 text-[11px] font-medium transition-colors hover:bg-secondary"
              >
                <Plug className="h-3.5 w-3.5" />{t('اتصال‌ها')}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ReminderSettingsDialog open={notifOpen} onOpenChange={setNotifOpen} />
      <ConnectionsDialog open={connOpen} onOpenChange={setConnOpen} />
    </>
  )
}

/** چیپ کوچک پروفایل در پایین سایدبار — به نمای تنظیمات می‌رود */
export function ProfileChip() {
  const userName = useAra((s) => s.userName)
  const setView = useAra((s) => s.setView)
  const t = useI18n((s) => s.t)
  return (
    <button
      onClick={() => setView('settings')}
      aria-label={t('تنظیمات')}
      title={t('تنظیمات')}
      className="flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <PencilLine className="h-3 w-3" />
      <span className="max-w-24 truncate">{userName || 'تنظیمات'}</span>
    </button>
  )
}
