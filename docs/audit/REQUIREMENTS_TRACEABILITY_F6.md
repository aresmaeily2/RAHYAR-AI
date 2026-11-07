# REQUIREMENTS_TRACEABILITY_F6 — رهیار (RahyAr AI)

- **چرخه:** F6 — «بستن تمام موارد باقی‌مانده پس از F5»
- **تاریخ:** 2026-11-07 · **HEAD پایه‌ی این ماتریس:** `57aefdb` (شاخه main محلی، ۹۱ کامیت جلوتر از `origin/main=28b64bb`)
- **خاستگاه بسته:** وضعیت‌ها به کد در `57aefdb` تعلق دارند؛ کامیت‌های بعدی فقط مستندات/ابزارند (`git diff 57aefdb..HEAD -- src android` = خالی). هش قطعی HEAD بسته در `SOURCE-HEAD.txt` بسته ثبت است.
- **قانون صفر:** هر وضعیت فقط با آزمون بازتولیدپذیر و مدرک ثبت‌شده معتبر است؛ وجود کد یا صفحه UI به معنی تکمیل نیست. کد موجود بازنویسی نشد مگر نقص واقعی، بازتولیدپذیر و مستند پیدا شود (فقط آب‌وهوا — F6-WX-1).
- **مبنای ورودی:** RTM F5 (۱۰۶ ردیف VERIFIED/۱۲ PARTIAL/۷ INT-NT/۶ NOT-IMPL/۱۸ BLOCKED به‌ادعای grep خام — واقعی: 101 VERIFIED / 11 PARTIAL / 6 IMPLEMENTED_NOT_TESTED / 5 NOT_IMPLEMENTED / 13 BLOCKED در ۱۳۶ ردیف). **تصحیح مهم: شمارش واقعی ۱۳۶ ردیف است، نه «۱۲۰» که گزارش F5 ادعا می‌کرد.**
- **راستی‌آزمایی چرخه F6:** E2E ۱۱/۱۱ (دوبار) · Unit ۲۶۷/۲۶۷ · JVM ۸۳+۸۳ · ماتریس امنیت ۱۱/۱۱ · باتری راه‌اندازی OWNER روی DB تازه S1–S11 · مالی ۹ سناریو + تطبیق عددی + هم‌زمانی · backup/restore واقعی · canary نشت کلید در ۴ مسیر · بازساخت بایت‌به‌بایت APK · fail-closed امضا · فیکس و رگرسیون آب‌وهوا
- **ستون‌ها:** ID | الزام | معیار پذیرش | لایه | وضعیت | مدرک (شواهد F5 حفظ و شواهد F6 با برچسب **F6:** افزوده شده‌اند)

