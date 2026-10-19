# انتشار مخزن GitHub — رهیار AI (Rahyar)
**Owner:** `aresmaeily2` · **Repository:** `HAMYAR-AI` (تغییرنام به Rahyar در انتظار اقدام مالک) · **نسخهٔ نهایی:** `1.0.0`

> **به‌روزرسانی 2026-10-19 — نسخهٔ نهایی 1.0.0 (مأموریت ارتقای جامع):**
> مخزن در `aresmaeily2/HAMYAR-AI` منتشر شده (کامیت‌های rc1 تا rc2 پوش شدند) و موج ارتقای نهایی ۱٫۰ روی آن اعمال شد:
> HSTS، حق فراموشی کامل‌تر، مرز خطای سراسری، اسکلت بارگذاری، حذف ۷ وابستگی مرده، متای OG/Twitter، نسخهٔ `1.0.0` و CHANGELOG.
> جزئیات: `CHANGELOG.md` و `docs/GRAND_UPGRADE_RC3.md`. انتشار نهایی = push پس از دروازه‌های سبز با `scripts/github-push.sh` (توکن فقط runtime خوانده می‌شود).

---

## وضعیت آماده‌سازی (انجام‌شده در این نشست)
- ✓ نام یکپارچه در `package.json`/README/Manifest/PWA/عنوان پنجره/آیکون/مستندات = **Rahyar / رهیار AI**
- ✓ تاریخچه git کاملاً تازه (یک کامیت یتیم) — هیچ تاریخی از پروژه‌های دیگر یا بلاب‌های حساس قدیمی وجود ندارد
- ✓ اسکن استقلال: صفر ارجاع به پروژه‌های دیگر در ۳۴۷ فایل track‌شده
- ✓ `.env`/DB/`download`/`artifacts`/`worklog` خارج از مخزن (`.gitignore`)
- ✓ `git status` پاک؛ شاخه `main`؛ تگ `v1.0.0-rc1`

## چرا Push در sandbox انجام نشد
این محیط اجرا **هیچ اعتبارنامه‌ای برای GitHub ندارد** (نه `gh`، نه `GITHUB_TOKEN`، نه credential helper) و طبق سوابق این نشست، اتصال خروجی به GitHub پروسه ابزار را ناپایدار می‌کند. بنابراین مخزن به‌صورت **push-ready** آماده شد و انتشار با یک دستور توسط مالک (که توکن دارد) انجام می‌شود — برای شفافیت کامل، این تنها مورد خارج از اختیار کد است.

## دستور انتشار (مالک اجرا کند)

### گزینه الف — از همین ماشین (توصیه‌شده)
```bash
cd /home/z/my-project
git remote add origin https://github.com/aresmaeily2/Rahyar.git
git push --force -u origin main --tags
# Token در صورت درخواست: username = aresmaeily2 ، password = <GitHub PAT با scope repo>
```

### گزینه ب — با توکن در یک خط
```bash
cd /home/z/my-project && git push --force https://aresmaeily2:<YOUR_PAT>@github.com/aresmaeily2/Rahyar.git main --tags
```

### گزینه ج — از هر ماشین دیگر با باندل
فایل `download/rahyar-rc-1.0/rahyar-v1.0.0-rc1.bundle` را به آن ماشین ببرید:
```bash
git clone rahyar-v1.0.0-rc1.bundle Rahyar && cd Rahyar
git push --force https://github.com/aresmaeily2/Rahyar.git main --tags
```

## شواهد خواسته‌شده مرحله ۱۷
| مورد | مقدار |
|---|---|
| Repository | `https://github.com/aresmaeily2/Rahyar` (پس از اجرای دستور بالا) |
| Tag | `v1.0.0-rc1` |
| هش نهایی/گزارش کامل | `download/rahyar-rc-1.0/18-انتشار-GitHub.md` (پس از این کامیت ثبت می‌شود) |
| Push | ⏳ با دستور بالا توسط مالک — باندل آماده است |
