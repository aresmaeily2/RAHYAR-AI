'use client'

// ─── نمای تنظیمات کامل — نسخه ۱٫۰ رهیار ──────────────────────
// ۱۱ دسته: حساب، ظاهر، هوش مصنوعی، تقویم و زبان، صدا، یادآورها،
// دسترسی‌ها، حریم خصوصی، داده‌ها (Import/Export + Backup)، درباره.
// محتوای قبلی پروفایل‌دایالوگ اینجا متمرکز شده است.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Accessibility,
  Bell,
  CalendarDays,
  Database,
  Download,
  Globe,
  Info,
  KeyRound,
  Loader2,
  Mic,
  Palette,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  Volume2,
  Wand2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAra } from '@/lib/store'
import { useClientValue } from '@/lib/client-hooks'
import { useI18n } from '@/i18n/store'
import type { CalendarMode } from '@/i18n/store'
import { formatNum } from '@/i18n/core'
import { AppearancePicker } from './appearance-picker'
import { ReminderSettingsDialog } from './reminder-settings-dialog'
import { ConnectionsDialog } from './connections-dialog'
import {
  WeatherRow,
  EffectsRow,
  AccountRow,
  PasswordRow,
} from './profile-dialog'
import { readSoundEnabled, setSoundEnabled, playUiSound } from '@/lib/feedback'
import { TEXT_SCALES, TEXT_SCALE_LABELS, readStoredTextScale, applyTextScale, type TextScale } from '@/lib/appearance'

type SectionId =
  | 'account' | 'appearance' | 'theme' | 'ai' | 'voice'
  | 'language' | 'calendar' | 'accessibility'
  | 'reminders' | 'permissions' | 'finance' | 'privacy'
  | 'data' | 'about'

// فهرست بخش‌ها مطابق مأموریت نسخه ۱٫۰ — همه واقعی، بدون Placeholder
const SECTIONS: Array<{ id: SectionId; icon: typeof User; labelKey: string }> = [
  { id: 'account', icon: User, labelKey: 'حساب کاربری' },
  { id: 'theme', icon: Palette, labelKey: 'تم و اکسنت' },
  { id: 'appearance', icon: Wand2, labelKey: 'جلوه‌ها' },
  { id: 'ai', icon: Sparkles, labelKey: 'هوش مصنوعی' },
  { id: 'voice', icon: Volume2, labelKey: 'صدا و گفتار' },
  { id: 'language', icon: Globe, labelKey: 'زبان' },
  { id: 'calendar', icon: CalendarDays, labelKey: 'تقویم' },
  { id: 'accessibility', icon: Accessibility, labelKey: 'دسترس‌پذیری' },
  { id: 'reminders', icon: Bell, labelKey: 'یادآورها' },
  { id: 'permissions', icon: Mic, labelKey: 'دسترسی‌ها' },
  { id: 'finance', icon: Wallet, labelKey: 'مالی' },
  { id: 'privacy', icon: ShieldCheck, labelKey: 'حریم خصوصی' },
  { id: 'data', icon: Database, labelKey: 'داده‌ها و پشتیبان' },
  { id: 'about', icon: Info, labelKey: 'درباره' },
]

