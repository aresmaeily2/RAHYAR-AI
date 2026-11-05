# ممیزی جامع قابلیت‌های رهیار — ۲۰۲۶-۱۱-۰۴

**بازهٔ کد:** commit `58b430d` (سرور) + APK v2.1.0-voice vc22 (SHA-256: debug `2651d208…`, release `00d9748a…`)
**روش:** هر قابلیت فقط در صورت وجود شواهد اجرای واقعی «تأییدشده» ثبت می‌شود؛ ادعای بدون شواهد = «پیاده‌شده-ولی-اثبات‌نشده» یا «پیاده‌نشده».

## مقایسهٔ وضعیت‌ها
| برچسب | معنا |
|---|---|
| VERIFIED | پیاده‌سازی + آزمون واقعی موفق با شواهد |
| UNVERIFIED | کد موجود؛ عملکرد واقعی اثبات نشده |
| PARTIAL | بخشی کار می‌کند |
| NOT_IMPL | پیاده‌سازی نشده |
| BLOCKED | وابسته به سرویس/مجوز/زیرساخت بیرونی (با ذکر دقیق وابستگی) |

## ۱) نسخهٔ وب (Next.js روی سرور)
| قابلیت | وضعیت | شواهد |
|---|---|---|
| احراز هویت/نشست (OWNER/USER) | VERIFIED | ورود واقعی admin/admin و user/admin در همین ممیزی (ماتریس ۴۰۱/۴۰۳/۲۰۰) |
| وظایف (CRUD+اولویت) | VERIFIED | unit 254/254؛ E2E گزارش‌شده در docs/final-delivery/05 |
| یادآورها + اعلان | PARTIAL | یادآور و ناوبری VERIFIED؛ اعلان سیستمی وب=UNVERIFIED (وابسته به مرورگر/سرویس) |
| امور مالی + گزارش | VERIFIED | unit (finance summary) + سناریو agentic finance_summary با DB-اثبات |
| تقویم شمسی/میلادی | VERIFIED | Intl fa-IR-u-ca-persian + آزمون‌ها؛ نمایش دو‌تقویمی |
| گفتگوی هوش مصنوعی (پروایدرها) | PARTIAL | z-ai sdk VERIFIED (chat/stream)؛ local_rules VERIFIED؛ openai-compatible=UNVERIFIED (نیازمند endpoint بیرونی) |
| Agentic (ابزار/کنش) | VERIFIED | ۵ سناریوی زندهٔ قبلی با اثبات DB؛ Mission Guard |
| جست‌وجوی وب | PARTIAL | کد+z-ai sdk؛ اجرای زنده وابسته به دسترس‌پذیری سرویس میزبان |
| پیامک بانکی | PARTIAL | تحلیلگر متن VERIFIED (unit)؛ دریافت خودکار SMS وب=NA (محدودیت پلتفرم وب) |
| Voice وب (STT/TTS) | PARTIAL | حلقهٔ صوتی واقعی en=PASS، fa=محدودیت موتور (گزارش ۱۰:۰۰ قبلی)؛ روی شبیه‌ساز بدون میکروفون میزبان آزمون‌ناپذیر |
| Ambient Experience | VERIFIED | لایهٔ محیطی + قبل/بعد + perf json (rahyar-ambient artifacts) |
| امنیت (CSP/nonce/Proxy/CSRF/نرخ) | VERIFIED | ماتریس همین ممیزی + p04/p06r scans |
| دسترسی‌پذیری/i18n | VERIFIED | docs/final-delivery/04 |

