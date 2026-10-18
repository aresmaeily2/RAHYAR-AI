'use client'

// ─── زبان حرکت مشترک رهیار ۴.۰ — آینه توکن‌های tokens.css ────────
// هر انیمیشن Framer باید از همین primitives استفاده کند تا حرکت در
// کل محصول یکدست بماند. مقادیر با متغیرهای CSS هم‌خانواده‌اند:
//   --motion-*  (مدت)   --ease-standard / emphasized / spring

import { useReducedMotion } from 'framer-motion'
import type { Transition, Variants } from 'framer-motion'

/** منحنی امضای رهیار — خروج سریع، فرود نرم (استاندارد) */
export const EASE_STANDARD = [0.25, 1, 0.5, 1] as const
/** منحنی لهجه‌دار — برای pop و بازخوردهای شاد */
export const EASE_EMPHASIZED = [0.34, 1.3, 0.64, 1] as const

/** فنر نرم — ورود عناصر بزرگ (کارت، شیت) */
export const springSoft: Transition = { type: 'spring', stiffness: 320, damping: 30, mass: 0.9 }
/** فنر تیز — قرص‌های ناوبری و بازخوردهای فوری */
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 32 }
/** فنر الاستیک — FAB و دکمه‌های اصلی (فشار) */
export const springElastic: Transition = { type: 'spring', stiffness: 520, damping: 18 }

/** ورود محتوای نما — جابه‌جایی کم، بدون پرش layout */
export const viewFade: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_STANDARD } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease: EASE_STANDARD } },
}

/** ورود آیتم‌های فهرست — با تأخیر پله‌ای ظریف (حداکثر ۴ پله) */
export const listItem = (i: number): Variants => ({
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: EASE_STANDARD, delay: Math.min(i, 3) * 0.05 },
  },
  exit: { opacity: 0, transition: { duration: 0.12 } },
})

/** پاپ ظریف برای بازخورد فوری (چیپ، دکمه، حلقه جشن) */
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: springSnappy },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
}

/** ورود دیالوگ/شیت — مقیاس + جابه‌جایی هماهنگ با سیستم */
export const dialogIn: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: EASE_STANDARD } },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.16, ease: EASE_STANDARD } },
}

/** هوک حرکت-ایمن — اگر کاربر کاهش حرکت خواست، ترنسفورم‌ها حذف شوند */
export function useMotionSafe(): boolean {
  const reduced = useReducedMotion()
  return !reduced
}
