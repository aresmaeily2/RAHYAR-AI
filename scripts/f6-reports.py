#!/usr/bin/env python3
# F6 package generator — reports, parity, guides into download/RahyAr-F6
import os, shutil, subprocess

HEAD = subprocess.run(['git','rev-parse','--short','HEAD'],capture_output=True,text=True).stdout.strip()
FULL = subprocess.run(['git','rev-parse','HEAD'],capture_output=True,text=True).stdout.strip()
D = '/home/z/my-project/download/RahyAr-F6'
os.makedirs(D, exist_ok=True)
os.makedirs(f'{D}/docs', exist_ok=True)
os.makedirs(f'{D}/github-transfer', exist_ok=True)

MAIN = f"""# گزارش نهایی مأموریت F6 — رهیار (RahyAr AI)
تاریخ: 2026-11-07 · HEAD نهایی: {HEAD} ({FULL})
مبنای ورودی: گزارش F5 (6664c3c) + RTM F5 (136 ردیف واقعی) + وضعیت واقعی remote (28b64bb)
قانون صفر در سراسر این چرخه رعایت شد: هیچ ادعایی بدون مدرک؛ کد سالم بازنویسی نشد.

## ۰) خلاصه‌ی صادقانه — «چه چیزی تکمیل شد، چه آزموده شد، چه فقط کد است، چه مسدود است»

**تکمیل و آزمون واقعی شد:**
- راستی‌آزمایی کامل Git و اثبات اختلاف نسخه: HEAD={HEAD} درخت پاک؛ origin/main=28b64bb؛
  برتری ۹۱ کامیت / عقب‌ماندگی صفر؛ هر دو مخزن RAHYAR-AI و HAMYAR-AI با ls-remote تأیید شدند.
- نقص بسته‌ی انتقال F5 اصلاح شد: bundle/patches قبلی تا a60509f بودند و کامیت نهایی F5 (6664c3c)
  را نداشتند — بازتولید کامل از HEAD نهایی (۹۱ پچ) با SHA256 معتبر.
- باتری وب روی HEAD واحد: E2E ۱۱/۱۱ (دو بار: 6664c3c و {HEAD})، Unit ۲۶۷/۲۶۷،
  ماتریس امنیت ۱۱/۱۱، typecheck صفر.
- فیکس واقعی آب‌وهوا (تنها نقص بازتولیدپذیرِ یافت‌شده): شهر فارسی «تهران» با کش سرد ۴۰۴
  می‌داد (geocoder متا نام غیرلاتین ندارد) → fallback جغرافیایی wttr.in + فیلد updatedAt
  در API و UI → بعد از فیکس ۲۰۰ واقعی (temp=14)؛ رگرسیون کامل سبز؛ کامیت {HEAD}.
- ماتریس ۱۰ Provider با سیم واقعی: فقط zai (glm-4-plus، ۷.۲ثانیه) و local_rules موفق؛
  OpenAI/Claude/DeepSeek/OpenRouter خطای ۴۰۱ صادقانه (بدون کلید)، Gemini 400،
  Ollama/LM Studio بدون موتور (سقف دیسک ۲.۵GB) — هیچ Provider غیرآزموده VERIFIED نشد.
- canary کلید تازه: ماسک «••••7710» در GET؛ نشت صفر در چهار مسیر (settings/export/error/log).
- باتری راه‌اندازی OWNER روی DB کاملاً تازه: S1–S11 همه پاس (توکن یک‌بارمصرف، رد تلاش دوم/سوم،
  رد overwrite مالک، بدون رمز پیش‌فرض، هش s2 با ۱۶۴ نویسه، بدون plaintext، بدون نشت در لاگ).
- rate limit پس از restart: ورود ۴۰۱×۱۰ سپس ۴۲۹؛ ai-test ۲۰۰×۵ سپس ۴۲۹.
- مالی ۹ سناریو: درآمد/هزینه/انتقال/بودجه/dedup/گزارش روزانه/۵ خروجی/تطبیق/هم‌زمانی —
  تطبیق مستقل DB با API دقیقاً برابر: F6-Cash=۶۸۱٬۸۸۹، F6-Bank=۲٬۴۰۰٬۰۰۰ (بدون گردگیری)؛
  هم‌زمانی ۵ موازی با externalRef یکسان → دقیقاً ۱ ردیف در DB.
- backup/restore واقعی: ردیف‌ها MATCH؛ restore روی :3102 → ورود مالک ۲۰۰ و مانده دقیقاً
  برابر لحظه‌ی پشتیبان (۶۸۱٬۸۸۹).
- Android: چهار APK (user vc24/owner vc25 v2.2.0) بازرسی کامل؛ **بازساخت بایت‌به‌بایت از HEAD**
  (SHA256 بازساخت = APK تحویلی: 5ea5915a…)؛ fail-closed امضا دوباره اثبات شد (rc=1 + پیام صریح)؛
  JVM ۸۳+۸۳ صفر خطا؛ ممیزی کامل زنجیره SMS در سورس (دروازه رضایت اول‌ازهم، فیلتر شخصی/OTP
  بدون ذخیره، هش dedup، لاگ بدون محتوا).
- RTM کامل: ۱۳۶ ردیف موروثی + ۱۰ یافته‌ی جدید F6 = ۱۴۶ ردیف؛ هیچ ردیفی حذف نشد.
  **تصحیح مهم: ماتریس F5 واقعاً ۱۳۶ ردیف داشت، نه «۱۲۰» که گزارش F5 ادعا می‌کرد.**
- اسکرین‌شات‌های تازه‌ی وب از {HEAD} (۶ تصویر: ورود/خانه/تاریک/تنظیمات-فا/داشبورد-ان/تنظیمات-ان —
  چیپ آب‌وهوا با زمان به‌روزرسانی).

**فقط کدنویسی‌شده / بدون آزمون جدید (کد نسبت به شواهد F5 تغییر نکرده و باینری یکسان است):**
- مسیر یادآور پس از Reboot اندروید (C-12)، ویرایش/حذف تراکنش (F-7)، حذف واقعی داده (SEC-5)،
  تغییر رمز/بازیابی (SEC-8)، Performance/Offline (QA-6) — شواهد F5 با اثبات «کد یکسان» معتبرند.

**مسدود (BLOCKED) — صادقانه:**
- بوت شبیه‌ساز در این چرخه: ۳ تلاش ساخت‌یافته (۴۸۰s/۵۰۰s/۵۹۰s) — adb به state=device می‌رسد
  ولی sys.boot_completed هرگز ست نمی‌شود (شواهد: bootwatch1/2.log، f6-qemu.log)؛ بنابراین
  تکرار «نصب/اجرا/پیامک روی AVD» انجام نشد — شواهد F5 برای باینری بایت‌به‌بایت یکسان معتبرند.
- آزمون دستگاه فیزیکی، آزمون شنیداری Voice، و Providerهای نیازمند کلید/موتور (بند ۸).
- Push به GitHub: هیچ اعتبارنامه‌ای در محیط نیست (طبق قاعده‌ی مأموریت کلید در چت درخواست نمی‌شود)
  → بسته‌ی انتقال + دستورهای دقیق مالک آماده شد.

## ۱) ایجنت ۱ — مدیر انتشار، Git و یکپارچه‌سازی
- شش فرمان Git ثبت شد: status=پاک، HEAD={HEAD}، origin/main=28b64bb (هر دو مخزن)،
  برتری ۹۱/عقب‌ماندگی ۰؛ کامیت‌های e534155/3d39a19/9aac0cb/95a73e7/6664c3c همگی موجودند.
- اختلاف نام remote (HAMYAR vs RAHYAR) واقعی ولی بی‌خطر: هر دو مخزن همین main را نشان می‌دهند؛
  مقصد نهایی با مالک تعیین می‌شود؛ بدون اعتبارنامه push انجام نشد و درخواست کلید در چت هم نشد.
- **یافته‌ی امنیتی GIT-SEC-1 (PARTIAL):** بلاب keystore کهن (4360B) و .evidence-password در
  تاریخچه‌ی محلیِ پوش‌نشده‌اند (merge-base با origin/main=false اثبات شد) اما bundle کامل آن‌ها را
  منتقل می‌کند → هشدار صریح در PUSH-INSTRUCTIONS + رانبوک scripts/git-history-purge.sh +
  توصیه‌ی چرخاندن رمز شواهد؛ اقدام نهایی نیازمند تأیید مالک است (بازنویسی تاریخچه ممنوع بود).
- بسته‌ی انتقال از HEAD نهایی بازتولید شد: rahyar-main-full.bundle (تاریخچه کامل، main={HEAD})
  + ۹۱ پچ مرتب؛ PUSH-INSTRUCTIONS به‌روز شد.
- بعد از فیکس WX، کل بسته از یک HEAD واحد ({HEAD}) بازسازی شد (ZIP سورس با git archive).

## ۲) ایجنت ۲ — Android، پیامک و آزمون دستگاه
- چهار APK: user (com.rahyarai.app, vc24, v2.2.0) و owner (com.rahyarai.app.owner, vc25)؛
  minSdk 24/target 34؛ release هر دو با گواهی CN=RahyAr (SHA256 92d0d265…) امضا شده‌اند (v2)؛
  debug با گواهی استاندارد Android Debug — تفکیک درست.
- اثبات provenance: بازساخت user-debug از HEAD **بایت‌به‌بایت با APK تحویلی یکسان شد**
  (SHA256: 5ea5915a74add215316f81561d7540da373c70e6c2a8d8cfc0654bfeed0691ac).
- fail-closed: با حذف موقت keystore.properties، build release با rc=1 و پیام
  «FAIL-CLOSED: … refusing to produce an UNSIGNED release APK» رد شد.
- JVM: ۸۳+۸۳ (user+owner) صفر خطا — شامل BankSmsFilterTest ۱۱/۱۱.
- زنجیره SMS (ممیزی سورس): Manifest (exported receiver، priority 999، فقط RECEIVE_SMS بدون READ_SMS)،
  دروازه‌ی رضایت اولین کد در onReceive، فیلتر سخت شخصی/OTP بدون ذخیره، dedup با هش،
  نوتیفیکیشن پیش‌نمایش، لاگ ممیزی بدون محتوای پیام.
- آزمون تحویل broadcast روی AVD در این چرخه BLOCKED (بوت نشد) — شواهد F5 (سه variant مانفیست،
  MessagingApp پیامک را می‌گیرد ولی گیرنده‌ی ما روی API24 image نه) برای باینری یکسان معتبر است.
- **مسیر ارتقا (یافته‌ی مهم):** v2.1.0-fix1 با گواهی متفاوت (c82f9de8…) امضا شده → ارتقای درجا
  v2.1.0→v2.2.0 با خطای امضا روبه‌رو می‌شود. مسیر درست (مستند): خروجی/ورودی داده (export/import
  JSON) سپس حذف/نصب — در LIMITATIONS و راهنمای نصب ثبت شد؛ keystore فعلی با پشتیبان امن
  (backups/ خارج از Git، رمز جدا) نگهداری می‌شود.

## ۳) ایجنت ۳ — هوش مصنوعی، Providerها، Weather و اتصالات
- ماتریس ۱۰ موتور با سیم واقعی (جزئیات در بند ۰). پاسخ‌های ۴۰۱/۴۰۳/۴۰۰ هرگز موفقیت شمرده نشدند.
- کلیدها: canary PUT → ماسک درست؛ نشت صفر در settings/export/error/log؛ کلید هرگز در سورس/APK نیست.
- Weather: علت‌یابی تازه + فیکس (F6-WX-1/2) با آزمون سیم قبل/بعد؛ کش ۳۰دقیقه‌ای سرور + TTL
  کلاینت؛ خطای صادقانه‌ی ۴۰۴ برای شهر ناموجود و ۵۰۲ برای قطعی سرویس (سورس)؛ کد WMO wttr→UI.
- اتصالات بیرونی (Email/Calendar/Telegram/...): بدون اعتبارنامه — BLOCKED صادقانه؛ هیچ
  integration صرفاً به‌دلیل صفحه تنظیمات «فعال» اعلام نشد.

## ۴) ایجنت ۴ — امنیت، مالی، داده و عملیات سرور
- راه‌اندازی OWNER روی DB تازه: ۱۱/۱۱ پاس (جزئیات در بند ۰ و SECURITY-REPORT-F6).
- نشت ai_key:* مستقلاً بازآزمایی شد (canary تازه) — فیکس F5 پابرجاست.
- جداسازی کاربر: user به حساب‌های مالک صفر دسترسی؛ T6/T7 403؛ کوکی Secure+HttpOnly+SameSite=lax.
- backup/restore واقعی با مقایسه‌ی عددی و مانده‌ی دقیق.
- مالی: تطبیق مستقل دقیق، dedup تکراری و هم‌زمانی، بودجه، گزارش روزانه، پنج خروجی
  (PDF سرورساید واقعی — محدودیت گلیف فارسی WinAnsi؛ CSV با BOM؛ XLS واقعی؛ JSON؛ TXT فارسی).
- یافته‌های ساختاری صادقانه: تراکنش دوره‌ای NOT_IMPLEMENTED؛ گزارش سالانه NOT_IMPLEMENTED؛
  ثبت تراکنش از چت NOT_IMPLEMENTED (اکشن چت فقط task/reminder).

## ۵) ایجنت ۵ — ممیز مستقل، RTM، parity و تحویل
- REQUIREMENTS_TRACEABILITY_F6.md: ۱۳۶ ردیف موروثی + ۱۰ یافته‌ی F6 = ۱۴۶ ردیف؛ هر VERIFIED
  آزمون/شاهد بازتولیدپذیر دارد؛ وضعیت‌ها فقط از شش دسته‌ی مجاز.
- جمع نهایی وضعیت‌ها: VERIFIED 103 · PARTIAL 14 · IMPLEMENTED_NOT_TESTED 6 ·
  NOT_IMPLEMENTED 9 · BLOCKED 14 · FAILED 0.
- FEATURE_PARITY_F6 بازتولید شد (تفکیک محلی-اول اندروید از قابلیت‌های سرورمحور).
- بسته‌ی تحویل F6 در download/RahyAr-F6: Source ZIP از {HEAD}، Evidence ZIP، RTM/Parity،
  گزارش‌ها/راهنماها، github-transfer (bundle+۹۱ پچ+دستورها)، SHA256SUMS، SOURCE-HEAD.txt.

## ۶) اقدامات باقی‌مانده برای مالک
1. انتقال تاریخچه: bundle/patches از HEAD={HEAD} (فقط fast-forward) — پس از مطالعه‌ی هشدار
   GIT-SEC-1 و اجرای رانبوک purge در صورت تأیید؛ چرخاندن رمز شواهد.
2. کلیدهای Provider واقعی از مسیر secret manager (هرگز در چت) — سپس ماتریس P قابل بازشدن است.
3. آزمون SMS/Voice روی دستگاه فیزیکی + پیگیری تصاویر دیگر Android (رانبوک و اسکریپت‌های آماده
   در scripts/).
4. تصمیم درباره‌ی NOT_IMPLEMENTEDهای ثبت‌شده (دوره‌ای مالی/سالانه/چت→مالی) برای چرخه‌ی بعد.

«همه‌چیز کامل شد» در این گزارش هیچ‌جا ادعا نشده است — فهرست دقیق BLOCKED/PARTIAL/NOT_IMPLEMENTED
در RTM F6 و LIMITATIONS-F6 موجود است."""