## ۲) APK اندروید v2.1.0-voice (مستقل-محلی)
| قابلیت | وضعیت | شواهد |
|---|---|---|
| بوت محلی (HomeActivity/WebViewAssetLoader) | VERIFIED | نصب+اجرا روی شبیه‌ساز (پایین) + logcat |
| وظایف محلی (CRUD+اولویت) | VERIFIED | JVM tests + اجرای واقعی روی شبیه‌ساز |
| یادآور درون‌برنامه‌ای | VERIFIED | ReminderAlarmsTest + UI |
| اعلان یادآور سیستمی | PARTIAL | POST_NOTIFICATIONS+زنگ دقیق پیاده؛ رضایت درون‌اپ؛ VERIFIED روی شبیه‌ساز برای رضایت/اعلان |
| تنظیمات (نام/زبان fa-en/پوسته) | VERIFIED | UI + runtime |
| پشتیبان‌گیری/بازگردانی JSON | VERIFIED | LocalStoreTest + Share Sheet |
| **دستیار صوتی — مجوز میکروفون** | VERIFIED | دیالوگ سیستمی + `pm grant` واقعی + رویداد perm |
| **دستیار صوتی — تشخیص fa/en** | BLOCKED | روی تصویر AOSP API 30 هیچ سرویس Recognition نصب نیست (`isRecognitionAvailable=false` ثبت در logcat) و شبیه‌ساز headless میکروفون میزبان ندارد؛ کد کامل (`VoiceHelper` fa-IR/en-US) و مسیر روی دستگاه واقعی/تصویر گوگل باز است |
| **دستیار صوتی — نمایش متن/پاسخ** | VERIFIED | پنل گفت‌وگو + رویدادهای partial/final/error (برای مسیر بدون سرویس: پیام صادقانه) |
| **دستیار صوتی — TTS پخش پاسخ** | BLOCKED | تصویر AOSP فاقد موتور TTS؛ کد کامل (TextToSpeech fa/en) |
| **دستیار صوتی — فرمان→عملیات واقعی** | VERIFIED | VoiceCommandParser ۲۲ تست JVM (fa/en: وظیفه/حذف+confirm/یادآور/درآمد/هزینه/گزارش مالی/برنامه/تاریخ/لغو/راهنما) + مسیر اجرا روی UI؛ عملیات‌ها واقعاً در LocalStore نوشته می‌شوند |
| **مکالمه چندمرحله‌ای** | PARTIAL | محلی: شنود→اجرا→پاسخ→شنود مجدد دستی؛ حالت متصل: چت کامل وب |
| **قطع/لغو شنود و پاسخ** | VERIFIED | دکمهٔ قطع + voiceStop/ttsStop + رویداد end |
| **مدیریت خطا/قطعی** | VERIFIED | نگاشت خطاها به پیام فارسی/انگلیسی + وضعیت no_service صادقانه |
| **انتخاب زبان صوت** | VERIFIED | تنظیمات → fa/en |
| **حریم خصوصی صدا** | VERIFIED | شنود فقط با لمس؛ صدا فقط به سرویس OS؛ هیچ ذخیره/ارسال؛ متن کد+UI+تست OfflineContract (بدون network) |
| **Wake Word «سلام رهیار»** | PARTIAL | پیاده شد: سرویس foreground+اعلان ماندگار+opt-in+`FOREGROUND_SERVICE_MICROPHONE`؛ عملکرد واقعی وابسته به سرویس تشخیص گفتار → روی این تصویر BLOCKED (صادقانه در UI هم نمایش داده می‌شود) |
| اتصال اختیاری به سرور | PARTIAL | LoginActivity/SecureStore کد+تست؛ آزمون زندهٔ سرور در حالت متصل = UNVERIFIED در این اجرا |
| AI ابری داخل APK | BLOCKED | فقط در حالت متصل به سرور (وابستگی شبکه/حساب) |

## ۳) شبیه‌ساز و پنل مالک
| قابلیت | وضعیت | شواهد |
|---|---|---|
| بوت Android در TCG (بدون KVM) | VERIFIED | API 30 / Android 11 / x86_64 — جزئیات پایین |
| نصب APK (debug/release) روی شبیه‌ساز | VERIFIED | adb install + لاگ |
| پنل زندهٔ /emulator (تصویر~۱هرثانیه) | VERIFIED | تصویر زنده + لمس واقعی (tap/swipe/back/home/rotate) |
| امنیت مسیرهای شبیه‌ساز | VERIFIED | ماتریس ۹تایی: 307/401/403/429/503 (artifacts/reports/emu-security-tests.txt) |

## مشخصات دستگاه مجازی (ثبت‌شده پس از بوت)
- در گزارش پایین پس از تکمیل بوت پر می‌شود.

