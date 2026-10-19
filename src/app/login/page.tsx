'use client'

// ─── صفحه ورود / راه‌اندازی اولیه رهیار AI ──────────────────
// دو حالت:
//  1) راه‌اندازی اولیه (فقط یک‌بار): مالک نام کاربری/نام نمایشی/رمز انتخاب می‌کند
//  2) ورود: نام کاربری + رمز
// طراحی: همان زبان شیشه‌ای آرام رهیار — RTL، فوکوس‌رینگ، بدون وابستگی جدید.

import { useEffect, useState } from 'react'
import { LogIn, ShieldCheck, Loader2 } from 'lucide-react'
import { AmbientStage } from '@/components/ambient/ambient-stage'
import { AiOrb } from '@/components/ara/ai-orb'
import { useI18n } from '@/i18n/store'

type Mode = 'checking' | 'setup' | 'login' | 'done'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('checking')
  const [username, setUsername] = useState('owner')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [needsToken, setNeedsToken] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const t = useI18n((st) => st.t)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setMode('done')
          window.location.replace('/')
        } else if (d.setupPasswordPending) {
          setNeedsToken(d.setupTokenRequired === true)
          setMode('setup')
        } else {
          setMode('login')
        }
      })
      .catch(() => setMode('login'))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const url = mode === 'setup' ? '/api/auth/setup' : '/api/auth/login'
      const payload =
        mode === 'setup'
          ? { username, displayName, password, setupToken }
          : { username, password }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error ? t(d.error) : t('انجام نشد؛ دوباره تلاش کن'))
        return
      }
      window.location.replace('/')
    } catch {
      setError(t('ارتباط برقرار نشد؛ اتصال را بررسی کن'))
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border bg-background/60 px-4 py-2.5 text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40'

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <AmbientStage />

      <main className="glass-overlay relative z-10 w-full max-w-sm rounded-3xl p-7">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <AiOrb size={56} state="idle" />
          <div>
            <h1 className="font-heading text-xl font-extrabold">{t('رهیار AI')}</h1>
            <p className="mx-auto mt-1.5 max-w-64 text-xs leading-5 text-muted-foreground">
              {t('دستیار هوشمند شخصی — «از درخواست تا انجام»')}
            </p>
          </div>
        </div>

        {mode === 'checking' && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('در حال بررسی وضعیت…')}
          </div>
        )}

        {(mode === 'setup' || mode === 'login') && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === 'setup' ? (
              <div className="rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-[11px] leading-5" role="note">
                <p className="font-bold text-primary">{t('راه‌اندازی اولیه')}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {t('این اولین اجراست. یک رمز امن برای حساب مالک انتخاب کن؛ این فرم فقط همین یک‌بار نمایش داده می‌شود.')}
                </p>
              </div>
            ) : null}

            {mode === 'setup' && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="username" className="text-xs font-medium text-muted-foreground">{t('نام کاربری')}</label>
                  <input
                    id="username"
                    dir="ltr"
                    autoComplete="username"
                    className={inputCls}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                {needsToken && (
                  <div className="space-y-1.5">
                    <label htmlFor="setupToken" className="text-xs font-medium text-muted-foreground">{t('کد راه‌اندازی')}</label>
                    <input
                      id="setupToken"
                      dir="ltr"
                      autoComplete="one-time-code"
                      required
                      aria-describedby="setupTokenHint"
                      className={inputCls}
                      value={setupToken}
                      onChange={(e) => setSetupToken(e.target.value)}
                    />
                    <p id="setupTokenHint" className="text-[10.5px] text-muted-foreground">{t('مقدار RAHYAR_SETUP_TOKEN از تنظیمات سرور')}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="displayName" className="text-xs font-medium text-muted-foreground">{t('نام نمایشی')}</label>
                  <input
                    id="displayName"
                    className={inputCls}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">{t('رمز')}</label>
              <input
                id="password"
                type="password"
                dir="ltr"
                required
                minLength={8}
                autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('حداقل ۸ نویسه')}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs text-foreground">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || password.length < 8}
              className="ara-float ara-float-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'setup' ? <ShieldCheck className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {mode === 'setup' ? t('راه‌اندازی و ورود') : t('ورود')}
            </button>

            <p className="text-center text-[10px] leading-4 text-muted-foreground">
              {t('نشست در همین مرورگر ۳۰ روز معتبر است؛ با «خروج» از پروفایل هر زمان تمام می‌شود.')}
            </p>
          </form>
        )}
      </main>
    </div>
  )
}
