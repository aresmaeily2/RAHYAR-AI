// ─── صداهای یادآوری — تولید محلی با WebAudio (بدون فایل باینری) ──
// سه پروفایل ساده + حالت خاموش. همه پخش‌ها فقط پس از تعامل کاربر و
// با انتخاب صریح او انجام می‌شود (سیاست opt-in بخش ۸ دستور).
import type { ReminderSettings } from './settings'

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

function tone(
  ac: AudioContext,
  freq: number,
  startAt: number,
  dur: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = ac.currentTime + startAt
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

/** پخش صدای انتخابی کاربر — نتیجه true یعنی صدایی پخش شد */
export function playReminderSound(settings: Pick<ReminderSettings, 'soundId' | 'volume'>): boolean {
  if (settings.soundId === 'none') return false
  const ac = audioCtx()
  if (!ac) return false
  const v = Math.max(0, Math.min(1, settings.volume)) * 0.5
  if (settings.soundId === 'chime') {
    tone(ac, 880, 0, 0.5, v)
    tone(ac, 1174.66, 0.16, 0.55, v * 0.85)
    tone(ac, 1567.98, 0.32, 0.6, v * 0.7)
  } else if (settings.soundId === 'pulse') {
    tone(ac, 523.25, 0, 0.22, v, 'triangle')
    tone(ac, 523.25, 0.3, 0.22, v, 'triangle')
    tone(ac, 523.25, 0.6, 0.3, v, 'triangle')
  } else {
    tone(ac, 1046.5, 0, 0.18, v, 'square')
    tone(ac, 784, 0.24, 0.22, v * 0.8, 'square')
  }
  return true
}

// ── گفتار محلی (Web Speech API — بدون سرویس ابری) ────────────
/** گفتار متن یادآوری با صدای فارسی در دسترس سیستم؛ اگر صدا نبود false */
export function speakReminder(text: string, settings: Pick<ReminderSettings, 'speech' | 'speechRate'>): boolean {
  if (!settings.speech) return false
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
    const u = new SpeechSynthesisUtterance(text.slice(0, 200))
    u.lang = 'fa-IR'
    u.rate = settings.speechRate
    const voices = window.speechSynthesis.getVoices()
    const fa = voices.find((v) => v.lang?.toLowerCase().startsWith('fa'))
    if (fa) u.voice = fa
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}

/** آیا صدای فارسی در این دستگاه موجود است؟ (برای نمایش وضعیت در تنظیمات) */
export function hasPersianVoice(): boolean {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
    return window.speechSynthesis.getVoices().some((v) => v.lang?.toLowerCase().startsWith('fa'))
  } catch {
    return false
  }
}
