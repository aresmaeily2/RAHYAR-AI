# گزارش انتشار V1-P3-R — تطبیق Local با GitHub و وضعیت واقعی انتشار

> تاریخ: 2026-11-08 | شاخهٔ `v1/voice-acceptance` | مأموریت: V1-P3-R (تطبیق و انتشار امن — بدون توسعهٔ جدید)
> قواعد وضعیت: **VERIFIED** / **RECORDED** (ثبت‌شده در سند، بازتأیید بایتی نشده) / **ABSENT** (در GitHub موجود نیست) / **LOST** (با بازیافت سندباکس از دست رفته) / **BLOCKED** (مانع محیطی یا مالکیت تصمیم) / **UNCHANGED**
> اصل صفر: وضعیت Git ابتدا بازخوانی شد؛ `main` هرگز تغییر نکرد؛ بدون reset --hard / force-push / حذف تاریخچه؛ هیچ credential/توکنی در چت، گزارش یا فایل چاپ نشد؛ هر دو تلاش push عادی (بدون force) بود و خروجی پاک‌سازی‌شده ثبت شد.

## ۱. وضعیت محلی — یافته‌های دقیق (مأموریت A)

| مورد | مقدار واقعی ثبت‌شده |
|---|---|
| origin | `https://github.com/aresmaeily2/HAMYAR-AI.git` (بدون credential داخل URL) |
| HEAD لحظهٔ بازخوانی | `b00a9ee` (main — رفتار snapshot سندباکس؛ شاخهٔ V1 به‌صورت ref سالم مانده) |
| tip شاخهٔ V1 | `bd07ecf000e831d522baa2ca99b929c794e175df` |
| کامیت‌های P2 (پایه) | `ccca074` → `d86af40` → `71be8c6` → `2b0b610` → `5439b22` → `0f5c62c` → `f0b9fc2` → `a619e1c` (۸ عدد، همگی در ancestry) |
| کامیت‌های P3 | `d2b76b8` → `140bc24` → `11dec39` → `bf912c1` → `a1d720b` → `68db1a7` → `bd07ecf` (۷ عدد، همگی در ancestry) |
| جمع اصلی..V1 | ۱۵ کامیت (`git rev-list --count main..v1/voice-acceptance` = 15) |
| تطبیق «هشت‌گانه» | بازهٔ انحصاری P3 (`a619e1c..bd07ecf`) = **۷ کامیت**؛ با شمولِ `a619e1c` (آخرین کامیت بخش ۲ در همان پنجرهٔ کاری) = **۸ کامیت** — هر سه SHA نام‌برده در مأموریت (`a619e1c`، `a1d720b`، `bd07ecf`) با `git cat-file` و `merge-base --is-ancestor` تأیید شد: **EXISTS + IN ancestry** |
| dangling | کامیت‌های ادعایی **dangling نیستند**؛ موارد dangling موجود (۱۰ عدد) کامیت‌های تاریخی دیگرند |
| main محلی | `b00a9ee` = `28b64bb` (main ریموت) + **۱۰۵ کامیت** محلی منتشرنشده (کل کار F2…V1) |
| مجموعهٔ انتشار v1 | **۱۲۰ کامیت** جدید نسبت به همهٔ refهای ریموت (`rev-list --not origin/main origin/feature tags…`) |

## ۲. تطبیق محتوای گزارش با سورس شاخه (مأموریت B) — هر مورد: مسیر، کامیت، خلاصهٔ diff

