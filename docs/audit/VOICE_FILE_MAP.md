# V1 بخش ۲ — نقشه فایل‌های Voice (بند ۵ مأموریت)

> commit مبنا: `1e15165` (V1-VOICE بخش ۱) + `7092937` (V1-DOCS) — شاخه کاری: `v1/voice-acceptance`
> تاریخ تهیه: 2026-11-08 | هر جزء با مسئولیت، ورودی، خروجی و وابستگی دقیق

## ۱. زنجیره اصلی صوت (Single Path)

```
میکروفون دستگاه
  → VoiceHelper.java (SpeechRecognizer — STT بومی اندروید)
  → رویدادهای DOM: rahyar-voice-partial / -final / -error / -end
  → speech.ts (listen() — پل رویداد بومی/مرورگر)
  → chat-view.tsx (loop: ارسال خودکار متن نهایی به /api/chat — بدون دکمهٔ دوم)
  → Agent واقعی سرور (assistant/router.ts + gateway) → ابزار → DB
  → پاسخ → chat-view.tsx speak() → native.ts (پل RahyarNative) / speech.ts
  → VoiceHelper.java (TextToSpeech) → rahyar-tts-done → relisten خودکار (مکالمهٔ پیوسته)
  → Barge-in: شروع شنود جدید → stopSpeaking() → قطع فوری TTS
```

Wake Word مسیر جانبی مستقل است (بخش ۳ جدول) و مستقیماً در زنجیرهٔ بالا دخالت نمی‌کند.

## ۲. اجزای Android (Java)

| فایل | مسئولیت | ورودی | خروجی | وابستگی |
|---|---|---|---|---|
| `android/src/java/.../VoiceHelper.java` (307 خط) | STT با `SpeechRecognizer` + TTS با `TextToSpeech`؛ گیت مجوز میکروفون؛ سرعت خواندن ۰.۵–۲.۵؛ رویدادها به WebView | `startListening(langBcp47)`، `speak(text,lang)`، `setSpeechRate(rate)` از پل | رویدادهای JS: `rahyar-voice-partial/-final/-error/-end`، `rahyar-voice-perm`، `rahyar-tts-done` | `RahyarBridge.VoiceDelegate`، `HomeActivity` (پاسخ مجوز 4701)، سرویس گفتار سیستم |
| `android/src/java/.../VoiceCommandParser.java` (238 خط) | پارسر محلی آفلاین فرمان صوتی (بدون شبکه)؛ normalize فارسی؛ ضریب هزار/میلیون؛ لغو «منصرف/ثبت‌نکن» | متن نهایی STT + زبان | `JSONObject` عملیات محلی (یادآور/سؤال/لغو) | هیچ — JVM-آزمون‌پذیر (`VoiceCommandParserTest`) |
| `android/src/java/.../VoiceWakeService.java` (201 خط) | Wake Word اختیاری «سلام رهیار»؛ foreground-service با اعلان شفاف؛ چرخهٔ شنود با backoff قطعی | رضایت صریح تنظیمات (profile JSON) | بازکردن `HomeActivity` با `rahyar_wake=1`؛ اعلان پایدار | `SpeechRecognizer` سیستم، `BootReceiver`/`HomeActivity` برای روشن‌سازی |
| `android/src/java/.../BootReceiver.java` (56 خط) | پس از Boot، فقط اگر رضایت Wake فعال باشد سرویس را راه می‌اندازد | `BOOT_COMPLETED` | startForegroundService یا هیچ | `wakeEnabledFromProfileJson` — JVM-آزمون‌پذیر |
| `android/src/java/.../RahyarNativeBridge.java` (250 خط) | قرارداد JS↔بومی؛ اعتبارسنجی زبان/سرعت؛ سقف ۶۰۰ نویسهٔ TTS؛ parseReminders خالص | فراخوانی JS از `native.ts` | فراخوانی HostAction های Activity | `MainActivity` (ثبت روی WebView قفل به مبنا) — JVM-آزمون‌پذیر |
| `android/src/java/.../HomeActivity.java` (277 خط) | میزبان WebView؛ پاسخ دیالوگ مجوز؛ تزریق `rahyar-wake` به UI؛ startForegroundService برای Wake | Intent با `rahyar_wake=1`، نتیجهٔ مجوز | رویداد `rahyar-wake` به WebView | `VoiceWakeService`، `BootReceiver`، `VoiceHelper` |
| `android/app/gradle/AndroidManifest.xml` (111 خط) | مجوزها: RECORD_AUDIO، FOREGROUND_SERVICE(_MICROPHONE)، POST_NOTIFICATIONS، SCHEDULE_EXACT_ALARM، BOOT، SMS؛ ثبت VoiceWakeService + BootReceiver + ReminderReceiver | — | اعلان مجوزها به سیستم | flavors: user vc28 / owner vc29 (v2.4.0) |

