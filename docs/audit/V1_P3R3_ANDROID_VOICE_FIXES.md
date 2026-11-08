# V1-P3-R3 — اصلاحات اندروید صوتی (P0/P1) — بند ۲/۳/۴/۵/۶/۷ مأموریت

شاخه: `v1/voice-acceptance-r3` (والد: `v1/voice-acceptance-clean` @ 7d346f4) — main دست‌نخورده.
هر مورد: یافته → اصلاح → اثبات آزمون (نوع آزمون با برچسب صادقانه: JVM / HTTP / مرورگر / دستگاه).

## ۱. Foreground Microphone Service (P0 — §2)

| یافتهٔ ممیزی | اصلاح | اثبات |
|---|---|---|
| BootReceiver با `startForegroundService` سرویس microphone را از BOOT_COMPLETED/MY_PACKAGE_REPLACED راه می‌انداخت (Android 14+: SecurityException/ForegroundServiceStartNotAllowed) | از BOOT هرگز سرویس شروع نمی‌شود؛ فقط سیاست خالص `bootWakePolicy` → فلگ `wake_restore_pending` → پیام صادقانه در اپ بعدی؛ شروع فقط از Activity قابل مشاهده | JVM: `VoiceWakeGateTest` (سیاست بوت + خروجی‌ها) |
| `onStartCommand` بدون بررسی مجوز/رضایت مستقیم `startForeground` می‌زد | گیت واحد `startGate` (قابلیت فعال → رضایت → Activity → مجوز → موتور)؛ `startForeground` در try/catch (SecurityException/IllegalState → stopSelf، بدون اعلان گمراه‌کنندهٔ «در حال شنود»، Log امن) | JVM: ماتریس کامل گیت (۱۲ تست) |
| لغو مجوز در حین اجرا باعث حلقهٔ بی‌فایده/وضعیت کاذب می‌شد | `startListeningSafe` پیش از هر چرخه مجوز را کنترل می‌کند → توقف فوری سرویس | JVM: `nextRestartDelayMs(-1)` برای insufficient permissions (موجود) + گیت |
| مسیرهای پراکندهٔ startService | همهٔ مسیرها به یک گیت ختم‌اند؛ extra اجباری `rahyar_start_from=activity` | JVM + بازبینی کد |
| پس از بوت هیچ بازخوردی به کاربر نمی‌رسید | رویداد `rahyar-wake-restore` → پیام «شنود خاموش است؛ از تنظیمات روشنش کنید» | کد + i18n fa/en |

معیار قبولی §2 (تست Android 14/لغو مجوز/بوت/شروع دستی/صفر crash و صفر وضعیت کاذب): **قسمت منطق با JVM پوشش داده شد؛ قسمت اجرای روی دستگاه واقعی = BLOCKED (سند پذیرش دستگاه).**

## ۲. TTS و چرخهٔ عمر (P0 — §3)

| یافتهٔ ممیزی | اصلاح | اثبات |
|---|---|---|
| وقتی TTS آماده نبود، `speak` فوراً `tts-done` می‌فرستاد و متن گم می‌شد | صف امن `TtsBuffer` (ظرفیت ۸، FIFO، سرریز شمارش‌شده) + `initTts` در سازنده + تخلیهٔ صف در onInit(SUCCESS) | JVM: `VoiceTtsPolicyTest` (صف/FIFO/سرریز/تهی) |
| پاسخ‌های متوالی ممکن بود با QUEUE_FLUSH تداخل کنند | `QUEUE_ADD` + شنوندهٔ progress یک‌بار در init + `pendingUtterance` برای نادیده‌گرفتن callbackهای قدیمی | JVM + کد |
| `stopSpeaking` صف را پاک نمی‌کرد | clear صف + stop + done | JVM: `clearEmptiesEverything_stopSpeakingSemantics` |
| `destroy` ایمن نبود | پاک‌سازی صف + `setOnUtteranceProgressListener(null)` + stop/shutdown | کد |
| نتیجهٔ `setLanguage` بررسی نمی‌شد؛ نبود صدای فارسی = سکوت/موفقیت قلابی | حکم صادقانه `languageVerdict` → رویداد جدید `rahyar-tts-error` (missing_data/not_supported/init_failed/error) + پیام صادقانه در وب؛ `tts-done` فقط در پایان واقعی یا خطای نهایی | JVM: `languageVerdictIsHonest` + قرارداد `VoiceEventsTest` |
| رویدادهای وب از رشتهٔ binder به WebView ارسال می‌شد (نقص رشته‌نویسی — یافتهٔ جدید R3) | همهٔ emitها از `Handler(Looper.getMainLooper())` | کد + JVM (رشتهٔ JS) |

معیار قبولی §3: منطق کامل JVM-آزمون‌شده؛ رفتار صوتی واقعی روی دستگاه = BLOCKED.

## ۳. STT و حریم خصوصی (P0 — §4) — خلاصه؛ شرح کامل در V1_P3R3_PRIVACY_REVIEW.md

