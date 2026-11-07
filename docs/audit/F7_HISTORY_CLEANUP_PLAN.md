# F7_HISTORY_CLEANUP_PLAN — برنامهٔ پاک‌سازی تاریخچه (Agent 1)

## هدف

تاریخچهٔ قابل انتقال باید فاقد هر blob حساس باشد، هم‌زمان کد و قابلیت بازتولید حفظ شود و نگاشت کامل کامیت‌های قدیم/جدید ارائه شود.

## فهرست blobهای هدف (ثبت‌شده بدون چاپ مقدار)

| # | مسیر | blob SHA-1 (git) | دلیل حذف |
|---|---|---|---|
| 1 | `android/rahyar-release.keystore` | `a807354b1a9c17fa4e22df5ebc265f8006cf6f89` | مادهٔ کلید رمزشدهٔ امضا — حضور در تاریخچهٔ قابل انتقال ممنوع (بند ۹ قوانین) |
| 2 | `.evidence-password` | `16f4706e73f48494d5e3a0fdeab9e75259ab1e6d` | فایل رمز محیط شواهد (چرخهٔ قدیمی) |
| 3 | `.evidence-session-token` | `3b6bc8689e132af4e844931e401cab71dc9fd0ca` | توکن نشست با محتوای تصادفی غیرآزمایشی |

سایر موارد بررسی‌شده و سالم: `.env.example` (قالب بدون مقدار)، `src/app/api/auth/password/route.ts` (کد)، اسکریپت‌های scan/recovery (کد ابزاری)، `src/styles/tokens.css` (فقط تطابق نام با «token»)، `.env` (هیچ‌گاه کامیت نشده).

## روش اجرا (انجام‌شده — اسکریپت `scripts/f7-history-clean.sh`)

1. **کلون ایزوله:** `git clone --no-local --no-hardlinks /home/z/my-project /tmp/f7-clean` — مخزن کاری اصلی هرگز بازنویسی نشد.
2. **بازنویسی:** `git filter-repo --force --invert-paths --path android/rahyar-release.keystore --path .evidence-password --path .evidence-session-token`
3. **راستی‌آزمایی پنج‌گانه** (لاگ: `artifacts/logs/f7/history-cleanup.log`):
   - V1: `git rev-list <هر ref> -- <سه مسیر>` = ۰ برای همهٔ شاخه/تگ‌ها؛
   - V2: سه blob SHA در `git cat-file --batch-all-objects --batch-check` غایب؛
   - V3: `git diff orig-main main` = خالی ⇒ درخت HEAD بیت‌به‌بیت حفظ شده؛
   - V4: ۱۷۴ → ۱۷۲ کامیت (دو کامیتِ فقط-حساس حذف: `d3dd564`، `87834e5`)؛
   - V5: `commit-map.txt` کامل (نگاشت ۱:۱ برای ۱۷۲ کامیت حفظ‌شده).

## حفظ بازتولید

- درخت HEAD جدید (`0a30e28`) با درخت HEAD قدیم (`5630814`) **دقیقاً برابر** است ⇒ هر گزارش/بستهٔ آینده از هر دو یکسان ساخته می‌شود.
- نگاشت کامل قدیم→جدید تحویل شد: `download/RahyAr-F7/transfer/commit-map.txt`.
- دو کامیت حذف‌شده فقط حاوی افزودن فایل حساس بودند (بدون کد) — در این سند فهرست شدند تا هیچ «گمشدهٔ ناشناخته» باقی نماند.

## پاکی نسبیتی (نسبت به پوش آینده)

- ۲۸ کامیتِ ِقبل از `28b64bb` (تاریخ origin/main) هیچ‌گاه تغییر نکرد (SHAها ثابت) چون blobها فقط در بازهٔ ۹۵کامیتیِ جلوتر بودند ⇒ **۹۳ پچ** روی پایهٔ ثابت `28b64bb` تولید شد.
- نسخهٔ کامل هم به‌صورت bundle تک‌فایله ارائه شد (برای clone مستقیم).

## قواعد پس از پاک‌سازی (الزامات ادامه‌دار)

1. بازگشت این سه مسیر به Git ممنوع؛ `.gitignore` و pre-push guard (از R2: `scripts/tests/r2_push_guard.py`) باید در push اصلی فعال بمانند.
2. هر bundle/patch آینده فقط از مخزنِ پاک تولید شود و قبل از تحویل، آزمون V1/V2 روی آن تکرار شود.
3. اگر مالک push کرد، بلافاصله `git ls-remote` برای تأیید `HEAD == 0a30e28` اجرا شود.
4. keystore امضای نسخه‌های آینده فقط خارج Git (مسیر `android/keystore.properties`، fail-closed در `android/app/build.gradle:91`) و با نگهداری امن توسط مالک.
