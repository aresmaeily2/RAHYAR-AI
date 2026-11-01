# 02 — جرم‌شناسی اسرار و تاریخچه Git (Agent 2) — رجیستر C1–C10

تاریخ: 2026-11-02 تهران | اثرانگشت رسمی = ۱۲ نویسهٔ اول SHA-256 مقدار (هیچ مقداری در هیچ گزارشی چاپ نشده)

## وضعیت نهایی پس از اقدامات R2

| ID | ماهیت | reach (راستی‌آزمایی مجدد) | اقدام R2 | وضعیت نهایی |
|---|---|---|---|---|
| C1 | رمز owner دورهٔ v2.0/v2.1 (`cec51518b9ac`) | PUBLIC در تاریخچهٔ origin | **اسکراب ۲۲ حامل از درخت tracked** (۱۸+۴ فایل، مقدار → REDACTED_C1 یا env fail-closed) | LOCAL_CLEAN؛ تاریخچهٔ origin = تصمیم مالک |
| C2 | رمز owner دورهٔ rc1 (`ee0880daa2ca`) | PUBLIC | اسکراب حامل | LOCAL_CLEAN |
| C3 | store/key-pass keystore فعلی (`f60ed56a9c82`) | PUBLIC (تاریخچه) | keystore + backup سالم؛ **vault بازسازی و بازیابی PASS** (SHA-256 منطبق `d4b7169a…`) | چرخش رمز = مالک؛ keystore فایل هرگز به origin نرفته |
| C4 | store-pass keystore قدیمی (`dd65b755befe`) | PUBLIC | اسکراب (حتی scan-data در ۲ اسکنر) | LOCAL_CLEAN |
| C5 | رمز کاربر تست sarika (`8eb38003b10d`) | PUBLIC | اسکراب | LOCAL_CLEAN |
| C6 | literal منفی badLogin (`e20de4c418c6`) | — | NA طبق رجیستر | NA |
| C7 | رمز دورهٔ ۳۶۰ (`46d0a91d1e48`) | **هرگز در origin نبود** | — (HEAD تمیز بود) | LOCAL_CLEAN |
| C8 | bootstrap password (`8aa62d3b0a15`) | LOCAL ONLY | فایل `.evidence-password` **از ایندکس خارج + gitignore**؛ mint fail-closed + T1–T7 ALL-PASS | STRUCTURALLY_UNPUBLISHABLE |
| C9 | session token (`ff9d8259a6e5`) | LOCAL ONLY | `.evidence-session-token` untrack؛ توکن INACTIVE (Session=0، TTL منقضی) | STRUCTURALLY_UNPUBLISHABLE |
| C10 | رمز جفت username (`9774fdedae3b`) | PUBLIC | اسکراب | LOCAL_CLEAN |

**خروجی اسکن نهایی درخت tracked**: C1=0، C2=0، C4=0، C5=0، C7=0، C10=0 فایل. C3=۲۵ فایل (کلمهٔ رایج در context غیراعتبارنامه‌ای — طبق سنت رجیستر غیر-اعتبارنامه‌ای)، C6=۱ (NA)، C8/C9 = فایل‌های untracked محلی (عمداً برای forensics حفظ شده‌اند).

## گاردهای ساختاری جدید
1. `git rm --cached` برای `.evidence-password`، `.evidence-session-token`، `android/rahyar-release.keystore` + entryهای .gitignore.
2. **pre-push hook** (لوکال) + `scripts/tests/r2_push_guard.py`: مسیرهای ممنوعه + اثرانگشت رجیستر روی بازهٔ push → خروج non-zero = push مسدود.
3. `scripts/r2_secret_scrub.py` — اسکراب تکرارپذیر مبتنی بر fp (بدون دیدن مقدار).

## keystore — وضعیت
- `android/rahyar-release.keystore` — tracked بود → **untracked شد** (روی دیسک سالم؛ SHA-256 `d4b7169a21f8f113f7cf8104c0b5dd32…`).
- روی **همهٔ** refهای origin و tags: غایب (log خالی) — هرگز عمومی نشده.
- backup رمزنگاری‌شده: `vault/rahyar-release-keystore.backup.enc` (AES-256-CBC/PBKDF2 200k) + رمز در فایل جدا (هر دو mode 600، دایرکتوری 700، خارج از گیت). آزمون بازیابی مستقل: **PASS — SHA-256 دقیقاً منطبق**.
- build-android-apk*.sh از env (`RAHYAR_KS_STOREPASS/KS_KEYPASS`) با fail-closed استفاده می‌کنند (T1-T7/G-C34 PASS).

## آزمون‌های T1–T7 (اجرای مجدد R2): ALL-PASS
T1 مسیر موفق / T2 نبود env → abort / T3 رمز کوتاه → abort / T4 بدون secret در خروجی / T5 idempotent / T6 توکن بدون رمز، mode 600 / T7 DB خراب → خطای تمیز + G-C7/G-C7b/G-C34×3.

## موارد مالک (فقط با دسترسی مالک)
1. **چرخش** رمزهای حسابی C1/C2/C5/C10 (و C3 = رمز keystore) — مقادیر در تاریخچهٔ origin عمومی‌اند؛ چرخش ریسک را صفر می‌کند.
2. **پاک‌سازی تاریخچهٔ origin** (اختیاری، پس از چرخش): `git filter-repo` روی مسیرهای حامل + force-push هماهنگ؛ دستورالعمل در گزارش DevOps.
3. کپی فایل رمز vault به محل امن شخصی (تفکیک کامل کانال).
