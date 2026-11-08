# گزارش امنیت Git و پاک‌سازی تاریخچه — V1-P3-R2 (بخش A)

> تاریخ: 2026-11-08 تهران | شاخهٔ انتشار: `v1/voice-acceptance-clean`
> مأموریت: V1-P3-R2 — پاک‌سازی امن تاریخچه + آماده‌سازی انتشار بدون افشای محرمانه (توسعهٔ قابلیت جدید = صفر)
> اصل صفر: بکاپ مستقل قبل از هر تغییر · بدون force-push · بدون تغییر `main` محلی/ریموت · هیچ مقدار محرمانه‌ای در هیچ گزارش/لاگ/ترمینالی چاپ نشد — فقط مسیر، نوع، Blob-ID، اثرانگشت و نتیجهٔ اسکن.

## ۰) خلاصهٔ اجرایی

| مورد | نتیجه |
|---|---|
| بکاپ مستقل قبل از بازنویسی | `git bundle --all` → `artifacts/git-backup/rahyar-pre-r2-scrub-20261108-171111.bundle` (43.4MB، verify: «complete history»، SHA-256 در `evidence/backup_manifest.txt`) |
| ممیزی کامل تاریخچه (A1) | ۲۰۰ کامیت / ۱۴۵۹ blob از tip قابل‌رسیدن؛ ۱۳۵۵ blob متنی اسکن شد؛ رجیستر رسمی C1..C10 + الگوهای عمومی |
| حامل‌های واقعیِ یافت‌شده | ۴ مسیر ممنوعه (keystore، `.evidence-password`، `.evidence-session-token`، `RUN.md`) + حامل‌های pre-scrub رجیستر در blobهای تاریخی + **۲ فایل متنی در tip که از اسکن‌های قبلی جا مانده بود** (`scripts/f2-security-scans.py` و `download/RahyAr-Android/RahyAr_COMPLETE_SOURCE.txt`) |
| پاک‌سازی (A2) | `git filter-repo` روی کلون آینه‌ای جداشده؛ حذف ۴۷ مسیر از کل تاریخچه + بازنویسی blob بر پایهٔ اثرانگشت؛ ۱۹۸ کامیت بازنویسی، ۲ کامیت خالی‌شده حذف |
| اسکن نهایی (A3) | **صفر hit رجیستر در کل تاریخچهٔ قابل انتشار · صفر مسیر ممنوعه · صفر الگوی عمومی** · فقط FP مستندشدهٔ C3 (کلمهٔ رایج) داخل ZIPها |
| گارد pre-push | `scripts/tests/r2_push_guard.py` روی بازهٔ root..tip: **OK** (`evidence/prepush_guard_d4abcbe.txt`) |
| انتشار | بخش ۵ و `evidence/github_verification.txt` (کامیت بعدیِ همین شاخه) |

## ۱) ممیزی واقعی (A1) — روش

- مبنای تشخیص: **اثرانگشت رسمی رجیستر C1..C10** = ۱۲ نویسهٔ اول SHA-256 هر مقدار (طبق `docs/final-delivery/02-forensics-c1-c10-r2.md` و `scripts/tests/r2_push_guard.py`) — اسکن بدون دیدن مقدارها.
- پوشش: همهٔ blobهای قابل‌رسیدن از tip شاخه (`git rev-list --objects`)؛ blobهای دارای بایت NUL = باینری (فقط مسیر/اندازه)؛ آرشیوهای ZIP با استخراج موقت اعضا اسکن شدند؛ الگوهای عمومی: PEM private key، AWS AKID، GitHub PAT (کلاسیک/fine-grained)، JWT، connection-string با credential.
- کلاس‌بندی C3 طبق سنت رجیستر: «کلمهٔ رایج» — فقط در context کلید=مقدار (`storepass/keypass/storePassword/...`) REAL، در غیر آن FP.

### ۱-۱) مسیرهای ممنوعهٔ یافت‌شده در تاریخچه (همه از tip قابل‌رسیدن بودند)

