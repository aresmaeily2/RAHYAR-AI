'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * F2-EMU: پنل پخش زندهٔ شبیه‌ساز اندروید — فقط مالک (نشست OWNER لازم است).
 * امکانات مأموریت (مرحلهٔ ۳): تصویر زندهٔ سبک، وضعیت آنلاین/آفلاین، وضعیت
 * ADB/بوت، رزولوشن و مشخصات، لمس/برگشت/خانه، چرخش، نوسازی، بازیابی اتصال،
 * نمایش خطای واقعی (۴۰۱/۴۰۳/۴۲۹/۵۰۳)، وضعیت نصب اپ رهیار.
 */

type Phase = 'waiting' | 'live' | 'recovering' | 'auth' | 'denied' | 'offline'

type Status = {
  deviceOnline: boolean; booted: boolean; apiLevel: string; androidVersion: string
  abi: string; resolution: string; density: string; ramMb: string; appInstalled: boolean
}

const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5,
  padding: '3px 9px', borderRadius: 999, border: '1px solid #2a3c78',
  background: '#101a3a', color: '#c7d2f2', whiteSpace: 'nowrap',
}
const btn: React.CSSProperties = {
  background: '#16224a', color: '#dbe4ff', border: '1px solid #2a3c78',
  borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
}
const dot = (ok: boolean) => ({
  width: 8, height: 8, borderRadius: 99, background: ok ? '#4ade80' : '#f87171', display: 'inline-block',
})

