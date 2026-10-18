'use client'

import { useI18n } from '@/i18n/store'

interface ProgressRingProps {
  value: number // ۰ تا ۱۰۰
  size?: number
  stroke?: number
  label?: string
  sublabel?: string
}

export function ProgressRing({ value, size = 88, stroke = 8, label, sublabel }: ProgressRingProps) {
  const { t, lang } = useI18n()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={lang === 'en' ? `Progress ${Math.round(clamped)} percent` : `پیشرفت ${Math.round(clamped)} درصد`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none">{label ?? `${Math.round(clamped)}${lang === 'en' ? '%' : '٪'}`}</span>
        {sublabel && <span className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  )
}
