'use client'

// ─── هویت زنده دستیار رهیار — ۸ حالت با رفتار بصری مخصوص ────────
// کاربر فقط با نگاه کردن می‌فهمد دستیار در چه وضعیتی است:
//   idle      → تنفس آرام (آماده‌ام، در کنارتم)
//   breathing → نفس عمیق‌تر (خوش آمدی — حالت اول ورود)
//   glow      → درخشش گرم (یک کار انجام شد — جشن کوتاه)
//   pulse     → تپش هشدار (یادآوری فعال شد — به من نگاه کن)
//   listening → حلقه‌های منتشرشونده (دارم می‌شنوم)
//   thinking  → حلقه مداری آرام (دارم فکر می‌کنم)
//   streaming → جریان چرخان تندتر (در حال نوشتن پاسخم)
//   speaking  → تپش هم‌نوا با موج صدا (دارم حرف می‌زنم)
// کاملاً CSS و transform — بدون canvas، بدون تصویر، GPU-friendly.
// حالت سراسری از AmbientEngine می‌آید (data-orb روی <html>)؛
// این کامپوننت فقط وضعیت معنایی را به شکل تبدیل می‌کند.

import { cn } from '@/lib/utils'
import { tStatic } from '@/i18n/store'
import type { AmbientOrbState } from '@/lib/ambient/types'

export type OrbState = AmbientOrbState

const ORB_LABEL: Record<OrbState, string> = {
  idle: 'دستیار رهیار — آماده',
  breathing: 'دستیار رهیار — خوش آمدی',
  glow: 'دستیار رهیار — آفرین، کار انجام شد',
  pulse: 'دستیار رهیار — یادآوری',
  listening: 'دستیار در حال شنیدن',
  thinking: 'دستیار در حال فکر کردن',
  streaming: 'دستیار در حال نوشتن پاسخ',
  speaking: 'دستیار در حال صحبت',
}

const ORB_LABEL_EN: Record<OrbState, string> = {
  idle: 'Rahyar assistant — ready',
  breathing: 'Rahyar assistant — welcome',
  glow: 'Rahyar assistant — well done, task completed',
  pulse: 'Rahyar assistant — reminder',
  listening: 'Assistant is listening',
  thinking: 'Assistant is thinking',
  streaming: 'Assistant is writing a reply',
  speaking: 'Assistant is speaking',
}

export function AiOrb({
  size = 36,
  state = 'idle',
  className,
}: {
  size?: number
  state?: OrbState
  className?: string
}) {
  // زبان از data-lang روی html — بدون رندر مجدد زنجیره‌ای
  const lang = typeof document !== 'undefined' && document.documentElement.dataset.lang === 'en' ? 'en' : 'fa'
  const label = lang === 'en' ? ORB_LABEL_EN[state] : ORB_LABEL[state]
  return (
    <span
      className={cn('ara-orb relative inline-flex shrink-0 items-center justify-center', `ara-orb--${state}`, className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
      data-state={state}
    >
      {/* هاله محیطی — تنفس؛ شدت و سرعتش با حالت عوض می‌شود */}
      <span className="ara-orb-halo" aria-hidden />

      {/* حلقه‌های شنیدن — انتشار مثل موج روی آب */}
      <span className="ara-orb-ring ara-orb-ring-1" aria-hidden />
      <span className="ara-orb-ring ara-orb-ring-2" aria-hidden />

      {/* مدار فکر / جریان نوشتن — یک قاعده بصری، دو سرعت */}
      <span className="ara-orb-flow" aria-hidden />

      {/* هسته — گوی گرادیانی با بازتاب داخلی */}
      <span
        className="ara-orb-core"
        style={{
          background: `radial-gradient(circle at 32% 28%,
            color-mix(in oklab, var(--ax-300) 85%, #ffffff) 0%,
            var(--primary) 46%,
            color-mix(in oklab, var(--primary-strong) 82%, var(--ax-ink)) 100%)`,
          boxShadow: `inset 0 1.5px 3px color-mix(in oklab, #ffffff 45%, transparent),
            inset 0 -2px 4px color-mix(in oklab, var(--ax-ink) 32%, transparent),
            0 3px 10px -2px var(--glow-brand)`,
        }}
        aria-hidden
      >
        {/* برق سطح — شکست نور */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(ellipse 42% 30% at 30% 22%, color-mix(in oklab, #ffffff 55%, transparent), transparent 100%)',
          }}
          aria-hidden
        />
      </span>
    </span>
  )
}

/** نوار موج صدا — هم‌نوای حالت speaking دستیار */
export function VoiceWave({
  active = true,
  bars = 5,
  className,
}: {
  active?: boolean
  bars?: number
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex h-4 items-center gap-[3px]', className)}
      role="img"
      aria-label={active ? tStatic('دستیار در حال پاسخ', typeof document !== 'undefined' && document.documentElement.dataset.lang === 'en' ? 'en' : 'fa') : ''}
      aria-hidden={!active}
    >
      {[...Array(bars)].map((_, i) => (
        <span
          key={i}
          className={cn('w-[2.5px] rounded-full', active && 'ara-wave-bar')}
          style={{
            height: `${8 + ((i * 5) % 9)}px`,
            background: 'var(--primary)',
            opacity: active ? 0.85 : 0.25,
            animationDelay: `${i * 0.12}s`,
            animationDuration: '0.9s',
          }}
        />
      ))}
    </span>
  )
}