| مورد | مسیر فایل | کامیت | خلاصهٔ diff / اثبات محتوایی |
|---|---|---|---|
| pending-action و اتصال Pending به پیام مبدأ | `src/lib/assistant/pending-action.ts` + `src/app/api/chat/route.ts` + `src/app/api/chat/stream/route.ts` | `d2b76b8` | ۶ فایل، ‎+345/−53؛ `proposalMsgId`×8 و `proposalAt`×4 در pending-action؛ `pendingIsFresh` در POST×2 و stream×2 |
| کنترل مالکیت کاربر و انقضا | همان بالا + `tests/unit/v1-pending-freshness.test.ts` | `d2b76b8`، `140bc24` (‎+59) | تعریف `pendingIsFresh` (سطر ۵۸): نبودِ لنگر → false؛ `prop.userId !== userId` → false؛ تست‌های stale ×5 |
| پاک‌سازی JSON خام در ذخیره/تاریخچه/نمایش | `src/lib/assistant/reply-sanitize.ts` (جدید) | `d2b76b8` (‎+117) | `sanitizeReplyForDisplay` / `safeDisplayContent` / `displayFallback`؛ سیم‌کشی در هر دو روت: GET سطر 327/423، ذخیره سطر 380/605 — پیام‌های قدیمی آلوده هم پاکسازی می‌شوند |
| گارد صداقت Agent | `src/lib/server-ai.ts` + `tests/unit/v1-guard-unbacked-claim.test.ts` | `d86af40` (‎+76)، `d2b76b8` (‎+98)، `140bc24` (‎+64)، `11dec39` (‎+5) | regexهای ادعا (ثبت/حذف/تغییر/مرتب + «کرد/کردم/دادم») سطر 828/833/838/843؛ `MUTATING_ACTION_TYPES`×2 |
| کنترل ناسازگاری نوع هدف | `src/lib/server-ai.ts` | `bf912c1` (‎+19) | `TARGETS_REMINDER` + `TASK_MUTATION` → اکشن رد می‌شود (`ok:false` + note دوزبانه + logAction failed) |
| جلوگیری از حذف فازی و حذف جانبی | `src/lib/assistant/cancel-undo.ts` | `ccca074` (‎+85)، `d2b76b8` | حذف فقط `deleteMany({ id, userId })` سطر 136 (reminder) و 141 (task)؛ هیچ تطبیق فازی عنوانی مبنای حذف نیست |
| تست‌های جدید D-5/D-6/D-7 | سه فایل تست + هارنس | `140bc24` (۳ فایل، ‎+231، ۳۲ مورد)، `11dec39` (هارنس ۲۰۴ خطی + ابزار آلوده‌سازی) | نام هر ۳۲ تست در لاگ شواهد ثبت است |
| اصلاحات race و idempotency | `cancel-undo.ts` + تست‌ها | `ccca074`، `140bc24`، `d2b76b8` | deleteMany شمارشی بدون throw؛ پاسخ صادقانهٔ «چیزی برای انصراف نبود» (سطر 91)؛ تست idempotent پاکسازی (سطر 81 تست sanitize) |
| اسکریپت‌های آزمون و گزارش‌ها | `scripts/v1-fix-verify.sh` (۲۶۲)، `v1-p3-d5-d6-d7-verify.sh` (۲۰۴)، `v1-voice-scenarios-p2.sh` (۹۵)، `v1-p3-pollute.ts` (۳۰)، `v1-p3-memory-setup.ts` (۲۸)، `v1-p2-reset-test-state.ts` (۱۹) | `71be8c6`، `11dec39`، `bf912c1`، `a1d720b` | گزارش‌ها: `docs/audit/V1_P3_FINAL_REPORT.md` (۱۰۴)، `V1_P2_FINAL_REPORT.md` (۱۶۲) |

## ۳. مستندات الزامی روی شاخه (مأموریت C) — هر ۹ مورد PRESENT

