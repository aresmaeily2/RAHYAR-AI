# VOICE_BASELINE_AUDIT — ممیزی وضعیت واقعی دستیار صوتی (V1)

- **چرخه:** V1 (مأموریت مستقل مالک — اولویت مطلق) · **تاریخ:** 2026-11-08
- **HEAD پایه:** `5522d458` (اعلامی F7) → **HEAD کد صوتی V1:** `1e15165`
- **قانون:** اول واقعیت، بعد تغییر، بعد آزمون. هیچ وضعیتی بدون مدرک ثبت نشده است.
- **متد ممیزی:** خواندن کامل ۱۰ کلاس صوتی اندروید + `speech.ts`/`native.ts` + `chat-view.tsx` + `app.js` محلی + Manifest واقعی build + ۱۰ فایل تست JVM + بازاجرأ آزمون‌ها روی سندباکس واقعی.

## ۰. معماری واقعی — دو پشته، یک قرارداد

| پشته | ورودی | STT | موتور نیت → اجرا | TTS |
|---|---|---|---|---|
| **وب متصل** (مرورگر + WebView سرور مالک = MainActivity) | دکمهٔ میکروفون در composer چت | Web Speech API / پل بومی `RahyarNative` → `VoiceHelper` | **همان پایپ‌لاین چت** (`/api/chat` → detectIntent → مدل/روتر قطعی → ابزار DB) — هیچ منطق موازی | TTS بومی با `rahyar-tts-done` / Web Speech Synthesis |
| **اپ محلی آفلاین** (HomeActivity + assets/www) | FAB تزریقی `voiceFab` | `SpeechRecognizer` بومی از طریق `RahyarBridge` → `VoiceHelper` | `VoiceCommandParser.java` (خالص JVM) → `runIntent` روی ماژول‌های محلی با گیت تأیید | `TextToSpeech` بومی |

پل‌ها: `RahyarBridge` (محلی) و `RahyarNativeBridge` (متصل) — هر دو فقط قرارداد JS + اعتبارسنجی؛ منطق در کلاس‌های خالص JVM-آزمون‌پذیر. مسیر WebView↔Native: `addJavascriptInterface("RahyarNative"/bridge)` + رویدادهای DOM (`rahyar-voice-*`, `rahyar-tts-done`, `rahyar-wake`) با `evaluateJavascript` — دقیقاً هم‌نام با قرارداد وب (تست `VoiceEventsTest` هم‌خوانی را قفل می‌کند).

**نتیجهٔ ممیزی ساختار:** هیچ پیاده‌سازی تکراری/ناسازگار STT/TTS باقی نمانده — یافتهٔ F7 (رانر TTS موزی مرده) در F7 بسته شد؛ در V1 دوباره بررسی شد و تأیید شد `chat-view` فقط یک رانر با failsafe دارد و `speech.ts` همان قرارداد را ارائه می‌کند.

## ۱. جدول وضعیت هر قابلیت (شش وضعیت مجاز)

