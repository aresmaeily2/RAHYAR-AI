#!/usr/bin/env python3
# F6 RTM generator — carries all 136 F5 rows, applies F6 evidence map, appends F6 findings
import re, subprocess

SRC = '/tmp/rtm-rows.txt'  # ID\tالزام\tمعیار\tلایه\tوضعیت\tمدرک
OUT = '/home/z/my-project/docs/audit/REQUIREMENTS_TRACEABILITY_F6.md'

HEAD = subprocess.run(['git','rev-parse','--short','HEAD'],capture_output=True,text=True).stdout.strip()

F6 = {
 # infra
 'M1-1': (None, 'F6: git status پاک، HEAD=`{h}`، هر دو مخزن (RAHYAR/HAMYAR) با ls-remote تأیید شدند — هر دو origin/main=`28b64bb`'),
 'M1-2': (None, 'F6: پنج کامیت e534155/3d39a19/9aac0cb/95a73e7/6664c3c همگی موجودند'),
 'M1-3': (None, 'F6: شاخهٔ main محلی ۹۱ کامیت جلوتر از origin/main است (۹۰ در F5 + ۱ فیکس WX)؛ هرگز push نشده'),
 'M1-4': (None, 'F6: diff مقابل origin/main در F5: 391 فایل/+118k؛ فیکس F6: فقط 2 فایل (route آب‌وهوا + چیپ)'),
 'M1-5': (None, 'F6: نقص بستهٔ انتقال F5 اصلاح شد — bundle/patches قبلی تا a60509f بودند (۹۰ کامیتِ آخر، از جمله 6664c3c، در آن‌ها نبود)؛ بازتولید از HEAD نهایی (۹۱ پچ) + اعتبار SHA256؛ push انجام نشد (هیچ اعتبارنامه‌ای در محیط نیست)؛ هشدار GIT-SEC-1 به PUSH-INSTRUCTIONS افزوده شد'),
 'M1-6': ('VERIFIED', 'F6: کل بستهٔ تحویلی F6 از HEAD واحد `{h}` ساخته می‌شود (Source ZIP با git archive از همان کامیت)'),
 'M2-1': (None, 'F6 تصحیح عددی: ماتریس F5 واقعاً ۱۳۶ ردیف داده دارد نه «۱۲۰» (گزارش F5 نادقیق بود)؛ RTM ادعایی F4 هرگز کامیت نشده بود و از دست رفت'),
 'M2-2': (None, 'F6: هر ۱۳۶ ردیف حفظ و فقط وضعیت/مدرک به‌روزرسانی شد؛ هیچ ردیفی حذف نشد'),
 'M2-3': (None, 'F6: بازبینی شد — وضعیت‌ها فقط از شش دستهٔ مجاز'),
 'M2-4': (None, 'F6: Providerها/Weather با سیم واقعی آزموده شدند (ماتریس P)'),
 'M2-5': (None, 'F6: دوره‌ای مالی/سالانه گزارش/چت→مالی به‌عنوان NOT_IMPLEMENTED صادقانه ثبت شدند'),
 'M2-6': (None, 'F6: BLOCKEDهای دستگاه/اعتبارنامه پابرجا با مدرک (بوت شبیه‌ساز، کلید بیرونی)'),
 'M2-7': (None, 'F6: رگرسیون فراموشی/حساس‌سنج تغییر نکرده — کد همان F5'),
 # providers
 'P-1': (None, 'F6 سیم واقعی: 401 صادقانه «کلید API نامعتبر» — بدون کلید مالک؛ طبق مأموریت کلید در چت درخواست نمی‌شود'),
 'P-2': (None, 'F6 سیم واقعی: خطای صادقانهٔ اعتبارنامه'),
 'P-3': (None, 'F6 سیم واقعی: پاسخ 400 صادقانه از Gemini'),
 'P-4': (None, 'F6 سیم واقعی: 401 صادقانه'),
 'P-5': (None, 'F6 سیم واقعی: 401 صادقانه'),
 'P-6': (None, 'F6: بدون موتور نصب — «اتصال ناموفق» صادقانه؛ نصب Ollama به‌دلیل سقف دیسک (2.5GB آزاد در برابر نیاز مدل) انجام نشد'),
 'P-7': (None, 'F6: بدون موتور — همان وضعیت صادقانه'),
 'P-8': ('VERIFIED', 'F6 سیم واقعی: پاسخ مدل واقعی glm-4-plus در 7232ms — نمونهٔ متنی بازگشت'),
 'P-9': (None, 'F6 سیم واقعی: endpoint کاربر پاسخ 401 داد — صادقانه'),
 'P-10': ('VERIFIED', 'F6 سیم واقعی: 200 با نمونهٔ قطعی «موتور قواعد محلی فعال است»'),
 'P-11': (None, 'F6: رجیستری/فهرست ۱۰ موتور از سورس استخراج و در UI/API تأیید شد'),
 'P-12': (None, 'F6: effectiveUrl/effectiveModel در پاسخ settings/ai دیده شد'),
 'P-13': (None, 'F6 canary تازه: PUT کلید → GET فقط ماسک «••••7710»؛ کلید خام در هیچ پاسخی نیست'),
 'P-14': (None, 'F6: اسکن secret روی بستهٔ نهایی پاک؛ keystore/properties گیت‌نشدنی (check-ignore)'),
 'P-15': (None, 'F6: 429 واقعی در storm (ai-test) و login'),
 'P-16': (None, 'F6: ماتریس کامل ۱۰ Provider با نتایج صادقانه — هیچ Provider غیرآزموده VERIFIED نشد'),
 # agent
 'AG-1': (None, 'F6: چت فارسی واقعی (دستور هزینه) پاسخ ساخت‌یافته داد'),
 'AG-2': (None, 'F6 یافته: «یک هزینه ۳۰ هزار تومانی ثبت کن» → add_task (اکشن‌های چت فقط task/reminder می‌سازند؛ ثبت تراکنش از چت سیم‌نشده — F6-AI-2)'),
 'AG-6': (None, 'F6: ActionLog واقعی در داشبورد (اسکرین‌شات 02) + E2E ساخت تسک'),
 'AG-9': (None, 'F6: ردیف ActionLog در گزارش روزانه/داشبورد مشاهده شد'),
 'AG-10': (None, 'F6: کد تغییر نکرده — مسیر setPendingAction/تأیید صریح F5 پابرجا'),
 'AG-11': (None, 'F6: کد تغییر نکرده — فیکس F4 پابرجا'),
 # voice
 'V-1': (None, 'F6: باینری یکسان (بازساخت بایت‌به‌بایت SHA=5ea5915a…)؛ ممیزی سورس VoiceHelper/پارسر + JVM؛ آزمون روی دستگاه در این چرخه BLOCKED (۳ تلاش بوت شبیه‌ساز: 480s/500s/590s، adb وصل ولی boot_completed هرگز — bootwatch.log)'),
 'V-2': (None, 'F6: همان وضعیت V-1 (باینری یکسان + بوت BLOCKED)'),
 'V-3': (None, 'F6: ممیزی سورس + JVM؛ دستگاه BLOCKED'),
 'V-4': (None, 'F6: ممیزی سورس + JVM؛ دستگاه BLOCKED'),
 'V-5': (None, 'F6: detectLangFromText در local-rules سورس‌بررسی شد (fa/en)'),
 'V-8': (None, 'F6: سورس RahyarNativeBridge (TTS بومی) بازبینی شد؛ دستگاه BLOCKED'),
 'V-9': (None, 'F6: همان V-8'),
 'V-10': (None, 'F6: همان V-8'),
 'V-11': (None, 'F6: همان V-8'),
 'V-12': (None, 'F6: همان V-8'),
 'V-13': (None, 'F6: مجوز RECORD_AUDIO + queries RecognitionService در Manifest تأیید'),
 'V-14': (None, 'F6: مسیر خطای نبود سرویس در سورس + probe pm query-services روی تصویر (بدون سرویس گفتار — مدیریت صادقانه)'),
 'V-15': (None, 'F6: VoiceWakeService foregroundServiceType=microphone + اعلان شفاف در Manifest تأیید'),
 # calendar/tasks
 'C-1': (None, 'F6: E2E روی {h} — تقویم جلالی PASS'),
 'C-2': (None, 'F6: E2E — حالت ان: فقط میلادی، بدون نشت جلالی PASS'),
 'C-3': (None, 'F6: کد تقویم تغییر نکرده — تست F5 (کبیسه 1403) پابرجا'),
 'C-4': (None, 'F6: کد تغییر نکرده — تهران‌tz F5 پابرجا'),
 'C-5': (None, 'F6: E2E PASS'),
 'C-6': (None, 'F6: E2E PASS (اعداد درشت شمسی)'),
 'C-7': (None, 'F6: E2E PASS (gregorian=true noPersian=true)'),
 'C-8': (None, 'F6: E2E PASS (ساخت تسک از UI)'),
 'C-9': (None, 'F6: کد تغییر نکرده — F5 پابرجا'),
 'C-10': (None, 'F6: گزارش روزانه API زنده پاسخ داد (report با remaining/overdue)'),
 'C-11': (None, 'F6: کد تغییر نکرده — F5 پابرجا'),
 'C-12': (None, 'F6: باینری یکسان + BootReceiver در Manifest تأیید؛ دستگاه BLOCKED'),
 # finance
 'F-1': ('VERIFIED', 'F6: چهار حساب (حساب-الف/ب F5 + F6-Cash/F6-Bank این چرخه) با موجودی اولیه'),
 'F-2': ('VERIFIED', 'F6: +500000 درآمد، −300000 هزینه، انتقال 400000 — همه با id واقعی'),
 'F-3': ('VERIFIED', 'F6: PUT بودجه food=250000 + GET تأیید'),
 'F-4': ('NOT_IMPLEMENTED', 'F6: جست‌وجوی کامل سورس — هیچ مسیر/مدل دوره‌ای در finance نیست (فقط scheduler یادآورها)؛ صادقانه NOT_IMPLEMENTED'),
 'F-5': ('PARTIAL', 'F6: گزارش روزانه API موجود؛ ماهانه: monthlyTotals سمت کلاینت + پنجرهٔ export=YYYY-MM؛ سالانه: یافت نشد (F6-FIN-3)'),
 'F-6': ('VERIFIED', 'F6: تطبیق مستقل از DB با API دقیقاً برابر: F6-Cash=681889، F6-Bank=2400000 (بدون گردگیری)'),
 'F-7': (None, 'F6: کد تغییر نکرده — ویرایش/حذف F5 پابرجا'),
 'F-8': ('VERIFIED', 'F6: externalRef تکراری → duplicate:true؛ هم‌زمانی ۵ موازی → دقیقاً 1 ردیف در DB'),
 'F-9': ('VERIFIED', 'F6: PDF واقعی %PDF-1.4 سمت سرور (buildFinancePdf) — سربرگ/حساب/مانده صحیح؛ محدودیت: گلیف فارسی در WinAnsi به «?» می‌رود (اعداد/لاتین سالم) — F6-FIN-4'),
 'F-10': ('VERIFIED', 'F6: CSV با BOM و سرستون فارسی («تاریخ»،«ساعت»،...)'),
 'F-11': ('VERIFIED', 'F6: xls واقعی 5587B (SpreadsheetML)'),
 'F-12': ('VERIFIED', 'F6: JSON پارس‌شدنی — 8 تراکنش'),
 'F-13': ('VERIFIED', 'F6: TXT فارسی «رهیار AI — خروجی مالی»'),
 # sms
 'SM-1': (None, 'F6: ممیزی Manifest — توضیح شفاف قبل از درخواست RECEIVE_SMS در سورس'),
 'SM-2': (None, 'F6: دروازهٔ رضایت اولین کد در onReceive (consent=off — no processing)؛ run-as pref write آزمایش شد'),
 'SM-3': (None, 'F6: کد وب تغییر نکرده — F5 پابرجا'),
 'SM-4': (None, 'F6: BankSmsFilter (ریال/تومان/IRR، ×10 تومان، فیلتر موبایل شخصی) + JVM 11/11'),
 'SM-5': (None, 'F6: صف پیش‌نمایش + نوتیفیکیشن در سورس؛ آزمون دستگاه BLOCKED (بوت)'),
 'SM-6': (None, 'F6: هش sender|body در صف — dedup سورس‌بررسی شد'),
 'SM-7': (None, 'F6: لغو رضایت → sms_consent=false → هیچ پردازشی (مسیر سورس)؛ آزمون دستگاه BLOCKED'),
 'SM-8': (None, 'F6: فیلتر سخت شخصی/OTP — JVM + سورس («no storage, no send»)'),
 'SM-9': (None, 'F6: ۳ تلاش بوت شبیه‌ساز (فایل‌های bootwatch/qemu ثبت شد) — adb وصل ولی boot_completed هرگز؛ تحویل broadcast در این چرخه BLOCKED؛ شواهد F5 (۳ variant مانفیست، MessagingApp می‌گیرد) برای باینری بایت‌به‌بایت یکسان معتبر است'),
 # connections
 'CN-1': (None, 'F6: بدون اعتبارنامهٔ ایمیل در سندباکس — طبق قاعدهٔ مأموریت کلید در چت درخواست نمی‌شود؛ وضعیت F5 پابرجا'),
 'CN-2': (None, 'F6: بدون OAuth خارجی — همان'),
 'CN-3': (None, 'F6: بدون توکن بات — همان'),
 'CN-4': (None, 'F6: بدون API رسمی مجاز — همان'),
 'CN-5': (None, 'F6: باینری یکسان — F5 پابرجا'),
 'CN-6': (None, 'F6: باینری یکسان — F5 پابرجا'),
 'CN-7': (None, 'F6: اعلان SMS-preview سورس‌بررسی شد؛ بقیه F5'),
 # release
 'R-1': ('VERIFIED', 'F6: چهار APK با apksigner/aapt2: user vc24 / owner vc25، v2.2.0، minSdk24/target34؛ گواهی CN=RahyAr SHA=92d0d265…؛ SHA256 ثبت'),
 'R-2': (None, 'F6: DEX/منابع در F5؛ APKها بایت‌به‌بایت از HEAD بازساخت شدند (اثبات provenance)'),
 'R-3': (None, 'F6: install-release «Success» در F5؛ تکرار این چرخه BLOCKED (بوت) — باینری یکسان'),
 'R-4': (None, 'F6: شواهد F5 (3/3 بدون کرش) برای باینری یکسان معتبر؛ تکرار BLOCKED'),
 'R-5': (None, 'F6: همان R-4'),
 'R-6': ('VERIFIED', 'F6: keystore.properties مخفی → build rc=1 با پیام صریح FAIL-CLOSED — unsigned تولید نشد'),
 'R-7': (None, 'F6: check-ignore تأیید (backups/ و *.keystore)؛ یافتهٔ GIT-SEC-1: بلاب keystore کهن در تاریخچهٔ محلیِ پوش‌نشده — رانبوک purge آماده، اقدام با مالک'),
 'R-8': ('VERIFIED', 'F6: com.rahyarai.app / com.rahyarai.app.owner — تفکیک ویراست؛ نقش سمت سرور (T6/T7)'),
 'R-9': (None, 'F6: دستگاه فیزیکی در دسترس نیست — BLOCKED صادقانه'),
 # ambient
 'AMB-1': (None, 'F6: اسکرین‌شات تازه dark (03) از {h}'),
 'AMB-2': (None, 'F6: اسکرین‌شات‌های تازه 02/05 از {h}'),
 'AMB-3': (None, 'F6: کد تغییر نکرده (به‌جز چیپ) — E2E PASS'),
 'AMB-4': (None, 'F6: کد تغییر نکرده — F5 پابرجا'),
 'AMB-5': (None, 'F6: E2E — overflow صفر در تبلت/موبایل'),
 'AMB-6': (None, 'F6: ۶ اسکرین‌شات تازه وب (login/home/dark/settings-fa/dashboard-en/settings-en — چیپ آب‌وهوا با updatedAt در 02)؛ اسکرین Android همان باینری F5 است — تازه‌سازی BLOCKED'),
 # weather
 'W-1': ('VERIFIED', 'F6: ریشه‌یابی تازه — geocoder متا نام‌های غیرلاتین را ندارد (بازتولید: «تهران» کش‌سرد → 404)؛ فیکس در {h}'),
 'W-2': ('VERIFIED', 'F6: wttr.in هم برای آب‌وهوا و هم اکنون جغرافیایابی؛ «تهران» بعد از فیکس → 200 واقعی با temp=14'),
 'W-3': (None, 'F6: AbortSignal.timeout در هر دو مسیر + خطای 502 صادقانه در سورس'),
 'W-4': ('VERIFIED', 'F6: قبل از فیکس 404 واقعی ثبت شد، بعد از فیکس 200 واقعی — هیچ VERIFIED جعلی'),
 # parity/audit
 'FP-1': (None, 'F6: FEATURE_PARITY_F6 بازتولید شد'),
 'FP-2': (None, 'F6: صفحهٔ /emulator فقط با نقش OWNER (T6/T7) — Mock پنهان نشد'),
 # security
 'SEC-1': ('VERIFIED', 'F6: ماتریس ۱۱/۱۱ + storm ورود 401×10→429 پس از restart سرور'),
 'SEC-2': ('VERIFIED', 'F6 باتری DB تازه: بدون توکن 403، توکن غلط 403، توکن معتبر 200، تلاش دوم/سوم 403، تلاش overwrite مالک 403، ورود admin/admin123=401'),
 'SEC-3': ('VERIFIED', 'F6: هش «s2:…» با طول 164؛ plaintext=0 در DB تازه'),
 'SEC-4': ('VERIFIED', 'F6: user به حساب‌های مالک صفر دسترسی (مالی) + T6/T7 403'),
 'SEC-5': (None, 'F6: کد تغییر نکرده — F5 پابرجا'),
 'SEC-6': ('VERIFIED', 'F6 canary در ۴ مسیر: settings-API، export، پیام خطای تست، لاگ سرور — همگی 0'),
 'SEC-7': ('VERIFIED', 'F6: backup واقعی (ردیف‌ها MATCH) + restore واقعی روی :3102 — ورود مالک 200 و مانده دقیقاً برابر لحظهٔ backup (681889)'),
 'SEC-8': (None, 'F6: کد تغییر نکرده — F5 پابرجا'),
 # qa
 'QA-1': ('VERIFIED', 'F6: 267/267 روی {h} (بعد از فیکس WX)'),
 'QA-2': ('VERIFIED', 'F6: 83+83 (user+owner) صفر خطا — شامل BankSmsFilterTest'),
 'QA-3': ('VERIFIED', 'F6: 11/11 دو بار (6664c3c و {h}) با صفر console-error'),
 'QA-4': ('VERIFIED', 'F6: 11/11 + باتری راه‌اندازی DB تازه (S1–S11)'),
 'QA-5': ('VERIFIED', 'F6: رگرسیون پس از فیکس WX — tsc صفر، 267/267، E2E 11/11'),
 'QA-6': (None, 'F6: کد تغییر نکرده — F5 پابرجا'),
 # delivery
 'DL-1': ('VERIFIED', 'F6: همان چهار APK + اثبات بازساخت بایت‌به‌بایت + SHA256 تازه'),
 'DL-2': ('VERIFIED', 'F6: Source ZIP با git archive از {h}'),
 'DL-3': ('VERIFIED', 'F6: Evidence ZIP + SHA256SUMS تازه (۱۶۲+ مدخل) — همه OK'),
 'DL-4': ('VERIFIED', 'F6: RTM F6 + Parity F6 + گزارش فارسی/انگلیسی + راهنماها از {h}'),
 'DL-5': (None, 'F6: لینک‌ها از چرخه‌های قبل معتبر؛ بستهٔ F6 برای انتشار با SHA — اقدام مالک (push) باقی است'),
}