| # | سند | مسیر روی شاخه | وضعیت |
|---|---|---|---|
| 1 | گزارش کامل V1-P3 | `docs/audit/V1_P3_FINAL_REPORT.md` | PRESENT (۱۰۴ خط، کامیت `bd07ecf`) |
| 2 | جدول D-5/D-6/D-7 قبل/بعد | بخش ۱ همان گزارش (سطرهای ۱۱–۱۴ با شاهد DB) | PRESENT |
| 3 | گزارش تست‌های تازه | بخش ۴: Unit 354/354، Typecheck 0، Lint 0+1، E2E 11/11، JVM 97، P6P8 11/0/1، امنیتی exit0، build+restart | PRESENT (RECORDED — در این مأموریت بازاجرا نشد؛ مأموریت توسعه نیست) |
| 4 | خروجی سناریوهای زنده با شناسهٔ DB | بخش ۳: canary `cmw7w1rvb0001pjvygccb6rzn`، حافظه `cmw7w1rle0001pjueq6w99b6m`، کار `cmw7w1t82004xpjfn829ujsbu`، undo `cmw7wgkz3003lpjk6p0ksmm2l`، پیام آلوده `cmw7w3b6a0001pj3fl59hhcn0` | PRESENT |
| 5 | گزارش امنیتی | `docs/audit/V1_P2_SECURITY_REVIEW.md` + ردیف‌های امنیتی ۴ و اسکن بخش ۶ گزارش P3 | PRESENT |
| 6 | گزارش Git و تاریخچه | بخش ۶ گزارش P3 (زنجیرهٔ کامیت‌ها) | PRESENT |
| 7 | راهنمای نصب و آزمون APK | `docs/audit/V1_P3_DEVICE_TEST_GUIDE_FA.md` (۵۵ خط) | PRESENT |
| 8 | محدودیت آزمون گوشی واقعی | گزارش P3 سطر 58/76/103 + راهنما سطر 5/55: همه **BLOCKED**، ادعاییِ آزمون دستگاه وجود ندارد | PRESENT |
| 9 | manifest تحویلی + SHA-256 | بخش ۵ گزارش P3: جدول SHA-256 چهار APK + گواهی `598facd4…` | PRESENT |

## ۴. بستهٔ تحویل (مأموریت D)

- `download/RahyAr-V1-P3/` و `download/RahyAr-V1-P2/` در snapshot فعلی سندباکس **موجود نیستند** (بازیافت محیط بین جلسات؛ تنها `download/RahyAr-Android/` که tracked است باقی مانده) → وضعیت: **LOST**. SHA256SUMS قدیمی قابل اجرای مجدد نیست.
- اثبات ماندگار نسخهٔ ۲.۴.۰ در سندِ tracked گزارش P3 است (جدول SHA-256 چهار APK + گواهی) — **RECORDED**؛ تطبیق بایتی APK اکنون ممکن نیست (**NOT VERIFIED** — فایل‌ها از دست رفته‌اند).
- tip شاخه (۸۸۰ فایل): هیچ keystore/vault/`.evidence-*`/db tracked نیست؛ فقط `.env.example` (قالب) و `scripts/p06r-keystore-recovery-test.py` (اسکریپت آزمون) — تمیز.
- یافته: سه APK قدیمی v2.1.0 (عصر F2) هنوز tracked هستند (`download/RahyAr-Android/…`) — توصیه: در مأموریت آینده به GitHub Releases منتقل و از سورس حذف شوند؛ ریسک credential ندارند اما واجد «حذف از سورس» هستند. در این مأموریت دست نخوردند.
- بستهٔ جدید این مأموریت: `download/RahyAr-V1-P3-R/` با SHA256SUMS تازه ساخته شد (بخش ۸).

## ۵. ممیزی پیش از push و تلاش انتشار (مأموریت E)

### ۵-۱. اسکن حساسیتِ کل مجموعهٔ انتشار (۱۲۰ کامیت، ۷۲۶ blob)