| # | قابلیت | وضعیت | مدرک (فایل:خط / آزمون) |
|---|---|---|---|
| ۱ | دکمهٔ میکروفون + شروع شنود با لمس | VERIFIED (کد + JVM قرارداد) | `chat-view.tsx:926-941`، `app.js:329-423`؛ `VoiceEventsTest` |
| ۲ | نمایش وضعیت شنیدن/پردازش/پاسخ (اورب + متن زنده) | VERIFIED (کد) / **دستگاه BLOCKED** | `chat-view.tsx:211-223` → AmbientEngine `AiOrb state`؛ `app.js setPanel`؛ شواهد وب: `artifacts/logs/f8/shots/02..04` |
| ۳ | مجوز میکروفون زمان‌اجرا + رد مجوز + retry | VERIFIED (کد + قرارداد رویداد) | `VoiceHelper.java:97-113` (granted/denied/need_request)، `HomeActivity.onRequestPermissionsResult:229-233`، `MainActivity:197-200`، retry در `speech.ts:115-130` |
| ۴ | لغو مجوز از Settings و توقف کامل | VERIFIED (کد) / **دستگاه BLOCKED** | هر startListening مجوز را دوباره چک می‌کند (`VoiceHelper.startListening`) → denied → خطای صادقانه، شنود شروع نمی‌شود |
| ۵ | STT فارسی (fa-IR) | VERIFIED (کد) / **صوت روی دستگاه BLOCKED** | `VoiceHelper.java:137-201` (EXTRA_LANGUAGE fa-IR + partial)؛ JVM: پارسر/رویداد؛ وب: Web Speech |
| ۶ | STT انگلیسی (en-US) | VERIFIED (کد) / **صوت روی دستگاه BLOCKED** | همان مسیر با en-US؛ انتخاب دستی زبان جدید در V1 |
| ۷ | انتخاب دستی زبان + حفظ زبان مکالمه | VERIFIED (کد، جدید V1) | وب: `voice_lang` سرور + `chat-view startVoiceListening`؛ محلی: `profile.voiceLang` → `V.bcp()` |
| ۸ | تغییر زبان در میانهٔ مکالمه (سرویس‌سازگار) | IMPLEMENTED_NOT_TESTED | `VoiceHelper` ENABLE_LANGUAGE_SWITCH (API 33+) — رفتار واقعی به موتور دستگاه وابسته است؛ روی دستگاه BLOCKED |
| ۹ | متن + زمینهٔ مکالمه → Agent (ارسال خودکار) | **VERIFIED — فیکس V1 + اثبات زنده** | قبلاً متن فقط در input می‌رفت؛ V1: `onFinal → send()` خودکار (`chat-view.tsx:603-608`)؛ زنده: `voice-agent-scenarios.log` S1-S7 |
| ۱۰ | اجرای ابزار واقعی + نتیجهٔ DB | VERIFIED (زندهٔ امروز) | S1 یادآور ۹ صبح فردا → `2026-11-09T05:30Z` واقعی؛ S3 هزینه ۱۵۰٬۰۰۰ → مانده −۱۵۰٬۰۰۰ دقیق |
| ۱۱ | تأیید عملیات حساس (مالی/حذف) | VERIFIED (زندهٔ امروز) | S2 پیشنهاد بدون نوشتن → S3 «بله، بانک ملت» → نوشتن؛ S4 انصراف → صفر نوشتن؛ محلی: `app.js askConfirm` |
| ۱۲ | TTS فارسی/انگلیسی + پخش | VERIFIED (کد) / **صوت روی دستگاه BLOCKED** | `VoiceHelper.speak` (QUEUE_FLUSH، utt listener)؛ `chat-view speak` با failsafe 25s/20s |
| ۱۳ | قطع فوری خواندن (بَرج-این لمسی) | **VERIFIED — فیکس V1** | `startVoiceListening` → `stopSpeaking()` پیش از شنود (`chat-view.tsx:590-592`)؛ دکمهٔ پیام و `autoSpeak` toggle موجود |
| ۱۴ | جلوگیری از پخش هم‌زمان چند پاسخ | VERIFIED (کد) | `QUEUE_FLUSH` + `synth.cancel()` پیش از هر speak |
| ۱۵ | سرعت خواندن (۰٫۵–۲٫۵) | **VERIFIED — جدید V1** | وب: slider تنظیمات → `voice_rate` سرور (اعتبارسنجی 400 روی نامعتبر؛ S7 لاگ)؛ بومی: `RahyarNativeBridge.setTtsRate` + `VoiceHelper.setSpeechRate` (JVM ۶ تست)؛ محلی: `profile.voiceRate` |
| ۱۶ | مکالمهٔ پیوسته (multi-turn با زمینه) | **VERIFIED (وب) — فیکس V1 / دستگاه BLOCKED** | auto-relisten بعد از `rahyar-tts-done` وقتی `voiceConvoRef` فعال (`chat-view.tsx:252-266`)؛ زمینهٔ چندمرحله‌ای سمت سرور (همان حافظهٔ چت) — S3 (پیشنهاد→تأیید با زمینه) اثبات زنده |
| ۱۷ | توقف/ادامهٔ مکالمه | VERIFIED | تاپ مجدد میکروفون = خروج از حالت پیوسته؛ حذف تاریخچه چت موجود |
| ۱۸ | مدیریت خطای شبکه/Provider/سرویس غایب | VERIFIED (کد + لاگ زندهٔ F7/F8) | نگاشت کامل خطاها به پیام محلی fa/en (`voiceErrorText`)؛ خطای صوتی = خروج از حالت پیوسته (بدون حلقهٔ بی‌پایان) |
| ۱۹ | Wake Word «سلام رهیار» (اختیاری) | VERIFIED (کد+JVM) / **دستگاه BLOCKED** | `VoiceWakeService` (backoff قطعی، اعلان ماندگار، بدون ذخیرهٔ صدا)؛ **جدید V1:** تشخیص عبارت → intent extra `rahyar_wake` → `HomeActivity` → رویداد `rahyar-wake` → شروع شنود با رضایت موجود (`app.js:566-573`) |
| ۲۰ | خاموش/روشن Wake Word + بازیابی پس از بوت | VERIFIED (کد+JVM) | toggle تنظیمات محلی → `setWakeService`؛ `BootReceiver.wakeEnabledFromProfileJson` (fail-closed، JVM)؛ `HomeActivity.onCreate:69-75` |
| ۲۱ | عدم شنود پنهان / بدون بافر صدا | VERIFIED (کد+JVM) | `onBufferReceived` no-op؛ شنود فقط با لمس؛ Wake فقط با رضایت صریح + اعلان شفاف؛ پروفایل خراب = خاموش |
| ۲۲ | مبلغ و واحد پول صوتی (هزار/میلیون) | **VERIFIED — فیکس V1** | `VoiceCommandParser.firstAmount` ضریب هزار/میلیون fa/en؛ ۴ تست JVM جدید؛ مورد «۱۵۰ هزار تومان» = ۱۵۰٬۰۰۰ |
| ۲۳ | «منصرف شدم/ثبت نکن» → هیچ نوشتنی | **VERIFIED — فیکس V1 + زنده** | پارسر: cancel با منصرف/ثبت نکن/نریز؛ زندهٔ S4: صفر تراکنش ۹۹۹ |
| ۲۴ | UI صوتی: متن قابل ویرایش پیش از ارسال | VERIFIED (کد) | composer textarea قابل ویرایش؛ محلی: جعبهٔ تایپ همان مسیر پارسر |
| ۲۵ | Reduced Motion / RTL / Ambient | VERIFIED (کد + شات) | اورب از AmbientEngine؛ شات fa RTL `02..06`؛ ان `08/09` |