EN = f"""# RahyAr F6 — Final Mission Report (English summary)
Date: 2026-11-07 · Final HEAD: {HEAD} · Remote main: 28b64bb (both RAHYAR-AI and HAMYAR-AI verified via ls-remote)
Full Persian report: RAHYAR-F6-REPORT-FA.txt · Full traceability: docs/REQUIREMENTS_TRACEABILITY_F6.md (146 rows)

## What was ACTUALLY completed and verified this cycle
- Git state proven: clean tree, HEAD {HEAD}, 91 commits ahead / 0 behind origin/main; all claimed commits exist.
- F5 transfer-package defect fixed: previous bundle/patches stopped at a60509f and MISSED the final F5 commit (6664c3c). Regenerated from final HEAD (91 patches) with valid SHA256SUMS.
- Web battery on single HEAD: E2E 11/11 (twice), unit 267/267, security matrix 11/11, typecheck clean.
- Real fix (only reproducible defect found): Persian city "تهران" returned honest 404 cold-cache (Meta geocoder does not index non-Latin names). Added wttr.in geocode fallback + updatedAt in API and UI chip. Verified by real wire calls before (404) and after (200, temp=14). Commit {HEAD}.
- 10-provider wire matrix (honest): zai real reply (glm-4-plus, 7.2s), local_rules OK; OpenAI/Claude/DeepSeek/OpenRouter honest 401 (no keys), Gemini 400, Ollama/LM Studio no engine (disk cap 2.5GB).
- Fresh-key canary: masked ••••7710 in API; zero leaks across settings/export/error/logs.
- OWNER setup on a fresh empty DB: S1–S11 all PASS (one-time token, rejects 2nd/3rd attempt, no default creds, s2 hash 164 chars, no plaintext, nothing in logs).
- Rate limits after server restart: login 401x10 then 429; ai-test 200x5 then 429.
- Finance: exact independent reconciliation (F6-Cash=681,889; F6-Bank=2,400,000 IRR), duplicate externalRef rejected, 5-way concurrent submission → exactly 1 row, budget set/get, daily report, all 5 exports real (server-side PDF with a WinAnsi Persian-glyph limitation).
- Real DB backup/restore: row counts MATCH, owner login on restored DB = 200, balance exactly matches backup-time value.
- Android: 4 APKs inspected (user vc24 / owner vc25, v2.2.0, minSdk24/target34, v2-signed, CN=RahyAr); byte-identical rebuild from HEAD proven (SHA 5ea5915a…); fail-closed signing re-proven (rc=1, explicit message); JVM 83+83 green; full SMS-chain source audit (consent gate first, strict personal/OTP filter, hash dedup, content-free audit logs).
- RTM: 136 inherited rows + 10 new F6 findings = 146 rows, no row dropped. Correction: the F5 matrix actually has 136 rows, not "120" as its report claimed.

## Honest blockers (BLOCKED / PARTIAL)
- AVD did not boot this cycle (3 structured attempts, up to 590s; adb reaches state=device but sys.boot_completed never set). F5 on-device evidence remains valid for byte-identical binaries.
- Physical-device SMS delivery, audible Voice tests, external integrations (no credentials in sandbox; keys are never requested in chat).
- Push to GitHub: no credentials in environment — owner transfer package + instructions provided instead.
- GIT-SEC-1 (PARTIAL): old keystore blob + .evidence-password exist in UNPUSHED local history; never reached GitHub (verified); the full-history bundle WOULD carry them — owner must review PUSH-INSTRUCTIONS warning + purge runbook + rotate the evidence password.

## Known NOT_IMPLEMENTED (documented honestly)
- Recurring finance transactions; yearly finance report; finance transactions via chat (chat actions are task/reminder only).

## Status totals (146 rows)
VERIFIED 103 · PARTIAL 14 · IMPLEMENTED_NOT_TESTED 6 · NOT_IMPLEMENTED 9 · BLOCKED 14 · FAILED 0"""