| مسیر | blob | اولین کامیت | آخرین | دسته |
|---|---|---|---|---|
| `android/rahyar-release.keystore` | `a807354b1a9c…` | `d3dd564` | `a7ff761` (untrack) | REAL — فایل keystore خصوصی؛ مطابق رجیستر: هرگز به origin نرفته؛ روی دیسک سالم + vault backup تأییدشده |
| `.evidence-password` | `16f4706e73f4…` (fp C8) | `87834e5` | `a7ff761` | REAL — رمز bootstrap؛ LOCAL ONLY طبق رجیستر |
| `.evidence-session-token` | `3b6bc8689e13…` (fp C9) | `87834e5` | `a7ff761` | REAL — توکن نشست منقضی (INACTIVE) طبق رجیستر |
| `RUN.md` | `b64d1ac452e2…` (داخل آن hit C1) | `2f9e35d` | `7a0f7ea` (untrack) | REAL — دارای رمز حساب طبق کامنت `.gitignore` (GU2-PRIV1) |

- `.env` / `.env.local` / `vault/` / `keystore.properties` / هر `*.jks|*.pem|*.p12` دیگر: **در تاریخچه موجود نبود** (صفر).

### ۱-۲) حامل‌های متنی pre-scrub رجیستر (blobهای تاریخی)

نسخه‌های تاریخیِ پیش از scrubهای R2 در مسیرهای زیر مقدار واقعی داشتند (نسخهٔ tipِ بیشترشان پاک است؛ استثنا در ۱-۳):

| مسیر | blob نمونه | رجیستر |
|---|---|---|
| `scripts/f2-security-scans.py` | `d281a5c25ced` | C1×6، C2×2، C5×2، C6×3، C10×2 |
| `scripts/live-v2-tests.cjs` | `314e35129e8c`، `2abfbc506fb2` | C1، C5، C6 |
| `scripts/test-user-isolation.ts` | `c37ebfce1cfa` | C2 |
| `scripts/preview-setup.ts`، `session-capture.sh`، `capture-*.cjs`، `agent-*evidence*.cjs`، `ai-real-evidence.cjs`، `offline-evidence.cjs`، `preview-capture.cjs`، `capture-before-v200.cjs` و … | ۱۶ blob | C1 (+C5 در دو فایل) |
| `scripts/p06_doc_safety_scan.py` / `p06r_doc_safety_scan.py` | `6b4beb069c6c`، `edb4ffb473f0` | C4 (حامل scan-data) |
| `scripts/audit-screens.mjs` | `aeb61de41612` | C7 |
| `scripts/build-android-apk.sh` | `794b8936fe59` | C4×4 (پارامترهای store/key-pass قدیمی) |
| `scripts/build-android-apk-v11.sh` / `build-android-rebuild.sh` | `e090932c3109`، `ab9077be6063` | C3×2 در هرکدام — **در context credential** (`pass`) → REAL |
| `RUN.md` | `b64d1ac452e2` | C1×1 |

فهرست کامل blob/مسیر/کلاس: `evidence/a1_preclean_scan_summary.txt`.

### ۱-۳) یافته‌های جدید نسبت به گزارش قبلی P3-R (۳۵۵→ این مأموریت)

اسکن قبلی P3-R سقف حجمی داشت و دو فایل متنی بزرگ را ندیده بود؛ در این ممیزی سقف برداشته شد:

1. **`download/RahyAr-Android/RahyAr_COMPLETE_SOURCE.txt`** — دو نسخهٔ تاریخی (`9f4e7d585d3e` = نسخهٔ tip، `2641aec0b3b8`) شامل **مقادیر واقعی C1×6، C2×2، C5×2، C6×3، C10×2** — این فایل «dump سورس» محتوای `f2-security-scans.py` عصر pre-scrub را هم کپی کرده است. یعنی tipِ شاخهٔ v1 خودش حامل واقعی بود و انتشار مستقیم آن D.4 را می‌شکست.
2. **`scripts/f2-security-scans.py` در tip (`d281a5c25ced`)** — نسخهٔ tip همان blob آلوده است؛ فهرست FILES در `scripts/r2_secret_scrub.py` (موج R2 قبلی) این فایل را پوشش نداده بود.
3. داخل ZIPها: `RahyAr_Full_Source.zip` (دو نسخه) عضو `scripts/f2-security-scans.py` با مقادیر واقعی را در خود داشت؛ `RahyAr-F2-Test-Evidence.zip` عضو `f3-audit.txt` با hitهای C3 (طبقه‌بندی در A3).

