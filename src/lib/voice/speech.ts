// ─── لایه گفتار دستیار — تشخیص گفتار فارسی/انگلیسی + خواندن پاسخ ──
// Web Speech API محلی مرورگر — هیچ سرویس ابری صوتی، هیچ کلید،
// هیچ هزینه‌ای. صدا هرگز روی سرور ارسال یا ذخیره نمی‌شود.

'use client'

import { langBcp47, type Lang } from '@/i18n/core'
import { nativeBridge, nativeVoiceSupported, nativeTtsSupported } from './native'

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

/** آیا ورودی صوتی در دسترس است؟ (اپ اندروید: تشخیص بومی؛ مرورگر: Web Speech) */
export function speechInputSupported(): boolean {
  if (nativeVoiceSupported()) return true
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
 *
 * در اپ اندروید (پل RahyarNative): تشخیص گفتار بومی اندروید (fa-IR/en-US)
 * مسیر وب را جایگزین می‌کند — همان قرارداد callbacks، بدون تغییر UI.
 */
export function listen(opts: {
  lang: Lang
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onEnd?: () => void
  onError?: (message: string) => void
}): VoiceSession | null {
  // ── مسیر بومی اندروید ──
  if (nativeVoiceSupported()) {
    const b = nativeBridge()!
    let ended = false
    const onPartial = (e: Event) => {
      const t = (e as CustomEvent<{ text?: string }>).detail?.text ?? ''
      if (t) opts.onPartial(t)
    }
    const onFinal = (e: Event) => {
      const t = (e as CustomEvent<{ text?: string }>).detail?.text ?? ''
      if (t.trim()) {
        opts.onFinal(t.trim())
      }
    }
    const onError = (e: Event) => {
      const code = (e as CustomEvent<{ code?: string }>).detail?.code ?? 'error'
      if (code === 'no-speech') {
        opts.onError?.('')
      } else if (code === 'denied' || code === 'no_match' || code === 'busy') {
        opts.onError?.(code)
      } else {
        opts.onError?.(code)
      }
    }
    const onEnd = () => {
      if (ended) return
      ended = true
      removeNativeVoiceListeners(onPartial, onFinal, onError, onEnd)
      opts.onEnd?.()
    }
    addNativeVoiceListeners(onPartial, onFinal, onError, onEnd)
    try {
      b.startVoiceRecognition(langBcp47(opts.lang))
    } catch {
      removeNativeVoiceListeners(onPartial, onFinal, onError, onEnd)
      opts.onError?.('start-failed')
      return null
    }
    return {
      stop: () => {
        try {
          b.stopVoiceRecognition()
        } catch {
          /* بی‌خطر */
        }
      },
    }
  }

  // ── مسیر وب (مرورگر) ──
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

// ── پل رخدادهای صوتی بومی ────────────────────────────────────
type VoiceHandler = {
  partial: (e: Event) => void
  final: (e: Event) => void
  error: (e: Event) => void
  end: (e: Event) => void
}

let activeVoiceHandler: VoiceHandler | null = null

function addNativeVoiceListeners(
  partial: (e: Event) => void,
  final: (e: Event) => void,
  error: (e: Event) => void,
  end: (e: Event) => void,
): void {
  removeNativeVoiceListeners(partial, final, error, end)
  activeVoiceHandler = { partial, final, error, end }
  window.addEventListener('rahyar-voice-partial', partial)
  window.addEventListener('rahyar-voice-final', final)
  window.addEventListener('rahyar-voice-error', error)
  window.addEventListener('rahyar-voice-end', end)
}

function removeNativeVoiceListeners(
  partial: (e: Event) => void,
  final: (e: Event) => void,
  error: (e: Event) => void,
  end: (e: Event) => void,
): void {
  window.removeEventListener('rahyar-voice-partial', partial)
  window.removeEventListener('rahyar-voice-final', final)
  window.removeEventListener('rahyar-voice-error', error)
  window.removeEventListener('rahyar-voice-end', end)
  if (activeVoiceHandler && activeVoiceHandler.partial === partial) activeVoiceHandler = null
}

/** ذخیره صداها برای لغو خواندن */
let speakingUtterances: SpeechSynthesisUtterance[] = []

/** خواندن متن با صدا — در اندروید با TTS بومی، در مرورگر با Web Speech Synthesis */
export function speak(text: string, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    if (!text.trim()) {
      resolve()
      return
    }
    // ── مسیر بومی اندروید (TTS بومی — صدای فارسی سیستم) ──
    if (nativeTtsSupported()) {
      const b = nativeBridge()!
      const onDone = () => {
        window.removeEventListener('rahyar-tts-done', onDone)
        resolve()
      }
      window.addEventListener('rahyar-tts-done', onDone)
      try {
        b.speak(text.slice(0, 600), langBcp47(lang))
      } catch {
        window.removeEventListener('rahyar-tts-done', onDone)
        resolve()
        return
      }
      // ایمنی: اگر پس از ۲۵ ثانیه رویداد پایان نیامد، رد شو
      window.setTimeout(() => {
        window.removeEventListener('rahyar-tts-done', onDone)
        resolve()
      }, 25_000)
      return
    }
    // ── مسیر وب ──
    if (!speechOutputSupported()) {
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
  // مسیر بومی
  if (nativeTtsSupported()) {
    try {
      nativeBridge()?.stopSpeaking()
    } catch {
      /* بی‌خطر */
    }
  }
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
