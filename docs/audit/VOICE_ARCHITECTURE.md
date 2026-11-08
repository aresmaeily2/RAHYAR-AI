# VOICE_ARCHITECTURE — معماری فنی دستیار صوتی رهیار (V1)

- **تاریخ:** 2026-11-08 · **HEAD کد:** `1e15165` · مکمل: `VOICE_BASELINE_AUDIT.md`

## ۱. نقشهٔ کامل مسیر فراخوانی (میک → پاسخ صوتی)

```
[وب متصل — مرورگر یا WebView سرور]
  لمس میکروفون (chat-view toggleVoice)
    → startVoiceListening()
        ├─ stopSpeaking()           ← قطع فوری TTS جاری (بَرج-این)
        ├─ listen({lang})           ← src/lib/voice/speech.ts
        │    ├─ اپ اندروید؟ → پل RahyarNative.startVoiceRecognition(bcp47)
        │    │      → MainActivity HostAction → VoiceHelper.startListening()
        │    │            → مجوز؟ granted: SpeechRecognizer(fa-IR/en-US, partial, lang-switch)
        │    │              رویدادهای DOM: rahyar-voice-partial/final/error/end + rahyar-voice-perm
        │    │      └─ مرورگر؟ Web Speech API (همان قرارداد callbacks)
        │    ├─ onPartial → نمایش زنده در composer + اورب «گوش می‌دهم»
        │    └─ onFinal → send(text)  ← ارسال خودکار به Agent (V1)
        │            → POST /api/chat/stream (زمینهٔ مکالمه سمت سرور)
        │            → detectIntent/مدل → ابزار واقعی (Task/Reminder/Finance/Plan)
        │            → پاسخ + اکشن‌های DB واقعی
        │            → speak(reply)   ← TTS بومی (rahyar-tts-done) یا Web Speech
        │                  └─ tts-done → اگر مکالمهٔ پیوسته فعال → startVoiceListening()
        └─ onError → پیام محلی fa/en + خروج از حالت پیوسته (بدون حلقهٔ بی‌پایان)

[اپ محلی آفلاین — HomeActivity + assets/www]
  لمس FAB (app.js voiceFab)
    → voiceMicState؟ need_request → requestMicPermission → rahyar-voice-perm
    → native.voiceStart(V.bcp())  → RahyarBridge → VoiceHelper (SpeechRecognizer)
    → rahyar-voice-final → native.parseVoiceCommand(text, lang)   [VoiceCommandParser.java]
    → runIntent → add_task/add_reminder/add_income/add_expense/finance_report/…
         ├─ مالی/حذف → askConfirm() — بدون تأیید هیچ نوشتنی
         └─ اجرا روی ماژول‌های محلی (LocalStore)
    → speak(reply) → native.ttsSpeak → VoiceHelper TTS (سرعت از profile.voiceRate)

[Wake Word — اختیاری]
  VoiceWakeService (foreground، اعلان ماندگار، partial-loop با backoff قطعی)
    → عبارت «سلام رهیار» → startActivity(HomeActivity, extra rahyar_wake=1, singleTop)
    → HomeActivity.applyWakeIntent → رویداد rahyar-wake در WebView
    → app.js listener → toggleListen()  (شنود فقط با رضایت میکروفون — fail-closed)
```

## ۲. تفکیک Native / Web

| مؤلفه | لایه | فایل |
|---|---|---|
| SpeechRecognizer + TTS سیستم | **Native Android** | `VoiceHelper.java` |
| سرویس Wake Word + اعلان ماندگار | Native Android | `VoiceWakeService.java` |
| بازیابی Wake پس از بوت | Native Android | `BootReceiver.java` (+ `HomeActivity` در شروع اپ) |
| پل‌های JS (قرارداد + اعتبارسنجی) | Native Android | `RahyarBridge.java` (محلی)، `RahyarNativeBridge.java` (متصل) |
| پارسر فرمان حالت محلی | JVM-خالص | `VoiceCommandParser.java` |
| لایهٔ گفتار وب (انتخاب مسیر) | Web (TS) | `src/lib/voice/speech.ts` |
| تشخیص پل بومی | Web (TS) | `src/lib/voice/native.ts` |
| چرخهٔ چت/اورب/ارسال خودکار/پیوسته | Web (React) | `src/components/ara/chat-view.tsx` |
| UI محلی صوت (FAB/پنل/تنظیمات) | Web محلی (JS) | `android/src/www/js/app.js` |
| تنظیمات صوت سرور (زبان/سرعت) | سرور | `server-settings.ts` + `/api/settings/app` |