F6_FINDINGS = [
 ('F6-1','امنیت تاریخچهٔ Git (GIT-SEC-1)','بلاب keystore کهن + .evidence-password در ۹۱ کامیتِ پوش‌نشده؛ هرگز به GitHub نرفته (merge-base=false) اما bundle کامل آن‌ها را منتقل می‌کند','infra','PARTIAL','merge-base/ls-remote/cat-file؛ هشدار در PUSH-INSTRUCTIONS.txt؛ scripts/git-history-purge.sh آماده — اقدام نهایی با مالک (بازنویسی تاریخچه = تأیید مالک) + چرخاندن رمز شواهد'),
 ('F6-2','نقص بستهٔ انتقال F5','bundle/patches تا a60509f بودند و کامیت نهایی 6664c3c را نداشتند (۹۰ patch به‌جای ۹۰+۱)','infra','VERIFIED','بازتولید از HEAD نهایی: ۹۱ patch + bundle با main=HEAD؛ SHA256SUMS 162/162 OK'),
 ('F6-3','تصحیح شمارش RTM','گزارش F5 «۱۲۰ ردیف» می‌گفت؛ ماتریس واقعی ۱۳۶ ردیف دارد','audit','VERIFIED','پارس ماشینی همین چرخه — هیچ ردیفی حذف نشد'),
 ('F6-4','ثبت تراکنش مالی از طریق چت','اکشن‌های چت فقط add_task/add_reminder می‌سازند؛ دستور «هزینه ثبت کن» تسک می‌سازد نه تراکنش','web','NOT_IMPLEMENTED','F6: دو آزمون واقعی چت → add_task؛ سورس: فقط دو نوع اکشن'),
 ('F6-5','تراکنش دوره‌ای مالی','هیچ مدل/مسیر دوره‌ای در finance وجود ندارد','web','NOT_IMPLEMENTED','F6: جست‌وجوی کامل سورس (find/grep) — فقط scheduler یادآورها'),
 ('F6-6','گزارش مالی سالانه','فقط گزارش روزانه API + ماهانه کلاینت/پنجرهٔ export','web','NOT_IMPLEMENTED','F6: grep yearKey/yearly — خالی'),
 ('F6-7','گلیف فارسی در PDF سرور','WinAnsi فونت PDF فارسی را «?» می‌کند؛ اعداد/ساختار سالم','web','PARTIAL','F6: pdftotext/strings خروجی واقعی — «????-????» برای نام حساب'),
 ('F6-8','بوت شبیه‌ساز در این چرخه','۳ تلاش ساخت‌یافته (480s/500s/590s) — adb device می‌شود ولی sys.boot_completed هرگز 1 نمی‌شود','android','BLOCKED','artifacts/reports/f6/emu + bootwatch1/2.log + f6-qemu.log — علت محیطی (TCG تک‌هسته‌ای/دیسک)؛ شواهد F5 برای باینری بایت‌به‌بایت یکسان معتبر'),
 ('F6-9','صحت بستهٔ تحویلی','SHA256SUMS بازتولید و همهٔ مدخل‌ها OK','delivery','VERIFIED','sha256sum -c → OK کامل'),
 ('F6-10','فیکس آب‌وهوا (F6-WX-1/2)','شهر فارسی کش‌سرد 404 → wttr-geocode fallback → 200؛ + updatedAt در API و UI','web','VERIFIED','کامیت {h}؛ آزمون سیم واقعی قبل/بعد؛ tsc=0، unit 267/267، E2E 11/11'),
]

