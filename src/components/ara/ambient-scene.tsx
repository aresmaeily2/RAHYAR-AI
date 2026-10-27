'use client'

// ─── صحنه محیطی رهیار — لایه‌های پس‌زمینه غیرتخت ─────────────────
// برای هر تم یک صحنه SVG سبک: موج (اقیانوس)، کوه و برگ (جنگل)،
// روبان شفق، تپه و خورشید (غروب)، ماه و ستاره (شب)، حلقه‌های آرام
// (مینیمال) + گرین نویز + ذرات نور آرام. همه در آلفای ۳–۷٪ — فقط حس،
// هرگز حواس‌پرتی. SVGها ایستا هستند (صفر هزینه فریم)؛ فقط ذرات با
// transform حرکت می‌کنند.

import { useClientValue } from '@/lib/client-hooks'
import { readStoredTheme, type AraTheme } from '@/lib/appearance'

function OceanScene() {
  return (
    <>
      <circle cx="220" cy="140" r="260" style={{ fill: 'var(--scene-1)' }} opacity="0.09" filter="url(#scene-soft)" />
      <path
        d="M0 700 C 240 660, 420 740, 720 710 C 1000 682, 1180 740, 1440 700 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-2)' }}
        opacity="0.07"
        filter="url(#scene-soft)"
      />
      <path
        d="M0 780 C 300 740, 560 820, 880 790 C 1140 766, 1300 812, 1440 788 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-3)' }}
        opacity="0.09"
        filter="url(#scene-soft)"
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
        filter="url(#scene-soft)"
      />
      <circle cx="1200" cy="160" r="180" style={{ fill: 'var(--scene-1)' }} opacity="0.09" filter="url(#scene-soft)" />
      <ellipse cx="260" cy="220" rx="60" ry="26" style={{ fill: 'var(--scene-1)' }} opacity="0.09" filter="url(#scene-soft)" transform="rotate(-28 260 220)" />
      <ellipse cx="380" cy="300" rx="44" ry="18" style={{ fill: 'var(--scene-3)' }} opacity="0.09" filter="url(#scene-soft)" transform="rotate(22 380 300)" />
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
        filter="url(#scene-soft)"
      />
      <path
        d="M-100 480 C 320 300, 700 560, 1080 360 C 1260 266, 1420 320, 1560 280"
        fill="none"
        style={{ stroke: 'var(--scene-2)' }}
        strokeWidth="60"
        strokeLinecap="round"
        opacity="0.08"
        filter="url(#scene-soft)"
      />
      <path
        d="M-100 620 C 340 460, 760 680, 1140 500 C 1300 424, 1440 460, 1560 430"
        fill="none"
        style={{ stroke: 'var(--scene-3)' }}
        strokeWidth="36"
        strokeLinecap="round"
        opacity="0.1"
        filter="url(#scene-soft)"
      />
      <circle cx="180" cy="760" r="6" style={{ fill: 'var(--deco)' }} opacity="0.3" />
      <circle cx="1260" cy="700" r="4" style={{ fill: 'var(--deco)' }} opacity="0.2" />
    </>
  )
}

