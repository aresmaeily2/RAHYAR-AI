# چک‌لیست انتشار — V1-P3-R2

> تاریخ: 2026-11-08 تهران | وضعیت‌ها: PASS / FAIL / BLOCKED / PENDING(پس از این کامیت اجرا می‌شود و در کامیت بعدی با شواهد ثبت می‌شود)

## بخش A — پاک‌سازی امن تاریخچه

| مورد | وضعیت | مدرک |
|---|---|---|
| A0 ثبت وضعیت اولیه Git/refs/remote | PASS | `evidence/backup_manifest.txt` (main/origin-main/v1-tip + شمارش اشیا) |
| A0 بکاپ مستقل + آزمایش صحت | PASS | bundle کامل «complete history» + SHA-256 در manifest |
| A1 ممیزی کامل تاریخچه (رجیستر C1..C10 + الگوهای عمومی + ZIPها) | PASS | `evidence/a1_preclean_scan_summary.txt` — ۲۰۰ کامیت/۱۴۵۹ blob |
| A1 طبقه‌بندی REAL/FP بدون چاپ مقدار | PASS | گزارش امنیت بخش ۱ (فقط مسیر/blob/اثرانگشت/context-key) |
| A2 بازنویسی کنترل‌شده روی کلون جداشده (بدون دست‌زدن به main) | PASS | `evidence/a2_commit_map.txt`، `a2_ref_map.txt` |
| A2 حذف در تمام تاریخچه (نه فقط tip) | PASS | ۴۷ مسیر از کل تاریخچه؛ blobهای ممنوعه unreachable و سپس فیزیکی حذف |
| A2 نگاشت old→new + گزارش حفظ محتوا | PASS | `V1_P3R2_COMMIT_MAPPING.md` + `evidence/a2_content_preservation.txt` (۸۸۱=۸۸۱ فایل) |
| A3 اسکن نهایی کل تاریخچهٔ شاخهٔ پاک | PASS | `evidence/a3_clean_history_scan_summary.txt` — صفر hit واقعی |
| A3 صفر keystore/vault/`.evidence-*` در تاریخچهٔ انتشار | PASS | فهرست مسیرهای ممنوعهٔ اسکن A3 خالی |
| A3 FPها مستندشده | PASS | C3 (کلمهٔ رایج) داخل ZIPها — گزارش امنیت بخش ۳ |
| A3 گارد pre-push روی شاخهٔ پاک | PASS | `evidence/prepush_guard_d4abcbe.txt` + اجرای مجدد پس از کامیت مستندات (کامیت بعدی) |
| A4 push عادی بدون force شاخهٔ پاک به GitHub | PASS | push_exit=0؛ remote SHA = local tip `f58d9be` — `evidence/github_verification.txt` |
| A4 ساخت PR باز | **BLOCKED** | توکن fine-grained مالک فاقد مجوز «Pull requests: write» است (403)؛ دقیق‌ترین راه‌حل امن در `evidence/github_verification.txt` ثبت شد؛ هیچ راه ناامنی استفاده نشد |
| A4 اثبات GitHub-side (SHA/commits/سند/main) | PASS | شاخه، ۵ کامیت اول، دریافت سند از API، main=28b64bb — `evidence/github_verification.txt` |
| A4 عدم تغییر main (محلی/ریموت) | PASS | ریموت قبل/بعد = `28b64bb` (ls-remote ×۲ + API)؛ محلی بدون هیچ دستور نوشتن روی main |

## بخش B — آزمون صوتی دستگاه واقعی

| مورد | وضعیت |
|---|---|
| B1 گوشی واقعی + ثبت مدل/اندروید/APK/مجوزها | **BLOCKED** — دستگاه در محیط موجود نیست؛ APK: هویت RECORDED (`evidence/apk_identity_recorded.txt`)، فایل بایتی LOST → rebuild لازم |
| B2 دوازده سناریوی زنجیرهٔ کامل | **BLOCKED** — پروتکل کامل و معیارهای PASS در `V1_VOICE_REAL_DEVICE_ACCEPTANCE.md` |
| B3 صحت اقدام با شناسهٔ رکورد DB | **BLOCKED** — پروتکل ثبت شد |
| B4 STT/TTS اندازه‌گیری واقعی | **BLOCKED** — جدول اندازه‌گیری آماده شد |

## بخش C — امنیت و حریم خصوصی صوت (سطح کد)

| مورد | وضعیت |
|---|---|
| مجوز میک قبل از فعال‌سازی (fail-closed) | PASS (کد) — `VoiceHelper.java:99-108` |
| بدون ضبط پنهان / بدون ارسال بدون رضایت | PASS (کد) |
| بدون audio/transcript در لاگ | PASS (کد) — صفر hit |
| بدون API key در APK/سورس | PASS (کد) — STT/TTS سیستمی؛ اسکن رجیستر/الگوهای عمومی صفر hit |
| رفتار پس از بستن برنامه / سرویس پس‌زمینه | PASS (کد) — BootReceiver fail-closed |
| تأیید رفتاری روی دستگاه | **BLOCKED** |

## بخش D — مستندات و شواهد در مخزن

| مورد | وضعیت |
|---|---|
| `docs/audit/V1_P3R2_GIT_SECURITY_REPORT.md` | PASS (همین کامیت) |
| `docs/audit/V1_VOICE_REAL_DEVICE_ACCEPTANCE.md` | PASS (همین کامیت) |
| `docs/audit/V1_P3R2_COMMIT_MAPPING.md` | PASS (همین کامیت) |
| `docs/audit/V1_P3R2_RELEASE_CHECKLIST.md` | PASS (همین کامیت) |
| `docs/audit/evidence/*` | PASS (همین کامیت) — `github_verification.txt` در کامیت بعدی |

## بخش E — معیار پایان

| معیار | وضعیت |
|---|---|
| تاریخچهٔ انتشار پاک از secretها + اسکن مستقل | **PASS** |
| شاخهٔ پاک در GitHub | **PASS** — `f58d9be` روی origin |
| PR باز و بدون merge | **BLOCKED** — توکن مالک مجوز Pull requests: write ندارد (403)؛ هیچ merge انجام نشد؛ main دست‌نخورده |
| main بدون تغییر | PASS* (تأیید نهایی پس از push) |
| آزمون زنجیرهٔ صوتی روی گوشی واقعی | **BLOCKED — نه COMPLETE و نه PARTIAL-GIT-complete** |
| STT/Agent/اقدام واقعی/TTS در یک جریان پیوسته | **BLOCKED** |
| سناریوهای خطا/مجوز/لغو/تأیید روی دستگاه | **BLOCKED** |
| مستندات و شواهد در GitHub | **PASS** — دریافت سند امنیت از GitHub API (200) تأیید شد |

> نکتهٔ صادقانه: طبق قاعدهٔ مأموریت، اگر بخش Git موفق و بخش صوتی ناموفق/مسدود باشد، وضعیت کلی مأموریت COMPLETE نیست؛ اعلام نهایی در گزارش پایانی این مأموریت انجام می‌شود. هیچ ادعایی دربارهٔ آزمون دستگاه واقعی وجود ندارد و تا اجرای واقعی هیچ شواهدی تولید نمی‌شود. V1-P4 و هر قابلیت جدید تا تأیید مالک آغاز نمی‌شود.