### ۱-۴) ارزیابی افشا و توصیه (بدون تصمیم‌گیری به‌جای مالک)

- مقادیر C1/C2/C4/C5/C6/C10 طبق رجیستر رسمی **از قبل در تاریخچهٔ عمومی origin (main/feature/تگ‌های قدیمی) PUBLIC بوده‌اند** — این وضعیتِ پیشین است؛ در این مأموریت تاریخچهٔ origin تغییر نکرد (ممنوع: force-push). **توصیهٔ رجیستر (مسئولیت مالک): چرخش این رمزها** — این توصیه همچنان باز است.
- C3 (رمز فعلی keystore): خود فایل keystore هرگز به origin نرفته؛ پس از این مأموریت، contextهای credential آن در تاریخچهٔ شاخهٔ انتشار نیز حذف/REDACTED شد. **چرخش رمز keystore همچنان توصیهٔ باز مالک است.**
- C8/C9 (LOCAL ONLY، STRUCTURALLY_UNPUBLISHABLE): فایل‌های حامل از تاریخچهٔ انتشار حذف شدند؛ مقدارها هرگز در origin نبوده‌اند.
- توکن GitHub این سندباکس (`upload/HAMYAR TOKEN.txt`): هرگز track/commit نشده (۰ کامیت شامل `upload/`)؛ خارج از گیت باقی ماند و در هیچ گزارشی مقدارش چاپ نشد.

## ۲) ساخت تاریخچهٔ پاک (A2) — روش کنترل‌شده و بازگشت‌پذیر

- اجرای `git filter-repo` (v2.47+، نسخهٔ `a40bce548d2c`) **روی کلون آینه‌ای جداشده** (`artifacts/scrub-work/rahyar.git`)، با `--refs refs/heads/v1/voice-acceptance` → **تنها شاخهٔ v1 بازنویسی شد؛ `main` و همهٔ refهای مرجع در مخزن اصلی دست‌نخورده ماندند.**
- حذف مسیر از **کل تاریخچه**: ۴ مسیر ممنوعه + ۴۴ فایل حریم‌خصوصی (اسکرین‌شات‌های «دادهٔ کاربر» + RUN.md — دقیقاً فهرست حذفِ کامیت مالک‌محور `7a0f7ea` GU2-PRIV1) = **۴۷ مسیر یکتا**.
- بازنویسی blobها با callback اثرانگشت‌محور (بدون دیدن مقدار): هر توکنِ منطبق با رجیستر → `REDACTED_Cx`؛ C3 فقط در context credential → `REDACTED_C3`؛ داخل ZIPها نیز اعضای متنی با همان قاعده بازنویسی و آرشیو بازساخته شد.
- نتیجه: `old_tip=95acf84c…` → `new_tip=d4abcbe43c…`؛ ۱۹۸ کامیت بازنویسی؛ **۲ کامیت خالی‌شده حذف شدند**: `87834e5` (فقط معرف فایل‌های evidence بود) و `d3dd564` (فقط معرف keystore بود) — هر دو snapshot UUID.
- نگاشت کامل old→new: `evidence/a2_commit_map.txt` (+`a2_ref_map.txt`) و جدول کامیتهای V1 در `V1_P3R2_COMMIT_MAPPING.md`.
- **اثبات حفظ محتوا**: درخت tip قبل/بعد = **۸۸۱ = ۸۸۱ فایل؛ صفر حذف از tip، صفر افزودن، فقط ۳ فایل با محتوای اصلاح‌شده** (همان سه هدف قرمزسازی): `scripts/f2-security-scans.py`، `RahyAr_COMPLETE_SOURCE.txt`، `RahyAr_Full_Source.zip` — `evidence/a2_content_preservation.txt`. هیچ تغییرات معتبر P2/P3 و هیچ فایل معتبر پروژه‌ای از دست نرفت.

