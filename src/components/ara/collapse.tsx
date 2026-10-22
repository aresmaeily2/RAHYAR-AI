'use client'

// ─── Collapse مشترک — باز/بسته شدن نرم پنل‌های درون‌خطی ─────────
// یک‌باره، کوتاه (۲۴۰ms)، کاهش‌حرکت‌آگاه: با prefers-reduced-motion
// انیمیشن حذف می‌شود و فقط نمایش/مخفی ساده رخ می‌دهد.
// قرارداد موتور محیطی رهیار: حرکت در خدمت فهم رابط، نه تزئین.

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_STANDARD, useMotionSafe } from './motion'

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  const safe = useMotionSafe()
  if (!safe) return open ? <>{children}</> : null
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.24, ease: EASE_STANDARD }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