| یافته | blob | مسیر | معرفی | دسته‌بندی |
|---|---|---|---|---|
| keystore رمزشده | `a807354b1a9c17fa4e22df5ebc265f8006cf6f89` | `android/rahyar-release.keystore` | `d3dd564` (2026-10-28) | **از v1 قابل‌رسیدن** — بازکردن با مصالح مخزن ناممکن (آزمون ۸۵ نامزد ناموفق)، اما «حمل‌نشدن» الزام D.4 است |
| رمز evidence | `16f4706e73f48494d5e3a0fdeab9e75259ab1e6d` | `.evidence-password` | `87834e5` (2026-10-29) | PLACEHOLDER-LIKE + fingerprint C8 — از v1 قابل‌رسیدن |
| توکن نشست | `3b6bc8689e132af4e844931e401cab71dc9fd0ca` | `.evidence-session-token` | `87834e5` (2026-10-29) | NOT-OBVIOUSLY-PLACEHOLDER + fingerprint C9 — از v1 قابل‌رسیدن |
| pre-scrub رجیسترها | `d281a5c2…` (C1/C2/C5/C6/C10)، `2abfbc50…` (C6)، `6b4beb06…`/`edb4ffb4…` (C4)، `aeb61de4…` (C7) | `scripts/f2-security-scans.py`، `scripts/live-v2-tests.cjs`، `scripts/p06(r)_doc_safety_scan.py`، `scripts/audit-screens.mjs` | پیش از scrubهای R2 | نسخه‌های تاریخیِ pre-scrub — نسخهٔ tip پاک است ولی blob تاریخی reachable است |
| PEM-KEY | `2e83487b…` | `scripts/p06_scan.py` | — | **false positive** — رشتهٔ الگوی خودِ اسکنر، نه کلید واقعی |
| C3 | ۴۰ blob | متنوع | — | fingerprint کلمهٔ رایج — در گارد سخت‌گیر نیست |

- نکتهٔ مهم گارد: قلاب `pre-push` محلی (`scripts/tests/r2_push_guard.py`) فقط **tip** را می‌سنجد (diff پایه تا new + محتوای new) — blobهای تاریخی را نمی‌بیند؛ یعنی حتی گارد موجود انتشار تاریخچهٔ حساس را متوقف نمی‌کرد.
- پاک‌سازی F7 (سه مسیر) فقط **روی کلون** انجام شده بود و مخزن اصلی «دست‌نخورده» ماند — همین اکنون با `cat-file`/`rev-list --objects` مستقیم تأیید شد.

### ۵-۲. تلاش push عادی (بدون force)

```
$ git push origin v1/voice-acceptance   (GIT_TERMINAL_PROMPT=0)
fatal: could not read Username for 'https://github.com': terminal prompts disabled
EXIT: 128
```

- `ls-remote` قبل و بعد از تلاش: `main=28b64bb`، `feature/ambient-motion-polish=f2cf171`، ۳ تگ — **هیچ تغییری در ریموت**؛ شاخهٔ v1 در ریموت وجود ندارد.
- موجودی احراز هویت محیط: gh نصب نیست؛ `~/.ssh` خالی؛ هیچ `credential.*`؛ `GITHUB_TOKEN/GH_TOKEN/GIT_ASKPASS/GITHUB_PAT` set نیستند؛ `~/.git-credentials` و `~/.netrc` وجود ندارند. خواندن ناشناس (ls-remote/raw/API) کار می‌کند؛ **push = BLOCKED**.

### ۵-۳. نتیجهٔ E — BLOCKED با دو دلیل مستقل

1. **بدون credential** — هیچ روش احراز هویت امن موجودی در محیط نیست و طبق قواعد قبلی توکن مطالبه/چاپ نمی‌شود.
2. **تعارض حساسیت تاریخچه** — حتی با credential، انتشار «تاریخچهٔ واقعی» طبق E.1 سه blob مستند + carrierهای pre-scrub را منتشر می‌کند و D.4 (ممنوعیت افزودن keystore/رمز/token به GitHub) را نقض می‌کند. رفع این تعارف یک تصمیم مالک است (گزینه‌ها در بخش ۹) — نه تصمیم مجری.

## ۶. Pull Request (مأموریت F) — BLOCKED

- PR به `main` نیازمند وجود شاخه روی ریموت است؛ push انجام نشد و `gh` نصب نیست → PR ساخته نشد، هیچ Merge انجام نشد.
- Runbook برای پس از رفع مانع (ثبت‌شده، اجرانشده): push معمولی → `gh pr create --base main --head v1/voice-acceptance` (یا REST) با توضیح گزارش P3 + نتایج تست؛ PR باز و بدون merge نگه داشته می‌شود.

## ۷. راستی‌آزمایی مستقل از GitHub (مأموریت G — تطبیق‌یافته با وضعیتِ عدم انتشار)

