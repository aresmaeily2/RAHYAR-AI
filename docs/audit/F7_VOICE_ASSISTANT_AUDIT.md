# F7_VOICE_ASSISTANT_AUDIT — ممیزی کامل دستیار صوتی (Agent 2، مرحلهٔ A)

- **چرخه:** F7 · **تاریخ:** 2026-11-07 · **HEAD پایهٔ F7:** `5630814`
- **قانون صفر:** ابتدا واقعیت، سپس تغییر، سپس آزمون مجدد — همهٔ موارد با لاگ/اسکریپت بازتولیدپذیر.


## ۰. خلاصهٔ اجرایی

دو پشتهٔ صوتی موازی در محصول وجود دارد که ممیزی F7 هر دو را **سطر‌به‌سطر** بررسی کرد:

| پشته | ورودی | STT | موتور نیت | ثبت هزینه |
|---|---|---|---|---|
| وب متصل (مرورگر + WebView سرور مالک) | دکمهٔ میکروفون در chat-view | Web Speech API / پل بومی `RahyarNative` | همان پایپ‌لاین چت (`detectIntent` → مدل) | پیش از F7: **غیرممکن** — F7: مسیر تأییددار مالی اضافه شد |
| اپ محلی آفلاین (`HomeActivity` + assets/www) | FAB تزریقی در app.js | `SpeechRecognizer` بومی با `RahyarBridge` | `VoiceCommandParser.java` (محلی) | صحیح — به finance متصل است |

یافتهٔ F6 (هزینه → Task) **در مسیر محلی درست بود** (`VoiceCommandParser.java:116-119` + آزمون `faAddExpensePersianDigits`) اما در مسیر وب **ساختاری بود**: فعل «ثبت کن» در `ADD_VERBS` و نبود اکشن مالی ⇒ «هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن» به `add_task` می‌رفت. **در F7 با مسیر تأییددار مالی حل و روی سرور واقعی اثبات شد.**

## ۱. جدول موجودی اجزا (ممیزی مرحلهٔ A)

| جزء | فایل:خط | در سورس | در UI | سرویس واقعی | تست واحد | تست یکپارچگی | روی دستگاه |
|---|---|---|---|---|---|---|---|
| STT وب `listen()` | `src/lib/voice/speech.ts:75-177` | ✅ | ✅ chat-view:816-829 | Web Speech / پل بومی | ✅ (degrade) | ✅ F7 live (perm-flow) | ❌ BLOCKED |
| STT بومی اندروید | `VoiceHelper.java:118-189` | ✅ | ✅ هر دو اکتیویتی | `android.speech` | — (JVM ناممکن) | ✅ قرارداد رویداد | ❌ BLOCKED |
| TTS وب (ماژول) | `speech.ts:220-304` | ✅ | ⚠️ پیش‌تر کد مرده؛ F7: از مسیر chat-view با failsafe استفاده می‌شود | SpeechSynthesis/بومی | ✅ `hasVoiceFor` | — | ❌ BLOCKED |
| TTS بومی | `VoiceHelper.java:223-268` | ✅ | ✅ | `TextToSpeech` | — | ✅ رویداد done | ❌ BLOCKED |
| Wake Word | `VoiceWakeService.java` | ✅ (+فیکس F7) | ✅ تنظیمات محلی | سرویس پیش‌زمینه mic | ✅ F7 `VoiceWakeRestartTest` | — | ❌ BLOCKED |
| `VoiceCommandParser` | ۲۳ تست JVM | ✅ | ✅ (app.js) | خالص | ✅ ۲۳ تست | ✅ | ❌ BLOCKED |
| مجوز میکروفون (محلی) | `VoiceHelper.java:89-108` | ✅ | ✅ FAB→4701 | مجوز زمان‌اجرا | — | ✅ | ❌ BLOCKED |
| مجوز میکروفون (متصل) | پیش‌تر **نداشت**؛ F7 اضافه شد | ✅ | ✅ (web perm-flow) | مجوز زمان‌اجرا | — | ✅ قرارداد رویداد | ❌ BLOCKED |
| تأیید عملیات حساس (وب) | `pending-action.ts` | ✅ | ✅ چیپ | DB واقعی | ✅ | ✅ F7 live | ❌ BLOCKED |
| تأیید مالی (محلی) | `app.js:483-498` (F7) | ✅ | ✅ دیالوگ | DB محلی | — | — | ❌ BLOCKED |
| تنظیمات صوتی (زبان/پاسخ گفتاری) | settings-view + app.js | ✅ | ✅ | سرور/پروفایل | — | — | ❌ BLOCKED |
| E2E صوتی | — | — | — | — | — | ⚠️ F7: رگرسیون نیت صوتی + چرخهٔ مالی در سطح API زنده؛ صوت فیزیکی ناممکن | ❌ BLOCKED |

## ۲. حفره‌های یافت‌شده در ممیزی (همه در F7 تعیین تکلیف شدند)

