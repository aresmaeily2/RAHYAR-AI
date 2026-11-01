# MASTER-EXECUTION-STATE — مأموریت تحویل نهایی RahyAr (R2)

آخرین به‌روزرسانی: 2026-11-02 ~00:15 تهران. اصل: هیچ موردی رها نمی‌شود؛ هر مورد با مسئول/وضعیت/شواهد/گام بعدی.

## وضعیت فازها

| # | کار | مسئول | وضعیت | شواهد / خروجی |
|---|---|---|---|---|
| 1 | ممیزی پایهٔ واقعی | Agent 0 | **DONE** | `PROJECT_BASELINE.md` |
| 2 | منشور تیم ۱۰نفره | Agent 0 | **DONE** | `agents/roles.md` |
| 3 | ممیزی‌های موازی (۷ subagent) | Agents 1-9 | **DONE** | گزارش‌های ساختاریافته → خلاصه در ۰۱–۰۸ |
| 4 | موج امنیتی (D-1..D-10، F-1..F-6، B-1..B-14) | Agents 1/2/7/0 | **DONE** | commit `a7ff761` |
| 5 | موج محصول/i18n/a11y (۲۳+ مورد) | Agents 4/5/0 | **DONE** | commit `3b07d52` + `41cc5b1` |
| 6 | اسکراب رجیستر (۲۵ مقدار) + گارد pre-push + untrack | Agent 2 | **DONE** | exposure map نهایی: C1/C2/C4/C5/C7/C10=0 |
| 7 | بازسازی vault + بازیابی keystore | Agent 2 | **DONE** | SHA-256 منطبق `d4b7169a…` |
| 8 | build تولیدی + سرو + probes D-1 | Agent 7 | **DONE** | exit 0؛ P-A=401/P-B=403 |
| 9 | E2E زنده + ویدئو + اسکرین‌شات + تک-ارسال | Agents 6/7 | **DONE** | `download/RahyAr_R2_Final/evidence/` |
| 10 | مستندات ۰۱–۰۸ + CSV + گزارش واحد | Agents 9/0 | **DONE** | `docs/final-delivery/` |
| 11 | بستهٔ سورس مستقل + manifest + README + credentials | Agent 7 | **IN PROGRESS** | build-full-source-zip.sh |
| 12 | ممیزی مستقل نهایی (Agent 8) | Agent 8 | **PENDING** | → `09-independent-audit-r2.md` |
| 13 | گزارش نهایی گفتگو + Complete | Agent 0 | PENDING | — |

## Backlog مالک (بیرونی — بدون توقف بقیه)
| ID | مورد | مانع |
|---|---|---|
| B-1 | چرخش C1/C2/C5/C10 (+C3 رمز keystore) | دسترسی مالک |
| B-2 | پاک‌سازی اختیاری تاریخچهٔ origin (بعد از چرخش) | تصمیم مالک |
| B-3 | لینک Preview از پنل Workspace | محدودیت sandbox (مستند) |
| B-7 | تست دستگاه اندروید + APK در محیط دارای SDK | SDK در sandbox نیست |

## تصمیم‌های ثبت‌شده
- کار روی main (الگوی همیشگی Workspace — auto-checkpoint پلتفرم روی main است)؛ commitهای مجزا به‌جای شاخه برای هر ایجنت، چون تک-نویسنده‌ای و ترتیبی بود.
- F-3/B-6/B-7 (Low) با مستند پذیرفته شد؛ فهرست در ۰۱/۰۳/۰۴.
- zod bump به نسخهٔ بعد (تغییر lockfile در برش امنیتی R2 انجام نشد).
- مأموریت FOOTBALL IQ KIDS: پس از بستن R2 شروع می‌شود (B-6 قبلی).
