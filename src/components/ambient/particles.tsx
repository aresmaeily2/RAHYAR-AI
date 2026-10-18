'use client'

// ─── لایه ذرات — شخصیت هر تم با کمترین تعداد ────────────────────
// قاعده: حداکثر ~۱۰ ذره، فقط transform/opacity، دوره‌های ۲۶ تا ۱۳۰
// ثانیه. مینیمال هیچ ذره‌ای ندارد — سکون شخصیت آن تم است.
// مختصات همه ثابت‌اند (بدون random) تا رندر سرور و کلاینت یکی باشد.

import type { AraTheme } from '@/lib/appearance'

type Star = { readonly left: string; readonly top: string; readonly dur: string; readonly delay: string }
type FallItem = { readonly left: string; readonly s: number; readonly dur: string; readonly sway: string; readonly delay: string }

const BUBBLES = [
  { left: '14%', s: 9, dur: '38s', dx: '3vw', delay: '0s' },
  { left: '72%', s: 13, dur: '46s', dx: '-2.5vw', delay: '-14s' },
  { left: '38%', s: 7, dur: '34s', dx: '2vw', delay: '-22s' },
  { left: '88%', s: 11, dur: '42s', dx: '-3vw', delay: '-8s' },
  { left: '55%', s: 6, dur: '30s', dx: '1.5vw', delay: '-27s' },
] as const

const STARS_NIGHT = [
  { left: '9%', top: '12%', dur: '5.5s', delay: '0s' },
  { left: '22%', top: '26%', dur: '7s', delay: '-2s' },
  { left: '35%', top: '8%', dur: '6.2s', delay: '-4s' },
  { left: '48%', top: '18%', dur: '8s', delay: '-1s' },
  { left: '62%', top: '6%', dur: '5.8s', delay: '-3s' },
  { left: '74%', top: '22%', dur: '7.5s', delay: '-5s' },
  { left: '86%', top: '10%', dur: '6.8s', delay: '-2.5s' },
  { left: '93%', top: '30%', dur: '8.2s', delay: '-6s' },
  { left: '16%', top: '38%', dur: '7.2s', delay: '-3.5s' },
  { left: '58%', top: '34%', dur: '6.5s', delay: '-1.8s' },
] as const

const STARS_AURORA = [
  { left: '12%', top: '10%', dur: '6.5s', delay: '0s' },
  { left: '30%', top: '20%', dur: '8s', delay: '-3s' },
  { left: '52%', top: '7%', dur: '7s', delay: '-2s' },
  { left: '70%', top: '16%', dur: '8.5s', delay: '-4s' },
  { left: '88%', top: '9%', dur: '6s', delay: '-1.5s' },
  { left: '42%', top: '28%', dur: '7.8s', delay: '-5s' },
] as const

const PETALS = [
  { left: '12%', s: 1, dur: '56s', sway: '22px', delay: '0s' },
  { left: '30%', s: 0.8, dur: '68s', sway: '-16px', delay: '-19s' },
  { left: '48%', s: 1.15, dur: '62s', sway: '26px', delay: '-35s' },
  { left: '66%', s: 0.9, dur: '74s', sway: '-20px', delay: '-10s' },
  { left: '82%', s: 1.05, dur: '58s', sway: '18px', delay: '-44s' },
  { left: '92%', s: 0.75, dur: '70s', sway: '-24px', delay: '-27s' },
  { left: '55%', s: 0.85, dur: '66s', sway: '20px', delay: '-52s' },
] as const

const LEAVES_FOREST = [
  { left: '8%', s: 0.9, dur: '64s', sway: '20px', delay: '-6s' },
  { left: '26%', s: 0.75, dur: '76s', sway: '-18px', delay: '-28s' },
  { left: '58%', s: 1, dur: '70s', sway: '24px', delay: '-40s' },
  { left: '78%', s: 0.85, dur: '82s', sway: '-16px', delay: '-16s' },
  { left: '90%', s: 0.7, dur: '72s', sway: '20px', delay: '-52s' },
] as const

const LEAVES_AUTUMN = [
  { left: '10%', s: 1, dur: '58s', sway: '22px', delay: '0s' },
  { left: '28%', s: 0.8, dur: '70s', sway: '-20px', delay: '-21s' },
  { left: '47%', s: 1.1, dur: '64s', sway: '26px', delay: '-38s' },
  { left: '68%', s: 0.9, dur: '76s', sway: '-18px', delay: '-12s' },
  { left: '86%', s: 1, dur: '60s', sway: '20px', delay: '-48s' },
  { left: '95%', s: 0.7, dur: '72s', sway: '-22px', delay: '-30s' },
] as const

