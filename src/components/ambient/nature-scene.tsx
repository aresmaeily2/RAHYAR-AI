'use client'

// ─── لایه طبیعت تزئینی — SVG ایستای سبک فقط در لبه‌ها ───────────
// این عناصر هرگز حرکت نمی‌کنند (صفر هزینه فریم) و فقط «مکان» را
// روایت می‌کنند: موج، کوه، شاخه، ماه، افق باران. حرکت با ذرات
// و لایه‌های زنده از AmbientStage می‌آید.
// اصلاح نسبت به نسخه قبل: شناسه فیلترها هم‌نام ارجاع شدند
// (#amb-soft) — پیش‌تر ارجاع url(#scene-soft) به تعریف بی‌نام
// اشاره می‌کرد و بلور اعمال نمی‌شد.

import type { AraTheme } from '@/lib/appearance'

function OceanScene() {
  return (
    <>
      <circle cx="220" cy="140" r="260" style={{ fill: 'var(--scene-1)' }} opacity="0.09" filter="url(#amb-soft)" />
      <path
        d="M0 700 C 240 660, 420 740, 720 710 C 1000 682, 1180 740, 1440 700 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-2)' }}
        opacity="0.07"
        filter="url(#amb-soft)"
      />
      <path
        d="M0 780 C 300 740, 560 820, 880 790 C 1140 766, 1300 812, 1440 788 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-3)' }}
        opacity="0.09"
        filter="url(#amb-soft)"
      />
      <path
        d="M0 640 C 200 616, 380 660, 640 644 M 800 630 C 980 616, 1160 650, 1440 632"
        fill="none"
        style={{ stroke: 'var(--deco)' }}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.15"
      />
    </>
  )
}

function ForestScene() {
  return (
    <>
      <path
        d="M0 660 L 300 420 L 560 640 L 760 480 L 1040 680 L 1240 540 L 1440 660 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-2)' }}
        opacity="0.1"
        filter="url(#amb-soft)"
      />
      <circle cx="1200" cy="160" r="180" style={{ fill: 'var(--scene-1)' }} opacity="0.09" filter="url(#amb-soft)" />
      <ellipse cx="260" cy="220" rx="60" ry="26" style={{ fill: 'var(--scene-1)' }} opacity="0.09" filter="url(#amb-soft)" transform="rotate(-28 260 220)" />
      <ellipse cx="380" cy="300" rx="44" ry="18" style={{ fill: 'var(--scene-3)' }} opacity="0.09" filter="url(#amb-soft)" transform="rotate(22 380 300)" />
      <path
        d="M120 760 q 30 -40 60 0 q 30 40 60 0 M 1140 800 q 26 -34 52 0 q 26 34 52 0"
        fill="none"
        style={{ stroke: 'var(--deco)' }}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.15"
      />
    </>
  )
}

function AuroraScene() {
  return (
    <>
      <path
        d="M-100 320 C 300 120, 640 420, 1000 220 C 1200 110, 1380 180, 1560 120"
        fill="none"
        style={{ stroke: 'var(--scene-1)' }}
        strokeWidth="90"
        strokeLinecap="round"
        opacity="0.09"
        filter="url(#amb-soft)"
      />
      <path
        d="M-100 480 C 320 300, 700 560, 1080 360 C 1260 266, 1420 320, 1560 280"
        fill="none"
        style={{ stroke: 'var(--scene-2)' }}
        strokeWidth="60"
        strokeLinecap="round"
        opacity="0.08"
        filter="url(#amb-soft)"
      />
      <path
        d="M-100 620 C 340 460, 760 680, 1140 500 C 1300 424, 1440 460, 1560 430"
        fill="none"
        style={{ stroke: 'var(--scene-3)' }}
        strokeWidth="36"
        strokeLinecap="round"
        opacity="0.1"
        filter="url(#amb-soft)"
      />
      <circle cx="180" cy="760" r="6" style={{ fill: 'var(--deco)' }} opacity="0.3" />
      <circle cx="1260" cy="700" r="4" style={{ fill: 'var(--deco)' }} opacity="0.2" />
    </>
  )
}

function SunsetScene() {
  return (
    <>
      <circle cx="760" cy="300" r="150" style={{ fill: 'var(--scene-1)' }} opacity="0.12" filter="url(#amb-soft)" />
      <path
        d="M0 640 C 320 580, 620 690, 940 640 C 1180 604, 1320 650, 1440 630 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-2)' }}
        opacity="0.1"
        filter="url(#amb-soft)"
      />
      <path
        d="M0 740 C 300 690, 600 790, 920 745 C 1160 712, 1320 760, 1440 740 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-3)' }}
        opacity="0.08"
        filter="url(#amb-soft)"
      />
      <path
        d="M180 200 q 20 -14 40 0 M 240 180 q 20 -14 40 0"
        fill="none"
        style={{ stroke: 'var(--deco)' }}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.15"
      />
    </>
  )
}