## محدودیت‌های فنی باقی‌مانده (شفاف)
1. **KVM ندارد** → بوت TCG کند (هر بوت ۱۰-۲۵ دقیقه) و RSS محدود (OOM کِیل در 2.5GB ثبت شد؛ پایدار شد با ۱۰۲۴MB مهمان).
2. **تصویر AOSP API 30 بدون سرویس گفتار/TTS گوگل** → STT/TTS روی این شبیه‌ساز BLOCKED؛ راه: دستگاه واقعی یا تصویر با GApps.
3. **شبیه‌ساز headless بدون میکروفون میزبان** → ورودی صدا برای آزمون STT حتی با سرویس هم ممکن نیست (محدودیت زیرساخت).
4. TMPFILES حداکثر 100MB و لینک‌ها موقت؛ گوفایل از این شبکه فقط با endpoint مستقیم store3 کار می‌کند.
5. Keystore release قبلی (CN=Rahyar Release) در ریست محیط از دست رفته؛ کلید جدید (CN=RahyAr، `90f16a6b…`) جایگزین شد و رمز فقط روی سرور در backups/ است.

---

# پیوست روزِ مأموریت نهایی — ۲۰۲۶-۱۱-۰۵ (commit ee64717)

## تغییرات وضعیت نسبت به ممیزی ۱۱-۰۴

| قابلیت | وضعیت پیشین | وضعیت امروز | مدرک |
|---|---|---|---|
| کرش اولین اجرای APK روی Android 7 | باز (مظنون: WebView قدیمی) | **FIXED — ریشهٔ واقعی** | logcat واقعی: `InflateException ← SplashView ← NoSuchMethodException init[Context, AttributeSet]` — سازندهٔ استاندارد LayoutInflater اضافه شد؛ رگرسیون ساخت (per-source class check) پاس |
| دستیار صوتی — عدم دسترسی میکروفون/سرویس گفتار | پیام خطا فقط | **مسیر متنی واقعی** | ورودی فرمان متنی در پنل صوتی — همان `parseVoiceCommand` + همان موتور اجرا (هیچ مسیر نمایشی)؛ hint صادقانه fa/en |
| فرمان‌های عملیاتی روی شبیه‌ساز | مسیر صوتی فقط | **هوک آزمون فقط-دیباگ** | `--es rahyar_command` → رویداد voice-final واقعی؛ Release بدون هوک (FLAG_DEBUGGABLE) |
| چند ارائه‌دهنده AI (۹ سرویس نام‌برده) | معماری قابل توسعه | **پریست‌های عملیاتی** | OpenAI/DeepSeek/OpenRouter/Ollama/LM Studio/Claude/Gemini در تنظیمات — همه از endpoint سازگار با OpenAI؛ کلید فقط سرور |
| فرمان قطعی «وظیفه بساز» (وب) | توهم مدل: reply ادعای ثبت، DB خالی | **FIXED + گارد ضدتوهم** | lane قطعی: `بساز/کار جدید/task:` → اجرای واقعی (تست زنده: row در DB)؛ اگر ادعای مدل بدون اثر اجراشده باشد، یادداشت راستی‌آزمایی صادقانه به پاسخ اضافه می‌شود (chat + stream) |
| پایداری نشست تعاملی شبیه‌ساز | محدود | **محدودیت محیطی ثبت‌شده** | ۱۳+ بوت این نشست همگی در فاز پایانی بوت با OOM سراسری کشته شدند (qemu RSS→۳.۴GB در ظرف ۴GB با ~۰.۹GB فرایند پلتفرم)؛ oom_score_adj برای کاربر غیرمجاز (EACCES ثبت شد)؛ keepalive + حلقهٔ خودکار شواهد فعال است |

## شواهد آزمون امروز (تازه)

- JVM اندروید: **72/72 PASS** (parser صوت fa/en + LocalStore + ReminderAlarms) — `ANDROID_JVM_TESTS.txt`
- وب unit+type+lint: **261/261 PASS** (`bun run verify`)
- E2E وب (نشست مالک): **10/10** — ورود/CRUD کار/حساب+تراکنش مالی/پارس پیامک بانک ملت (۳۵۰۰۰۰ ریال خرج، کارت ۶۷۸۹)/چت عامل/health/خروج — `web-e2e.txt`
- ماتریس امنیتی شبیه‌ساز: **11/11** — ۴۰۱/۳۰۷/۴۰۳/۴۰۳-CSRF/۴۲۹/۲۰۰ — `emu-security-tests.txt`
- بازرسی APK: امضا CN=RahyAr (RSA-4096 PKCS12) + badging vc22 v2.1.0 minSdk24 targetSdk34 + ۸ مجوز — `apk-inspection.txt`
- ویدیوها: وب دوزبانه با ۵+ فرمان واقعی (۶۲s) + پنل مالک (۹۲s)