| یافتهٔ ممیزی | اصلاح | اثبات |
|---|---|---|
| ادعای «صدا هرگز به سرور ارسال نمی‌شود» نادرست بود (سرویس سیستم می‌تواند آنلاین پردازش کند) | تفکیک مسیر: `sttEngineMode` (on_device / system_service / unavailable) — API 31+ با `createOnDeviceSpeechRecognizer`/`isOnDeviceRecognitionAvailable`؛ همهٔ ادعاها در کد/مستندات/UI صادقانه بازنویسی شد | JVM: `VoiceSttPrivacyTest` |
| شنود از مسیر آنلاین‌پذیر بدون رضایت | دیالوگ رضایت بومی؛ رد/لغو = هیچ شنودی؛ رضایت قابل لغو از تنظیمات (`stt_online_consent`) | JVM: ماتریس تصمیم + کد |
| وضعیت موتور در UI نامرئی | `sttState()` از دو پل + نمایش در تنظیمات صوت + دکمهٔ اجازه/لغو | کد + app.js |
| ذخیرهٔ صدا | هیچ تغییری لازم نشد — `onBufferReceived` از قبل unused؛ مستند شد | کد |

معیار قبولی §4: تست on-device/بدون on-device/رد رضایت/قطع شبکه روی دستگاه = BLOCKED؛ منطق JVM سبز؛ ثبت مسیر انتخابی هر درخواست در `sttState()`.

## ۴. Wake Word (P1 — §5)

تصمیم مستند در `V1_P3R3_WAKE_WORD_DECISION.md`: **غیرفعال موقت** (`WAKE_FEATURE_ENABLED=false`)؛ ارزیابی ۷ گزینه؛ Push-to-talk مستقل؛ تا آزمون باتری واقعی + FAR/FRR هیچ ادعای COMPLETE. Toggle در UI صادقانه غیرفعال.

## ۵. تفکیک دو حالت محصول (P1 — §6)

| مسیر | آزمون | نتیجه |
|---|---|---|
| A. Local-first (HomeActivity → RahyarBridge → VoiceHelper → VoiceCommandParser → local actions) | JVM واقعی (پارسر + رویدادها + گیت‌ها) + منطق app.js در مرورگر آزمون‌های unit وب | سبز (124 JVM / 354 unit) |
| B. Connected (MainActivity → RahyarNativeBridge → وب → Agent سرور → action/DB → TTS) | HTTP واقعی روی build production با DB تازه + مرورگر واقعی (Playwright) | PASS=10 FAIL=0 WARN=2 (الگوی مستند یادآور متصل) + E2E 11/11 صفر خطای کنسول |

هیچ نتیجهٔ سرور به‌عنوان اثبات مسیر محلی ثبت نشده و برعکس. ورودی‌های باتری HTTP متن تایپ‌شده‌اند (نه mock STT)؛ تزریق `debugFinalEvent` فقط در بیلد Debug وجود دارد و استفاده نشده.

## ۶. Release Key و APK (P1 — §7)

`V1_P3R3_RELEASE_IDENTITY.md`: کلید مرجع در محیط موجود نیست → **RELEASE UPGRADE = BLOCKED**؛ هیچ کلید جدیدی ساخته نشد (probe exit 42 ثبت شد)؛ خط لولهٔ v14 با سیاست fail-closed + مقایسهٔ مجوزهای manifest داخل APK؛ مسئلهٔ دو مانیفست مستند/بازنشسته شد.

## ۷. رگرسیون (P2 — §9)

| باتری | نتیجه |
|---|---|
| Android JVM (شامل ۲۷ تست جدید R3) | OK (124 tests) — `evidence/r3_jvm_tests.txt` |
| وب typecheck / unit / lint | exit 0 / 354 pass 0 fail / 0 errors + 1 warning موجود (D-3) — `evidence/r3_web_regression.txt` |
| Web E2E (Playwright + axe، build production) | 11/11، صفر خطای کنسول — `evidence/r3_grand_e2e.txt` |
| HTTP battery (P6/P8) | PASS=10 FAIL=0 WARN=2 — `evidence/r3_fix_verify_verdicts.txt` |
| Secret tests (P0-6R) | ALL-PASS — `evidence/r3_secrets.txt` |
| Failure injection / منفی | JVM: پروفایل خراب، سرریز صف، موتور ناموجود، رد رضایت، حکم زبان؛ HTTP: لغو تکراری، لغو مبهم، حذف رکورد کاربر دیگر — همه در باتری‌های بالا |
| Mock vs Real برچسب‌گذاری | این سند + سند پذیرش دستگاه (جدول لایه‌ها) |

## ۸. یادداشت صداقت — false positive ابزار نمایش

در جریان کار، یک «خرابی کد» در chat-view.tsx گزارش شد (`[messages` → `essages`). بازبینی بایت‌به‌بایت blobهای commit نشان داد کد کاملاً سالم است؛ الگوی `[m` در خروجی ترمینال توسط فیلتر خروجی محیط بلعیده می‌شد. هیچ تغییری لازم نشد و هیچ ادعای رفع نقصی ثبت نشد. (سازوکار: دنبالهٔ `[m` مثل reset کد ANSI ESC[m است.)