1. **رانر TTS موازی و مرده** — `chat-view` پیاده‌سازی دوم بدون failsafe داشت؛ `speech.ts` نسخهٔ کامل بی‌مصرف بود. (فیکس: failsafe ۲۵s/۲۰s در chat-view + نگه‌داشتن قرارداد رویداد)
2. **باگ چرخهٔ Wake Word** — کامنت‌های «restartLoop» بی‌پیاده‌سازی؛ بعد از اولین نتیجه/خطا شنونده نمی‌مرد. (فیکس: backoff قطعی + آزمون JVM)
3. **بازگشت تنظیم Wake Word پس از بوت/شروع اپ** — نبود. (فیکس: `BootReceiver` + `HomeActivity` با خواندن پروفایل؛ fail-closed — JSON خراب = خاموش)
4. **زبان صوتی محلی فقط ظاهری** — `voiceLang` ذخیره ولی خوانده نمی‌شد. (فیکس: `V.bcp()` از پروفایل)
5. **نبود جریان رضایت میکروفون در حالت متصل** — SpeechRecognizer فقط «خطای عمومی» می‌داد. (فیکس: `VoiceHelper.startListening` → need_request/denied + `MainActivity.onRequestPermissionsResult` 4701 → `rahyar-voice-perm` + retry در `speech.ts`)
6. **کدهای خطای صوتی خام انگلیسی** — `voice: no_match`. (فیکس: نگاشت محلی fa/en در `voiceErrorText`)
7. **بی‌تأییدی مالی صوتی محلی** — add_income/add_expense فوری می‌نوشت. (فیکس: askConfirm مثل delete)
8. **نشت نیت مالی در مسیر وب** (هزینه→Task) — بزرگ‌ترین یافته. (فیکس: مسیر قطعی add_expense + پندینگ + تأیید؛ گزارش جدا: `F7_AGENT_INTENT_AUDIT.md`)
9. **Manifest قدیمی فریب‌دهنده** — `android/src/AndroidManifest.xml` فقط-اینترنت، در حالی که build واقعی `android/app/gradle/AndroidManifest.xml` با RECORD_AUDIO است؛ ممیزی‌های بعدی باید دومینیز.

## ۳. چرخهٔ هدف مکالمه صوتی — وضعیت بند B

| گام | وضعیت | مدرک |
|---|---|---|
| ۱. لمس دکمهٔ شروع | ✅ | chat-view mic button |
| ۲. بررسی مجوز | ✅ | web: Web Speech prompt؛ متصل: need_request → دیالوگ سیستم؛ محلی: requestMic |
| ۳. ضبط با اطلاع کاربر | ✅ | توست «گوش می‌دهم…» + نمایش partial؛ **هیچ شنود پس‌زمینه/پنهان** (Wake فقط opt-in با اعلان ماندگار) |
| ۴. گفتار→متن fa/en | ✅ کد / ⚠️ صوت واقعی | fa-IR/en-US؛ روی دستگاه BLOCKED |
| ۵. متن+Context → Agent | ✅ | همان composer/send → `/api/chat/stream` (بدون منطق موازی) |
| ۶. تشخیص قصد | ✅ | روتر قطعی + مدل — `F7_AGENT_INTENT_AUDIT.md` |
| ۷. تأیید عملیات حساس | ✅ | ماشین پندینگ (حذف/فراموشی/مالی) — آزمون زنده |
| ۸. اجرای مجاز | ✅ | add_task/finance/reminders روی DB واقعی |
| ۹. نمایش نتیجه | ✅ | پیام + اکشن‌ها |
| ۱۰. پاسخ صوتی | ✅ کد / ⚠️ صوت | TTS fa/en + failsafe |
| ۱۱. ادامه/توقف مکالمه | ✅ | stop TTS، لغو شنیدن، chat-history delete |

## ۴. بند C (قابلیت‌های الزامی) — جمع‌بندی

- تشخیص/پاسخ fa و en: پیاده + قرارداد آزمون؛ **روی دستگاه صوتی BLOCKED** (بند F)
- مکالمه چندمرحله‌ای و Context: وب ✅ (همان حافظهٔ چت)؛ محلی: پارسر stateless (محدودیت مستند)
- قطع پاسخ صوتی / لغو شنیدن / نمایش متن / اصلاح متن: ✅ وب (composer قابل ویرایش پیش از ارسال)؛ محلی: جعبهٔ تایپ جایگزین
- مدیریت نویز/خطا: نگاشت محلی پیام‌ها (F7) + no_match/timeout/backoff
- قطع اینترنت: وب → خطای network محلی‌شده + offline-box بومی؛ محلی: پنل صادقانه + تایپ
- نبود سرویس STT/TTS: پیام صادقانه + degrade (VoiceHelper unavailable / wake degraded)
- خاموشی صفحه/پس‌زمینه: Wake-Word foreground service (opt-in)؛ شنود عادی هرگز پس‌زمینه نمی‌ماند
- جلوگیری از ضبط پنهان: ✅ — فقط با لمس؛ بدون بافر صدا (`onBufferReceived` no-op)؛ تست JVM عدم-شروع-خودکار wake از پروفایل خراب