## ۳. اجزای Web/TypeScript

| فایل | مسئولیت | ورودی | خروجی | وابستگی |
|---|---|---|---|---|
| `src/lib/voice/speech.ts` (324 خط) | لایهٔ یکپارچهٔ صوت وب: `listen()` (Web Speech API یا پل بومی)، `speak()`، `stopSpeaking()`، `hasVoiceFor()`؛ fail-safe TTS | متن پاسخ Agent؛ انتخاب زبان | Promise شنود/خواندن؛ رویدادها؛ ردِ صریح در نبود پشتیبانی | `native.ts`، Web Speech API مرورگر |
| `src/lib/voice/native.ts` (94 خط) | تشخیص و قرارداد پل `RahyarNative`؛ همگام‌سازی یادآورها؛ تشخیص قابلیت‌ها | window.RahyarNative | bridge یا null — هرگز استثنا | `RahyarNativeBridge.java` |
| `src/components/ara/chat-view.tsx` (۱۰۰۵ خط — نقاط صوتی: ~۱۷۷–۶۳۲) | **دستگاه مرکزی مکالمهٔ صوتی V1**: ارسال خودکار متن نهایی به Agent؛ barge-in (شنود جدید TTS را قطع می‌کند)؛ relisten خودکار پس از TTS با شرایط توقف محدود؛ fail-safe ۲۵ث؛ زبان/سرعت از تنظیمات | رویدادهای صوت، پاسخ Agent، تنظیمات کاربر | پیام‌ها، درخواست /api/chat، فراخوانی speak/stop | `speech.ts`، `native.ts`، i18n store |
| `src/i18n/store.ts` | پایدارسازی voiceReplies/voiceRate/voiceLang (۰.۵–۲.۵، auto/fa/en) | تنظیمات UI | ذخیرهٔ سرور + Refهای بی‌رِندر | `settings/app` API |
| `src/app/api/settings/app/route.ts` (108 خط) | GET/PUT تنظیمات؛ اعتبارسنجی voiceRate (0.5–2.5) و voiceLang (''|fa|en) | JSON بدنه | تنظیمات ذخیره‌شده | `server-settings.ts` |
| `src/lib/server-settings.ts` | خواندن/نوشتن تنظیمات صوتی per-user | userId، کلید | مقدار type-safe | Prisma |

## ۴. کلاس‌های پشتیبان مرتبط (خط صوت نیستند ولی در زنجیره دخالت دارند)

| فایل | نقش |
|---|---|
| `src/lib/assistant/router.ts` + `pending-action.ts` + `expense-flow.ts` | مغز Agent سرور: اجرای ابزار واقعی، گیت تأیید عملیات حساس (بند ۶ مأموریت) |
| `src/app/api/chat/route.ts` | نقطهٔ ورود فرمان صوتی-متنی به Agent |
| `src/app/api/reminders/route.ts` | ثبت واقعی یادآور (S1 سناریو) |
| `android/src/java/.../ReminderAlarms.java` + `ReminderReceiver.java` | اعلان واقعی یادآور با AlarmManager |
| `android/src/www/js/app.js` | پوستهٔ محلی WebView — مصرف رویداد صوت در حالت آفلاین |

## ۵. وضعیت هر جزء (قواعد بند ۱۵ مأموریت)

| جزء | وضعیت | دلیل |
|---|---|---|
| VoiceHelper (STT/TTS بومی) | **CODED** | پیاده‌سازی کامل + JVM 194/194؛ اجرای میکروفونی واقعی روی دستگاه = BLOCKED (بند ۳ مأموریت) |
| VoiceCommandParser | **CODED** (منطق JVM-VERIFIED) | ۱۸ آزمون JVM جدید در 1e15165 — منطق خالص اثبات‌شده؛ اجرای گفتاری = BLOCKED |
| VoiceWakeService + BootReceiver | **CODED** | چرخهٔ restart/backoff JVM-آزمون‌پذیر؛ تشخیص واقعی wake روی دستگاه = BLOCKED |
| speech.ts / chat-view.tsx loop | **CODED** | unit 289/289 + سناریوهای S1–S7 زندهٔ سرور (بخش بعد از متن STT) — صوت واقعی = BLOCKED |
| تنظیمات صوتی سرور | **CODED** (API-level verified) | S7: PUT/GET + ردِ مقدار نامعتبر روی سرور زندهٔ 3001 |
| مجوز میکروفون (دیالوگ/رد/لغو) | **CODED** | جریان fail-closed کدنویسی‌شده؛ آزمون دیالوگ سیستم = BLOCKED |

> هیچ جزء صوتی VERIFIED-on-device نیست — همین صراحت، مبنای گزارش پذیرش بخش ۲ است.