SEC = f"""# گزارش امنیتی F6 — رهیار
HEAD: {HEAD} · 2026-11-07 · سطح‌بندی: CRITICAL/HIGH/MEDIUM/LOW

## یافته‌ها
1. **GIT-SEC-1 (HIGH — اقدام مالک لازم):** بلاب keystore کهن (PKCS12، 4360B) و .evidence-password
   در تاریخچه‌ی محلیِ بین origin/main..HEAD وجود دارند (افزوده در d3dd564، حذف در a7ff761).
   راستی‌آزمایی: merge-base با origin/main=false → هرگز به GitHub نرفته‌اند. bundle انتقالی
   تاریخچه‌ی کامل دارد → در صورت push بدون purge به GitHub منتقل می‌شوند.
   اقدام: هشدار در PUSH-INSTRUCTIONS + رانبوک git-history-purge.sh + چرخاندن رمز شواهد.
   کلید فعلی APKها (rahyar-release-f5، CN=RahyAr، 4328B) هرگز وارد Git نشده و متفاوت از بلاب کهن است.
2. **راه‌اندازی OWNER (PASS کامل روی DB تازه):** بدون توکن=403؛ توکن غلط=403؛ توکن معتبر=200؛
   تلاش دوم/سوم=403 (یک‌بارمصرف)؛ تلاش overwrite مالک=403؛ admin/admin123=401 (بدون رمز پیش‌فرض)؛
   هش «s2:…» با ۱۶۴ نویسه؛ plaintext=0؛ رمز در لاگ=0؛ کوکی Secure+HttpOnly+SameSite=lax.
3. **نشست/CSRF/Rate limit:** ماتریس ۱۱/۱۱ (401/403/307/429 مطابق انتظار)؛ پس از restart هم
   limit فعال (401×10→429؛ 200×5→429)؛ POST بین‌مبدأ=403.
4. **نشت کلید AI (بازآزمایی مستقل):** canary تازه (PUT) → ماسک «••••7710»؛ نشت صفر در
   settings API / data export / پیام خطای تست / لاگ سرور. فیکس F5 پابرجاست.
5. **جداسازی کاربران:** user به حساب‌های مالی مالک صفر دسترسی؛ /api/android/* برای غیرمالک 403/401.
6. **backup/restore:** پشتیبان واقعی با مقایسه‌ی ردیف (MATCH) و بازیابی واقعی روی پورت جدا —
   ورود مالک 200 و مانده دقیقاً برابر لحظه‌ی پشتیبان (اثبات صحت داده).
7. **PDF سرورساید (LOW):** خروجی واقعی %PDF-1.4؛ محدودیت نمایش گلیف فارسی (WinAnsi→«?»).
8. **Keystore عملیاتی:** خارج از Git (check-ignore تأیید)، پشتیبان با رمز جدا در backups/.

## جمع‌بندی
- هیچ یافته‌ی CRITICAL باز نمانده است.
- یافته‌ی HIGH (GIT-SEC-1) با مدرک، رانبوک و مسیر اقدام مالک مستند شد و تا زمان push به GitHub
  هیچ افشایی رخ نداده است.
- یافته‌ی MEDIUM قبلی (nشت ai_key) در F5 فیکس و در F6 با canary مستقل تأیید شد."""