function NightScene() {
  return (
    <>
      <path
        d="M600 120 a 150 150 0 1 0 130 220 a 120 120 0 1 1 -130 -220 Z"
        style={{ fill: 'var(--scene-1)' }}
        opacity="0.09"
        filter="url(#amb-soft)"
      />
      <path
        d="M0 700 L 360 500 L 700 680 L 1020 520 L 1440 700 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-3)' }}
        opacity="0.09"
        filter="url(#amb-soft)"
      />
      <circle cx="300" cy="180" r="2.5" style={{ fill: 'var(--deco)' }} opacity="0.35" />
      <circle cx="480" cy="90" r="2" style={{ fill: 'var(--deco)' }} opacity="0.3" />
      <circle cx="1050" cy="140" r="2.5" style={{ fill: 'var(--deco)' }} opacity="0.3" />
      <circle cx="1240" cy="240" r="2" style={{ fill: 'var(--deco)' }} opacity="0.2" />
      <circle cx="900" cy="60" r="1.8" style={{ fill: 'var(--deco)' }} opacity="0.2" />
    </>
  )
}

function MinimalScene() {
  return (
    <>
      <circle cx="1150" cy="200" r="150" fill="none" style={{ stroke: 'var(--deco)' }} strokeWidth="1.5" opacity="0.14" />
      <circle cx="1150" cy="200" r="110" fill="none" style={{ stroke: 'var(--deco)' }} strokeWidth="1.5" opacity="0.1" />
      <circle cx="220" cy="740" r="90" fill="none" style={{ stroke: 'var(--deco)' }} strokeWidth="1.5" opacity="0.11" />
      <circle cx="700" cy="420" r="4" style={{ fill: 'var(--deco)' }} opacity="0.2" />
    </>
  )
}

/** شاخه شکوفه — ایستا؛ گلبرگ‌های ریزان به لایه ذرات منتقل شدند */
function SakuraScene() {
  return (
    <>
      <circle cx="1180" cy="170" r="170" style={{ fill: 'var(--scene-1)' }} opacity="0.1" filter="url(#amb-soft)" />
      <path
        d="M-20 90 C 140 60, 260 90, 380 150 M 240 92 C 280 60, 330 52, 380 60"
        fill="none"
        style={{ stroke: 'var(--deco)' }}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.2"
      />
      {[...Array(6)].map((_, i) => {
        const bx = 60 + i * 62
        const by = 74 + (i % 2) * 26 + i * 8
        return (
          <g key={i} transform={`translate(${bx} ${by})`} opacity="0.4">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} rx="7" ry="4" transform={`rotate(${a}) translate(6 0)`} style={{ fill: 'var(--scene-1)' }} />
            ))}
            <circle r="2.5" style={{ fill: 'var(--scene-3)' }} />
          </g>
        )
      })}
      <path
        d="M0 760 C 300 720, 620 800, 940 762 C 1180 734, 1320 780, 1440 756 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-1)' }}
        opacity="0.08"
        filter="url(#amb-soft)"
      />
    </>
  )
}

/** تپه‌های خزان — ایستا؛ برگ‌های چرخان به لایه ذرات منتقل شدند */
function AutumnScene() {
  return (
    <>
      <circle cx="240" cy="180" r="180" style={{ fill: 'var(--scene-1)' }} opacity="0.1" filter="url(#amb-soft)" />
      <path
        d="M0 680 L 320 480 L 640 660 L 980 500 L 1280 660 L 1440 600 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-2)' }}
        opacity="0.12"
        filter="url(#amb-soft)"
      />
      <path
        d="M0 790 C 280 750, 560 830, 900 795 C 1160 770, 1320 810, 1440 788 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-3)' }}
        opacity="0.07"
        filter="url(#amb-soft)"
      />
    </>
  )
}

/** باران — افق مه‌آلود و برکه؛ قطره‌ها به لایه ذرات منتقل شدند */
function RainScene() {
  return (
    <>
      <circle cx="300" cy="170" r="200" style={{ fill: 'var(--scene-1)' }} opacity="0.1" filter="url(#amb-soft)" />
      <circle cx="1180" cy="260" r="160" style={{ fill: 'var(--scene-2)' }} opacity="0.08" filter="url(#amb-soft)" />
      <path
        d="M0 700 C 300 670, 620 730, 940 700 C 1180 678, 1320 716, 1440 700 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-2)' }}
        opacity="0.09"
        filter="url(#amb-soft)"
      />
      <path
        d="M0 800 C 320 770, 640 830, 980 802 C 1200 784, 1340 816, 1440 800 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-3)' }}
        opacity="0.08"
        filter="url(#amb-soft)"
      />
      <ellipse cx="420" cy="820" rx="180" ry="14" fill="none" style={{ stroke: 'var(--deco)' }} strokeWidth="1.5" opacity="0.12" />
      <ellipse cx="1120" cy="850" rx="140" ry="10" fill="none" style={{ stroke: 'var(--deco)' }} strokeWidth="1.5" opacity="0.1" />
    </>
  )
}

const SCENES: Record<AraTheme, () => React.ReactNode> = {
  ocean: OceanScene,
  forest: ForestScene,
  aurora: AuroraScene,
  sunset: SunsetScene,
  night: NightScene,
  minimal: MinimalScene,
  sakura: SakuraScene,
  autumn: AutumnScene,
  rain: RainScene,
}

/** صحنه SVG تم — ایستا و بی‌هزینه؛ فقط در لبه‌ها روایت می‌سازد */
export function NatureScene({ theme }: { theme: AraTheme }) {
  const Scene = SCENES[theme] ?? OceanScene
  return (
    <svg
      className="amb-layer"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="amb-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="34" />
        </filter>
      </defs>
      <Scene />
    </svg>
  )
}