| بررسی | روش | نتیجه |
|---|---|---|
| فهرست شاخه‌های ریموت | `git ls-remote origin` ×۳ (قبل/میان/بعد) + `api.github.com/repos/aresmaeily2/HAMYAR-AI/branches` | فقط `main=28b64bb` و `feature/ambient-motion-polish=f2cf171` — **شاخهٔ v1 وجود ندارد** |
| SHA کامل آخرین کامیت شاخهٔ V1 از GitHub | API/raw | **ABSENT** — قابل استخراج نیست |
| وجود کامیت‌های ادعاشده از ریموت | raw 404 | `raw…/v1/voice-acceptance/docs/audit/V1_P3_FINAL_REPORT.md` → `404: Not Found` |
| دریافت گزارش‌های V1-P3 از GitHub | raw | همان 404 — هیچ سند V1 روی ریموت نیست (حتی نسخهٔ P2 روی main هم 404 است؛ ریموت از عصر V1 عقب‌تر است) |
| مسیر کد و تست‌های D-5..D-7 از ریموت | raw | ABSENT |
| Compare `main...v1/voice-acceptance` | صفحهٔ compare | «There isn't anything to compare» + خطای بارگذاری refs — چون head وجود ندارد |
| ثابت‌ماندن main | ls-remote قبل/بعد + API | `28b64bb0bc21e162703a59a01f6d828f8c2065d4` در هر سه بازخوانی — **UNCHANGED**؛ `main` محلی `b00a9ee` هم بدون هیچ کامیت/تغییری |
| تطبیق SHA256 بسته با manifest منتشرشده | — | manifest روی GitHub ABSENT؛ بستهٔ محلی قدیمی LOST؛ بستهٔ جدید P3-R با SHA256SUMS تازه ساخته شد — تطبیق GitHub محلی ممکن نیست (**NOT VERIFIED**) |

## ۸. بستهٔ تحویل این مأموریت

`download/RahyAr-V1-P3-R/` — شامل این گزارش + چهار لاگ شواهد خام (`section-a.log`، `section-a2-auth.log`، `section-b-c.log`، `section-e-push.log`) + `SHA256SUMS`. گزارش در سندِ tracked شاخه نیز کامیت شد تا از بازیافت سندباکس در امان بماند.

## ۹. گزینه‌های پیشِ روی مالک برای رفع BLOCKED push

| گزینه | شرح | پیامد SHA | نکتهٔ امنیتی |
|---|---|---|---|
| ۱ — تاریخچهٔ تمیز (الگوی F7) | clone تمیز (filter-repo سه مسیر + حذف blobهای pre-scrub) + بازپخش ۱۵ کامیت V1؛ push شاخهٔ تمیز | SHA کامیت‌ها تغییر می‌کند؛ نگاشت قدیم→جدید (commit-map) منتشر می‌شود؛ «SHA یکسان محلی/ریموت» فقط برای tip پس از بازپخش برقرار است | تنها گزینه‌ای که D.4 را کامل برآورده می‌کند |
| ۲ — انتشار تاریخچهٔ واقعی با پذیرش صریح | push مستقیم تاریخچه با علم به سه blob + carrierها؛ چرخش/ابطال هویت‌های مرده در کنار آن | SHAها یکسان می‌مانند (معیار پایان برقرار) | خلاف D.4 فعلی مأموریت؛ فقط با تأیید صریح مالک |
| ۳ — انتقال آفلاین | bundle تمیز (الگوی F7) برای مالک، بدون GitHub | — | بدون انتشار عمومی |

تا تأیید مالک، هیچ‌کدام اجرا نمی‌شود.

## ۱۰. جدول نهایی الزامی مأموریت (H)

