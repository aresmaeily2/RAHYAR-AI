'use client'

// ─── AmbientEngine — موتور مرکزی تجربه محیطی رهیار ──────────────
// یک singleton مستقل که «حال محیط» را مالکیت می‌کند:
//   زمان روز • فصل • حالت تمرکز • سوییچ جلوه‌ها • کاهش حرکت سیستم
//   • تب پنهان • حالت هویت دستیار
// خروجی Engine دو مسیر دارد:
//   ۱) صفات data-* روی <html> → CSS لایه‌های محیطی از آن تغذیه می‌شود
//   ۲) snapshot واکنشی → React با useSyncExternalStore می‌خواند
// هیچ صفحه‌ای مستقیماً افکت تولید نمی‌کند؛ فقط وضعیت معنایی اعلام
// می‌شود و Engine تصمیم می‌گیرد چه جلوه‌ای، با چه شدتی و کِی.

import type {
  AmbientOrbState,
  AmbientSeason,
  AmbientSnapshot,
  AmbientTimeOfDay,
} from './types'
import { TRANSIENT_ORB } from './types'

/** کلید ذخیره‌سازی سوییچ جلوه‌ها — همان کلید قبلی برای مهاجرت صفر */
const EFFECTS_KEY = 'ara-effects'

/** باندهای زمانی روز — مرز ساعت (به‌علاوه دقیقه) */
const TIME_BANDS: ReadonlyArray<readonly [number, AmbientTimeOfDay]> = [
  [5, 'night'],      // ۰۰ تا ۰۵
  [7, 'dawn'],       // ۰۵ تا ۰۷
  [11, 'morning'],   // ۰۷ تا ۱۱
  [15, 'noon'],      // ۱۱ تا ۱۵
  [17.5, 'afternoon'], // ۱۵ تا ۱۷:۳۰
  [19.5, 'sunset'],  // ۱۷:۳۰ تا ۱۹:۳۰
  [21, 'evening'],   // ۱۹:۳۰ تا ۲۱
  [24.1, 'night'],   // ۲۱ به بعد
]

export function timeOfDayFor(d: Date): AmbientTimeOfDay {
  const h = d.getHours() + d.getMinutes() / 60
  for (const [limit, name] of TIME_BANDS) {
    if (h < limit) return name
  }
  return 'night'
}