export function SettingsView() {
  const { t, lang, setLang, calendarMode, setCalendarMode } = useI18n()
  // سال جاری برای برچسب زبان‌ها — شمسی و میلادی، پویا (بدون سال هاردکد)
  const nowYear = new Date().getFullYear()
  const jalaliYear = (() => {
    try {
      return Number(new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric' }).format(new Date()).replace(/[^\d]/g, ''))
    } catch {
      return nowYear - 621
    }
  })()
  const gregYear = nowYear
  const userName = useAra((s) => s.userName)
  const setUserName = useAra((s) => s.setUserName)
  const [active, setActive] = useState<SectionId>('account')
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [connOpen, setConnOpen] = useState(false)
  const [username, setUsername] = useState('')
  const sound = useClientValue(readSoundEnabled, true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setName(userName)
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d) => setUsername(d?.user?.username ?? ''))
      .catch(() => {})
  }, [userName])

  const goto = useCallback((id: SectionId) => {
    setActive(id)
    const el = document.getElementById(`sec-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  async function saveName() {
    if (savingName) return
    setSavingName(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'خطا')
      setUserName(d.profile.name)
      toast.success(t('پروفایل ذخیره شد'))
    } catch {
      toast.error(t('ذخیره ناموفق بود'))
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      {/* ناوبری بخش‌ها — چیپ‌های افقی */}
      <div className="glass-card sticky top-[52px] z-10 flex gap-1.5 overflow-x-auto rounded-2xl p-2" style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => goto(s.id)}
              aria-current={active === s.id ? 'true' : undefined}
              className={cn(
                'ara-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors',
                active === s.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(s.labelKey)}
            </button>
          )
        })}
      </div>

      <div ref={scrollRef} className="space-y-4">
        {/* ── حساب کاربری ── */}
        <SettingsSection id="account" icon={User} title={t('حساب کاربری')}>
          <label htmlFor="settings-name" className="text-[10px] text-muted-foreground">{t('نام تو')}</label>
          <div className="flex gap-2">
            <input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              maxLength={40}
              className="flex-1 rounded-xl border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <button
              onClick={saveName}
              disabled={savingName}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : t('ذخیره‌سازی')}
            </button>
          </div>
          <PasswordRow />
          {username && <AccountRow username={username} />}
        </SettingsSection>

        {/* ── تم و اکسنت ── */}
        <SettingsSection id="theme" icon={Palette} title={t('تم و اکسنت')}>
          <AppearancePicker />
        </SettingsSection>

        {/* ── جلوه‌ها ── */}
        <SettingsSection id="appearance" icon={Wand2} title={t('جلوه‌ها')}>
          <EffectsRow />
          <WeatherRow />
          <button
            onClick={() => setConnOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2 text-[11px] font-medium transition-colors hover:bg-secondary"
          >
            {t('اتصال‌ها')}
          </button>
        </SettingsSection>

        {/* ── هوش مصنوعی ── */}
        <SettingsSection id="ai" icon={Sparkles} title={t('هوش مصنوعی')}>
          <AiEngineCard />
        </SettingsSection>

        {/* ── صدا و گفتار ── */}
        <SettingsSection id="voice" icon={Volume2} title={t('صدا و گفتار')}>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium">{t('صداهای رابط')}</p>
              <p className="text-[10px] text-muted-foreground">{t('تیک کوتاه برای ثبت، تکمیل و تایمر')}</p>
            </div>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => {
                setSoundEnabled(e.target.checked)
                if (e.target.checked) playUiSound('success')
              }}
              aria-label={t('صداهای رابط')}
              className="h-4 w-4 accent-[var(--primary)]"
            />
          </div>
          <VoiceRepliesRow />
          <button
            onClick={() => setNotifOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2 text-[11px] font-medium transition-colors hover:bg-secondary"
          >
            <Bell className="h-3.5 w-3.5" />
            {t('یادآور و صدا')}
          </button>
        </SettingsSection>

        {/* ── زبان ── */}
        <SettingsSection id="language" icon={Globe} title={t('زبان')}>
          <p className="text-[10px] text-muted-foreground">{t('زبان رابط')}</p>
          <div className="flex gap-2">
            {(['fa', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={cn(
                  'ara-press flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
                  lang === l ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground',
                )}
              >
                <Globe className="me-1 inline h-3.5 w-3.5" />
                {t(l === 'fa' ? 'فارسی' : 'انگلیسی')}
                <span className="ms-1 opacity-60">{l === 'fa' ? `RTL · ${formatNum(jalaliYear, 'fa')}` : `LTR · ${gregYear}`}</span>
              </button>
            ))}
          </div>
        </SettingsSection>

        {/* ── تقویم ── */}
        <SettingsSection id="calendar" icon={CalendarDays} title={t('تقویم')}>
          <p className="text-[10px] text-muted-foreground">{t('حالت تقویم')}</p>
          <div className="flex gap-2">
            {/* در زبان انگلیسی فقط تقویم میلادی معنا دارد (معیار مأموریت) */}
            {(lang === 'en'
              ? (['gregorian'] as CalendarMode[])
              : (['jalali', 'dual', 'gregorian'] as CalendarMode[])
            ).map((m) => (
              <button
                key={m}
                onClick={() => setCalendarMode(m)}
                aria-pressed={calendarMode === m}
                className={cn(
                  'ara-press flex-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-colors',
                  calendarMode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground',
                )}
              >
                {t(m === 'jalali' ? 'شمسی' : m === 'dual' ? 'شمسی + میلادی' : 'میلادی')}
              </button>
            ))}
          </div>
          <p className="text-[10px] leading-5 text-muted-foreground">
            {t('حالت دوگانه: شمسی بزرگ و پررنگ با رنگ تأکید؛ میلادی کوچک‌تر و خاکستری به انگلیسی.')}
          </p>
        </SettingsSection>

        {/* ── دسترس‌پذیری ── */}
        <SettingsSection id="accessibility" icon={Accessibility} title={t('دسترس‌پذیری')}>
          <TextScaleRow />
          <p className="rounded-xl bg-secondary/40 px-3 py-2 text-[10px] leading-5 text-muted-foreground">
            {t('حرکت کاهش‌یافته سیستم‌عامل محترم شمرده می‌شود — اگر در سیستم فعال باشد، همه جلوه‌ها خودکار آرام می‌گیرند.')}
          </p>
        </SettingsSection>

        {/* ── مالی ── */}
        <SettingsSection id="finance" icon={Wallet} title={t('مالی')}>
          <FinanceSettingsCard />
        </SettingsSection>

        {/* ── یادآورها ── */}
        <SettingsSection id="reminders" icon={Bell} title={t('یادآورها')}>
          <button
            onClick={() => setNotifOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2.5 text-[11px] font-medium transition-colors hover:bg-secondary"
          >
            <Bell className="h-3.5 w-3.5" />
            {t('بازکردن تنظیمات یادآور')}
          </button>
        </SettingsSection>

        {/* ── دسترسی‌ها ── */}
        <SettingsSection id="permissions" icon={Mic} title={t('دسترسی‌ها')}>
          <PermissionsCard />
        </SettingsSection>

        {/* ── حریم خصوصی ── */}
        <SettingsSection id="privacy" icon={ShieldCheck} title={t('حریم خصوصی')}>
          <PrivacyCard />
        </SettingsSection>

        {/* ── داده‌ها ── */}
        <SettingsSection id="data" icon={Database} title={t('داده‌ها')}>
          <DataCard />
        </SettingsSection>

        {/* ── درباره ── */}
        <SettingsSection id="about" icon={Info} title={t('درباره')}>
          <div className="space-y-1.5 text-xs leading-6">
            <p className="font-heading text-sm font-extrabold">{t('رهیار')} <span className="text-muted-foreground">v1.0</span></p>
            <p className="text-muted-foreground">{t('دستیار هوشمند شخصی')}</p>
            <p className="text-muted-foreground">
              AI: {t('موتور هوش مصنوعی')} (Local Rules + OpenAI-Compatible) · Ambient Engine · i18n (fa/en) · Finance · SMS
            </p>
          </div>
          <button
            onClick={() => setConnOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2 text-[11px] font-medium transition-colors hover:bg-secondary"
          >
            {t('اتصال‌ها')}
          </button>
        </SettingsSection>
      </div>

      <ReminderSettingsDialog open={notifOpen} onOpenChange={setNotifOpen} />
      <ConnectionsDialog open={connOpen} onOpenChange={setConnOpen} />
    </div>
  )
}

// ── قالب بخش ──
function SettingsSection({
  id, icon: Icon, title, children,
}: {
  id: SectionId
  icon: typeof User
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={`sec-${id}`} className="glass-card scroll-mt-28 space-y-2.5 rounded-3xl p-4" aria-label={title}>
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
      {children}
    </section>
  )
}

// ── کارت موتور هوش مصنوعی ──
interface AiStatus {
  engine: string
  endpointUrl: string
  endpointModel: string
  hasKey: boolean
  keyMasked: string
  killSwitch: boolean
}

function AiEngineCard() {
  const { t, lang } = useI18n()
  const [st, setSt] = useState<AiStatus | null>(null)
  const [url, setUrl] = useState('')
  const [model, setModel] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/settings/ai')
      const d = await r.json()
      setSt(d)
      setUrl(d.endpointUrl ?? '')
      setModel(d.endpointModel ?? '')
    } catch {
      /* بی‌صدا */
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(engine?: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(engine ? { engine } : {}),
          endpointUrl: url,
          endpointModel: model,
          ...(key.trim() ? { endpointKey: key.trim() } : {}),
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'خطا')
      setSt(d)
      setKey('')
      toast.success(t('ذخیره شد'))
    } catch (e) {
      toast.error(e instanceof Error && e.message !== 'خطا' ? t(e.message) : t('ذخیره تنظیمات ناموفق بود'))
    } finally {
      setBusy(false)
    }
  }

  async function runTest() {
    setBusy(true)
    setTest(null)
    try {
      const res = await fetch('/api/settings/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointUrl: url, endpointModel: model, endpointKey: key.trim(), useSavedKey: !key.trim() }),
      })
      const d = await res.json()
      setTest(
        d.ok
          ? { ok: true, message: `✓ ${d.model} — ${formatNum(Math.round((d.latencyMs ?? 0) / 100) / 10, lang)}s` }
          : { ok: false, message: d.error ? t(d.error) : 'failed' },
      )
    } catch {
      setTest({ ok: false, message: 'network error' })
    } finally {
      setBusy(false)
    }
  }

  const engines: Array<{ id: string; label: string; desc: string }> = [
    { id: 'local_rules', label: t('موتور قواعد محلی'), desc: t('بدون مدل، بدون هزینه، بدون اینترنت') },
    { id: 'openai_compatible', label: t('Endpoint سازگار با OpenAI'), desc: 'Ollama · LM Studio · DeepSeek · OpenRouter · …' },
  ]

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {engines.map((e) => (
          <button
            key={e.id}
            onClick={() => save(e.id)}
            aria-pressed={st?.engine === e.id}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-start transition-all',
              st?.engine === e.id ? 'border-primary/60 bg-primary/10' : 'border-border/50 bg-secondary/40 hover:bg-secondary/60',
            )}
          >
            <p className="text-[11px] font-bold">{e.label}</p>
            <p className="mt-0.5 text-[9.5px] leading-4 text-muted-foreground">{e.desc}</p>
          </button>
        ))}
      </div>

      {st?.engine === 'openai_compatible' && (
        <div className="space-y-2 rounded-xl bg-secondary/40 p-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            dir="ltr"
            placeholder="https://api.openai.com/v1  ·  http://localhost:11434/v1"
            aria-label={t('آدرس Endpoint')}
            className="w-full rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              dir="ltr"
              placeholder={t('نام مدل') + ' (gpt-4o-mini / llama3)'}
              aria-label={t('نام مدل')}
              className="w-full rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              dir="ltr"
              type="password"
              placeholder={st.hasKey ? `${t('کلید API')} (${st.keyMasked})` : t('کلید API')}
              aria-label={t('کلید API')}
              className="w-full rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => save()} disabled={busy} className="flex-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50">
              {busy ? '…' : t('ذخیره‌سازی')}
            </button>
            <button onClick={runTest} disabled={busy || !url.trim()} className="rounded-lg border px-3 py-2 text-[11px] font-medium disabled:opacity-50">
              {t('تست اتصال')}
            </button>
          </div>
          {test && (
            <p className={cn('text-[10px]', test.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')} dir="ltr">
              {test.message}
            </p>
          )}
          <p className="text-[9.5px] leading-4 text-muted-foreground">
            {t('کلید فقط روی سرور محلی خودت ذخیره می‌شود و هرگز نمایش داده نمی‌شود.')}
          </p>
        </div>
      )}

      {st && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium">{t('کلید قطع اضطراری')}</p>
              <p className="text-[10px] text-muted-foreground">{t('همه فراخوانی مدل فوراً قطع می‌شود — قواعد محلی روشن می‌ماند')}</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={st.killSwitch}
            onChange={async (e) => {
              try {
                const res = await fetch('/api/settings/ai', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ killSwitch: e.target.checked }),
                })
                if (!res.ok) throw new Error()
                void load()
                toast.success(t('ذخیره شد'))
              } catch {
                toast.error(t('ذخیره تنظیمات ناموفق بود'))
              }
            }}
            aria-label={t('کلید قطع اضطراری')}
            className="h-4 w-4 accent-[var(--primary)]"
          />
        </div>
      )}
    </div>
  )
}

// ── کارت دسترسی‌ها ──
function PermissionsCard() {
  const { t } = useI18n()
  // خواندن مجوز فقط-کلاینت بدون setState در effect (قانون react-hooks) —
  // الگوی پروژه: useClientValue برای مقدار اولیه؛ تغییر فقط از رویداد کاربر
  const initial = useClientValue(() => {
    if (!('Notification' in window)) return 'unsupported' as const
    return (Notification.permission as 'default' | 'granted' | 'denied') ?? 'default'
  }, 'default' as 'default' | 'granted' | 'denied' | 'unsupported')
  const [override, setOverride] = useState<'default' | 'granted' | 'denied' | 'unsupported' | null>(null)
  const [mic, setMic] = useState<'granted' | 'denied' | 'unknown'>('unknown')
  const notif = override ?? initial

  function label(v: string): string {
    if (v === 'granted') return t('مجوز اعلان داده شده ✓')
    if (v === 'denied') return t('مجوز اعلان رد شده — از تنظیمات مرورگر قابل تغییر است')
    if (v === 'unsupported') return t('مرورگرت اعلان پشتیبانی نمی‌کند (فقط توست داخلی فعال می‌ماند)')
    return t('مجوز اعلان هنوز پرسیده نشده')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
        <div>
          <p className="text-xs font-medium">{t('اعلان مرورگر')}</p>
          <p className="text-[10px] text-muted-foreground">{label(notif)}</p>
        </div>
        <button
          onClick={async () => {
            if (!('Notification' in window)) return
            try {
              const p = await Notification.requestPermission()
              setOverride(p as 'granted' | 'denied' | 'default')
              toast.success(p === 'granted' ? t('مجوز اعلان داده شد') : t('درخواست مجوز ناموفق بود'))
            } catch {
              toast.error(t('درخواست مجوز ناموفق بود'))
            }
          }}
          className="rounded-lg border px-2.5 py-1.5 text-[10px] font-medium"
        >
          {t('بازکردن')}
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
        <div>
          <p className="text-xs font-medium">microphone</p>
          <p className="text-[10px] text-muted-foreground">{t('ورودی صوتی فارسی')} — {mic === 'granted' ? '✓' : mic === 'denied' ? '✕' : '—'}</p>
        </div>
        <button
          onClick={() => {
            const nav = navigator as Navigator & { permissions?: Permissions }
            nav.permissions
              ?.query({ name: 'microphone' as PermissionName })
              .then((p) => setMic(p.state as 'granted' | 'denied' | 'unknown'))
              .catch(() => setMic('unknown'))
          }}
          className="rounded-lg border px-2.5 py-1.5 text-[10px] font-medium"
        >
          {t('تحلیل')}
        </button>
      </div>
    </div>
  )
}

// ── کارت حریم خصوصی ──
function PrivacyCard() {
  const { t, lang } = useI18n()
  const [usage, setUsage] = useState<{ today: number; month: number } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/settings/ai/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUsage(d ? { today: d.today ?? 0, month: d.month ?? 0 } : null))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] leading-5 text-muted-foreground">
        {t('همه داده‌ها روی دستگاه خودت می‌ماند (SQLite محلی). هیچ تحلیلی به بیرون ارسال نمی‌شود؛ فراخوانی مدل فقط با موتوری که خودت انتخاب می‌کنی.')}
      </p>
      {usage && (
        <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2.5 text-xs">
          <span className="text-muted-foreground">{t('هوش مصنوعی')} — {t('گزارش')}</span>
          <span className="font-bold tabular-nums">
            {formatNum(usage.today, lang)} {t('امروز')} · {formatNum(usage.month, lang)} {t('ماه')}
          </span>
        </div>
      )}
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2.5">
        <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{t('حریم خصوصی')} — {t('حذف')}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
          {t('حذف همه کارها، یادآورها، گفتگو، حافظه‌ها و داده مالی. حساب تو می‌ماند.')}
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            if (!confirming) {
              setConfirming(true)
              return
            }
            setBusy(true)
            try {
              const res = await fetch('/api/data/delete-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirm: 'پاک کن' }),
              })
              if (!res.ok) throw new Error()
              toast.success(t('انجام شد'))
              setConfirming(false)
            } catch {
              toast.error(t('عملیات ناموفق بود'))
            } finally {
              setBusy(false)
            }
          }}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          {busy ? '…' : confirming ? t('برای تأیید پاک‌سازی دوباره کلیک کن') : t('حذف همه داده‌ها')}
        </button>
      </div>
    </div>
  )
}

// ── کارت داده‌ها ──
function DataCard() {
  const { t, lang } = useI18n()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function importFile(f: File) {
    setBusy(true)
    try {
      const text = await f.text()
      const res = await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ? t(d.error) : 'import failed')
      toast.success(`${formatNum(d.tasks ?? 0, lang)} ${t('کارها')} · ${formatNum(d.memories ?? 0, lang)} ${t('حافظه من')}`)
    } catch (e) {
      toast.error(e instanceof Error && e.message !== 'import failed' ? t(e.message) : t('بازگردانی ناموفق بود'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <a
          href="/api/data/export"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2.5 text-[11px] font-medium transition-colors hover:bg-secondary"
        >
          <Download className="h-3.5 w-3.5" />
          {t('خروجی و پشتیبان (JSON)')}
        </a>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-2.5 text-[11px] font-medium transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {t('ورود و بازگردانی (JSON)')}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importFile(f)
          e.target.value = ''
        }}
      />
      <p className="text-[10px] leading-5 text-muted-foreground">
        {t('خروجی شامل کارها، یادآورها، حافظه‌ها، گفتگو، مالی و تنظیمات است. ورود، اضافه می‌کند و چیزی بازنویسی نمی‌شود.')}
      </p>
      <div className="grid grid-cols-4 gap-1.5" style={{ direction: 'ltr' }}>
        {(['csv', 'xls', 'json', 'txt'] as const).map((f) => (
          <a
            key={f}
            href={`/api/finance/export?format=${f}`}
            className="rounded-lg bg-secondary/50 px-2 py-1.5 text-center text-[10px] font-bold uppercase transition-colors hover:bg-secondary"
          >
            {f}
          </a>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">Finance: PDF → {t('نمای گزارش')} + Ctrl/Cmd+P</p>
    </div>
  )
}


// ── کارت داده‌ها ──

// ── کارت پاسخ گفتاری — متصل به تنظیمات سرور (voice_replies) ──
function VoiceRepliesRow() {
  const { t } = useI18n()
  const [on, setOn] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/settings/app')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.voiceReplies === 'boolean') setOn(d.voiceReplies)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  async function toggle(v: boolean) {
    setOn(v)
    try {
      const res = await fetch('/api/settings/app', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceReplies: v }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setOn(!v)
      toast.error(t('ذخیره ناموفق بود'))
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
      <div>
        <p className="text-xs font-medium">{t('پاسخ گفتاری دستیار')}</p>
        <p className="text-[10px] text-muted-foreground">{t('خواندن خودکار پاسخ پس از فرمان صوتی')}</p>
      </div>
      <input
        type="checkbox"
        checked={loaded ? on : false}
        onChange={(e) => void toggle(e.target.checked)}
        disabled={!loaded}
        aria-label={t('پاسخ گفتاری دستیار')}
        className="h-4 w-4 accent-[var(--primary)]"
      />
    </div>
  )
}

// ── کارت اندازه متن — WCAG 1.4.4 (تغییر واقعی روی سند) ──
function TextScaleRow() {
  const { t } = useI18n()
  const scale = useClientValue(readStoredTextScale, 'md')

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground">{t('اندازه متن')}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {TEXT_SCALES.map((s) => (
          <button
            key={s}
            onClick={() => applyTextScale(s)}
            aria-pressed={scale === s}
            className={cn(
              'ara-press rounded-lg px-1.5 py-2 text-[10px] font-bold transition-colors',
              scale === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground',
            )}
          >
            {t(TEXT_SCALE_LABELS[s])}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">{t('تغییر بلافاصله اعمال می‌شود و برای این دستگاه ذخیره می‌شود.')}</p>
    </div>
  )
}

// ── کارت تنظیمات مالی — واحد پول + وضعیت رضایت پیامک ──
function FinanceSettingsCard() {
  const { t } = useI18n()
  const [currency, setCurrency] = useState<'irr' | 'toman'>('irr')
  const [smsConsent, setSmsConsent] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/settings/app')
      .then((r) => r.json())
      .then((d) => {
        if (d?.financeCurrency) setCurrency(d.financeCurrency)
        if (typeof d?.smsConsent === 'boolean') setSmsConsent(d.smsConsent)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  async function setCurrencyValue(v: 'irr' | 'toman') {
    setCurrency(v)
    try {
      const res = await fetch('/api/settings/app', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financeCurrency: v }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error(t('ذخیره ناموفق بود'))
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground">{t('واحد نمایش مبالغ')}</p>
        <div className="flex gap-2">
          {(['irr', 'toman'] as const).map((c) => (
            <button
              key={c}
              onClick={() => void setCurrencyValue(c)}
              aria-pressed={currency === c}
              disabled={!loaded}
              className={cn(
                'ara-press flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
                currency === c ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground',
              )}
            >
              {c === 'irr' ? t('ریال') : t('تومان')}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">{t('در نمای مالی و نمودارها بلافاصله اعمال می‌شود.')}</p>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
        <div>
          <p className="text-xs font-medium">{t('دسترسی پیامک بانکی')}</p>
          <p className="text-[10px] text-muted-foreground">{t('مدیریت رضایت در بخش دسترسی‌ها')}</p>
        </div>
        <span className={cn(
          'rounded-full px-2 py-0.5 text-[9.5px] font-bold',
          smsConsent ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-secondary text-muted-foreground',
        )}>
          {smsConsent ? t('فعال') : t('غیرفعال')}
        </span>
      </div>
    </div>
  )
}
