'use client'

// ─── اسپلش رهیار — وب ──────────────────────────────────────────────
// همان هویت و خط‌زمانی اسپلش بومی اندروید، به‌صورت سبک وب:
//   0.00s هاله + ورود نشان · 0.35s رسم R · 0.95s پای R ·
//   1.25s جرقه · 1.50s نام · ~1.4-1.8s محو و ورود به اپ
// قواعد:
//  - فقط شروع سرد (sessionStorage) — ناوبری داخلی و بازگشت تکرار نمی‌کند
//  - prefers-reduced-motion → نمایش ثابت سریع بدون انیمیشن
//  - هیچ تأخیر اجباری: کلیک = ردشدن؛ مجموع ≤ ۱.۹ ثانیه
//  - پس‌زمینهٔ اپ همزمان پشت اسپلش آماده می‌شود

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const KEY = 'rahyar-splash-seen'

/** رسم R — همان هندسهٔ نشان (viewBox 100) */
function MarkPath({ delay, duration }: { delay: number; duration: number }) {
  return (
    <motion.path
      d={delay === 0 ? 'M30,24 H47 A15.5,15.5 0 0 1 47,55 H30 V80' : 'M47,55 L66,80'}
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ delay, duration, ease: 'linear' }}
    />
  )
}

export function Splash() {
  const reduce = useReducedMotion()
  const [show, setShow] = useState(false)

  // فقط شروع سرد نشست مرورگر — setState داخل کالبک تایمر (نه همگام در اثر)
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* محیط بدون storage — نمایش نمی‌دهیم */
    }
    const t = setTimeout(() => setShow(true), 0)
    return () => clearTimeout(t)
  }, [])

  // پایان خودکار — هیچ تأخیر اجباری بلوکه‌کننده؛ کلیک هم رد می‌کند
  useEffect(() => {
    if (!show) return
    const total = reduce ? 500 : 1850
    const t = setTimeout(() => setShow(false), total)
    return () => clearTimeout(t)
  }, [show, reduce])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 cursor-pointer select-none"
          style={{ background: '#0B1020' }}
          onClick={() => setShow(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
          role="status"
          aria-label="rahyar AI در حال آماده‌سازی"
        >
          {/* هالهٔ نور */}
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute w-72 h-72 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(124,92,255,0.40) 0%, rgba(240,98,164,0.16) 55%, transparent 72%)',
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1.05 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          )}

          {/* نشان — مربع گوشه‌گرد گرادیانی + رسم R */}
          <motion.div
            className="relative w-[116px] h-[116px] rounded-[26px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #7C5CFF 0%, #F062A4 55%, #2FD8C8 100%)',
              boxShadow: '0 18px 60px rgba(124,92,255,0.35)',
            }}
            initial={reduce ? undefined : { opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <svg viewBox="0 0 100 100" className="w-[74px] h-[74px]" aria-hidden>
              {reduce ? (
                <g stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M30,24 H47 A15.5,15.5 0 0 1 47,55 H30 V80" />
                  <path d="M47,55 L66,80" />
                </g>
              ) : (
                <>
                  <MarkPath delay={0.35} duration={0.6} />
                  <MarkPath delay={0.95} duration={0.3} />
                </>
              )}
            </svg>
            {/* جرقه */}
            {!reduce && (
              <motion.span
                aria-hidden
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full"
                style={{ background: '#2FD8C8', boxShadow: '0 0 12px rgba(47,216,200,0.9)' }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.25, duration: 0.25, ease: 'backOut' }}
              />
            )}
          </motion.div>

          {/* نام برند */}
          <motion.div
            className="text-center"
            initial={reduce ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 1.5, duration: 0.25 }}
          >
            <div className="text-2xl font-semibold text-white tracking-tight">
              rahyar <span className="font-light opacity-80">AI</span>
            </div>
            <motion.div
              className="text-xs text-white/60 mt-1.5"
              initial={reduce ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 1.8, duration: 0.25 }}
            >
              دستیار هوشمند شخصی
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