## ۳. پل WebView ↔ Native

- ثبت: `web.addJavascriptInterface(bridge, "RahyarNative")` در **هر دو** اکتیویتی (`HomeActivity:192`، `MainActivity:116`) — تشخیص از سمت وب با `nativeBridge()` (`isAndroidApp()`).
- امنیت پل: قفل ناوبری به مبدأ مجاز (appassets / مبنای سرور)، سقف حجم ورودی، sanitize زبان/سرعت، هیچ دادهٔ نشست/فایل از پل خارج نمی‌شود.
- رویدادهای بومی→وب با `evaluateJavascript(VoiceHelper.eventJs(...))` — خروجی تست‌پذیر JVM (`VoiceEventsTest`) و هم‌نام با `native.ts`.
- مجوز میکروفون: درخواست از Activity (`requestPermissions` 4701) → نتیجه → رویداد `rahyar-voice-perm` → retry شفاف وب.

## ۴. قرارداد رویدادها (قفل‌شده با تست)

| رویداد | جهت | بار |
|---|---|---|
| `rahyar-voice-partial` | Native→Web | `{text}` |
| `rahyar-voice-final` | Native→Web | `{text}` |
| `rahyar-voice-error` | Native→Web | `{code}` no_match/busy/denied/unavailable/error |
| `rahyar-voice-end` | Native→Web | — |
| `rahyar-voice-perm` | Native→Web | `{state: granted|denied}` |
| `rahyar-tts-done` | Native→Web | — |
| `rahyar-wake` | Native→Web | — (V1) |

## ۵. وضعیت‌های UI صوتی و منبع حقیقت آن‌ها

| وضعیت | منبع واقعی |
|---|---|
| آماده | `phase=idle` و بدون شنود/خواندن |
| در حال گوش دادن | `listening` (فقط پس از start واقعی recognizer) |
| در حال تشخیص | partial رسیدن → متن زنده در composer |
| در حال پردازش | `phase=waiting` (درخواست Agent در جریان) |
| در حال اجرای ابزار | اکشن‌های پاسخ در جریان sync می‌شوند |
| در حال پاسخ صوتی | `speakingId` ست شده (تا `rahyar-tts-done` یا failsafe 25s/20s) |
| متوقف‌شده | تاپ کاربر (خروج از شنود/خواندن) — تصمیم صریح |
| خطا | رویداد error → پیام محلی + خروج از حالت پیوسته |
| بدون اتصال | offline-box بومی / پیام network محلی‌شده |

هیچ انیمیشنی بدون رخداد واقعی نمایش داده نمی‌شود — اورب فقط از AmbientEngine حالت می‌گیرد (`chat-view.tsx:209-223`).

## ۶. جلوگیری از منطق موازی (الزام بند ۲)

- در حالت متصل، متن صوتی از **همان** `send()` چت می‌گذرد — مدل/روتر/تأیید مالی یکسان با متن تایپی؛ هیچ مسیر دومی وجود ندارد.
- در حالت محلی، متن تایپ‌شدهٔ پنل و خروجی STT هر دو به `parseVoiceCommand` → `runIntent` می‌روند (یک پارسر، یک موتور اجرا).
- دو پشته فقط در «پارسر محلی» و «مدل سرور» متفاوت‌اند — بر اساس معماری محلی-اول محصول (مستند در `app/build.gradle`)؛ ادغام این دو = تغییر معماری محصول، خارج از اصلاحات ضروری V1.

## ۷. TTS فارسی — مسیر جایگزین (الزام بند ۵)

مسیر اصلی: TTS سیستم دستگاه (Google TTS فارسی روی اکثر دستگاه‌ها با تنظیمات زبان فارسی). اگر کیفیت فارسی دستگاه نامناسب بود:
1. **نصب موتور TTS فارسی** (مثل Google TTS با بستهٔ فارسی، یا موتورهای فارسی Play Store) — رهیار از TTS سیستم پیش‌فرض استفاده می‌کند و بدون تغییر کد از موتور جدید بهره می‌گیرد.
2. مسیر ابری (مثلاً TTS Provider) **پیاده نشد** — نیاز به کلید/هزینه/ارسال صدا به بیرون دارد؛ طبق مأموریت شفاف مستند می‌شود: در صورت درخواست مالک به‌عنوان ماژول اختیاری با اعلام هزینه/حریم خصوصی اضافه می‌شود. هیچ صدای ساختگی/پیش‌ضبط به‌جای پاسخ زنده استفاده نشده است.