function SunsetScene() {
  return (
    <>
      <circle cx="760" cy="300" r="150" style={{ fill: 'var(--scene-1)' }} opacity="0.12" filter="url(#scene-soft)" />
      <path
        d="M0 640 C 320 580, 620 690, 940 640 C 1180 604, 1320 650, 1440 630 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-2)' }}
        opacity="0.1"
        filter="url(#scene-soft)"
      />
      <path
        d="M0 740 C 300 690, 600 790, 920 745 C 1160 712, 1320 760, 1440 740 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-3)' }}
        opacity="0.08"
        filter="url(#scene-soft)"
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
        filter="url(#scene-soft)"
      />
      <path
        d="M0 700 L 360 500 L 700 680 L 1020 520 L 1440 700 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-3)' }}
        opacity="0.09"
        filter="url(#scene-soft)"
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

/** گلبرگ شکوفه — پارامتریک؛ سقوط بسیار آرام با CSS (ara-fall) */
function SakuraScene() {
  const petals = [
    { x: 160, y: -30, s: 1.1, d: '0s', dur: '52s' },
    { x: 420, y: -90, s: 0.8, d: '-18s', dur: '64s' },
    { x: 760, y: -50, s: 1.25, d: '-34s', dur: '58s' },
    { x: 1040, y: -120, s: 0.9, d: '-9s', dur: '70s' },
    { x: 1300, y: -60, s: 1.05, d: '-44s', dur: '60s' },
    { x: 580, y: -160, s: 0.7, d: '-27s', dur: '76s' },
  ]
  return (
    <>
      <circle cx="1180" cy="170" r="170" style={{ fill: 'var(--scene-1)' }} opacity="0.1" filter="url(#scene-soft)" />
      {/* شاخه شکوفه — گوشه بالا */}
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
      {/* گلبرگ‌های ریزان */}
      {petals.map((p, i) => (
        <g key={i} className="ara-fall" style={{ animationDelay: p.d, animationDuration: p.dur }}>
          <g transform={`translate(${p.x} ${p.y}) scale(${p.s})`} opacity="0.5">
            <path d="M0 0 C 8 -6, 18 -4, 20 4 C 14 12, 4 12, 0 0 Z" style={{ fill: 'var(--scene-2)' }} transform="rotate(24)" />
          </g>
        </g>
      ))}
      <path
        d="M0 760 C 300 720, 620 800, 940 762 C 1180 734, 1320 780, 1440 756 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-1)' }}
        opacity="0.08"
        filter="url(#scene-soft)"
      />
    </>
  )
}

/** برگ‌های خزان — پارامتریک؛ چرخش آرام در سقوط */
function AutumnScene() {
  const leaves = [
    { x: 200, y: -40, s: 1, d: '0s', dur: '56s' },
    { x: 520, y: -110, s: 0.75, d: '-21s', dur: '68s' },
    { x: 880, y: -60, s: 1.15, d: '-38s', dur: '62s' },
    { x: 1180, y: -140, s: 0.85, d: '-12s', dur: '74s' },
    { x: 1360, y: -80, s: 1, d: '-48s', dur: '58s' },
  ]
  return (
    <>
      <circle cx="240" cy="180" r="180" style={{ fill: 'var(--scene-1)' }} opacity="0.1" filter="url(#scene-soft)" />
      <path
        d="M0 680 L 320 480 L 640 660 L 980 500 L 1280 660 L 1440 600 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-2)' }}
        opacity="0.12"
        filter="url(#scene-soft)"
      />
      {leaves.map((p, i) => (
        <g
          key={i}
          className="ara-fall"
          style={{ animationDelay: p.d, animationDuration: p.dur, ['--fall-sway' as string]: `${18 + i * 6}px` }}
        >
          <g transform={`translate(${p.x} ${p.y}) scale(${p.s})`} opacity="0.55">
            <path
              d="M0 0 C 10 -14, 26 -12, 30 2 C 26 14, 8 18, 0 0 Z M 2 2 L 26 4"
              style={{ fill: i % 2 ? 'var(--scene-2)' : 'var(--scene-1)', stroke: 'var(--scene-3)', strokeWidth: 1 }}
              transform="rotate(30)"
            />
          </g>
        </g>
      ))}
    </>
  )
}

/** باران آرام — خطوط مورب ایستا + سطح خیس؛ آلفای پایین، صفر هزینه فریم
 *  (رفع typecheck: تم rain در SCENES ثبت نشده بود) */
function RainScene() {
  const drops = [
    { x: 120, y: 40, len: 46, o: 0.14 },
    { x: 320, y: -20, len: 60, o: 0.1 },
    { x: 540, y: 90, len: 40, o: 0.12 },
    { x: 760, y: -40, len: 56, o: 0.09 },
    { x: 980, y: 60, len: 44, o: 0.13 },
    { x: 1200, y: -10, len: 58, o: 0.1 },
    { x: 1380, y: 110, len: 38, o: 0.12 },
  ]
  return (
    <>
      <circle cx="240" cy="160" r="200" style={{ fill: 'var(--scene-1)' }} opacity="0.08" filter="url(#scene-soft)" />
      {drops.map((d, i) => (
        <line
          key={i}
          x1={d.x}
          y1={d.y}
          x2={d.x - d.len * 0.28}
          y2={d.y + d.len}
          style={{ stroke: 'var(--scene-2)' }}
          strokeWidth={i % 2 ? 1.5 : 2.5}
          strokeLinecap="round"
          opacity={d.o}
        />
      ))}
      <path
        d="M0 780 C 300 760, 620 800, 940 778 C 1180 762, 1320 792, 1440 780 L1440 900 L0 900 Z"
        style={{ fill: 'var(--scene-2)' }}
        opacity="0.09"
        filter="url(#scene-soft)"
      />
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

/** پنج ذره نور با مسیرهای متفاوت — با transform حرکت می‌کنند (GPU) */
function Motes() {
  const motes = [
    { left: '12%', top: '18%', size: 10, dur: '24s', dx: '7vw', dy: '-9vh', delay: '0s' },
    { left: '78%', top: '26%', size: 14, dur: '30s', dx: '-6vw', dy: '10vh', delay: '-8s' },
    { left: '30%', top: '68%', size: 8, dur: '22s', dx: '5vw', dy: '-12vh', delay: '-14s' },
    { left: '86%', top: '62%', size: 12, dur: '28s', dx: '-8vw', dy: '-7vh', delay: '-4s' },
    { left: '55%', top: '8%', size: 7, dur: '26s', dx: '4vw', dy: '11vh', delay: '-18s' },
  ]
  return (
    <>
      {motes.map((m, i) => (
        <span
          key={i}
          className="ara-mote"
          style={{
            left: m.left,
            top: m.top,
            width: m.size,
            height: m.size,
            filter: 'blur(5px)',
            animationDelay: m.delay,
            ['--mote-dur' as string]: m.dur,
            ['--mote-dx' as string]: m.dx,
            ['--mote-dy' as string]: m.dy,
          }}
        />
      ))}
    </>
  )
}

export function AmbientScene() {
  const theme = useClientValue(readStoredTheme, 'ocean')
  const Scene = SCENES[theme] ?? OceanScene

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* مش رنگی صحنه + هاله‌های شناور (CSS) */}
      <div className="ara-ambient" />
      {/* صحنه SVG تم — ایستا */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <filter id="ara-scene-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <filter id="ara-scene-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <Scene />
      </svg>
      {/* گرین نویز — بافت فیلم؛ کاملاً ایستا */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.03] mix-blend-overlay" aria-hidden="true">
        <rect width="100%" height="100%" filter="url(#ara-scene-noise)" />
      </svg>
      <Motes />
    </div>
  )
}