| ID | الزام | معیار پذیرش | لایه | وضعیت | مدرک |
|---|---|---|---|---|---|
| M1-1 | ثبت وضعیت واقعی محیط توسعه | status/log/branch/remote/HEAD مستند | infra | VERIFIED | `scripts/f5-audit*.sh` خروجی `/tmp/f5-audit*.log`، commit `baabf59`؛ F6: git status پاک، HEAD=`57aefdb`، هر دو مخزن (RAHYAR/HAMYAR) با ls-remote تأیید شدند — هر دو origin/main=`28b64bb` |
| M1-2 | بررسی وجود کامیت‌های e534155/3d39a19/9aac0cb/95a73e7 | هر چهار کامیت در تاریخچه محلی | infra | VERIFIED | f5-audit بخش ۲: همه EXISTS؛ F6: پنج کامیت e534155/3d39a19/9aac0cb/95a73e7/6664c3c همگی موجودند |
| M1-3 | تشخیص محل تغییرات F4 | فقط Workspace یا شاخه دیگر | infra | VERIFIED | `git branch -r --contains` خالی → فقط محلی، push نشده؛ F6: شاخهٔ main محلی ۹۱ کامیت جلوتر از origin/main است (۹۰ در F5 + ۱ فیکس WX)؛ هرگز push نشده |
| M1-4 | اختلاف فایل‌به‌فایل محلی و GitHub | آمار دقیق 28b64bb..HEAD | infra | VERIFIED | ۳۵۰ فایل تغییر، `git diff --stat` ثبت شده؛ F6: diff مقابل origin/main در F5: 391 فایل/+118k؛ فیکس F6: فقط 2 فایل (route آب‌وهوا + چیپ) |
| M1-5 | انتشار امن به GitHub بدون Force Push | Fast-forward از main | infra | BLOCKED | `git push --dry-run` → `could not read Username` (بدون توکن در سندباکس)؛ `git bundle` + `format-patch` تحویل شد؛ F6: نقص بستهٔ انتقال F5 اصلاح شد — bundle/patches قبلی تا a60509f بودند (۹۰ کامیتِ آخر، از جمله 6664c3c، در آن‌ها نبود)؛ بازتولید از HEAD نهایی (۹۱ پچ) + اعتبار SHA256؛ push انجام نشد (هیچ اعتبارنامه‌ای در محیط نیست)؛ هشدار GIT-SEC-1 به PUSH-INSTRUCTIONS افزوده شد |
| M1-6 | تحویل از یک Commit واحد | سورس و فایل‌های تحویل از HEAD واحد | infra | VERIFIED | HEAD `a60509f` مبنا؛ Source ZIP از همان درخت؛ F6: کل بستهٔ تحویلی F6 از HEAD واحد `57aefdb` ساخته می‌شود (Source ZIP با git archive از همان کامیت) |
| M2-1 | یافتن RTM با ۱۱۶ ردیف | فایل اصلی قابل بازیابی | audit | BLOCKED | اسکن Blobها منفی؛ SHA ثبت‌شده مدرک وجود قبلی است؛ F6 تصحیح عددی: ماتریس F5 واقعاً ۱۳۶ ردیف داده دارد نه «۱۲۰» (گزارش F5 نادقیق بود)؛ RTM ادعایی F4 هرگز کامیت نشده بود و از دست رفت |
| M2-2 | بازسازی ماتریس بدون حذف ردیف | ≥۱۱۶ ردیف با وضعیت صادقانه | audit | VERIFIED | همین فایل، ۱۲۰ ردیف؛ F6: هر ۱۳۶ ردیف حفظ و فقط وضعیت/مدرک به‌روزرسانی شد؛ هیچ ردیفی حذف نشد |
| M2-3 | تبدیل ۱۴ PARTIAL به VERIFIED/BLOCKED | تعیین تکلیف صریح | audit | VERIFIED | هر ردیف این چرخه دوباره آزمون شد؛ F6: بازبینی شد — وضعیت‌ها فقط از شش دستهٔ مجاز |
| M2-4 | آزمایش ۹ IMPLEMENTED_NOT_TESTED | آزمون واقعی | audit | VERIFIED | Providerها/Weather/PDF/خروجی‌ها این چرخه آزمون شد؛ F6: Providerها/Weather با سیم واقعی آزموده شدند (ماتریس P) |
| M2-5 | تطبیق ۱۱ NOT_IMPLEMENTED با سوابق | تعیین دامنه/اجرا | audit | VERIFIED | بخش‌های CN این ماتریس؛ F6: دوره‌ای مالی/سالانه گزارش/چت→مالی به‌عنوان NOT_IMPLEMENTED صادقانه ثبت شدند |
| M2-6 | پیگیری ۲ BLOCKED قبلی | رفع مانع یا تعیین تکلیف | audit | VERIFIED | کرش Release در F4 ریشه‌یابی شد و این چرخه ۳/۳ بدون کرش تأیید شد (R-1)؛ F6: BLOCKEDهای دستگاه/اعتبارنامه پابرجا با مدرک (بوت شبیه‌ساز، کلید بیرونی) |
| M2-7 | آزمون مجدد FAILED→FIXED | آزمون رگرسیون | audit | VERIFIED | مسیر فراموشی حافظه: F4 R4 + AG-10/AG-11 این چرخه؛ F6: رگرسیون فراموشی/حساس‌سنج تغییر نکرده — کد همان F5 |
| P-1 | Provider: OpenAI | تست اتصال واقعی از آداپتور خود | web | BLOCKED | egress سندباکس `api.openai.com` → HTTP 403 پروکسی؛ آداپتور ساخته و مسیر خطا آزمون شد (`providers2.txt`)؛ F6 سیم واقعی: 401 صادقانه «کلید API نامعتبر» — بدون کلید مالک؛ طبق مأموریت کلید در چت درخواست نمی‌شود |
| P-2 | Provider: Claude (بومی) | تست اتصال واقعی | web | BLOCKED | `api.anthropic.com` → 403 پروکسی؛ آداپتور بومی Messages API + ترجمه SSE پیاده شد؛ F6 سیم واقعی: خطای صادقانهٔ اعتبارنامه |
| P-3 | Provider: Gemini (بومی) | تست اتصال واقعی | web | PARTIAL | پاسخ واقعی 400 (کلید آزمایشی نامعتبر) از میزبان واقعی گوگل — اتصال و نگاشت خطا اثبات؛ تکمیل واقعی نیازمند کلید معتبر کاربر؛ F6 سیم واقعی: پاسخ 400 صادقانه از Gemini |
| P-4 | Provider: DeepSeek | تست اتصال واقعی | web | PARTIAL | پاسخ واقعی 401 از `api.deepseek.com` از طریق آداپتور خود (`providers2.txt`)؛ تکمیل نیازمند کلید معتبر؛ F6 سیم واقعی: 401 صادقانه |
| P-5 | Provider: OpenRouter | تست اتصال واقعی | web | PARTIAL | پاسخ واقعی 401 + لیست عمومی مدل‌ها HTTP 200؛ تکمیل نیازمند کلید معتبر؛ F6 سیم واقعی: 401 صادقانه |
| P-6 | Provider: Ollama | تست اتصال واقعی | web | BLOCKED | موتور محلی نصب نیست؛ شکست صادقانه «اتصال ناموفق» ثبت شد؛ F6: بدون موتور نصب — «اتصال ناموفق» صادقانه؛ نصب Ollama به‌دلیل سقف دیسک (2.5GB آزاد در برابر نیاز مدل) انجام نشد |
| P-7 | Provider: LM Studio | تست اتصال واقعی | web | BLOCKED | موتور محلی نصب نیست؛ رفتار خطای صادقانه ثبت شد؛ F6: بدون موتور — همان وضعیت صادقانه |
| P-8 | Provider: ZAI میزبان | پاسخ واقعی مدل | web | VERIFIED | `ok:true, model:glm-4-plus, sample` واقعی (`providers2.txt`)؛ F6 سیم واقعی: پاسخ مدل واقعی glm-4-plus در 7232ms — نمونهٔ متنی بازگشت |
| P-9 | Provider: Endpoint سازگار OpenAI | انتخاب/ذخیره/تست/خطا | web | VERIFIED | F2 unreachable → خطای صادقانه؛ F3 چت روی Provider خراب → کاهش نرم 200؛ F6 سیم واقعی: endpoint کاربر پاسخ 401 داد — صادقانه |
| P-10 | Provider: قواعد محلی | پاسخ بدون مدل/اینترنت | web | VERIFIED | تست مسیر اختصاصی `ok:true` + چت F1-local با اکشن واقعی؛ F6 سیم واقعی: 200 با نمونهٔ قطعی «موتور قواعد محلی فعال است» |
| P-11 | انتخاب و تغییر Provider از UI | ده کارت در تنظیمات | web | VERIFIED | PUT ده موتور `engine=…` پاسخ موفق (F0)؛ UI کارت + فیلدها؛ F6: رجیستری/فهرست ۱۰ موتور از سورس استخراج و در UI/API تأیید شد |
| P-12 | انتخاب مدل و Endpoint | ذخیره per-engine | web | VERIFIED | `ai_model:<id>`/`ai_url:<id>` ذخیره و بازخوانی در `getEngineStatus`؛ F6: effectiveUrl/effectiveModel در پاسخ settings/ai دیده شد |
| P-13 | ذخیره امن و ماسک کلید | کلید هرگز کامل برنگردد | web | VERIFIED | F4 mask=`••••2345`؛ ماسک Providerهای نام‌دار در `providers`؛ F6 canary تازه: PUT کلید → GET فقط ماسک «••••7710»؛ کلید خام در هیچ پاسخی نیست |
| P-14 | کلید داخل APK/سورس عمومی نباشد | اسکن تحویلی‌ها | web | VERIFIED | نشت=0 در data-export بعد از اصلاح G5b؛ اسکن نهایی بخش تحویل؛ F6: اسکن secret روی بستهٔ نهایی پاک؛ keystore/properties گیت‌نشدنی (check-ignore) |
| P-15 | مدیریت Timeout/نرخ/قطع/کلید نامعتبر | پیام صادقانه هر حالت | web | VERIFIED | Timeout/قطع/401/403/429 نگاشت‌شده در آداپتورها + شواهد 401 واقعی؛ F6: 429 واقعی در storm (ai-test) و login |
| P-16 | Provider غیرقابل آزمایش VERIFIED نشود | قاعده صفر | web | VERIFIED | OpenAI/Claude = BLOCKED نه VERIFIED؛ F6: ماتریس کامل ۱۰ Provider با نتایج صادقانه — هیچ Provider غیرآزموده VERIFIED نشد |
| AG-1 | فهم درخواست طبیعی فارسی | پاسخ/اکشن درست | web | VERIFIED | E2E + F1-local یادآور با اکشن `add_reminder` واقعی در DB؛ F6: چت فارسی واقعی (دستور هزینه) پاسخ ساخت‌یافته داد |
| AG-2 | تشخیص Intent | نگاشت فرمان به اکشن | web | VERIFIED | F1-local add_reminder + F4 A3 هزینه؛ F6 یافته: «یک هزینه ۳۰ هزار تومانی ثبت کن» → add_task (اکشن‌های چت فقط task/reminder می‌سازند؛ ثبت تراکنش از چت سیم‌نشده — F6-AI-2) |
| AG-3 | پرسش برای اطلاعات ناقص | سؤال شفاف | web | VERIFIED | F4 A5 → R2 breakdown با کلید درست 5/5 |
| AG-4 | برنامه‌ریزی چندمرحله‌ای | plan واقعی | web | VERIFIED | F4 A2 weekly-plan PASS |
| AG-5 | استفاده از حافظه | ذخیره/بازیابی/جداسازی | web | VERIFIED | F4 B1/B2 SEPARATION PASS + A6 بازیابی «کیان» |
| AG-6 | انتخاب ابزار و اجرای فرمان مجاز | اکشن در DB | web | VERIFIED | F1-local: ردیف یادآور واقعی با remindAt تهران درست؛ F6: ActionLog واقعی در داشبورد (اسکرین‌شات 02) + E2E ساخت تسک |
| AG-7 | بررسی نتیجه اجرا | خواندن پس از نوشتن | web | VERIFIED | تست agentic-f1 post-write re-read |
| AG-8 | مدیریت شکست مدل | کاهش نرم بدون کرش | web | VERIFIED | F3 چت روی Provider خراب → 200 مدیریت‌شده |
| AG-9 | ثبت ActionLog | لاگ هر عملیات | web | VERIFIED | جدول ActionLog + تست action-schema؛ F6: ردیف ActionLog در گزارش روزانه/داشبورد مشاهده شد |
| AG-10 | تأیید عملیات حساس | بدون تأیید اجرا نشود | web | VERIFIED | F4 R4b: پیش از تأیید حذف نمی‌شود (still-there=1)؛ F6: کد تغییر نکرده — مسیر setPendingAction/تأیید صریح F5 پابرجا |
| AG-11 | صداقت مسیر فراموشی حافظه | نتیجه واقعی گزارش شود | web | VERIFIED | F4 R4c/R4d: پاسخ «حذف شد» فقط پس از حذف واقعی DB (gone=0)؛ F6: کد تغییر نکرده — فیکس F4 پابرجا |
| V-1 | دریافت صدای فارسی روی دستگاه | آزمون شنیداری | android | BLOCKED | میکروفون در سندباکس/شبیه‌ساز در دسترس نیست — طبق مأموریت ۴ تا آزمون شنیداری NOT VERIFIED؛ F6: باینری یکسان (بازساخت بایت‌به‌بایت SHA=5ea5915a…)؛ ممیزی سورس VoiceHelper/پارسر + JVM؛ آزمون روی دستگاه در این چرخه BLOCKED (۳ تلاش بوت شبیه‌ساز: 480s/500s/590s، adb وصل ولی boot_completed هرگز — bootwatch.log) |
| V-2 | دریافت صدای انگلیسی روی دستگاه | آزمون شنیداری | android | BLOCKED | همان مانع V-1؛ F6: همان وضعیت V-1 (باینری یکسان + بوت BLOCKED) |
| V-3 | STT فارسی | سرویس گفتار دستگاه | android | BLOCKED | بدون سرویس گفتار روی ایمیج API24/سندباکس؛ F6: ممیزی سورس + JVM؛ دستگاه BLOCKED |
| V-4 | STT انگلیسی | سرویس گفتار دستگاه | android | BLOCKED | همان V-3؛ F6: ممیزی سورس + JVM؛ دستگاه BLOCKED |
| V-5 | تشخیص زبان | fa/en سوئیچ | android | IMPLEMENTED_NOT_TESTED | voiceLang در VoiceHelper (fa-IR/en-US) + UI انتخاب؛ F6: detectLangFromText در local-rules سورس‌بررسی شد (fa/en) |
| V-6 | ارسال متن به Agent | همان مسیر چت | web | VERIFIED | مسیر متن جایگزین F2: parseVoiceCommand → runIntent واقعی |
| V-7 | دریافت پاسخ | UI پنل صوت | web | VERIFIED | VoiceEventsTest + پنل پاسخ |
| V-8 | TTS فارسی | خروجی صوتی | android | BLOCKED | موتور TTS روی ایمیج در دسترس نیست (F2: fa-engine-limit صادقانه)؛ F6: سورس RahyarNativeBridge (TTS بومی) بازبینی شد؛ دستگاه BLOCKED |
| V-9 | TTS انگلیسی | خروجی صوتی | android | PARTIAL | F2 آزمون صدای واقعی en-PASS ثبت شد (شواهد F2)؛ F6: همان V-8 |
| V-10 | پخش صوت | MediaPlayer/TTS | android | PARTIAL | مسیر کد + آزمون F2 en؛ دستگاهی کامل نشد؛ F6: همان V-8 |
| V-11 | توقف و ادامه پخش | ttsStop | android | IMPLEMENTED_NOT_TESTED | VoiceHelper stop + تست VoiceEvents؛ F6: همان V-8 |
| V-12 | قطع و وصل مکالمه | حالت شنود | android | IMPLEMENTED_NOT_TESTED | voiceStop/start + حالت‌های پنل؛ F6: همان V-8 |
| V-13 | مدیریت مجوز میکروفون | دیالوگ سیستم | android | VERIFIED | RECORD_AUDIO runtime flow + VoiceEventsTest + تنظیمات؛ F6: مجوز RECORD_AUDIO + queries RecognitionService در Manifest تأیید |
| V-14 | مدیریت خطای سرویس صوتی | پیام صادقانه | android | VERIFIED | errUnavailable با «سرویس گفتار دستگاه نصب نیست» (تست ۲۳تایی پارسر + F2)؛ F6: مسیر خطای نبود سرویس در سورس + probe pm query-services روی تصویر (بدون سرویس گفتار — مدیریت صادقانه) |
| V-15 | Wake Word اختیاری با رضایت | فقط opt-in | android | IMPLEMENTED_NOT_TESTED | VoiceWakeService + toggle + JVM VoiceEventsTest؛ F6: VoiceWakeService foregroundServiceType=microphone + اعلان شفاف در Manifest تأیید |
| C-1 | تقویم شمسی | نمایش درست | web | VERIFIED | E2E «Jalali month visible»؛ F6: E2E روی 57aefdb — تقویم جلالی PASS |
| C-2 | تقویم میلادی + حالت دوگانه | سوییچ | web | VERIFIED | C1/C2 + E2E en gregorian-only؛ F6: E2E — حالت ان: فقط میلادی، بدون نشت جلالی PASS |
| C-3 | تبدیل تاریخ و کبیسه | ۱۴۰۳/۱۴۰۴ | web | VERIFIED | C3-C5: len=30، 1403-12-30→2025-03-20، 1404-12-29→2026-03-20؛ F6: کد تقویم تغییر نکرده — تست F5 (کبیسه 1403) پابرجا |
| C-4 | منطقه زمانی تهران | محاسبه درست | web | VERIFIED | F4 R1: ۹ صبح تهران → 05:30Z؛ F6: کد تغییر نکرده — تهران‌tz F5 پابرجا |
| C-5 | رویداد ایجاد/ویرایش/حذف/یادآوری | CRUD کامل | web | VERIFIED | F4 سناریوهای تقویم + E2E؛ F6: E2E PASS |
| C-6 | UI فارسی: اعداد درشت شمسی، میلادی ریز زیر روز، RTL، عناوین فارسی | چک بصری | web | VERIFIED | ۱۸ اسکرین‌شات F4 (fa/en) + E2E RTL؛ F6: E2E PASS (اعداد درشت شمسی) |
| C-7 | UI انگلیسی: فقط میلادی، اعداد لاتین، بدون نشت فارسی، LTR | چک بصری | web | VERIFIED | E2E «Gregorian only, Latin digits, no Jalali leak»؛ F6: E2E PASS (gregorian=true noPersian=true) |
| C-8 | وظایف: ایجاد/ویرایش/حذف/تکمیل | CRUD | web | VERIFIED | E2E «task created via UI» + F4؛ F6: E2E PASS (ساخت تسک از UI) |
| C-9 | وظایف: اولویت/سررسید/تکرار/زیرکار/دسته/فیلتر/جست‌وجو | کامل | web | VERIFIED | F4 breakdown 5 زیرکار + tests/server-tasks؛ F6: کد تغییر نکرده — F5 پابرجا |
| C-10 | گزارش روزانه وظایف + اتصال Agent | یکپارچگی | web | VERIFIED | F4 A4 overdue + plan_query؛ F6: گزارش روزانه API زنده پاسخ داد (report با remaining/overdue) |
| C-11 | یادآور: اعلان واقعی/زمان‌بندی پایدار/تکرار/Snooze | وب | web | VERIFIED | E2E + F4 R1 + reminder-settings-dialog؛ F6: کد تغییر نکرده — F5 پابرجا |
| C-12 | یادآور: بازیابی پس از reboot + مجوز | اندروید | android | IMPLEMENTED_NOT_TESTED | BootReceiver + ReminderAlarms + ۴ تست JVM؛ آزمون بوت دستگاهی این چرخه انجام نشد؛ F6: باینری یکسان + BootReceiver در Manifest تأیید؛ دستگاه BLOCKED |
| F-1 | مالی: چند حساب + موجودی اولیه | مانده درست | web | VERIFIED | D1/D2: حساب-الف=1350000 حساب-ب=250000 (دقیق)؛ F6: چهار حساب (حساب-الف/ب F5 + F6-Cash/F6-Bank این چرخه) با موجودی اولیه |
| F-2 | مالی: درآمد/هزینه/انتقال | ثبت سه‌نوع | web | VERIFIED | D2 سه تراکنش با مانده مستقل؛ F6: +500000 درآمد، −300000 هزینه، انتقال 400000 — همه با id واقعی |
| F-3 | مالی: دسته‌بندی + بودجه ماهانه | بودجه با دسته معتبر | web | VERIFIED | D3b/D3c: PUT food 100000 ok + فهرست؛ F6: PUT بودجه food=250000 + GET تأیید |
| F-4 | مالی: هزینه/درآمد تکرارشونده | تولید خودکار + ضدتکرار | web | NOT_IMPLEMENTED | D5: externalRef همان → همان id duplicate:true؛ F6: جست‌وجوی کامل سورس — هیچ مسیر/مدل دوره‌ای در finance نیست (فقط scheduler یادآورها)؛ صادقانه NOT_IMPLEMENTED |
| F-5 | مالی: گزارش روزانه/ماهانه/سالانه + نمودار واقعی | گزارش درست | web | PARTIAL | F4 D6 گزارش ماهانه + نمودار UI (shots)؛ F6: گزارش روزانه API موجود؛ ماهانه: monthlyTotals سمت کلاینت + پنجرهٔ export=YYYY-MM؛ سالانه: یافت نشد (F6-FIN-3) |
| F-6 | مالی: مانده حساب + فیلتر/جست‌وجو | محاسبه مستقل | web | VERIFIED | D2 + UI فیلتر (F4 shots)؛ F6: تطبیق مستقل از DB با API دقیقاً برابر: F6-Cash=681889، F6-Bank=2400000 (بدون گردگیری) |
| F-7 | مالی: ویرایش/حذف تراکنش | CRUD | web | VERIFIED | D6: PATCH+DELETE → gone=0؛ F6: کد تغییر نکرده — ویرایش/حذف F5 پابرجا |
| F-8 | مالی: تشخیص تراکنش تکراری | externalRef | web | VERIFIED | D5؛ F6: externalRef تکراری → duplicate:true؛ هم‌زمانی ۵ موازی → دقیقاً 1 ردیف در DB |
| F-9 | خروجی PDF سمت سرور | فایل واقعی نه چاپ مرورگر | web | VERIFIED | D4: application/pdf 2944B `%PDF-1.4`→`%%EOF` + ۶ تست واحد؛ F6: PDF واقعی %PDF-1.4 سمت سرور (buildFinancePdf) — سربرگ/حساب/مانده صحیح؛ محدودیت: گلیف فارسی در WinAnsi به «?» می‌رود (اعداد/لاتین سالم) — F6-FIN-4 |
| F-10 | خروجی CSV | UTF-8 BOM | web | VERIFIED | D4 http=200 text/csv 353B؛ F6: CSV با BOM و سرستون فارسی («تاریخ»،«ساعت»،...) |
| F-11 | خروجی Excel | SpreadsheetML | web | VERIFIED | D4 http=200 vnd.ms-excel 3242B؛ F6: xls واقعی 5587B (SpreadsheetML) |
| F-12 | خروجی JSON | ساختار کامل | web | VERIFIED | D4 http=200 1385B؛ F6: JSON پارس‌شدنی — 8 تراکنش |
| F-13 | خروجی TXT | متن خوانا | web | VERIFIED | D4 http=200 506B؛ F6: TXT فارسی «رهیار AI — خروجی مالی» |
| SM-1 | مجوز پیامک با توضیح شفاف | دیالوگ شفاف | android | VERIFIED | بخش تنظیمات اپ (fa/en) + رضایت فقط با granted واقعی؛ F6: ممیزی Manifest — توضیح شفاف قبل از درخواست RECEIVE_SMS در سورس |
| SM-2 | رضایت صریح + ذخیره امن رضایت | pref + سرور | android/web | VERIFIED | consent pref via run-as خوانده شد (`value="true"`)؛ سرور E0؛ F6: دروازهٔ رضایت اولین کد در onReceive (consent=off — no processing)؛ run-as pref write آزمایش شد |
| SM-3 | انتخاب حساب مقصد | الزام accountId | web | VERIFIED | خطای «حساب مقصد را انتخاب کن» بدون حساب؛ F6: کد وب تغییر نکرده — F5 پابرجا |
| SM-4 | تشخیص بانک/مبلغ/تاریخ/واریز-برداشت | پارسر | android | VERIFIED | ۱۱/۱۱ تست JVM BankSmsFilterTest؛ F6: BankSmsFilter (ریال/تومان/IRR، ×10 تومان، فیلتر موبایل شخصی) + JVM 11/11 |
| SM-5 | پیش‌نمایش + اصلاح پیش از ثبت | صف محلی + تأیید | android | IMPLEMENTED_NOT_TESTED | کد صف/اعلان/ثبت-رد در اپ آماده؛ نمایش UI دستگاهی موکول به دستگاه واقعی؛ F6: صف پیش‌نمایش + نوتیفیکیشن در سورس؛ آزمون دستگاه BLOCKED (بوت) |
| SM-6 | ضدتکرار | همان پیامک دوباره ثبت نشود | web | VERIFIED | E3 duplicate:true با همان id؛ F6: هش sender|body در صف — dedup سورس‌بررسی شد |
| SM-7 | لغو رضایت + توقف پردازش | پس از لغو هیچ | android/web | VERIFIED | E5: «اول رضایت» + revoke pref test؛ F6: لغو رضایت → sms_consent=false → هیچ پردازشی (مسیر سورس)؛ آزمون دستگاه BLOCKED |
| SM-8 | عدم ارسال پیامک غیرمرتبط به سرور | فیلتر سخت | android/web | VERIFIED | E4: preview=[] ignored=1 + فیلتر JVM؛ F6: فیلتر سخت شخصی/OTP — JVM + سورس («no storage, no send») |
| SM-9 | دریافت واقعی SMS در Android | onReceive واقعی | android | PARTIAL | گیرنده ثبت + پیامک به سیستم می‌رسد ولی broadcast به گیرنده ما روی ایمیج API24 تحویل نشد (۳ واریانت) — `sms-verdict.txt`؛ نهایی‌سازی روی دستگاه واقعی؛ F6: ۳ تلاش بوت شبیه‌ساز (فایل‌های bootwatch/qemu ثبت شد) — adb وصل ولی boot_completed هرگز؛ تحویل broadcast در این چرخه BLOCKED؛ شواهد F5 (۳ variant مانفیست، MessagingApp می‌گیرد) برای باینری بایت‌به‌بایت یکسان معتبر است |
| CN-1 | اتصال Email (IMAP/SMTP یا OAuth) | API رسمی | web | NOT_IMPLEMENTED | نیازمند حساب/توکن کاربر؛ کاتالوگ + UI وضعیت موجود؛ F6: بدون اعتبارنامهٔ ایمیل در سندباکس — طبق قاعدهٔ مأموریت کلید در چت درخواست نمی‌شود؛ وضعیت F5 پابرجا |
| CN-2 | اتصال Calendar (Google/OAuth) | OAuth رسمی | web | NOT_IMPLEMENTED | نیازمند Client ID بیرونی؛ مستند در CONNECTIONS.md؛ F6: بدون OAuth خارجی — همان |
| CN-3 | اتصال Telegram | Bot API | web | BLOCKED | api.telegram.org در دسترس (302) اما بدون توکن بات مالک آزمون واقعی ناممکن؛ F6: بدون توکن بات — همان |
| CN-4 | اتصال WhatsApp | API رسمی | web | NOT_IMPLEMENTED | بدون API عمومی مجاز برای اتوماسیون — دور زدن ممنوع (مأموریت ۸)؛ F6: بدون API رسمی مجاز — همان |
| CN-5 | تماس | قابلیت سیستمی | android | NOT_IMPLEMENTED | خارج از دامنه فعلی بدون تأیید مالک؛ ACTION_DIAL پیشنهاد مستند؛ F6: باینری یکسان — F5 پابرجا |
| CN-6 | SMS ارسال | قابلیت سیستمی | android | NOT_IMPLEMENTED | نیازمند تصمیم مالک + مجوز SEND_SMS؛ F6: باینری یکسان — F5 پابرجا |
| CN-7 | اعلان‌ها | Browser/Android | web/android | VERIFIED | اعلان مرورگر (permissions card) + یادآور سیستمی اندروید (ReminderReceiver)؛ F6: اعلان SMS-preview سورس‌بررسی شد؛ بقیه F5 |
| R-1 | ساخت APK از HEAD نهایی + ثبت Package/Version/SHA | v2.2.0 از a60509f | android | VERIFIED | vc24/25، SHA ثبت در SHA256SUMS نهایی؛ F6: چهار APK با apksigner/aapt2: user vc24 / owner vc25، v2.2.0، minSdk24/target34؛ گواهی CN=RahyAr SHA=92d0d265…؛ SHA256 ثبت |
| R-2 | بررسی DEX/منابع/WebView/Manifest | inspection | android | VERIFIED | apksigner verify + aapt dump (R-1) + بررسی وابستگی webkit 1.11؛ F6: DEX/منابع در F5؛ APKها بایت‌به‌بایت از HEAD بازساخت شدند (اثبات provenance) |
| R-3 | نصب Release | Success | android | VERIFIED | `install-release => Success` (API24)؛ F6: install-release «Success» در F5؛ تکرار این چرخه BLOCKED (بوت) — باینری یکسان |
| R-4 | اجرای اولیه + اجرای مجدد + ریبوت | ۳ اجرا بدون کرش | android | VERIFIED | focus=HomeActivity هر سه؛ FATAL=0؛ crash-buffer=0B (`logcat-fix1-run{1,2,3}.log`)؛ F6: شواهد F5 (3/3 بدون کرش) برای باینری یکسان معتبر؛ تکرار BLOCKED |
| R-5 | تست همه صفحات + Logcat | 证据 کامل | android | PARTIAL | اسکرین‌شات هر اجرا + logcat کامل؛ پیمایش UI همه صفحات روی شبیه‌ساز این چرخه کامل نشد؛ F6: همان R-4 |
| R-6 | fail-closed امضا | build بدون کلید شکست بخورد | android | VERIFIED | اثبات واقعی: `FAIL-CLOSED: keystore.properties not found` rc=1؛ F6: keystore.properties مخفی → build rc=1 با پیام صریح FAIL-CLOSED — unsigned تولید نشد |
| R-7 | Keystore خارج از Git + پشتیبان امن | بدون کلید در ZIP عمومی | android | VERIFIED | gitignored؛ پشتیبان + passphrase جدا در backups/؛ F6: check-ignore تأیید (backups/ و *.keystore)؛ یافتهٔ GIT-SEC-1: بلاب keystore کهن در تاریخچهٔ محلیِ پوش‌نشده — رانبوک purge آماده، اقدام با مالک |
| R-8 | دو نسخه user/owner + کنترل نقش سمت سرور | هر دو build/sign | android | VERIFIED | هر دو ویراست CN=RahyAr؛ نقش OWNER با setup واقعی (T4/T6/T7)؛ F6: com.rahyarai.app / com.rahyarai.app.owner — تفکیک ویراست؛ نقش سمت سرور (T6/T7) |
| R-9 | آزمون دستگاه فیزیکی + نسخه‌های هدف | دستگاه واقعی | android | BLOCKED | سندباکس دستگاه ندارد؛ پوشش فعلی API24 (minSdk)؛ F6: دستگاه فیزیکی در دسترس نیست — BLOCKED صادقانه |
| AMB-1 | ۹ تم + روشن/تاریک | سوییچ و پایداری | web | VERIFIED | E2E + اسکرین‌شات‌های F4 (ocean/forest/night-reduced)؛ F6: اسکرین‌شات تازه dark (03) از 57aefdb |
| AMB-2 | Ambient Engine + AI Orb + نور طبیعی + حرکت هماهنگ | اجرای زنده | web | VERIFIED | `docs/AMBIENT_ENGINE.md` + shots + engine code؛ F6: اسکرین‌شات‌های تازه 02/05 از 57aefdb |
| AMB-3 | حالت تمرکز + Reduced Motion + خاموش‌کردن جلوه‌ها | رفتار درست | web | VERIFIED | F4 shot 13 (night-reduced) + motion.css + تست‌های motion؛ F6: کد تغییر نکرده (به‌جز چیپ) — E2E PASS |
| AMB-4 | توقف انیمیشن پس‌زمینه + مصرف باتری/GPU | اندازه‌گیری | web | PARTIAL | توقف در پس‌زمینه پیاده شده (engine visibility)؛ بنچمارک GPU رسمی این چرخه اجرا نشد؛ F6: کد تغییر نکرده — F5 پابرجا |
| AMB-5 | نمایش موبایل + RTL/LTR + دسترس‌پذیری | E2E | web | VERIFIED | E2E mobile/tablet overflow=0 + axe 0 serious؛ F6: E2E — overflow صفر در تبلت/موبایل |
| AMB-6 | تصاویر واقعی Web و Android جداگانه | نه شبیه‌سازی مرورگر به‌عنوان Android | evidence | PARTIAL | Web: E2E shots؛ Android: screencap واقعی شبیه‌ساز (3 اجرا + SMS) — اسکرین‌شات دستگاه فیزیکی BLOCKED؛ F6: ۶ اسکرین‌شات تازه وب (login/home/dark/settings-fa/dashboard-en/settings-en — چیپ آب‌وهوا با updatedAt در 02)؛ اسکرین Android همان باینری F5 است — تازه‌سازی BLOCKED |
| W-1 | علت واقعی خطای Weather | ریشه‌یابی مستند | web | VERIFIED | Open-Meteo api.open-meteo.com → HTTP 429 «Daily API request limit» از IP مشترک؛ geocoding سالم (200)؛ F6: ریشه‌یابی تازه — geocoder متا نام‌های غیرلاتین را ندارد (بازتولید: «تهران» کش‌سرد → 404)؛ فیکس در 57aefdb |
| W-2 | Provider جایگزین مجاز | fallback واقعی | web | VERIFIED | wttr.in: Tehran 200 (temp14 code51) + London 200 (temp9) + تهران فارسی 200؛ F6: wttr.in هم برای آب‌وهوا و هم اکنون جغرافیایابی؛ «تهران» بعد از فیکس → 200 واقعی با temp=14 |
| W-3 | مدیریت Timeout/خطای سرویس | صادقانه | web | VERIFIED | مسیر خطا 429→502 مستند در کد؛ F6: AbortSignal.timeout در هر دو مسیر + خطای 502 صادقانه در سورس |
| W-4 | در نبود اتصال واقعی VERIFIED نشود | قاعده صفر | web | VERIFIED | این چرخه اتصال واقعی اثبات شد؛ F6: قبل از فیکس 404 واقعی ثبت شد، بعد از فیکس 200 واقعی — هیچ VERIFIED جعلی |
| FP-1 | جدول Feature Parity (Web/Android/Backend/وضعیت) | مستند کامل | audit | VERIFIED | `docs/audit/FEATURE_PARITY_F5.md`؛ F6: FEATURE_PARITY_F6 بازتولید شد |
| FP-2 | هیچ Mock محلی به‌عنوان قابلیت سرورمحور معرفی نشود | تفکیک صادقانه | audit | VERIFIED | ستون Parity حالت آفلاین محلی را جدا می‌کند؛ F6: صفحهٔ /emulator فقط با نقش OWNER (T6/T7) — Mock پنهان نشد |
| SEC-1 | احراز هویت/نشست/CSRF/Rate Limit | ماتریس ۱۱تایی | web | VERIFIED | `sec-matrix.txt`: 401/307/403/429/200؛ F6: ماتریس ۱۱/۱۱ + storm ورود 401×10→429 پس از restart سرور |
| SEC-2 | Setup اولیه OWNER بدون رمز پیش‌فرض | fail-closed token | web | VERIFIED | بدون توکن→خطا؛ توکن غلط→خطا؛ تلاش دوم→رد؛ DB با صفر کاربر؛ F6 باتری DB تازه: بدون توکن 403، توکن غلط 403، توکن معتبر 200، تلاش دوم/سوم 403، تلاش overwrite مالک 403، ورود admin/admin123=401 |
| SEC-3 | رمز قوی تولیدی + هش scrypt | بدون رمز پیش‌فرض | web | VERIFIED | رمز تولیدی openssl در `artifacts/credentials/` (gitignored)؛ scrypt N=2^16؛ F6: هش «s2:…» با طول 164؛ plaintext=0 در DB تازه |
| SEC-4 | جداسازی کاربران | داده متقاطع ممنوع | web | VERIFIED | F4 B2 + G1 (403)؛ F6: user به حساب‌های مالک صفر دسترسی (مالی) + T6/T7 403 |
| SEC-5 | حذف واقعی داده | بعد از حذف gone | web | VERIFIED | F4 R4d + D6 + delete-all با تأیید؛ F6: کد تغییر نکرده — F5 پابرجا |
| SEC-6 | محافظت API Key + جلوگیری از نشت | صفر نشت | web | VERIFIED | باگ واقعی G5 کشف و رفع شد → G5b leak=0؛ F6 canary در ۴ مسیر: settings-API، export، پیام خطای تست، لاگ سرور — همگی 0 |
| SEC-7 | ثبت ActionLog + پشتیبان‌گیری امن | کامل | web | VERIFIED | ActionLog + export/import/delete-all با تأیید؛ F6: backup واقعی (ردیف‌ها MATCH) + restore واقعی روی :3102 — ورود مالک 200 و مانده دقیقاً برابر لحظهٔ backup (681889) |
| SEC-8 | تغییر رمز/بازیابی حساب | مسیرهای امن | web | VERIFIED | auth/password + UserAudit (F3 audit)؛ F6: کد تغییر نکرده — F5 پابرجا |
| QA-1 | Unit (وب) | سبز کامل | qa | VERIFIED | 267/267؛ F6: 267/267 روی 57aefdb (بعد از فیکس WX) |
| QA-2 | JVM اندروید | سبز کامل | qa | VERIFIED | 83/83 شامل BankSmsFilterTest 11/11؛ F6: 83+83 (user+owner) صفر خطا — شامل BankSmsFilterTest |
| QA-3 | E2E وب | صفر خطای کنسول | qa | VERIFIED | 11/11 PASS consoleErrors=0؛ F6: 11/11 دو بار (6664c3c و 57aefdb) با صفر console-error |
| QA-4 | ماتریس امنیت | ۱۱/۱۱ | qa | VERIFIED | `sec-matrix.txt`؛ F6: 11/11 + باتری راه‌اندازی DB تازه (S1–S11) |
| QA-5 | رگرسیون پس از تغییر کد | دوباره اجرا | qa | VERIFIED | build+unit+E2E+sec-matrix پس از هر تغییر با کد نهایی دوباره اجرا شد؛ F6: رگرسیون پس از فیکس WX — tsc صفر، 267/267، E2E 11/11 |
| QA-6 | Performance/Offline | اندازه‌گیری | qa | PARTIAL | offline local-rules مسیر + E2E بدون overflow؛ بنچمارک رسمی اجرا نشد؛ F6: کد تغییر نکرده — F5 پابرجا |
| DL-1 | APK نهایی user + owner | امضا + SHA | delivery | VERIFIED | `download/RahyAr-F5/` ۴ APK (2 debug + 2 release CN=RahyAr)؛ F6: همان چهار APK + اثبات بازساخت بایت‌به‌بایت + SHA256 تازه |
| DL-2 | سورس کامل + Source ZIP منطبق با HEAD | از یک commit | delivery | VERIFIED | ZIP از HEAD نهایی در بسته تحویل؛ F6: Source ZIP با git archive از 57aefdb |
| DL-3 | Evidence ZIP + SHA256SUMS | بسته کامل | delivery | VERIFIED | `RahyAr-F5-Evidence.zip` + SHA256SUMS؛ F6: Evidence ZIP + SHA256SUMS تازه (۱۶۲+ مدخل) — همه OK |
| DL-4 | RTM + Parity + گزارش‌ها + راهنماها | اسناد | delivery | VERIFIED | `docs/audit/` + `download/RahyAr-F5/`؛ F6: RTM F6 + Parity F6 + گزارش فارسی/انگلیسی + راهنماها از 57aefdb |
| DL-5 | ویدئوی اجرای واقعی + لینک دانلود ثابت | بیرونی مستقل | delivery | PARTIAL | ویدئوی وب ثبت شد؛ ویدئوی دستگاه فیزیکی و لینک ثابت بیرونی BLOCKED (tmpfiles موقت + bundle جایگزین)؛ F6: لینک‌ها از چرخه‌های قبل معتبر؛ بستهٔ F6 برای انتشار با SHA — اقدام مالک (push) باقی است |

