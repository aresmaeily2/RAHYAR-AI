'use client'

// ─── انتخاب‌گر ظاهر — تم جهان‌بینی + رنگ تأکید ───────────────────
// هر تم یک پیش‌نمایش مینیاتوری دارد (مش رنگ صحنه)؛ اکسنت‌ها نقطه‌های
// رنگی زنده‌اند و با انتخاب، کل رابط بی‌درنگ به‌روز می‌شود.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Type } from 'lucide-react'
import { useI18n } from '@/i18n/store'
import { cn } from '@/lib/utils'
import { useClientValue } from '@/lib/client-hooks'
import {
  ACCENTS,
  ACCENT_LABELS,
  applyTextScale,
  THEMES,
  THEME_LABELS,
  TEXT_SCALES,
  TEXT_SCALE_LABELS,
  readStoredTextScale,
  type AraAccent,
  type AraTheme,
  type TextScale,
} from '@/lib/appearance'
import { useAppearance } from '@/lib/appearance-store'

/** رنگ‌های واقعی هر تم برای پیش‌نمایش — آینه themes.css */
const THEME_PREVIEW: Record<AraTheme, { light: [string, string, string]; dark: [string, string, string] }> = {
  ocean: { light: ['#7DD3FC', '#2DD4BF', '#F5F9FB'], dark: ['#0A1016', '#14B8A6', '#38BDF8'] },
  forest: { light: ['#86EFAC', '#34D399', '#F6FAF5'], dark: ['#0A120C', '#4ADE80', '#A3E635'] },
  aurora: { light: ['#A78BFA', '#22D3EE', '#F7F7FC'], dark: ['#0C0A16', '#8B5CF6', '#22D3EE'] },
  sunset: { light: ['#FDBA74', '#FB7185', '#FDF8F4'], dark: ['#130E0A', '#FB923C', '#C084FC'] },
  night: { light: ['#94A3B8', '#64748B', '#F4F5F8'], dark: ['#060709', '#94A3B8', '#64748B'] },
  minimal: { light: ['#D4D4D8', '#A1A1AA', '#FBFBFA'], dark: ['#0B0B0C', '#A1A1AA', '#D4D4D8'] },
  sakura: { light: ['#F9A8D4', '#FBCFE8', '#FDF7F9'], dark: ['#140A0E', '#F472B6', '#C084FC'] },
  autumn: { light: ['#FBBF24', '#FB923C', '#FBF6EF'], dark: ['#120D08', '#F59E0B', '#EA580C'] },
  rain: { light: ['#94B8C4', '#6FA3AD', '#F4F7F6'], dark: ['#0A0F11', '#74A3B3', '#8FB6AD'] },
}

/** رنگ واقعی هر اکسنت برای نقطه انتخاب — آینه themes.css */
const ACCENT_DOT: Record<AraAccent, string> = {
  teal: '#14B8A6',
  blue: '#3B82F6',
  violet: '#8B5CF6',
  green: '#22C55E',
  orange: '#F97316',
  pink: '#EC4899',
  gold: '#F59E0B',
}

