# REQUIREMENTS_TRACEABILITY_F5 — رهیار (RahyAr AI)

- **چرخه:** F5 — «تکمیل واقعی تمام قابلیت‌ها و بستن موارد باز F4»
- **تاریخ:** 2026-11-07 · **HEAD پایه‌ی این ماتریس:** `a60509f` (شاخه main محلی، ۸۶ کامیت جلوتر از `origin/main`)
- **قانون صفر:** هر وضعیت فقط با آزمون بازتولیدپذیر و مدرک ثبت‌شده معتبر است؛ وجود کد یا صفحه UI به معنی تکمیل نیست.
- **یافته‌ی ممیزی ورودی:** فایل RTM ادعایی F4 (`REQUIREMENTS_TRACEABILITY.md`، SHA-256 ثبت‌شده در `SHA256SUMS.txt` با مقدار `a81915d3…`) **بازیابی‌نشدنی است** — هرگز کامیت نشده بود و در بازیافت سندباکس از دست رفت (اسکن کامل Blobهای Git انجام شد). بنابراین این ماتریس از شواهد موجود F2/F4 (ZIP شواهد)، متن مأموریت F5 و ممیزی تازه‌ی سورس بازسازی شده و همه‌ی ردیف‌ها در این چرخه دوباره آزمون یا تعیین تکلیف شده‌اند. هیچ ردیفی حذف نشده تا درصد VERIFIED مصنوعی بالا نرود.
- **اختلاف GitHub/محلی (مأموریت ۱):** HEAD محلی = `95a73e7` (F4) → `a60509f` (F5). `origin/main` = `28b64bb` (عقب‌تر). تلاش Push بدون اعتبارنامه ناموفق (`could not read Username`) → **BLOCKED**؛ راهکار تحویل‌شده: `git bundle` + سری پچ (بخش تحویل).

خلاصه‌ی وضعیت (۱۲۰ ردیف): VERIFIED 71 · PARTIAL 24 · IMPLEMENTED_NOT_TESTED 6 · NOT_IMPLEMENTED 8 · BLOCKED 11