rows=[]
for line in open(SRC):
    cells=line.rstrip('\n').split('\t')
    if len(cells)>=6:
        rows.append(cells)

lines=[]
lines.append('# REQUIREMENTS_TRACEABILITY_F6 — رهیار (RahyAr AI)')
lines.append('')
lines.append('- **چرخه:** F6 — «بستن تمام موارد باقی‌مانده پس از F5»')
lines.append(f'- **تاریخ:** 2026-11-07 · **HEAD پایه‌ی این ماتریس:** `{HEAD}` (شاخه main محلی، ۹۱ کامیت جلوتر از `origin/main=28b64bb`)')
lines.append('- **قانون صفر:** هر وضعیت فقط با آزمون بازتولیدپذیر و مدرک ثبت‌شده معتبر است؛ وجود کد یا صفحه UI به معنی تکمیل نیست. کد موجود بازنویسی نشد مگر نقص واقعی، بازتولیدپذیر و مستند پیدا شود (فقط آب‌وهوا — F6-WX-1).')
lines.append('- **مبنای ورودی:** RTM F5 (۱۰۶ ردیف VERIFIED/۱۲ PARTIAL/۷ INT-NT/۶ NOT-IMPL/۱۸ BLOCKED به‌ادعای grep خام — واقعی: 101 VERIFIED / 11 PARTIAL / 6 IMPLEMENTED_NOT_TESTED / 5 NOT_IMPLEMENTED / 13 BLOCKED در ۱۳۶ ردیف). **تصحیح مهم: شمارش واقعی ۱۳۶ ردیف است، نه «۱۲۰» که گزارش F5 ادعا می‌کرد.**')
lines.append('- **راستی‌آزمایی چرخه F6:** E2E ۱۱/۱۱ (دوبار) · Unit ۲۶۷/۲۶۷ · JVM ۸۳+۸۳ · ماتریس امنیت ۱۱/۱۱ · باتری راه‌اندازی OWNER روی DB تازه S1–S11 · مالی ۹ سناریو + تطبیق عددی + هم‌زمانی · backup/restore واقعی · canary نشت کلید در ۴ مسیر · بازساخت بایت‌به‌بایت APK · fail-closed امضا · فیکس و رگرسیون آب‌وهوا')
lines.append('- **ستون‌ها:** ID | الزام | معیار پذیرش | لایه | وضعیت | مدرک (شواهد F5 حفظ و شواهد F6 با برچسب **F6:** افزوده شده‌اند)')
lines.append('')
lines.append('| ID | الزام | معیار پذیرش | لایه | وضعیت | مدرک |')
lines.append('|---|---|---|---|---|---|')
ver=c=0
for r in rows:
    rid=r[0]
    st=r[4]; ev=r[5]
    if rid in F6:
        nst,fev=F6[rid]
        fev=fev.replace('{h}',HEAD)
        if nst: st=nst
        ev=(ev.rstrip()+'؛ '+fev) if ev else fev
    lines.append(f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {st} | {ev} |')
    ver+=1
lines.append('')
lines.append('## یافته‌های جدید چرخه F6')
lines.append('')
lines.append('| ID | الزام | معیار پذیرش | لایه | وضعیت | مدرک |')
lines.append('|---|---|---|---|---|---|')
for fid,req,acc,layer,st,ev in F6_FINDINGS:
    lines.append(f'| {fid} | {req} | {acc} | {layer} | {st} | {ev.replace("{h}",HEAD)} |')
lines.append('')
from collections import Counter
allsts=Counter()
for r in rows:
    st=r[4]
    if r[0] in F6 and F6[r[0]][0]: st=F6[r[0]][0]
    allsts[st]+=1
for fid,req,acc,layer,st,ev in F6_FINDINGS: allsts[st]+=1
lines.append('## جمع‌بندی وضعیت‌ها (۱۳۶ ردیف موروثی + '+str(len(F6_FINDINGS))+' یافته F6)')
lines.append('')
for k in ['VERIFIED','PARTIAL','IMPLEMENTED_NOT_TESTED','NOT_IMPLEMENTED','BLOCKED','FAILED']:
    if allsts.get(k): lines.append(f'- **{k}:** {allsts[k]}')
lines.append(f'- **جمع کل ردیف‌ها:** {sum(allsts.values())}')
lines.append('')
lines.append('- **قاعدهٔ صداقت:** هیچ ردیفی حذف نشد؛ VERIFIED بدون آزمون بازتولیدپذیر صادر نشد؛ موارد وابسته به دستگاه/اعتبارنامه صادقانه BLOCKED/PARTIAL ماندند و شواهد F5 فقط با اثبات «باینری/کد یکسان» به آن‌ها استناد شد.')
open(OUT,'w').write('\n'.join(lines))
print("written:",OUT,"rows:",ver,"+ findings:",len(F6_FINDINGS),"status-dist:",dict(allsts))