/** فصل از تقویم میلادی — نیم‌کره شمالی (مبنای کاربر ایران) */
export function seasonFor(d: Date): AmbientSeason {
  const m = d.getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

function readEffects(): boolean {
  try {
    return localStorage.getItem(EFFECTS_KEY) !== '0'
  } catch {
    return true
  }
}

/** عکس پیش‌فرض — روی سرور و قبل از init همین است؛ CSS هم همین
 *  پیش‌فرض‌ها را دارد تا هیچ فلشی بین SSR و کلاینت دیده نشود. */
export const AMBIENT_DEFAULT: AmbientSnapshot = {
  time: 'noon',
  season: 'summer',
  focus: false,
  effects: true,
  reduced: false,
  frozen: false,
  orb: 'idle',
}

type Listener = () => void

class AmbientEngine {
  private snap: AmbientSnapshot = AMBIENT_DEFAULT
  private listeners = new Set<Listener>()
  private started = false
  private timer: ReturnType<typeof setInterval> | null = null
  private mq: MediaQueryList | null = null
  private onVis: (() => void) | null = null
  private onMq: (() => void) | null = null
  private orbRevertTimer: ReturnType<typeof setTimeout> | null = null

  /** یک‌بارراه‌اندازی — فراخوانی از AmbientStage (idempotent) */
  init(): void {
    if (this.started || typeof window === 'undefined') return
    this.started = true

    this.mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.onMq = () => this.patch({ reduced: this.mq?.matches ?? false })
    this.mq.addEventListener?.('change', this.onMq)

    this.onVis = () => this.patch({ frozen: document.hidden })
    document.addEventListener('visibilitychange', this.onVis)

    this.patch({
      time: timeOfDayFor(new Date()),
      season: seasonFor(new Date()),
      effects: readEffects(),
      reduced: this.mq.matches,
      frozen: document.hidden,
    })

    // بازمحاسبه هر دقیقه — گذر آرام باندها با transition طولانی CSS
    this.timer = setInterval(() => {
      this.patch({
        time: timeOfDayFor(new Date()),
        season: seasonFor(new Date()),
      })
    }, 60_000)
  }

  /** توقف کامل (فقط برای تست/ریشه‌کنی — در عمل لازم نیست) */
  destroy(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    if (this.mq && this.onMq) this.mq.removeEventListener?.('change', this.onMq)
    if (this.onVis) document.removeEventListener('visibilitychange', this.onVis)
    this.started = false
  }

  // ─── قرارداد useSyncExternalStore ───
  getSnapshot = (): AmbientSnapshot => this.snap
  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  // ─── فرمان‌ها — تنها راه اعلام وضعیت از سوی صفحات ───

  /** حالت تمرکز (تایمر تمرکز این را صدا می‌زند) */
  setFocus(on: boolean): void {
    this.patch({ focus: on })
  }

  /** سوییچ جلوه‌ها — ماندگار؛ کلاس ara-no-fx قدیمی هم حفظ می‌شود */
  setEffects(on: boolean): void {
    try {
      localStorage.setItem(EFFECTS_KEY, on ? '1' : '0')
    } catch {
      /* بدون ماندگاری */
    }
    this.patch({ effects: on })
  }

  /** حالت هویت دستیار — چت/صدا این را اعلام می‌کنند */
  setOrb(state: AmbientOrbState): void {
    // حالت‌های گذرا (glow/pulse/breathing) بعد از مدت خودشان به حالت پیش می‌گردند
    const duration = TRANSIENT_ORB[state]
    if (duration) {
      const prev = this.snap.orb
      this.patch({ orb: state })
      if (this.orbRevertTimer) clearTimeout(this.orbRevertTimer)
      this.orbRevertTimer = setTimeout(() => {
        this.patch({ orb: this.snap.orb === state ? prev : this.snap.orb })
        this.orbRevertTimer = null
      }, duration)
      return
    }
    if (this.orbRevertTimer) {
      clearTimeout(this.orbRevertTimer)
      this.orbRevertTimer = null
    }
    this.patch({ orb: state })
  }

  /** بازخوانی دستی زمان/فصل (آزمون و دموی تدریجی گذر روز) */
  refreshClock(): void {
    this.patch({ time: timeOfDayFor(new Date()), season: seasonFor(new Date()) })
  }

  // ─── درون‌سازی ───

  private patch(p: Partial<AmbientSnapshot>): void {
    let changed = false
    const next = { ...this.snap } as Record<keyof AmbientSnapshot, unknown>
    for (const k of Object.keys(p) as (keyof AmbientSnapshot)[]) {
      const v = p[k]
      if (v !== undefined && v !== this.snap[k]) {
        next[k] = v
        changed = true
      }
    }
    if (!changed) return
    this.snap = next as unknown as AmbientSnapshot
    this.applyDom()
    this.listeners.forEach((l) => l())
  }

  /** اعمال وضعیت روی <html> — تنها نقطه اتصال Engine به CSS */
  private applyDom(): void {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const s = this.snap
    root.dataset.ambientTime = s.time
    root.dataset.ambientSeason = s.season
    root.dataset.ambient = s.effects ? 'on' : 'off'
    root.dataset.ambientMotion = s.reduced ? 'reduced' : 'full'
    root.dataset.ambientFrozen = s.frozen ? 'on' : 'off'
    root.dataset.orb = s.orb
    // سازگاری با قواعد CSS موجود (سوییچ کم‌مصرف قدیمی)
    root.classList.toggle('ara-no-fx', !s.effects)
    if (s.focus) root.setAttribute('data-focus-mode', 'on')
    else root.removeAttribute('data-focus-mode')
  }
}

/** تنها نمونه — همه لایه‌ها و صفحات از همین می‌خوانند */
export const ambient = new AmbientEngine()