## ۳) اسکن نهایی روی کل تاریخچهٔ شاخهٔ پاک (A3)

| معیار قبولی | نتیجه |
|---|---|
| صفر secret واقعی قابل‌دسترس | **PASS** — ۱۳۳۰ blob متنی + اعضای ZIP: صفر hit رجیستر (به‌جز FP مستندشدهٔ C3)؛ صفر الگوی عمومی (PEM/AWS/PAT/JWT/URL-creds) |
| صفر keystore/vault در تاریخچه | **PASS** — فهرست مسیرهای ممنوعه خالی؛ `a807354b…` دیگر قابل‌رسیدن نیست |
| FPها مستند | **PASS** — C3 (کلمهٔ رایج) داخل ZIPهای source-dump/evidence در contextهای غیراعتبارنامه‌ای (bun.lock/AndroidManifest/styles.xml/f3-audit.txt بدون الگوی pass) — طبق رجیستر غیر-اعتبارنامه‌ای؛ فایل‌های تعریف رجیستر (guard/forensics) صرفاً اثرانگشت دارند نه مقدار |
| گارد pre-push | **PASS** — `push guard: OK (no forbidden paths, no register fingerprints)` |
| بستهٔ انتشار بدون فایل محرمانه | **PASS** — فهرست درخت tip = ۸۸۱ فایل؛ `.evidence-*`/keystore/RUN.md/vault absent |
| یکپارچگی | `git fsck` = سالم؛ blobهای آلودهٔ قدیمی از odb کلون پاک‌سازی فیزیکی شدند (`gc --prune=now`؛ حجم ۲۲۹M→۳۸M) |

جزئیات: `evidence/a3_clean_history_scan_summary.txt`.

## ۴) وضعیت `main`

- محلی: `c9a3b233…` (حالت ابتدای مأموریت، ثبت در manifest بکاپ) — در این مأموریت **هیچ نوشته‌ای روی `main` انجام نشد** (بدون checkout/commit/reset روی main؛ فقط خواندن).
- ریموت `origin/main = 28b64bb…` — قبل و بعد از انتشار از `ls-remote`/API بازخوانی شد → `evidence/github_verification.txt`.
- واگرایی از پیشِ موجودِ `main` محلی نسبت به ریموت (snapshotهای UUID سندباکس) تغییر نکرد و موضوع این مأموریت نیست.

## ۵) انتشار (A4) — در کامیت بعدیِ همین شاخه مستند می‌شود

push عادی و بدون force شاخهٔ `v1/voice-acceptance-clean` به `origin` (GitHub `aresmaeily2/RAHYAR-AI` — نام قبلی HAMYAR-AI با redirect) و سپس PR باز به `main` بدون merge؛ اثبات GitHub-side (SHA شاخه، fetch سند از ریموت، مقایسهٔ main قبل/بعد) در `evidence/github_verification.txt` ثبت می‌شود. احراز هویت از طریق توکن مالکِ موجود در `upload/` (فقط مسیر استفاده شد؛ مقدار هرگز چاپ/کپی/کامیت نشد).

## ۶) تصمیم‌های باز مالک (خارج از اختیار مجری)

1. چرخش رمزهای حسابی C1/C2/C4/C5/C6/C10 و رمز keystore (C3) — طبق رجیستر رسمی.
2. پاک‌سازی تاریخچهٔ قدیمیِ خودِ origin (main/feature/تگ‌ها) — نیازمند تصمیم + عملیات جداگانه با force-pushed بازنویسی روی ریموت؛ در این مأموریت ممنوع و انجام نشد.
3. مأموریت آینده: انتقال ۳ APK قدیمی v2.1.0 از سورس به GitHub Releases (توصیهٔ ثبت‌شدهٔ P3-R؛ در این مأموریت حفظ شدند).