| مورد | Local | GitHub Remote | نتیجه |
|---|---|---|---|
| شاخه V1 | `v1/voice-acceptance` tip `bd07ecf` (+کامیت مستندات همین گزارش) — `git rev-parse` تأییدشده | ABSENT — API فقط main/feature را فهرست می‌کند | Local VERIFIED / Remote BLOCKED (بدون credential + تعارض D.4) |
| آخرین commit | P3: `bd07ecf000e831d522baa2ca99b929c794e175df`؛ سپس کامیت docs این مأموریت روی tip | ABSENT | Local VERIFIED / Remote ABSENT |
| کامیت‌های P2/P3 | ۱۵ عدد (`main..v1`)، سه SHA نام‌برده EXISTS+IN ancestry، غیر-dangling | ABSENT (404 raw / فهرست API) | Local VERIFIED / Remote ABSENT |
| کد D-5 | `pending-action.ts` + `pendingIsFresh` در دو روت — `d2b76b8` | ABSENT | Local VERIFIED / Remote ABSENT |
| کد D-6 | `reply-sanitize.ts` + سیم‌کشی سه‌لایه — `d2b76b8` | ABSENT | Local VERIFIED / Remote ABSENT |
| کد D-7 | `server-ai.ts` گارد ادعا + `MUTATING_ACTION_TYPES` — `d2b76b8`/`11dec39`/`140bc24` | ABSENT | Local VERIFIED / Remote ABSENT |
| تست‌ها | فایل‌های تست روی شاخه (۱۴۰bc24) + اعداد ثبت‌شدهٔ گزارش P3 (354/354، E2E 11/11، JVM 97) — در این مأموریت بازاجرا نشد | ABSENT | Local RECORDED / Remote ABSENT |
| گزارش نهایی | `docs/audit/V1_P3_FINAL_REPORT.md` (۱۰۴ خط، `bd07ecf`) | `404: Not Found` | Local VERIFIED / Remote ABSENT |
| APK و SHA256 | فایل‌ها LOST (بازیافت سندباکس)؛ SHA-256 چهار APK در گزارش tracked ثبت است | ABSENT | RECORDED / NOT VERIFIED بایتی / Remote ABSENT |
| Pull Request | ساخته نشد (وابسته به push؛ gh نیست) | وجود ندارد | BLOCKED |
| وضعیت main | محلی `b00a9ee` — بدون تغییر | ریموت `28b64bb` در هر سه بازخوانی یکسان | **UNCHANGED ✓** (تنها ردیف کاملاً سبز) |

## ۱۱. معیار پایان — وضعیت واقعی هر بند

| معیار | وضعیت |
|---|---|
| شاخهٔ V1 واقعاً روی GitHub | **NOT MET — BLOCKED** |
| یکسانی کامیت‌های نهایی محلی/ریموت | **NOT MET — BLOCKED** (شاخه‌ای در ریموت نیست) |
| مستندات V1-P3 در GitHub | **NOT MET — ABSENT (404)** |
| کد و تست‌های ادعاشده در همان شاخه | Local: **MET** (روی `v1/voice-acceptance`) / GitHub: NOT MET |
| بستهٔ تحویل و SHA256 قابل تطبیق | **PARTIAL** — بستهٔ جدید P3-R با SHA256SUMS تازه؛ APK بایتی NOT VERIFIED؛ تطبیق GitHub-side ABSENT |
| main بدون تغییر | **MET ✓** |
| PR باز برای ممیزی | **NOT MET — BLOCKED** |

## ۱۲. پایبندی به ممنوعیه‌ها و توقف

بدون force-push؛ بدون تغییر main (محلی/ریموت)؛ بدون حذف/بازنویسی تاریخچه؛ بدون چاپ یا مطالبهٔ هرگونه secret؛ بدون Merge؛ بدون شروع V1-P4؛ بدون توسعهٔ مالی/تقویم/SMS/سرویس بیرونی/Ambient. آزمون دستگاه واقعی همچنان **BLOCKED** و هیچ ادعایی از این بابت در هیچ سندی وجود ندارد. با تحویل این گزارش، مأموریت V1-P3-R بسته می‌شود و برای هر اقدام بعدی (انتخاب گزینهٔ بخش ۹، تأیید PR آتی، یا دستور جدید) **منتظر تأیید صریح مالک** می‌مانیم.
