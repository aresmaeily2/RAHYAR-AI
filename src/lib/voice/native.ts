// ─── لایه قابلیت‌های بومی اندروید (پل RahyarNative v2) ─────────
// وقتی محصول داخل اپ اندروید اجرا می‌شود، WebView پل بومی RahyarNative
// را ثبت می‌کند (MainActivity). این ماژول تنها نقطهٔ تشخیص و استفادهٔ آن است:
//  - صدا: SpeechRecognizer + TTS اندروید (Web Speech API در WebView نیست)
//  - یادآور: همگام‌سازی با AlarmManager برای اعلان سیستمی حتی با اپ بسته
//  - هر قابلیتی که نبود، مسیر وبِ قبلی (مرورگر) به همان شکل قبلی کار می‌کند
//
// قرارداد رخدادها (اندروید → وب با evaluateJavascript):
//   window.dispatchEvent(CustomEvent('rahyar-voice-partial', {detail:{text}}))
//   window.dispatchEvent(CustomEvent('rahyar-voice-final',   {detail:{text}}))
//   window.dispatchEvent(CustomEvent('rahyar-voice-error',   {detail:{code}}))
//   window.dispatchEvent(CustomEvent('rahyar-voice-end'))
//   window.dispatchEvent(CustomEvent('rahyar-tts-done',      {detail:{id}}))

'use client'

export interface RahyarNativeBridge {
  /** همیشه true — تشخیص حضور پل بومی */
  isAndroidApp(): boolean
  /** JSON: { voice, tts, reminders, version } */
  capabilities(): string
  /** شروع شنود — نتایج با رخدادهای rahyar-voice-* تحویل می‌شوند */
  startVoiceRecognition(langBcp47: string): void
  stopVoiceRecognition(): void
  /** خواندن متن — شناسهٔ گفته برمی‌گرداند؛ پایان با rahyar-tts-done */
  speak(text: string, langBcp47: string): string
  stopSpeaking(): void
  /** همگام‌سازی یادآورهای فعال — آرایه [{id, message, remindAt}] */
  syncReminders(jsonArray: string): void
  /** نسخهٔ اپ اندروید */
  appVersion(): string
}

type NativeWindow = Window & { RahyarNative?: RahyarNativeBridge }

export function nativeBridge(): RahyarNativeBridge | null {
  if (typeof window === 'undefined') return null
  const b = (window as NativeWindow).RahyarNative
  if (!b || typeof b.isAndroidApp !== 'function') return null
  try {
    return b.isAndroidApp() ? b : null
  } catch {
    return null
  }
}

export interface NativeCaps {
  voice: boolean
  tts: boolean
  reminders: boolean
  version: string
}

export function nativeCapabilities(): NativeCaps | null {
  const b = nativeBridge()
  if (!b) return null
  try {
    const caps = JSON.parse(b.capabilities()) as Partial<NativeCaps>
    return {
      voice: caps.voice === true,
      tts: caps.tts === true,
      reminders: caps.reminders === true,
      version: typeof caps.version === 'string' ? caps.version : '',
    }
  } catch {
    return null
  }
}

export function nativeVoiceSupported(): boolean {
  return nativeCapabilities()?.voice === true
}

export function nativeTtsSupported(): boolean {
  return nativeCapabilities()?.tts === true
}

export function nativeRemindersSupported(): boolean {
  return nativeCapabilities()?.reminders === true
}

/** همگام‌سازی یادآورهای فعال با زمان‌بند بومی — بدون پرتاب خطا */
export function syncNativeReminders(
  list: Array<{ id: string; message: string; remindAt: string }>,
): void {
  if (!nativeRemindersSupported()) return
  try {
    nativeBridge()?.syncReminders(JSON.stringify(list))
  } catch {
    /* بی‌صدا — اعلان وب مسیر جایگزین است */
  }
}
