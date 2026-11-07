# F7_EVIDENCE_INDEX — فهرست شواهد (Agent 5)

- **کد-HEAD که همهٔ آزمون‌ها به آن تعلق دارند:** `5b47b9c9` (main محلی) · **HEAD دقیق بستهٔ تحویل:** `download/RahyAr-F7/SOURCE-HEAD.txt` (کامیت مستندات بلافاصله بعد)
- **نمونه‌سازی مجدد بستهٔ انتقال:** `transfer/rahyar-f7-clean-history.bundle` از کلونِ پاک‌سازی‌شدهٔ همان HEAD — نگاشت در `transfer/commit-map.txt`

## لاگ‌های زنده (artifacts/logs/f7/ → در RahyAr-F7-Evidence.zip)

| فایل | محتوا | نتیجهٔ کلیدی |
|---|---|---|
| f7-baseline-git.log | شش‌گانهٔ Git + ابزار + افتادن بسته‌های F5/F6 | ۹۵/۰؛ remote یک مخزن |
| f7-sensitive-history.log | ردیابی سه blob حساس + طبقه‌بندی بدون چاپ مقدار | ۰ کامیت ریموت |
| history-cleanup.log | filter-repo + پنج راستی‌آزمایی | 0 مسیر/0 blob؛ parity خالی؛ ۱۷۴→۱۷۳ |
| sec-matrix.log | ماتریس ۱۱تایی | ۱۱/۱۱ |
| sec-deep.log | S1–S11 + نرخ‌لیمیت پس از ری‌استارت | همه سبز |
| expense-live.log | ۲۱ درخواست زندهٔ چت مالی | ۴ نوشتن واقعی + ۱ انصراف + رگرسیون Task |
| finance.log | ۹ سناریو + ۵ اکسپورت + هم‌زمانی | سبز (۴۲۹ = اثبات نرخ‌لیمیت) |
| finance-recheck.log | هم‌زمانی ref تازه + تطبیق DB-raw | ۱ ردیف؛ **پیش از فیکس: 2×500** (یافتهٔ FIN-1) |
| finance-conc-fixed.log | پس از فیکس | ok=1 dup=4 err=0 |
| backup-restore.log | VACUUM INTO + ۱۴ جدول + restore :3102 + فایل خراب | ALL-MATCH؛ login 200؛ DatabaseError |
| web-ai.log / web-ai2.log | ۱۰ Provider + canary ۴ مسیر + آب‌وهوا | ۲ پاسخ واقعی؛ canary صفر؛ 200+updatedAt+cache |
| e2e.log | grand-e2e + axe | ۱۱/۱۱، consoleErrors=0 |
| shots.log + screenshots/ | اسکرین‌شات‌های تازه fa/en/dark | ۵ فریم |
| package.log | ساخت بسته + اسکن اسرار | SHA256SUMS ثبت |
| build.log … | دنبالهٔ buildها | همه rc=0 |

## خروجی‌های بستهٔ تحویل (download/RahyAr-F7/)

| فایل | SHA-256 |
|---|---|
| RahyAr-F7-Complete-Source.zip | a43ad6bb4f724c4c5cb57f5b512c0773b07da25bce85df31029cb6180605b62e (از HEAD پیش از دو کامیتِ اسکراب — بند یادداشت) |
| RahyAr-F7-Evidence.zip | (نهایی در SHA256SUMS.txt بسته) |
| apks/Rahyar-user-v2.3.0-release.apk | 662a26dd03b3403c5b421780090d33ea3346194b3b4546ae552ba3916680bbfb |
| apks/Rahyar-owner-v2.3.0-release.apk | a9a419d9856bb1ffe3b150e65c16edca66d41755436ab1d1fdb13b16ae8507ec |
| apks/Rahyar-user-v2.3.0-debug.apk | 2dd327948ee1dc346681949b4a8a627d329651ebdb8fd6d2d8a7747e13327aaa |
| apks/Rahyar-owner-v2.3.0-debug.apk | 97ed0962faf0e593b4f8b2d089b8949fd4a9304a072e25a20b4a14c834da245a |
| evidence/pdf-fa-page1.jpg | 2c520fc6c21cebbcd9a2526f232e804edfa2a95a19e523a38d7d9962e7995c6c |
| transfer/rahyar-f7-clean-history.bundle | (نهایی در transfer/SHA256SUMS-transfer.txt) |
| transfer/patches/ | ۹۶ پچ روی پایهٔ ثابت 28b64bb |

## نکتهٔ اسکن اسرار

- «کلید canary آزمایشی» (ماسک‌شده) یک **کلید ساختگی آزمون** است (هرگز اعتبار واقعی نبود). در بسته‌ها صفر تکرار دارد؛ تنها تطابق grepِ شمارنده با **الگوی خودِ اسکنر** در `scripts/f7-package.sh` است — این به‌عنوان match قابل قبول ثبت می‌شود.
- keystore امضا (`android/keystore/rahyar-f7b.keystore` + `keystore.properties`) **خارج Git و خارج بسته** است (gitignored — با `git check-ignore` اثبات شد). اثر گواهی: SHA-256 `79496581…5dc088ce`.
- کلوچه‌ها/جارهای نشست فقط در /tmp؛ داخل هیچ بسته‌ای نیستند.
