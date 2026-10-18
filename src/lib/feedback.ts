'use client'

// ─── بازخورد حسی و صوتی رابط — ظریف، کوتاه، قابل خاموشی ──────────
// • صدا: سینت WebAudio محلی (بدون فایل باینری) — تیک موفقیت، تایمر،
//   ثبت کار، یادآور، تکمیل هدف
// • هپتیک: navigator.vibrate فقط در اندروید/PWA؛ iOS Safari پشتیبانی
//   ندارد و بی‌صدا رد می‌شود (بدون هیچ فرض دسترسی سیستمی)
// • ماندگاری سلیقه در localStorage (rahyar-sound) — پیش‌فرض روشن

const SOUND_KEY = 'rahyar-sound'

export function readSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0')
  } catch { /* بدون ماندگاری */ }
}

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function blip(freq: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  const ac = audioCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = ac.currentTime + at
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

type UiSound = 'tap' | 'success' | 'complete' | 'timerEnd' | 'goal'

/** پخش صدای رابط — اگر کاربر خاموش کرده باشد، هیچ اتفاقی نمی‌افتد */
export function playUiSound(kind: UiSound): void {
  if (!readSoundEnabled()) return
  switch (kind) {
    case 'tap':
      blip(720, 0, 0.07, 0.06)
      break
    case 'success':
      blip(660, 0, 0.1, 0.07)
      blip(880, 0.08, 0.14, 0.06)
      break
    case 'complete':
      blip(587.33, 0, 0.12, 0.07)
      blip(783.99, 0.1, 0.12, 0.07)
      blip(1046.5, 0.2, 0.2, 0.06)
      break
    case 'timerEnd':
      blip(880, 0, 0.16, 0.08)
      blip(880, 0.22, 0.16, 0.08)
      blip(1174.66, 0.44, 0.3, 0.07)
      break
    case 'goal':
      blip(523.25, 0, 0.12, 0.07)
      blip(659.25, 0.1, 0.12, 0.07)
      blip(783.99, 0.2, 0.12, 0.07)
      blip(1046.5, 0.3, 0.3, 0.06)
      break
  }
}

/** هپتیک سبک — فقط پلتفرم‌هایی که واقعاً پشتیبانی می‌کنند */
export function haptic(pattern: 'light' | 'medium' | 'success' = 'light'): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const p = pattern === 'light' ? 8 : pattern === 'medium' ? 16 : [10, 40, 18]
      navigator.vibrate(p)
    }
  } catch { /* بدون هپتیک */ }
}

/** ترکیب رایج: صدا + هپتیک با هم */
export function feedback(kind: UiSound, h: 'light' | 'medium' | 'success' = 'light'): void {
  playUiSound(kind)
  haptic(h)
}

/* ─── صدای محیطی تمرکز — پد آرام بدون فایل باینری ───
   دو موج سینوسی بم + نویز فیلترشده بسیار کم‌صدا؛ حلقه بی‌پایان.
   فقط با انتخاب صریح کاربر روشن می‌شود و با توقف تایمر قطع می‌گردد. */
let ambientNodes: { osc1: OscillatorNode; osc2: OscillatorNode; noise: AudioBufferSourceNode; gain: GainNode } | null = null

export function startAmbientSound(): boolean {
  if (!readSoundEnabled()) return false
  const ac = audioCtx()
  if (!ac || ambientNodes) return ambientNodes !== null
  try {
    const gain = ac.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(0.05, ac.currentTime + 2) // ورود نرم

    const osc1 = ac.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.value = 110 // لایی بم
    const osc2 = ac.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = 165 // پنجم — حس دوردست
    const oscGain = ac.createGain()
    oscGain.gain.value = 0.35
    osc1.connect(oscGain).connect(gain)
    osc2.connect(oscGain).connect(gain)

    // نویز قهوه‌ای فیلترشده — شبیه باران خیلی دور
    const len = ac.sampleRate * 2
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2
    }
    const noise = ac.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    const noiseGain = ac.createGain()
    noiseGain.gain.value = 0.5
    noise.connect(lp).connect(noiseGain).connect(gain)

    gain.connect(ac.destination)
    osc1.start()
    osc2.start()
    noise.start()
    ambientNodes = { osc1, osc2, noise, gain }
    return true
  } catch {
    return false
  }
}

export function stopAmbientSound(): void {
  if (!ambientNodes) return
  try {
    const ac = audioCtx()
    const { osc1, osc2, noise, gain } = ambientNodes
    if (ac) {
      gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.8) // خروج نرم
    }
    setTimeout(() => {
      try {
        osc1.stop()
        osc2.stop()
        noise.stop()
      } catch { /* قبلاً متوقف شده */ }
    }, 900)
  } catch { /* بی‌صدا */ }
  ambientNodes = null
}