export default function EmulatorPage() {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [tick, setTick] = useState(0)
  const [auto, setAuto] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [lastErr, setLastErr] = useState<string>('')
  const [httpCode, setHttpCode] = useState<number>(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const failStreak = useRef(0)

  const src = `/api/android/screen?c=${tick}`

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  // پخش زنده — فقط وقتی آنلاین است تصویر را تازه کن (بار سبک)
  useEffect(() => {
    if (!auto || phase === 'auth' || phase === 'denied' || phase === 'offline') return
    const id = setInterval(refresh, phase === 'live' ? 900 : 1500)
    return () => clearInterval(id)
  }, [auto, phase, refresh])

  // وضعیت شبیه‌ساز هر ۴ ثانیه
  const pollStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/android/status', { cache: 'no-store' })
      if (r.status === 401) { setPhase('auth'); setHttpCode(401); setLastErr('نشست معتبر نیست') ; return }
      if (r.status === 403) { setPhase('denied'); setHttpCode(403); setLastErr('فقط مالک به شبیه‌ساز دسترسی دارد'); return }
      if (r.status === 429) { setLastErr('محدودیت نرخ — چند لحظه صبر کنید'); return }
      const j = (await r.json()) as Status
      setStatus(j)
      if (!j.deviceOnline) {
        setPhase((p) => (p === 'auth' || p === 'denied' ? p : 'offline'))
        setLastErr('شبیه‌ساز در حال اجرا نیست — در حال انتظار برای راه‌اندازی مجدد…')
        return
      }
      if (!j.booted) {
        setPhase((p) => (p === 'auth' || p === 'denied' ? p : 'waiting'))
        setLastErr('اندروید در حال بوت است (شبیه‌سازی نرم‌افاری TCG — چند دقیقه طول می‌کشد)')
        return
      }
      setPhase((p) => (p === 'auth' || p === 'denied' ? p : 'recovering'))
    } catch {
      setPhase((p) => (p === 'auth' || p === 'denied' ? p : 'recovering'))
    }
  }, [])

  useEffect(() => {
    // F2-LINT: setState همزمان در اثر مجاز نیست — فراخوانی نخست با تایمر به‌تعویق می‌افتد
    const t0 = setTimeout(() => void pollStatus(), 0)
    const id = setInterval(() => void pollStatus(), 4000)
    return () => {
      clearTimeout(t0)
      clearInterval(id)
    }
  }, [pollStatus])

  const send = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true)
      try {
        const r = await fetch('/api/android/tap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (r.status === 401) setPhase('auth')
        else if (r.status === 403) { setPhase('denied'); setLastErr('مبدأ درخواست مجاز نیست') }
        else if (r.status === 429) setLastErr('محدودیت نرخ لمس')
      } catch {
        setLastErr('شبکه قطع است — بازیابی خودکار فعال')
      }
      setBusy(false)
      setTimeout(refresh, 250)
    },
    [refresh],
  )

  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current
    if (!img || !img.naturalWidth) return
    const r = img.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * img.naturalWidth
    const y = ((e.clientY - r.top) / r.height) * img.naturalHeight
    void send({ action: 'tap', x, y })
  }

  const isAuthIssue = phase === 'auth' || phase === 'denied'

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0b1020', color: '#e7ecff' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          padding: '10px 16px', borderBottom: '1px solid #1d2a4d', background: '#0d1428',
        }}
      >
        <strong style={{ fontSize: 14.5 }}>🤖 رهیار — شبیه‌ساز اندروید (زنده)</strong>
        <span style={chip}><span style={dot(phase === 'live')} />{phaseLabel(phase)}</span>
        {status && (
          <>
            <span style={chip}><span style={dot(status.deviceOnline)} />ADB</span>
            <span style={chip}><span style={dot(status.booted)} />بوت</span>
            {status.androidVersion && <span style={chip}>اندروید {status.androidVersion} (API {status.apiLevel})</span>}
            {status.abi && <span style={chip}>{status.abi}</span>}
            {status.resolution && <span style={chip}>{status.resolution} @{status.density}dpi</span>}
            {status.ramMb && <span style={chip}>RAM مهمان {status.ramMb}MB</span>}
            <span style={chip}><span style={dot(status.appInstalled)} />اپ رهیار {status.appInstalled ? 'نصب‌شده' : 'نصب نشده'}</span>
          </>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={() => void send({ action: 'back' })} disabled={busy || isAuthIssue} style={btn}>⬅︎ برگشت</button>
        <button onClick={() => void send({ action: 'home' })} disabled={busy || isAuthIssue} style={btn}>⌂ خانه</button>
        <button onClick={() => void send({ action: 'rotate' })} disabled={busy || isAuthIssue} style={btn}>⟳ چرخش</button>
        <button onClick={refresh} style={btn}>↻ نوسازی تصویر</button>
        <button onClick={() => setAuto((a) => !a)} style={btn}>{auto ? '⏸ توقف پخش' : '▶ ادامهٔ پخش'}</button>
      </header>

      <main style={{ display: 'flex', justifyContent: 'center', padding: '14px 10px 24px' }}>
        <div
          onClick={onTap}
          style={{
            position: 'relative', borderRadius: 26, overflow: 'hidden',
            border: '1px solid #24356b', background: '#05070f',
            boxShadow: '0 18px 60px rgba(0,0,0,.55)', cursor: phase === 'live' ? 'pointer' : 'default',
            minHeight: 420, minWidth: 240,
          }}
        >
          {!isAuthIssue && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              ref={imgRef}
              src={src}
              alt="صفحهٔ شبیه‌ساز اندروید — اپ رهیار"
              style={{ display: 'block', maxHeight: '74vh', width: 'auto', maxWidth: '92vw' }}
              onLoad={() => { failStreak.current = 0; setPhase('live'); setLastErr('') }}
              onError={() => {
                failStreak.current += 1
                if (failStreak.current >= 2) setPhase((p) => (p === 'live' ? 'recovering' : p === 'waiting' ? 'waiting' : 'recovering'))
              }}
            />
          )}
          {phase !== 'live' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center',
              padding: 24, fontSize: 13, color: '#93a4d0', lineHeight: 2,
              background: 'rgba(5,7,15,.82)',
            }}>
              {phase === 'auth' && (
                <>
                  <div style={{ fontSize: 30 }}>🔐</div>
                  <div>دسترسی به شبیه‌ساز فقط با حساب <b>مالک</b>.</div>
                  <a href="/login" style={{ color: '#7aa2ff', textDecoration: 'underline' }}>ورود به حساب مالک</a>
                </>
              )}
              {phase === 'denied' && (
                <>
                  <div style={{ fontSize: 30 }}>⛔</div>
                  <div>این نشست مجاز به دیدن شبیه‌ساز نیست (فقط مالک).</div>
                </>
              )}
              {phase === 'waiting' && (
                <>
                  <div style={{ fontSize: 30 }}>⏳</div>
                  <div>شبیه‌ساز اندروید در حال بوت است — بدون KVM، شبیه‌سازی نرم‌افاری (TCG).</div>
                  <div>پس از بالا آمدن، اپ <b>رهیار</b> به‌صورت خودکار نصب و اجرا می‌شود.</div>
                </>
              )}
              {phase === 'recovering' && (
                <>
                  <div style={{ fontSize: 30 }}>🔁</div>
                  <div>قطع موقت تصویر — بازیابی خودکار هر ۱.۵ ثانیه…</div>
                </>
              )}
              {phase === 'offline' && (
                <>
                  <div style={{ fontSize: 30 }}>📴</div>
                  <div>شبیه‌ساز اجرا نیست. زیرساخت هر گام موفق را در گزارش ثبت می‌کند.</div>
                </>
              )}
              {lastErr && <div style={{ fontSize: 11, color: '#f4b8b8' }}>خطا: {lastErr}{httpCode ? ` (HTTP ${httpCode})` : ''}</div>}
            </div>
          )}
        </div>
      </main>
      <footer style={{ textAlign: 'center', fontSize: 11, color: '#5d6fa3', paddingBottom: 16, lineHeight: 1.9 }}>
        لمس روی تصویر = لمس واقعی روی دستگاه · پخش ~۰.۹ ثانیه · محدودیت نرخ فعال · فقط مالک
        <br />APK نسخهٔ 2.1.0 (versionCode 22) — بستهٔ com.rahyarai.app
      </footer>
    </div>
  )
}

function phaseLabel(p: Phase): string {
  switch (p) {
    case 'live': return 'زنده'
    case 'waiting': return 'در حال بوت'
    case 'recovering': return 'بازیابی اتصال'
    case 'auth': return 'نیاز به ورود'
    case 'denied': return 'دسترسی ممنوع'
    case 'offline': return 'شبیه‌ساز خاموش'
  }
}