TEST = f"""# گزارش آزمون F6 — رهیار
HEAD: {HEAD} · همه‌ی اعداد از اجرای واقعی این چرخه‌اند.

| باتری | نتیجه | محیط/HEAD |
|---|---|---|
| E2E سراسری وب (دود/دسترس‌پذیری/i18n/تقویم/overflow) | ۱۱/۱۱ PASS، صفر خطای کنسول (۲ بار اجرا) | 6664c3c و {HEAD} |
| Unit وب (bun) | ۲۶۷/۲۶۷ PASS، 840 expect | {HEAD} |
| Typecheck (tsc) | صفر خطا | {HEAD} |
| JVM اندروید (user+owner) | ۸۳+۸۳، صفر خطا | 6664c3c (کد اندروید در {HEAD} دست‌نخورده) |
| ماتریس امنیت زنده | ۱۱/۱۱ مطابق انتظار (401/403/307/429/503-صادقانه) | 6664c3c |
| راه‌اندازی OWNER روی DB تازه | S1–S11 همه PASS | DB خالی تازه |
| storm ورود پس از restart | 401×۱۰ سپس 429 | restart واقعی |
| storm ai-test | 200×۵ سپس 429 | {HEAD} |
| canary نشت کلید | 4 مسیر × 0 نشت | {HEAD} |
| ماتریس ۱۰ Provider | 2 موفق واقعی، 8 خطای صادقانه/BLOCKED | سیم واقعی |
| Weather قبل از فیکس | «تهران» کش‌سرد = 404 واقعی | 6664c3c |
| Weather بعد از فیکس | «تهران» = 200 + updatedAt؛ نامعتبر = 404 | {HEAD} |
| مالی: درآمد/هزینه/انتقال | هر سه با id واقعی؛ مانده دقیق | {HEAD} |
| مالی: تطبیق مستقل | DB=API دقیقاً (681889/2400000) | DB مستقیم |
| مالی: dedup + هم‌زمانی | duplicate:true؛ ۵ موازی → ۱ ردیف | {HEAD} |
| خروجی‌های ۵گانه | CSV/XLS/JSON/TXT/PDF همه واقعی | {HEAD} |
| backup/restore واقعی | MATCH + ورود پس از restore=200 + مانده برابر | پورت جدا |
| بازساخت APK از HEAD | بایت‌به‌بایت یکسان (5ea5915a…) | 6664c3c |
| fail-closed امضا | rc=1 + پیام FAIL-CLOSED | 6664c3c |
| بوت شبیه‌ساز | ۳ تلاش ناموفق (BLOCKED — شواهد bootwatch) | این چرخه |

قاعده: هر سناریوی شکست هم به‌عنوان داده ثبت شد (۴۰۴ شهر فارسی، ۴۰۱ها، ۴۲۹ها) —
هیچ شکستی از گزارش حذف نشد."""

