// ─── لایه گفتار دستیار — تشخیص گفتار فارسی/انگلیسی + خواندن پاسخ ──
// Web Speech API محلی مرورگر — هیچ سرویس ابری صوتی، هیچ کلید،
// هیچ هزینه‌ای. صدا هرگز روی سرور ارسال یا ذخیره نمی‌شود.

'use client'

import { langBcp47, type Lang } from '@/i18n/core'

// ── تایپ‌های Web Speech (بدون @types بیرونی) ──────────────────
interface SpeechRecognitionAlternativeLike {
  transcript: string
  confidence: number
}
interface SpeechRecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}
interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((e: Event & { error?: string }) => void) | null
  onstart: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** آیا مرورگر ورودی صوتی دارد؟ */
export function speechInputSupported(): boolean {
  return getRecognitionCtor() !== null
}

/** آیا مرورگر خروجی صوتی دارد؟ */
export function speechOutputSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export interface VoiceSession {
  /** توقف شنود */
  stop: () => void
}

/**
 * شنود گفتار — یک جمله نهایی کافی است (voice command mode).
 * onPartial برای نمایش زنده متن موقت؛ onFinal برای نتیجه قطعی.
 */
export function listen(opts: {
  lang: Lang
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onEnd?: () => void
  onError?: (message: string) => void
}): VoiceSession | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = langBcp47(opts.lang)
  rec.continuous = false
  rec.interimResults = true
  rec.maxAlternatives = 1

  let finalText = ''
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      const txt = r[0]?.transcript ?? ''
      if (r.isFinal) finalText += txt
      else interim += txt
    }
    if (interim) opts.onPartial(interim.trim())
    if (finalText.trim()) {
      opts.onFinal(finalText.trim())
      finalText = ''
    }
  }
  rec.onerror = (e) => {
    const code = (e as Event & { error?: string }).error ?? 'error'
    // no-speech = فقط سکوت بود؛ خطای واقعی نیست
    opts.onError?.(code === 'no-speech' ? '' : code)
  }
  rec.onend = () => opts.onEnd?.()

  try {
    rec.start()
  } catch {
    opts.onError?.('start-failed')
    return null
  }
  return {
    stop: () => {
      try {
        rec.stop()
      } catch {
        /* بی‌خطر */
      }
    },
  }
}

/** ذخیره صداها برای لغو خواندن */
let speakingUtterances: SpeechSynthesisUtterance[] = []

/** خواندن متن با صدا — زبان را از تنظیمات می‌گیرد */
export function speak(text: string, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    if (!speechOutputSupported() || !text.trim()) {
      resolve()
      return
    }
    try {
      const synth = window.speechSynthesis
      synth.cancel()
      const u = new SpeechSynthesisUtterance(text.slice(0, 600))
      u.lang = langBcp47(lang)
      u.rate = lang === 'fa' ? 0.95 : 1
      u.pitch = 1
      const voices = synth.getVoices()
      const match =
        voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(lang === 'fa' ? 'fa' : 'en'))
      if (match) u.voice = match
      speakingUtterances.push(u)
      u.onend = () => resolve()
      u.onerror = () => resolve()
      synth.speak(u)
      // ایمنی: اگر after 20s هنوز نگفت، رد شو
      window.setTimeout(resolve, 20_000)
    } catch {
      resolve()
    }
  })
}

/** توقف خواندن */
export function stopSpeaking(): void {
  if (!speechOutputSupported()) return
  speakingUtterances = []
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* بی‌خطر */
  }
}

/** آیا صدای فارسی روی دستگاه هست؟ (برای UI راهنما) */
export function hasVoiceFor(lang: Lang): boolean {
  if (!speechOutputSupported()) return false
  try {
    return window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith(lang))
  } catch {
    return false
  }
}