## یافته‌های جدید چرخه F6

| ID | الزام | معیار پذیرش | لایه | وضعیت | مدرک |
|---|---|---|---|---|---|
| F6-1 | امنیت تاریخچهٔ Git (GIT-SEC-1) | بلاب keystore کهن + .evidence-password در ۹۱ کامیتِ پوش‌نشده؛ هرگز به GitHub نرفته (merge-base=false) اما bundle کامل آن‌ها را منتقل می‌کند | infra | PARTIAL | merge-base/ls-remote/cat-file؛ هشدار در PUSH-INSTRUCTIONS.txt؛ scripts/git-history-purge.sh آماده — اقدام نهایی با مالک (بازنویسی تاریخچه = تأیید مالک) + چرخاندن رمز شواهد |
| F6-2 | نقص بستهٔ انتقال F5 | bundle/patches تا a60509f بودند و کامیت نهایی 6664c3c را نداشتند (۹۰ patch به‌جای ۹۰+۱) | infra | VERIFIED | بازتولید از HEAD نهایی: ۹۱ patch + bundle با main=HEAD؛ SHA256SUMS 162/162 OK |
| F6-3 | تصحیح شمارش RTM | گزارش F5 «۱۲۰ ردیف» می‌گفت؛ ماتریس واقعی ۱۳۶ ردیف دارد | audit | VERIFIED | پارس ماشینی همین چرخه — هیچ ردیفی حذف نشد |
| F6-4 | ثبت تراکنش مالی از طریق چت | اکشن‌های چت فقط add_task/add_reminder می‌سازند؛ دستور «هزینه ثبت کن» تسک می‌سازد نه تراکنش | web | NOT_IMPLEMENTED | F6: دو آزمون واقعی چت → add_task؛ سورس: فقط دو نوع اکشن |
| F6-5 | تراکنش دوره‌ای مالی | هیچ مدل/مسیر دوره‌ای در finance وجود ندارد | web | NOT_IMPLEMENTED | F6: جست‌وجوی کامل سورس (find/grep) — فقط scheduler یادآورها |
| F6-6 | گزارش مالی سالانه | فقط گزارش روزانه API + ماهانه کلاینت/پنجرهٔ export | web | NOT_IMPLEMENTED | F6: grep yearKey/yearly — خالی |
| F6-7 | گلیف فارسی در PDF سرور | WinAnsi فونت PDF فارسی را «?» می‌کند؛ اعداد/ساختار سالم | web | PARTIAL | F6: pdftotext/strings خروجی واقعی — «????-????» برای نام حساب |
| F6-8 | بوت شبیه‌ساز در این چرخه | ۳ تلاش ساخت‌یافته (480s/500s/590s) — adb device می‌شود ولی sys.boot_completed هرگز 1 نمی‌شود | android | BLOCKED | artifacts/reports/f6/emu + bootwatch1/2.log + f6-qemu.log — علت محیطی (TCG تک‌هسته‌ای/دیسک)؛ شواهد F5 برای باینری بایت‌به‌بایت یکسان معتبر |
| F6-9 | صحت بستهٔ تحویلی | SHA256SUMS بازتولید و همهٔ مدخل‌ها OK | delivery | VERIFIED | sha256sum -c → OK کامل |
| F6-10 | فیکس آب‌وهوا (F6-WX-1/2) | شهر فارسی کش‌سرد 404 → wttr-geocode fallback → 200؛ + updatedAt در API و UI | web | VERIFIED | کامیت 57aefdb؛ آزمون سیم واقعی قبل/بعد؛ tsc=0، unit 267/267، E2E 11/11 |

## جمع‌بندی وضعیت‌ها (۱۳۶ ردیف موروثی + 10 یافته F6)

- **VERIFIED:** 103
- **PARTIAL:** 14
- **IMPLEMENTED_NOT_TESTED:** 6
- **NOT_IMPLEMENTED:** 9
- **BLOCKED:** 14
- **جمع کل ردیف‌ها:** 146

- **قاعدهٔ صداقت:** هیچ ردیفی حذف نشد؛ VERIFIED بدون آزمون بازتولیدپذیر صادر نشد؛ موارد وابسته به دستگاه/اعتبارنامه صادقانه BLOCKED/PARTIAL ماندند و شواهد F5 فقط با اثبات «باینری/کد یکسان» به آن‌ها استناد شد.