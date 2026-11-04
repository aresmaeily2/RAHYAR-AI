'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * F2-EMU: پنل پخش زندهٔ شبیه‌ساز اندروید — مخصوص بازدید مالک از پنل سمت راست.
 * تصویر هر ~۹۰۰ms از /api/android/screen تازه‌سازی می‌شود؛ لمس روی تصویر با
 * تبدیل مختصات به /api/android/tap ارسال می‌شود. اپ اجراشده در شبیه‌ساز، نسخهٔ
 * مستقل محلی رهیار (com.rahyarai.app) است.
 */

type Phase = 'waiting' | 'live'

export default function EmulatorPage() {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [tick, setTick] = useState(0)
  const [auto, setAuto] = useState(true)
  const [busy, setBusy] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const failsRef = useRef(0)

  const src = `/api/android/screen?c=${tick}`

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!auto) return
    const id = setInterval(refresh, 900)
    return () => clearInterval(id)
  }, [auto, refresh])

  const send = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true)
      try {
        await fetch('/api/android/tap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch {
        /* بی‌صدا — تصویر بعدی وضعیت را نشان می‌دهد */
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

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0b1020', color: '#e7ecff', fontFamily: 'inherit' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '12px 18px', borderBottom: '1px solid #1d2a4d', background: '#0d1428',
        }}
      >
        <strong style={{ fontSize: 15 }}>🤖 رهیار — پخش زندهٔ شبیه‌ساز اندروید</strong>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
            color: phase === 'live' ? '#4ade80' : '#fbbf24',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: 99,
            background: phase === 'live' ? '#4ade80' : '#fbbf24',
          }} />
          {phase === 'live' ? 'زنده' : 'در انتظار بوت شبیه‌ساز…'}
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={() => void send({ action: 'back' })} disabled={busy}
          style={btnStyle}>⬅︎ برگشت</button>
        <button onClick={() => void send({ action: 'home' })} disabled={busy}
          style={btnStyle}>⌂ خانه</button>
        <button onClick={refresh} style={btnStyle}>↻ نوسازی</button>
        <button onClick={() => setAuto((a) => !a)} style={btnStyle}>
          {auto ? '⏸ توقف پخش' : '▶ ادامهٔ پخش'}
        </button>
      </header>

      <main style={{ display: 'flex', justifyContent: 'center', padding: '16px 10px 28px' }}>
        <div
          onClick={onTap}
          style={{
            position: 'relative', borderRadius: 26, overflow: 'hidden',
            border: '1px solid #24356b', background: '#05070f',
            boxShadow: '0 18px 60px rgba(0,0,0,.55)', cursor: phase === 'live' ? 'pointer' : 'default',
            minHeight: 420, minWidth: 240,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="صفحهٔ شبیه‌ساز اندروید — اپ رهیار"
            style={{ display: 'block', maxHeight: '76vh', width: 'auto', maxWidth: '92vw' }}
            onLoad={() => { failsRef.current = 0; setPhase('live') }}
            onError={() => {
              failsRef.current += 1
              setPhase('waiting')
            }}
          />
          {phase === 'waiting' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center',
              padding: 24, fontSize: 13, color: '#93a4d0', lineHeight: 2,
            }}>
              <div style={{ fontSize: 30 }}>⏳</div>
              <div>شبیه‌ساز اندروید در حال بوت است (شبیه‌سازی نرم‌افزاری، بدون KVM).</div>
              <div>پس از بالا آمدن، اپ <b>رهیار</b> به‌صورت خودکار نصب و اجرا می‌شود.</div>
            </div>
          )}
        </div>
      </main>
      <footer style={{ textAlign: 'center', fontSize: 11, color: '#5d6fa3', paddingBottom: 18 }}>
        لمس روی تصویر = لمس روی صفحهٔ دستگاه · پخش هر ~۰.۹ ثانیه · APK نسخهٔ 2.1.0 (versionCode 22)
      </footer>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: '#16224a', color: '#dbe4ff', border: '1px solid #2a3c78',
  borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
}