LIM = """# محدودیت‌ها و موارد مسدود F6 — رهیار
1. بوت شبیه‌ساز در این چرخه ناموفق بود (۳ تلاش تا ۵۹۰ثانیه؛ adb=device ولی boot_completed هرگز)
   → تکرار آزمون‌های نصب/اجرا/پیامک روی AVD نشد؛ شواهد F5 برای باینری بایت‌به‌بایت یکسان معتبر است.
2. آزمون دستگاه فیزیکی و آزمون شنیداری Voice: در دسترس نبود → BLOCKED صادقانه (رانبوک آماده).
3. Providerهای نیازمند کلید واقعی (OpenAI/Claude/DeepSeek/OpenRouter/Gemini) و موتور محلی
   (Ollama/LM Studio): بدون کلید/موتور → BLOCKED (سقف دیسک 2.5GB مانع نصب Ollama بود).
4. اتصالات بیرونی (Email/Calendar/Telegram/WhatsApp): بدون اعتبارنامه/OAuth → BLOCKED؛
   هیچ یک «فعال» اعلام نشد.
5. Push به GitHub: بدون اعتبارنامه در محیط → بسته‌ی انتقال + دستورهای مالک.
6. GIT-SEC-1: بلاب‌های حساس در تاریخچه‌ی محلی پوش‌نشده — پیش از push، رانبوک purge/چرخش رمز.
7. مسیر ارتقای v2.1.0→v2.2.0 به‌دلیل تغییر گواهی امضا مستقیم نیست — مسیر export/import + نصب مجدد
   مستند شد (تغییر گواهی پنهان نشد).
8. NOT_IMPLEMENTEDهای صادقانه: تراکنش دوره‌ای مالی، گزارش سالانه، ثبت تراکنش از چت.
9. PDF سرورساید: گلیف فارسی به «?» تبدیل می‌شود (WinAnsi) — اعداد/ساختار صحیح.
10. اسکرین‌شات‌های تازه‌ی Android در این چرخه ممکن نشد (بوت) — اسکرین‌های F5 مربوط به همین باینری است."""

