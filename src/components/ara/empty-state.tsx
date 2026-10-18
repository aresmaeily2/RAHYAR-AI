'use client'

// ─── حالت خالی تصویری — هیچ صفحه‌ی خالی‌ای فقط متن ندارد ─────────
// ترکیب: تصویرسازی SVG سبک + توضیح + فراخوان اقدام + انیمیشن شناور
// آرام. همه از توکن‌های سیستم رنگ می‌گیرند (بدون hardcode).

import { motion } from 'framer-motion'
import { useI18n } from '@/i18n/store'
import { cn } from '@/lib/utils'

export type EmptyArt =
  | 'sun'
  | 'leaf'
  | 'moon'
  | 'wave'
  | 'calendar'
  | 'chat'
  | 'search'
  | 'bell'
  | 'memory'
  | 'settings'
  | 'cloud-off'
  | 'success'

/** تصویرسازی‌های SVG خطی — ظریف و هم‌خانواده با آیکون‌ها */
function EmptyArtwork({ art }: { art: EmptyArt }) {
  const stroke = 'var(--deco)'
  const accent = 'var(--primary)'
  switch (art) {
    case 'sun':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <circle cx="48" cy="48" r="17" stroke={accent} strokeWidth="2.5" />
          <circle cx="48" cy="48" r="17" fill={accent} opacity="0.12" />
          {[...Array(8)].map((_, i) => {
            const a = (i * Math.PI) / 4
            const x1 = 48 + Math.cos(a) * 25
            const y1 = 48 + Math.sin(a) * 25
            const x2 = 48 + Math.cos(a) * 33
            const y2 = 48 + Math.sin(a) * 33
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          })}
        </svg>
      )
    case 'leaf':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <path d="M66 26 C 40 30, 26 46, 24 72 C 50 68, 64 54, 66 26 Z" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M66 26 C 40 30, 26 46, 24 72" fill={accent} opacity="0.1" />
          <path d="M30 66 C 42 54, 54 42, 62 32" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <path d="M20 30 q 8 -10 16 -2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <path d="M76 62 q 10 4 6 14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      )
    case 'moon':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <path d="M60 20 a 26 26 0 1 0 14 44 a 21 21 0 1 1 -14 -44 Z" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" fill={accent} fillOpacity="0.08" />
          <circle cx="70" cy="26" r="2" fill={stroke} opacity="0.8" />
          <circle cx="78" cy="40" r="1.5" fill={stroke} opacity="0.6" />
          <circle cx="22" cy="34" r="1.5" fill={stroke} opacity="0.5" />
        </svg>
      )
    case 'wave':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <path d="M14 56 q 10 -10 20 0 t 20 0 t 20 0" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M14 68 q 10 -10 20 0 t 20 0 t 20 0" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
          <circle cx="66" cy="30" r="10" stroke={accent} strokeWidth="2.5" opacity="0.8" />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <rect x="22" y="28" width="52" height="46" rx="10" stroke={accent} strokeWidth="2.5" />
          <rect x="22" y="28" width="52" height="46" rx="10" fill={accent} opacity="0.07" />
          <path d="M22 44 h52" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
          <path d="M36 22 v10 M60 22 v10" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="34" y="54" width="10" height="9" rx="2.5" fill={accent} opacity="0.5" />
          <rect x="52" y="54" width="10" height="9" rx="2.5" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
        </svg>
      )
    case 'chat':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <path d="M24 30 a 12 12 0 0 1 12 -12 h24 a 12 12 0 0 1 12 12 v16 a 12 12 0 0 1 -12 12 H44 L32 70 V58 a 12 12 0 0 1 -8 -11.3 Z" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" fill={accent} fillOpacity="0.07" />
          <circle cx="40" cy="38" r="2.2" fill={accent} />
          <circle cx="48" cy="38" r="2.2" fill={accent} opacity="0.7" />
          <circle cx="56" cy="38" r="2.2" fill={accent} opacity="0.4" />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <circle cx="44" cy="42" r="18" stroke={accent} strokeWidth="2.5" />
          <circle cx="44" cy="42" r="18" fill={accent} opacity="0.07" />
          <path d="M57 55 L 70 68" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M38 40 q 6 -6 12 0" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        </svg>
      )
    case 'bell':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <path
            d="M30 60 V 44 a 18 18 0 0 1 36 0 v 16 l 6 8 H 24 Z"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
            fill={accent}
            fillOpacity="0.08"
          />
          <path d="M42 70 a 6 6 0 0 0 12 0" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M70 28 q 6 4 4 12 M 26 26 q -6 5 -3 13" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        </svg>
      )
    case 'memory':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <path
            d="M34 24 h 28 a 10 10 0 0 1 10 10 v 22 a 10 10 0 0 1 -10 10 H 52 l -10 10 v -10 H 34 a 10 10 0 0 1 -10 -10 V 34 a 10 10 0 0 1 10 -10 Z"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
            fill={accent}
            fillOpacity="0.07"
          />
          <circle cx="38" cy="45" r="3" fill={accent} opacity="0.85" />
          <circle cx="48" cy="45" r="3" fill={accent} opacity="0.55" />
          <circle cx="58" cy="45" r="3" fill={accent} opacity="0.3" />
          <path d="M32 58 h 24" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      )
    case 'settings':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <circle cx="48" cy="48" r="14" stroke={accent} strokeWidth="2.5" />
          <circle cx="48" cy="48" r="5" fill={accent} opacity="0.4" />
          {[...Array(8)].map((_, i) => {
            const a = (i * Math.PI) / 4
            const x1 = 48 + Math.cos(a) * 20
            const y1 = 48 + Math.sin(a) * 20
            const x2 = 48 + Math.cos(a) * 28
            const y2 = 48 + Math.sin(a) * 28
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          })}
        </svg>
      )
    case 'cloud-off':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <path
            d="M30 62 a 12 12 0 0 1 2 -23.8 A 16 16 0 0 1 62 34 a 13 13 0 0 1 8 23 Z"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
            fill={accent}
            fillOpacity="0.06"
          />
          <path d="M26 70 L 72 26" stroke="var(--destructive)" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
          <path d="M36 74 h 24" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        </svg>
      )
    case 'success':
      return (
        <svg viewBox="0 0 96 96" className="h-full w-full" fill="none" aria-hidden>
          <circle cx="48" cy="48" r="24" stroke="var(--success)" strokeWidth="2.5" />
          <circle cx="48" cy="48" r="24" fill="var(--success)" opacity="0.08" />
          <path d="M37 48.5 l 8 8 L 61 40" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 26 q 8 -8 16 -4 M 76 70 q -8 8 -16 4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
        </svg>
      )
  }
}

export function EmptyState({
  art = 'leaf',
  title,
  description,
  action,
  onAction,
  className,
  compact = false,
}: {
  art?: EmptyArt
  title: string
  description?: string
  action?: string
  onAction?: () => void
  className?: string
  compact?: boolean
}) {
  const { t } = useI18n()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      className={cn(
        'glass-card glass-hoverable flex flex-col items-center rounded-3xl px-6 text-center',
        compact ? 'py-6' : 'py-9',
        className,
      )}
    >
      <motion.div
        className={compact ? 'h-14 w-14' : 'h-20 w-20'}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <EmptyArtwork art={art} />
      </motion.div>
      <p className={cn('mt-3 font-heading font-bold', compact ? 'text-sm' : 'text-base')}>{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs leading-6 text-muted-foreground">{description}</p>
      )}
      {action && onAction && (
        <button
          onClick={onAction}
          className="ara-float mt-4 rounded-xl px-4 py-2 text-xs font-bold text-primary-text"
        >
          {action}
        </button>
      )}
    </motion.div>
  )
}