function ThemeCard({ theme, active, onPick }: { theme: AraTheme; active: boolean; onPick: () => void }) {
  const { t } = useI18n()
  const p = THEME_PREVIEW[theme]
  return (
    <button
      onClick={onPick}
      role="radio"
      aria-checked={active}
      aria-label={`${t('تم')} ${t(THEME_LABELS[theme])}`}
      className={cn(
        'ara-press glass-chip group relative flex flex-col items-stretch gap-1.5 rounded-2xl p-1.5 text-right transition-all',
        active && 'ring-2 ring-ring/70',
      )}
    >
      {/* مینیاتور صحنه */}
      <span className="relative block h-10 w-full overflow-hidden rounded-xl">
        <span
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${p.light[0]}55, ${p.light[1]}66 55%, ${p.light[2]})`,
          }}
        />
        <span
          className="absolute inset-0 opacity-0 transition-opacity duration-300 dark:opacity-100"
          style={{
            background: `linear-gradient(135deg, ${p.dark[0]}, ${p.dark[1]}44 60%, ${p.dark[2]})`,
          }}
        />
        {active && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="h-2.5 w-2.5" />
          </motion.span>
        )}
      </span>
      <span className="px-1 pb-0.5 text-[10px] font-medium">{t(THEME_LABELS[theme])}</span>
    </button>
  )
}

/** مقدار ذخیره‌شده با امکان بازنویسی — بدون mismatch هیدریشن */
function useStoredValue<T>(read: () => T, initial: T): [T, (v: T) => void] {
  const [override, setOverride] = useState<T | null>(null)
  const current = useClientValue(read, initial)
  return [override ?? current, setOverride]
}

export function AppearancePicker() {
  const { t } = useI18n()
  // همگام‌سازی اولیه با localStorage — یک‌بار در mount
  useEffect(() => {
    useAppearance.getState().hydrate()
  }, [])
  const theme = useAppearance((s) => s.theme)
  const accent = useAppearance((s) => s.accent)
  const setTheme = useAppearance((s) => s.setTheme)
  const setAccent = useAppearance((s) => s.setAccent)

  const [scale, setScale] = useStoredValue<TextScale>(readStoredTextScale, 'md')

  function pickScale(s: TextScale) {
    setScale(s)
    applyTextScale(s)
    try {
      localStorage.setItem('rahyar-textscale', s)
    } catch { /* بدون ماندگاری */ }
  }

  return (
    <div className="rounded-2xl bg-secondary/50 px-3 py-3">
      <p className="mb-2 text-xs font-semibold">{t('ظاهر و حال‌وهوا')}</p>

      {/* تم‌ها */}
      <div role="radiogroup" aria-label={t('انتخاب تم')} className="grid grid-cols-4 gap-2">
        {THEMES.map((t) => (
          <ThemeCard key={t} theme={t} active={t === theme} onPick={() => setTheme(t)} />
        ))}
      </div>

      {/* اکسنت‌ها */}
      <div role="radiogroup" aria-label={t('انتخاب رنگ تأکید')} className="mt-3 flex items-center justify-between gap-1.5">
        {ACCENTS.map((a) => (
          <button
            key={a}
            role="radio"
            aria-checked={a === accent}
            aria-label={`${t('رنگ')} ${t(ACCENT_LABELS[a])}`}
            title={ACCENT_LABELS[a]}
            onClick={() => setAccent(a)}
            className={cn(
              'ara-press relative flex h-8 w-8 items-center justify-center rounded-full transition-transform',
              a === accent && 'scale-110',
            )}
          >
            <span
              className="flex h-5.5 w-5.5 items-center justify-center rounded-full"
              style={{
                background: ACCENT_DOT[a],
                boxShadow:
                  a === accent
                    ? `0 0 0 2px var(--background), 0 0 0 4px ${ACCENT_DOT[a]}66, 0 2px 8px ${ACCENT_DOT[a]}55`
                    : 'inset 0 1px 2px rgb(255 255 255 / 0.3)',
              }}
            >
              {a === accent && <Check className="h-3 w-3 text-white" />}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{t('تم فضا و صحنه پس‌زمینه را تعیین می‌کند؛ رنگ تأکید، دکمه‌ها و لحظه‌های فعال را.')}</p>

      {/* اندازه متن — WCAG 1.4.4 */}
      <div className="mt-3 border-t pt-3" style={{ borderColor: 'color-mix(in oklab, var(--foreground) 8%, transparent)' }}>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
          <Type className="h-3.5 w-3.5 text-muted-foreground" />{t('اندازه متن')}</p>
        <div role="radiogroup" aria-label={t('اندازه متن')} className="flex gap-1">
          {TEXT_SCALES.map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={s === scale}
              onClick={() => pickScale(s)}
              className={cn(
                'ara-press flex-1 rounded-lg px-1 py-1.5 text-[10.5px] font-medium transition-colors',
                s === scale ? 'text-primary-foreground' : 'glass-chip text-muted-foreground',
              )}
              style={s === scale ? { background: 'var(--primary)' } : undefined}
            >
              {t(TEXT_SCALE_LABELS[s])}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