## ۲. آنچه در V1 تغییر کرد (فقط اصلاحات ضروری صوت)

۱) **ارسال خودکار نتیجهٔ STT به Agent** — چرخهٔ میک→STT→Agent→TTS اکنون بدون لمس دوم کامل می‌شود (بند ۲ گام ۶).
۲) **بَرج-این** — شروع شنود، خواندن جاری را قطع می‌کند (بند ۲ گام ۱۳، بند ۵).
۳) **مکالمهٔ پیوسته** — بعد از پایان پاسخ صوتی، شنود خودکار ادامه می‌یابد؛ توقف: تاپ کاربر، خطا، لغو (بند ۶).
۴) **زبان صوتی دستی + سرعت خواندن** — ذخیره سرور (`voice_lang`, `voice_rate`) با اعتبارسنجی؛ معادل محلی در پروفایل + پل `setTtsRate` (بند ۳/۵).
۵) **Wake Word → شروع شنود** — عبارت بیدارباش اپ را با flag باز می‌کند و UI محلی شنود را با رضایت موجود آغاز می‌کند (بند ۷).
۶) **صحت مبالغ صوتی محلی** — هزار/میلیون؛ **لغو صوتی کامل‌تر** — «منصرف شدم»، «ثبت نکن» (بند ۳/۴).

## ۳. آزمون‌های بازاجرا‌شدهٔ امروز (2026-11-08)

- **JVM:** 194/194 هر دو فلیور (شامل +۹ تست صوتی جدید V1) — `artifacts/logs/f8/jvm-tests-v1b.log`
- **Unit وب:** 289/289 — `artifacts/logs/f8/unit-tests-v1.log`
- **typecheck/lint:** سبز — `artifacts/logs/f8/lint.log`
- **سناریوهای زندهٔ Agent (بعد از متن):** S1–S7 + تأیید نام‌دار → نوشتن دقیق −۱۵۰٬۰۰۰ — `artifacts/logs/f8/voice-agent-scenarios.log`
- **APK v2.4.0:** ۴ APK ساخته/امضا/بازتولید بایت‌به‌بیت — `artifacts/logs/f8/apk/apk-inspection.txt`، `reproducibility.txt`

## ۴. مانع اصلی — دستگاه واقعی

`adb` نصب نیست، `/dev/kvm` غایب است (بازبینی 2026-11-08) و هیچ دستگاه فیزیکی به سندباکس متصل نیست. طبق بند ۱۰ مأموریت: مانع دقیق مستند شد، به‌جای تکرار بی‌پایان AVD؛ آزمون‌های مستقل دیگر ادامه یافت؛ **هیچ وضعیت VERIFIED صوتیِ «روی دستگاه» ثبت نشد.** همهٔ موارد «صوت روی دستگاه» در ستون‌های بالا صریحاً BLOCKED هستند و در `VOICE_TEST_REPORT_FA_EN.md` ماتریس دستگاه برای مالک آماده است.