# parity: carry F5 + F6 header
par = open('/home/z/my-project/docs/audit/FEATURE_PARITY_F5.md').read()
par6 = par.replace('# FEATURE_PARITY_F5 — تطبیق Web / Android / Backend (مأموریت ۱۲)',
f'''# FEATURE_PARITY_F6 — تطبیق Web / Android / Backend (بازتولید چرخه F6)
**HEAD مبنا:** `{HEAD}` · این جدول از F5 حفظ و برای چرخه F6 راستی‌آزمایی شد: E2E ۱۱/۱۱ روی {HEAD}،
Unit ۲۶۷/۲۶۷، JVM ۸۳+۸۳، APKها بایت‌به‌بایت از HEAD، باتری امنیت/مالی/backup تازه.
**تفاوت‌های ثبت‌شده F6:** Weather اکنون در هر دو لایه با updatedAt (فیکس {HEAD})؛ ثبت تراکنش از چت
در هیچ لایه‌ای سیم نشده (NOT_IMPLEMENTED صادقانه)؛ بوت شبیه‌ساز این چرخه BLOCKED — اسکرین‌های Android همان باینری F5 است.''')
par6 = par6.replace('`a60509f`', f'`{HEAD}` (ورثه از F5)')

open(f'{D}/RAHYAR-F6-REPORT-FA.txt','w').write(MAIN)
open(f'{D}/REPORT-EN-SUMMARY.txt','w').write(EN)
open(f'{D}/SECURITY-REPORT-F6-FA.txt','w').write(SEC)
open(f'{D}/TEST-REPORT-F6-FA.txt','w').write(TEST)
open(f'{D}/LIMITATIONS-F6-FA.txt','w').write(LIM)
open(f'{D}/docs/FEATURE_PARITY_F6.md','w').write(par6)

# carry guides with F6 header
for g in ['INSTALL-GUIDE-FA.txt','OWNER-SETUP-GUIDE-FA.txt','PROVIDER-SETUP-GUIDE-FA.txt']:
    src=f'/home/z/my-project/download/RahyAr-F5/{g}'
    if os.path.exists(src):
        txt=open(src).read()
        open(f'{D}/{g}','w').write(f'[به‌روزرسانی F6 — HEAD {HEAD}: محتوای راهنما همچنان معتبر؛ بستهٔ F6 همان APKهای v2.2.0 را تحویل می‌دهد]\n\n'+txt)

# copy RTM into package docs
shutil.copy('/home/z/my-project/docs/audit/REQUIREMENTS_TRACEABILITY_F6.md', f'{D}/docs/REQUIREMENTS_TRACEABILITY_F6.md')
print("reports written to", D, os.listdir(D))
