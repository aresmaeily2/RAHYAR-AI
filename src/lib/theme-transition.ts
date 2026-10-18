'use client'

// ─── انتقال تم با reveal دایره‌ای از نقطه تعامل ──────────────────
// View Transitions API — بهبود پیش‌رونده: مرورگرهای بدون پشتیبانی
// مستقیم setTheme می‌کنند (سوییچ فوری). prefers-reduced-motion نیز
// در سطح CSS به حالت بی‌حرکت می‌رود (globals.css).

type Coords = { x?: number; y?: number }

export function toggleThemeWithReveal(
  setTheme: (t: 'dark' | 'light') => void,
  current: string | undefined,
  point?: Coords,
) {
  const next: 'dark' | 'light' = current === 'dark' ? 'light' : 'dark'

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void> }
  }

  // بدون پشتیبانی API یا با کاهش حرکت → سوییچ ساده
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduced) {
    setTheme(next)
    return
  }

  const x = point?.x ?? window.innerWidth / 2
  const y = point?.y ?? 0
  // شعاع لازم برای پوشش کامل از نقطه کلیک
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  const root = document.documentElement
  root.style.setProperty('--vt-x', `${x}px`)
  root.style.setProperty('--vt-y', `${y}px`)
  root.style.setProperty('--vt-r', `${Math.ceil(r)}px`)

  const vt = doc.startViewTransition(() => {
    setTheme(next)
  })
  vt.ready.catch(() => {})
}
