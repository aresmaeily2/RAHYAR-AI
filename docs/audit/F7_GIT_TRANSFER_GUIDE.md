# F7_GIT_TRANSFER_GUIDE — راهنمای انتقال امن به GitHub (برای مالک)

> این راهنما برای **مالک** نوشته شده است. در F7 هیچ Push انجام نشد (هیچ اعتبارنامه‌ای در سندباکس نیست و طبق مأموریت، انتشار عمومی تا عبور از دروازه‌ها + تأیید مالک ممنوع است).

## ۰. وضعیت فعلی در یک نگاه

| مورد | مقدار |
|---|---|
| مخزن مقصد | `https://github.com/aresmaeily2/RAHYAR-AI.git` یا `…/HAMYAR-AI.git` — **هر دو یک مخزن‌اند** (ls-remote هر دو = `28b64bb`؛ سازگار با ریدایرکت تغییر نام). نام canonical را در GitHub → Settings تأیید کنید. |
| وضعیت مخزن مقصد | `28b64bb` |
| بستهٔ انتقال | `download/RahyAr-F7/transfer/` — تاریخچهٔ **پاک‌شده از ۳ blob حساس** |
| HEAD پاک | `0a30e2886d42a3eb74e16b17eca46c18e7517f43` |
| نسبت با `28b64bb` | fast-forward (۹۳ پچ، ۰ عقب) |

## ۱. روش A — از طریق bundle (توصیه‌شده)

```bash
# ۱) کلون از بسته (بدون نیاز به شبکه)
git clone rahyar-f7-clean-history.bundle rahyar-clean
cd rahyar-clean
git checkout main

# ۲) راستی‌آزمایی سلامت (هر سه باید 0 باشد)
git rev-list --all -- android/rahyar-release.keystore .evidence-password .evidence-session-token | wc -l

# ۳) اتصال به مقصد و بررسی dry-run
git remote add github https://github.com/aresmaeily2/RAHYAR-AI.git
git fetch github
git merge-base --is-ancestor github/main main && echo "FAST-FORWARD OK"
git push --dry-run github main

# ۴) Push واقعی (fast-forward؛ نه force)
git push github main
```

## ۲. روش B — از طریق پچ‌ها (۹۳ پچ)

```bash
git clone https://github.com/aresmaeily2/RAHYAR-AI.git rahyar-patched && cd rahyar-patched
git am /path/to/transfer/patches/*.patch   # به‌ترتیب شماره
# نتیجه باید HEAD == 0a30e28 باشد:
git rev-parse HEAD
```

## ۳. کنترل‌های پیش و پس از push

| کنترل | دستور | نتیجهٔ مورد انتظار |
|---|---|---|
| سلامت bundle | `git bundle verify rahyar-f7-clean-history.bundle` | بدون خطا |
| هش بسته | `sha256sum -c SHA256SUMS-transfer.txt` | OK |
| فقدان blob حساس | بند ۱-گام ۲ | `0` |
| بدون force | هرگز `--force`/`+ref` نزنید؛ `merge-base --is-ancestor` تأیید می‌کند | FAST-FORWARD OK |
| پس از push | `git ls-remote <repo> HEAD` | `0a30e28…` |
| نگاشت هویت | `commit-map.txt` برای تطبیق هر SHA قدیم/جدید | — |

## ۴. نگهداری محرمانگی در ادامه

- `android/keystore.properties` و فایل keystore امضا **خارج Git** می‌مانند (fail-closed در `android/app/build.gradle`)؛
- pre-push guard (`scripts/tests/r2_push_guard.py`) قبل از push فعال باشد؛
- اگر روزی تاریخچهٔ قدیمیِ آلوده (۹۵کامیتی اصلی) به‌اشتباه push شد: مخزن را فوراً private کنید و با مالک دربارهٔ ابطال توکن نشست (۴۳ کاراکتری، اگر تا آن زمان معتبر بوده) تصمیم بگیرید — این توکن هرگز عمومی نشده است.

## ۵. آنچه تحویل شماست

```
download/RahyAr-F7/transfer/
├── rahyar-f7-clean-history.bundle   (تاریخچهٔ کامل پاک — روش A)
├── patches/                          (۹۳ پچ — روش B)
├── commit-map.txt                    (نگاشت قدیم→جدید)
└── SHA256SUMS-transfer.txt
```
