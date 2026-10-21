# فهرست نهایی اقلام تحویل — RahyAr v2.0.0 (بند ۱۰ دستور)

| # | قلم | محل / وضعیت |
|---|---|---|
| ۱ | APK نسخهٔ Owner | `download/rahyar-v2-delivery/RahyAr-Owner-v2.0.0-owner-debug.apk` — SHA-256 `aacf02a5…d3bde2d99` |
| ۲ | APK نسخهٔ User | `download/rahyar-v2-delivery/RahyAr-User-v2.0.0-debug.apk` — SHA-256 `a78e3767…21e2a9621` |
| ۳ | لینک دانلود | tmpfiles.org تأییدشدهٔ ۶۰دقیقه‌ای در پیام تحویل + لینک دائمی gofile پس از رفع rate-limit؛ در فضای کاری `download/rahyar-v2-delivery/` همیشه موجود است |
| ۴ | سورس متناظر | کامیت‌های v2.0.0 در مخزن محلی + `RahyAr-Source-v2.0.0.zip` (دستور push دقیق در §گیت‌هاب پایین) |
| ۵ | گزارش ممیزی تطبیقی | `docs/DELIVERY_V2/FEATURES_MATRIX_V2.md` |
| ۶ | ماتریس قابلیت‌ها + وضعیت آزمون | همان سند (ستون وضعیت با واژگان قراردادی) |
| ۷ | گزارش امنیت و نقش‌ها | `docs/DELIVERY_V2/SECURITY_REPORT_V2.md` |
| ۸ | راهنمای نصب و ورود | `docs/DELIVERY_V2/INSTALL_GUIDE_V2_FA.md` |
| ۹ | راهنمای استقرار سرور | `docs/DELIVERY_V2/DEPLOYMENT_V2_FA.md` |
| ۱۰ | راهنمای Providerها و کلیدها | `docs/DELIVERY_V2/DEPLOYMENT_V2_FA.md` §مدل میزبان + `docs/AI_PROVIDERS.md` (معماری) |
| ۱۱ | وابستگی‌ها و هزینه‌ها | `docs/DELIVERY_V2/DEPLOYMENT_V2_FA.md` §هزینه‌ها |
| ۱۲ | بستهٔ اسکرین‌شات (۲۴ تصویر + مانیفست) | `download/screenshots-v2/` (zip: `RahyAr-Screenshots-v2.0.0.zip`) |
| ۱۳ | گزارش آزمون‌ها (نتایج واقعی) | `docs/DELIVERY_V2/TEST_REPORT_V2.md` |
| ۱۴ | محدودیت‌های باقی‌مانده | `docs/DELIVERY_V2/LIMITATIONS_V2_FA.md` |

## وضعیت گیت‌هاب — محدودیت شفاف (بند ۹ دستور)

**Push به `aresmaeily2/RahyAr` در این جلسه انجام نشد** — مدرک:
```
git ls-remote https://github.com/aresmaeily2/RahyAr.git
→ fatal: could not read Username for 'https://github.com': No such device or address
```
نشانهٔ نبودِ هرگونه اعتبارنامه (PAT/SSH) در محیط پس از ریست — هیچ کلیدی در env، `~/.git-credentials`، `~/.ssh` یا git config موجود نیست. طبق دستور، «ادعای push موفق بدون نتیجهٔ واقعی ممنوع» رعایت شد: **ادعا نمی‌شود**.

برای push (پس از تامین PAT با دسترسی repo):
```bash
cd RahyAr-Source-v2.0.0/ && unzip ..zip  # یا از مخزن محلی
git init && git add -A && git commit -m "RahyAr v2.0.0 — full product (AI+voice+reminders+finance+dual editions)"
git branch -M main
git remote add origin https://<PAT>@github.com/aresmaeily2/RahyAr.git
git push -u origin main
```
تاریخچهٔ محلی این جلسه از پروژهٔ بورسی کاملاً جدا است (rootRepo متفاوت).

## یادداشت لینک دانلود

هاست‌های عمومی آزمایش‌شده در این جلسه:
- tmpfiles.org: موفق + تأیید SHA-256 پس از دانلود ✅ (انقضای ۶۰ دقیقه)
- gofile.io: rate-limit پایدار در این جلسه (HTTP 000/`error-rateLimit`) — در جلسهٔ قبل همین میزبان موفق بود؛ تلاش مجدد توصیه می‌شود
- x0.at: پسوند .apk را رد می‌کند (۴۰۳) — محدودیت مستند جلسهٔ قبل
- filebin/litterbox/catbox/transfer.sh/0x0.st: ناموفق/مسدود از این IP