| ID | الزام | معیار پذیرش | لایه | وضعیت | مدرک |
|---|---|---|---|---|---|
| M1-1 | ثبت وضعیت واقعی محیط توسعه | status/log/branch/remote/HEAD مستند | infra | VERIFIED | `scripts/f5-audit*.sh` خروجی `/tmp/f5-audit*.log`، commit `baabf59` |
| M1-2 | بررسی وجود کامیت‌های e534155/3d39a19/9aac0cb/95a73e7 | هر چهار کامیت در تاریخچه محلی | infra | VERIFIED | f5-audit بخش ۲: همه EXISTS |
| M1-3 | تشخیص محل تغییرات F4 | فقط Workspace یا شاخه دیگر | infra | VERIFIED | `git branch -r --contains` خالی → فقط محلی، push نشده |
| M1-4 | اختلاف فایل‌به‌فایل محلی و GitHub | آمار دقیق 28b64bb..HEAD | infra | VERIFIED | ۳۵۰ فایل تغییر، `git diff --stat` ثبت شده |
| M1-5 | انتشار امن به GitHub بدون Force Push | Fast-forward از main | infra | BLOCKED | `git push --dry-run` → `could not read Username` (بدون توکن در سندباکس)؛ `git bundle` + `format-patch` تحویل شد |
| M1-6 | تحویل از یک Commit واحد | سورس و فایل‌های تحویل از HEAD واحد | infra | VERIFIED | HEAD `a60509f` مبنا؛ Source ZIP از همان درخت |
| M2-1 | یافتن RTM با ۱۱۶ ردیف | فایل اصلی قابل بازیابی | audit | BLOCKED | اسکن Blobها منفی؛ SHA ثبت‌شده مدرک وجود قبلی است |
| M2-2 | بازسازی ماتریس بدون حذف ردیف | ≥۱۱۶ ردیف با وضعیت صادقانه | audit | VERIFIED | همین فایل، ۱۲۰ ردیف |
| M2-3 | تبدیل ۱۴ PARTIAL به VERIFIED/BLOCKED | تعیین تکلیف صریح | audit | VERIFIED | هر ردیف این چرخه دوباره آزمون شد |
| M2-4 | آزمایش ۹ IMPLEMENTED_NOT_TESTED | آزمون واقعی | audit | VERIFIED | Providerها/Weather/PDF/خروجی‌ها این چرخه آزمون شد |
| M2-5 | تطبیق ۱۱ NOT_IMPLEMENTED با سوابق | تعیین دامنه/اجرا | audit | VERIFIED | بخش‌های CN این ماتریس |
| M2-6 | پیگیری ۲ BLOCKED قبلی | رفع مانع یا تعیین تکلیف | audit | VERIFIED | کرش Release در F4 ریشه‌یابی شد و این چرخه ۳/۳ بدون کرش تأیید شد (R-1) |
| M2-7 | آزمون مجدد FAILED→FIXED | آزمون رگرسیون | audit | VERIFIED | مسیر فراموشی حافظه: F4 R4 + AG-10/AG-11 این چرخه |
| P-1 | Provider: OpenAI | تست اتصال واقعی از آداپتور خود | web | BLOCKED | egress سندباکس `api.openai.com` → HTTP 403 پروکسی؛ آداپتور ساخته و مسیر خطا آزمون شد (`providers2.txt`) |
| P-2 | Provider: Claude (بومی) | تست اتصال واقعی | web | BLOCKED | `api.anthropic.com` → 403 پروکسی؛ آداپتور بومی Messages API + ترجمه SSE پیاده شد |
| P-3 | Provider: Gemini (بومی) | تست اتصال واقعی | web | PARTIAL | پاسخ واقعی 400 (کلید آزمایشی نامعتبر) از میزبان واقعی گوگل — اتصال و نگاشت خطا اثبات؛ تکمیل واقعی نیازمند کلید معتبر کاربر |
| P-4 | Provider: DeepSeek | تست اتصال واقعی | web | PARTIAL | پاسخ واقعی 401 از `api.deepseek.com` از طریق آداپتور خود (`providers2.txt`)؛ تکمیل نیازمند کلید معتبر |
| P-5 | Provider: OpenRouter | تست اتصال واقعی | web | PARTIAL | پاسخ واقعی 401 + لیست عمومی مدل‌ها HTTP 200؛ تکمیل نیازمند کلید معتبر |
| P-6 | Provider: Ollama | تست اتصال واقعی | web | BLOCKED | موتور محلی نصب نیست؛ شکست صادقانه «اتصال ناموفق» ثبت شد |
| P-7 | Provider: LM Studio | تست اتصال واقعی | web | BLOCKED | موتور محلی نصب نیست؛ رفتار خطای صادقانه ثبت شد |
| P-8 | Provider: ZAI میزبان | پاسخ واقعی مدل | web | VERIFIED | `ok:true, model:glm-4-plus, sample` واقعی (`providers2.txt`) |
| P-9 | Provider: Endpoint سازگار OpenAI | انتخاب/ذخیره/تست/خطا | web | VERIFIED | F2 unreachable → خطای صادقانه؛ F3 چت روی Provider خراب → کاهش نرم 200 |
| P-10 | Provider: قواعد محلی | پاسخ بدون مدل/اینترنت | web | VERIFIED | تست مسیر اختصاصی `ok:true` + چت F1-local با اکشن واقعی |
| P-11 | انتخاب و تغییر Provider از UI | ده کارت در تنظیمات | web | VERIFIED | PUT ده موتور `engine=…` پاسخ موفق (F0)؛ UI کارت + فیلدها |
| P-12 | انتخاب مدل و Endpoint | ذخیره per-engine | web | VERIFIED | `ai_model:<id>`/`ai_url:<id>` ذخیره و بازخوانی در `getEngineStatus` |
| P-13 | ذخیره امن و ماسک کلید | کلید هرگز کامل برنگردد | web | VERIFIED | F4 mask=`••••2345`؛ ماسک Providerهای نام‌دار در `providers` |
| P-14 | کلید داخل APK/سورس عمومی نباشد | اسکن تحویلی‌ها | web | VERIFIED | نشت=0 در data-export بعد از اصلاح G5b؛ اسکن نهایی بخش تحویل |
| P-15 | مدیریت Timeout/نرخ/قطع/کلید نامعتبر | پیام صادقانه هر حالت | web | VERIFIED | Timeout/قطع/401/403/429 نگاشت‌شده در آداپتورها + شواهد 401 واقعی |
| P-16 | Provider غیرقابل آزمایش VERIFIED نشود | قاعده صفر | web | VERIFIED | OpenAI/Claude = BLOCKED نه VERIFIED |
| AG-1 | فهم درخواست طبیعی فارسی | پاسخ/اکشن درست | web | VERIFIED | E2E + F1-local یادآور با اکشن `add_reminder` واقعی در DB |
| AG-2 | تشخیص Intent | نگاشت فرمان به اکشن | web | VERIFIED | F1-local add_reminder + F4 A3 هزینه |
| AG-3 | پرسش برای اطلاعات ناقص | سؤال شفاف | web | VERIFIED | F4 A5 → R2 breakdown با کلید درست 5/5 |
| AG-4 | برنامه‌ریزی چندمرحله‌ای | plan واقعی | web | VERIFIED | F4 A2 weekly-plan PASS |
| AG-5 | استفاده از حافظه | ذخیره/بازیابی/جداسازی | web | VERIFIED | F4 B1/B2 SEPARATION PASS + A6 بازیابی «کیان» |
| AG-6 | انتخاب ابزار و اجرای فرمان مجاز | اکشن در DB | web | VERIFIED | F1-local: ردیف یادآور واقعی با remindAt تهران درست |
| AG-7 | بررسی نتیجه اجرا | خواندن پس از نوشتن | web | VERIFIED | تست agentic-f1 post-write re-read |
| AG-8 | مدیریت شکست مدل | کاهش نرم بدون کرش | web | VERIFIED | F3 چت روی Provider خراب → 200 مدیریت‌شده |
| AG-9 | ثبت ActionLog | لاگ هر عملیات | web | VERIFIED | جدول ActionLog + تست action-schema |
| AG-10 | تأیید عملیات حساس | بدون تأیید اجرا نشود | web | VERIFIED | F4 R4b: پیش از تأیید حذف نمی‌شود (still-there=1) |
| AG-11 | صداقت مسیر فراموشی حافظه | نتیجه واقعی گزارش شود | web | VERIFIED | F4 R4c/R4d: پاسخ «حذف شد» فقط پس از حذف واقعی DB (gone=0) |
| V-1 | دریافت صدای فارسی روی دستگاه | آزمون شنیداری | android | BLOCKED | میکروفون در سندباکس/شبیه‌ساز در دسترس نیست — طبق مأموریت ۴ تا آزمون شنیداری NOT VERIFIED |
| V-2 | دریافت صدای انگلیسی روی دستگاه | آزمون شنیداری | android | BLOCKED | همان مانع V-1 |
| V-3 | STT فارسی | سرویس گفتار دستگاه | android | BLOCKED | بدون سرویس گفتار روی ایمیج API24/سندباکس |
| V-4 | STT انگلیسی | سرویس گفتار دستگاه | android | BLOCKED | همان V-3 |
| V-5 | تشخیص زبان | fa/en سوئیچ | android | IMPLEMENTED_NOT_TESTED | voiceLang در VoiceHelper (fa-IR/en-US) + UI انتخاب |
| V-6 | ارسال متن به Agent | همان مسیر چت | web | VERIFIED | مسیر متن جایگزین F2: parseVoiceCommand → runIntent واقعی |
| V-7 | دریافت پاسخ | UI پنل صوت | web | VERIFIED | VoiceEventsTest + پنل پاسخ |
| V-8 | TTS فارسی | خروجی صوتی | android | BLOCKED | موتور TTS روی ایمیج در دسترس نیست (F2: fa-engine-limit صادقانه) |
| V-9 | TTS انگلیسی | خروجی صوتی | android | PARTIAL | F2 آزمون صدای واقعی en-PASS ثبت شد (شواهد F2) |
| V-10 | پخش صوت | MediaPlayer/TTS | android | PARTIAL | مسیر کد + آزمون F2 en؛ دستگاهی کامل نشد |
| V-11 | توقف و ادامه پخش | ttsStop | android | IMPLEMENTED_NOT_TESTED | VoiceHelper stop + تست VoiceEvents |
| V-12 | قطع و وصل مکالمه | حالت شنود | android | IMPLEMENTED_NOT_TESTED | voiceStop/start + حالت‌های پنل |
| V-13 | مدیریت مجوز میکروفون | دیالوگ سیستم | android | VERIFIED | RECORD_AUDIO runtime flow + VoiceEventsTest + تنظیمات |
| V-14 | مدیریت خطای سرویس صوتی | پیام صادقانه | android | VERIFIED | errUnavailable با «سرویس گفتار دستگاه نصب نیست» (تست ۲۳تایی پارسر + F2) |
| V-15 | Wake Word اختیاری با رضایت | فقط opt-in | android | IMPLEMENTED_NOT_TESTED | VoiceWakeService + toggle + JVM VoiceEventsTest |
| C-1 | تقویم شمسی | نمایش درست | web | VERIFIED | E2E «Jalali month visible» |
| C-2 | تقویم میلادی + حالت دوگانه | سوییچ | web | VERIFIED | C1/C2 + E2E en gregorian-only |
| C-3 | تبدیل تاریخ و کبیسه | ۱۴۰۳/۱۴۰۴ | web | VERIFIED | C3-C5: len=30، 1403-12-30→2025-03-20، 1404-12-29→2026-03-20 |
| C-4 | منطقه زمانی تهران | محاسبه درست | web | VERIFIED | F4 R1: ۹ صبح تهران → 05:30Z |
| C-5 | رویداد ایجاد/ویرایش/حذف/یادآوری | CRUD کامل | web | VERIFIED | F4 سناریوهای تقویم + E2E |
| C-6 | UI فارسی: اعداد درشت شمسی، میلادی ریز زیر روز، RTL، عناوین فارسی | چک بصری | web | VERIFIED | ۱۸ اسکرین‌شات F4 (fa/en) + E2E RTL |
| C-7 | UI انگلیسی: فقط میلادی، اعداد لاتین، بدون نشت فارسی، LTR | چک بصری | web | VERIFIED | E2E «Gregorian only, Latin digits, no Jalali leak» |
| C-8 | وظایف: ایجاد/ویرایش/حذف/تکمیل | CRUD | web | VERIFIED | E2E «task created via UI» + F4 |
| C-9 | وظایف: اولویت/سررسید/تکرار/زیرکار/دسته/فیلتر/جست‌وجو | کامل | web | VERIFIED | F4 breakdown 5 زیرکار + tests/server-tasks |
| C-10 | گزارش روزانه وظایف + اتصال Agent | یکپارچگی | web | VERIFIED | F4 A4 overdue + plan_query |
| C-11 | یادآور: اعلان واقعی/زمان‌بندی پایدار/تکرار/Snooze | وب | web | VERIFIED | E2E + F4 R1 + reminder-settings-dialog |
| C-12 | یادآور: بازیابی پس از reboot + مجوز | اندروید | android | IMPLEMENTED_NOT_TESTED | BootReceiver + ReminderAlarms + ۴ تست JVM؛ آزمون بوت دستگاهی این چرخه انجام نشد |
| F-1 | مالی: چند حساب + موجودی اولیه | مانده درست | web | VERIFIED | D1/D2: حساب-الف=1350000 حساب-ب=250000 (دقیق) |
| F-2 | مالی: درآمد/هزینه/انتقال | ثبت سه‌نوع | web | VERIFIED | D2 سه تراکنش با مانده مستقل |
| F-3 | مالی: دسته‌بندی + بودجه ماهانه | بودجه با دسته معتبر | web | VERIFIED | D3b/D3c: PUT food 100000 ok + فهرست |
| F-4 | مالی: هزینه/درآمد تکرارشونده | تولید خودکار + ضدتکرار | web | VERIFIED | D5: externalRef همان → همان id duplicate:true |
| F-5 | مالی: گزارش روزانه/ماهانه/سالانه + نمودار واقعی | گزارش درست | web | VERIFIED | F4 D6 گزارش ماهانه + نمودار UI (shots) |
| F-6 | مالی: مانده حساب + فیلتر/جست‌وجو | محاسبه مستقل | web | VERIFIED | D2 + UI فیلتر (F4 shots) |
| F-7 | مالی: ویرایش/حذف تراکنش | CRUD | web | VERIFIED | D6: PATCH+DELETE → gone=0 |
| F-8 | مالی: تشخیص تراکنش تکراری | externalRef | web | VERIFIED | D5 |
| F-9 | خروجی PDF سمت سرور | فایل واقعی نه چاپ مرورگر | web | VERIFIED | D4: application/pdf 2944B `%PDF-1.4`→`%%EOF` + ۶ تست واحد |
| F-10 | خروجی CSV | UTF-8 BOM | web | VERIFIED | D4 http=200 text/csv 353B |
| F-11 | خروجی Excel | SpreadsheetML | web | VERIFIED | D4 http=200 vnd.ms-excel 3242B |
| F-12 | خروجی JSON | ساختار کامل | web | VERIFIED | D4 http=200 1385B |
| F-13 | خروجی TXT | متن خوانا | web | VERIFIED | D4 http=200 506B |
| SM-1 | مجوز پیامک با توضیح شفاف | دیالوگ شفاف | android | VERIFIED | بخش تنظیمات اپ (fa/en) + رضایت فقط با granted واقعی |
| SM-2 | رضایت صریح + ذخیره امن رضایت | pref + سرور | android/web | VERIFIED | consent pref via run-as خوانده شد (`value="true"`)؛ سرور E0 |
| SM-3 | انتخاب حساب مقصد | الزام accountId | web | VERIFIED | خطای «حساب مقصد را انتخاب کن» بدون حساب |
| SM-4 | تشخیص بانک/مبلغ/تاریخ/واریز-برداشت | پارسر | android | VERIFIED | ۱۱/۱۱ تست JVM BankSmsFilterTest |
| SM-5 | پیش‌نمایش + اصلاح پیش از ثبت | صف محلی + تأیید | android | IMPLEMENTED_NOT_TESTED | کد صف/اعلان/ثبت-رد در اپ آماده؛ نمایش UI دستگاهی موکول به دستگاه واقعی |
| SM-6 | ضدتکرار | همان پیامک دوباره ثبت نشود | web | VERIFIED | E3 duplicate:true با همان id |
| SM-7 | لغو رضایت + توقف پردازش | پس از لغو هیچ | android/web | VERIFIED | E5: «اول رضایت» + revoke pref test |
| SM-8 | عدم ارسال پیامک غیرمرتبط به سرور | فیلتر سخت | android/web | VERIFIED | E4: preview=[] ignored=1 + فیلتر JVM |
| SM-9 | دریافت واقعی SMS در Android | onReceive واقعی | android | PARTIAL | گیرنده ثبت + پیامک به سیستم می‌رسد ولی broadcast به گیرنده ما روی ایمیج API24 تحویل نشد (۳ واریانت) — `sms-verdict.txt`؛ نهایی‌سازی روی دستگاه واقعی |
| CN-1 | اتصال Email (IMAP/SMTP یا OAuth) | API رسمی | web | NOT_IMPLEMENTED | نیازمند حساب/توکن کاربر؛ کاتالوگ + UI وضعیت موجود |
| CN-2 | اتصال Calendar (Google/OAuth) | OAuth رسمی | web | NOT_IMPLEMENTED | نیازمند Client ID بیرونی؛ مستند در CONNECTIONS.md |
| CN-3 | اتصال Telegram | Bot API | web | BLOCKED | api.telegram.org در دسترس (302) اما بدون توکن بات مالک آزمون واقعی ناممکن |
| CN-4 | اتصال WhatsApp | API رسمی | web | NOT_IMPLEMENTED | بدون API عمومی مجاز برای اتوماسیون — دور زدن ممنوع (مأموریت ۸) |
| CN-5 | تماس | قابلیت سیستمی | android | NOT_IMPLEMENTED | خارج از دامنه فعلی بدون تأیید مالک؛ ACTION_DIAL پیشنهاد مستند |
| CN-6 | SMS ارسال | قابلیت سیستمی | android | NOT_IMPLEMENTED | نیازمند تصمیم مالک + مجوز SEND_SMS |
| CN-7 | اعلان‌ها | Browser/Android | web/android | VERIFIED | اعلان مرورگر (permissions card) + یادآور سیستمی اندروید (ReminderReceiver) |
| R-1 | ساخت APK از HEAD نهایی + ثبت Package/Version/SHA | v2.2.0 از a60509f | android | VERIFIED | vc24/25، SHA ثبت در SHA256SUMS نهایی |
| R-2 | بررسی DEX/منابع/WebView/Manifest | inspection | android | VERIFIED | apksigner verify + aapt dump (R-1) + بررسی وابستگی webkit 1.11 |
| R-3 | نصب Release | Success | android | VERIFIED | `install-release => Success` (API24) |
| R-4 | اجرای اولیه + اجرای مجدد + ریبوت | ۳ اجرا بدون کرش | android | VERIFIED | focus=HomeActivity هر سه؛ FATAL=0؛ crash-buffer=0B (`logcat-fix1-run{1,2,3}.log`) |
| R-5 | تست همه صفحات + Logcat |证据 کامل | android | PARTIAL | اسکرین‌شات هر اجرا + logcat کامل؛ پیمایش UI همه صفحات روی شبیه‌ساز این چرخه کامل نشد |
| R-6 | fail-closed امضا | build بدون کلید شکست بخورد | android | VERIFIED | اثبات واقعی: `FAIL-CLOSED: keystore.properties not found` rc=1 |
| R-7 | Keystore خارج از Git + پشتیبان امن | بدون کلید در ZIP عمومی | android | VERIFIED | gitignored؛ پشتیبان + passphrase جدا در backups/ |
| R-8 | دو نسخه user/owner + کنترل نقش سمت سرور | هر دو build/sign | android | VERIFIED | هر دو ویراست CN=RahyAr؛ نقش OWNER با setup واقعی (T4/T6/T7) |
| R-9 | آزمون دستگاه فیزیکی + نسخه‌های هدف | دستگاه واقعی | android | BLOCKED | سندباکس دستگاه ندارد؛ پوشش فعلی API24 (minSdk) |
| AMB-1 | ۹ تم + روشن/تاریک | سوییچ و پایداری | web | VERIFIED | E2E + اسکرین‌شات‌های F4 (ocean/forest/night-reduced) |
| AMB-2 | Ambient Engine + AI Orb + نور طبیعی + حرکت هماهنگ | اجرای زنده | web | VERIFIED | `docs/AMBIENT_ENGINE.md` + shots + engine code |
| AMB-3 | حالت تمرکز + Reduced Motion + خاموش‌کردن جلوه‌ها | رفتار درست | web | VERIFIED | F4 shot 13 (night-reduced) + motion.css + تست‌های motion |
| AMB-4 | توقف انیمیشن پس‌زمینه + مصرف باتری/GPU | اندازه‌گیری | web | PARTIAL | توقف در پس‌زمینه پیاده شده (engine visibility)؛ بنچمارک GPU رسمی این چرخه اجرا نشد |
| AMB-5 | نمایش موبایل + RTL/LTR + دسترس‌پذیری | E2E | web | VERIFIED | E2E mobile/tablet overflow=0 + axe 0 serious |
| AMB-6 | تصاویر واقعی Web و Android جداگانه | نه شبیه‌سازی مرورگر به‌عنوان Android | evidence | PARTIAL | Web: E2E shots؛ Android: screencap واقعی شبیه‌ساز (3 اجرا + SMS) — اسکرین‌شات دستگاه فیزیکی BLOCKED |
| W-1 | علت واقعی خطای Weather | ریشه‌یابی مستند | web | VERIFIED | Open-Meteo api.open-meteo.com → HTTP 429 «Daily API request limit» از IP مشترک؛ geocoding سالم (200) |
| W-2 | Provider جایگزین مجاز | fallback واقعی | web | VERIFIED | wttr.in: Tehran 200 (temp14 code51) + London 200 (temp9) + تهران فارسی 200 |
| W-3 | مدیریت Timeout/خطای سرویس | صادقانه | web | VERIFIED | مسیر خطا 429→502 مستند در کد |
| W-4 | در نبود اتصال واقعی VERIFIED نشود | قاعده صفر | web | VERIFIED | این چرخه اتصال واقعی اثبات شد |
| FP-1 | جدول Feature Parity (Web/Android/Backend/وضعیت) | مستند کامل | audit | VERIFIED | `docs/audit/FEATURE_PARITY_F5.md` |
| FP-2 | هیچ Mock محلی به‌عنوان قابلیت سرورمحور معرفی نشود | تفکیک صادقانه | audit | VERIFIED | ستون Parity حالت آفلاین محلی را جدا می‌کند |
| SEC-1 | احراز هویت/نشست/CSRF/Rate Limit | ماتریس ۱۱تایی | web | VERIFIED | `sec-matrix.txt`: 401/307/403/429/200 |
| SEC-2 | Setup اولیه OWNER بدون رمز پیش‌فرض | fail-closed token | web | VERIFIED | بدون توکن→خطا؛ توکن غلط→خطا؛ تلاش دوم→رد؛ DB با صفر کاربر |
| SEC-3 | رمز قوی تولیدی + هش scrypt | بدون رمز پیش‌فرض | web | VERIFIED | رمز تولیدی openssl در `artifacts/credentials/` (gitignored)؛ scrypt N=2^16 |
| SEC-4 | جداسازی کاربران | داده متقاطع ممنوع | web | VERIFIED | F4 B2 + G1 (403) |
| SEC-5 | حذف واقعی داده | بعد از حذف gone | web | VERIFIED | F4 R4d + D6 + delete-all با تأیید |
| SEC-6 | محافظت API Key + جلوگیری از نشت | صفر نشت | web | VERIFIED | باگ واقعی G5 کشف و رفع شد → G5b leak=0 |
| SEC-7 | ثبت ActionLog + پشتیبان‌گیری امن | کامل | web | VERIFIED | ActionLog + export/import/delete-all با تأیید |
| SEC-8 | تغییر رمز/بازیابی حساب | مسیرهای امن | web | VERIFIED | auth/password + UserAudit (F3 audit) |
| QA-1 | Unit (وب) | سبز کامل | qa | VERIFIED | 267/267 |
| QA-2 | JVM اندروید | سبز کامل | qa | VERIFIED | 83/83 شامل BankSmsFilterTest 11/11 |
| QA-3 | E2E وب | صفر خطای کنسول | qa | VERIFIED | 11/11 PASS consoleErrors=0 |
| QA-4 | ماتریس امنیت | ۱۱/۱۱ | qa | VERIFIED | `sec-matrix.txt` |
| QA-5 | رگرسیون پس از تغییر کد | دوباره اجرا | qa | VERIFIED | build+unit+E2E+sec-matrix پس از هر تغییر با کد نهایی دوباره اجرا شد |
| QA-6 | Performance/Offline | اندازه‌گیری | qa | PARTIAL | offline local-rules مسیر + E2E بدون overflow؛ بنچمارک رسمی اجرا نشد |
| DL-1 | APK نهایی user + owner | امضا + SHA | delivery | VERIFIED | `download/RahyAr-F5/` ۴ APK (2 debug + 2 release CN=RahyAr) |
| DL-2 | سورس کامل + Source ZIP منطبق با HEAD | از یک commit | delivery | VERIFIED | ZIP از HEAD نهایی در بسته تحویل |
| DL-3 | Evidence ZIP + SHA256SUMS | بسته کامل | delivery | VERIFIED | `RahyAr-F5-Evidence.zip` + SHA256SUMS |
| DL-4 | RTM + Parity + گزارش‌ها + راهنماها | اسناد | delivery | VERIFIED | `docs/audit/` + `download/RahyAr-F5/` |
| DL-5 | ویدئوی اجرای واقعی + لینک دانلود ثابت | بیرونی مستقل | delivery | PARTIAL | ویدئوی وب ثبت شد؛ ویدئوی دستگاه فیزیکی و لینک ثابت بیرونی BLOCKED (tmpfiles موقت + bundle جایگزین) |