const DROPS = [
  { left: '12%', dur: '6.2s', delay: '0s' },
  { left: '28%', dur: '7.4s', delay: '-2.2s' },
  { left: '44%', dur: '5.8s', delay: '-4.1s' },
  { left: '59%', dur: '6.8s', delay: '-1.3s' },
  { left: '73%', dur: '7.9s', delay: '-3.4s' },
  { left: '87%', dur: '6.4s', delay: '-5.2s' },
  { left: '95%', dur: '7.1s', delay: '-0.8s' },
] as const

function Bubbles() {
  return (
    <>
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="amb-bubble"
          style={{
            left: b.left,
            ['--s' as string]: `${b.s}px`,
            ['--dur' as string]: b.dur,
            ['--dx' as string]: b.dx,
            animationDelay: b.delay,
          }}
        />
      ))}
    </>
  )
}

function Stars({ set }: { set: readonly Star[] }) {
  return (
    <>
      {set.map((s, i) => (
        <span
          key={i}
          className="amb-star"
          style={{
            left: s.left,
            top: s.top,
            ['--dur' as string]: s.dur,
            animationDelay: s.delay,
          }}
        />
      ))}
    </>
  )
}

function Fall({ set, kind }: { set: readonly FallItem[]; kind: 'petal' | 'leaf' }) {
  return (
    <>
      {set.map((p, i) => (
        <span
          key={i}
          className="amb-fall"
          style={{
            left: p.left,
            ['--dur' as string]: p.dur,
            ['--fall-sway' as string]: p.sway,
            animationDelay: p.delay,
          }}
        >
          <span className={kind === 'petal' ? 'amb-petal' : 'amb-leaf'} style={{ transform: `scale(${p.s})` }} />
        </span>
      ))}
    </>
  )
}

function Drops() {
  return (
    <>
      {DROPS.map((d, i) => (
        <span
          key={i}
          className="amb-drop"
          style={{
            left: d.left,
            ['--dur' as string]: d.dur,
            animationDelay: d.delay,
          }}
        />
      ))}
    </>
  )
}

/** غبار گرم غروب — از ذرات نور موجود (.ara-mote) استفاده می‌کند */
function Dust() {
  const motes = [
    { left: '10%', top: '30%', size: 11, dur: '30s', dx: '9vw', dy: '2vh', delay: '0s' },
    { left: '40%', top: '58%', size: 8, dur: '26s', dx: '-7vw', dy: '-3vh', delay: '-9s' },
    { left: '64%', top: '22%', size: 13, dur: '34s', dx: '8vw', dy: '4vh', delay: '-16s' },
    { left: '84%', top: '48%', size: 9, dur: '28s', dx: '-9vw', dy: '-2vh', delay: '-5s' },
    { left: '25%', top: '76%', size: 7, dur: '24s', dx: '6vw', dy: '-4vh', delay: '-20s' },
  ] as const
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

/**
 * ذرات شخصیت تم — تنها منبع حرکت ریز محیط:
 * اقیانوس: پلاکتون نورانی | جنگل: برگ نسیم | شفق: ستاره + روبان |
 * شب: ستاره | غروب: غبار گرم | مینیمال: سکون | شکوفه: گلبرگ |
 * پاییز: برگ خزان | باران: قطره‌های بسیار کم
 */
export function AmbientParticles({ theme }: { theme: AraTheme }) {
  return (
    <div className="amb-layer amb-particles" aria-hidden="true">
      {theme === 'ocean' && <Bubbles />}
      {theme === 'aurora' && (
        <>
          <span className="amb-aurora-band" />
          <Stars set={STARS_AURORA} />
        </>
      )}
      {theme === 'night' && <Stars set={STARS_NIGHT} />}
      {theme === 'sunset' && <Dust />}
      {theme === 'forest' && <Fall set={LEAVES_FOREST} kind="leaf" />}
      {theme === 'sakura' && <Fall set={PETALS} kind="petal" />}
      {theme === 'autumn' && <Fall set={LEAVES_AUTUMN} kind="leaf" />}
      {theme === 'rain' && <Drops />}
      {/* minimal: عمداً هیچ — سکون، شخصیت این تم است */}
    </div>
  )
}
