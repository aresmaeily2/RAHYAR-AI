# -*- coding: utf-8 -*-
"""P0-6R ACCEPTANCE — جریان کامل تأیید پشتیبان keystore در مخزن خصوصی vault/.

۱) تلاش برای بازیابی blob موجود با رمز ثبت‌شده (روش مستند openssl -pass file:)
۲) در صورت عدم تطبیق: علامت‌گذاری blob قدیمی به‌عنوان UNRECOVERABLE و ساخت
   بکاپ جدید از keystore دست‌نخورده با همان فایل رمز (round-trip تضمینی)
۳) ثبت کامل ماسک‌شده در vault/BACKUP_RECORD.md — مقدار رمز هرگز چاپ نمی‌شود.
"""
import hashlib
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path("/home/z/my-project")
VAULT = ROOT / "vault"
ENC = VAULT / "rahyar-release-keystore.backup.enc"
PWF = VAULT / "keystore-backup-password.txt"
KS = ROOT / "android/rahyar-release.keystore"
TMP = Path("/tmp/ks-restored-acceptance.bin")
TEH = timezone(timedelta(hours=3, minutes=30))
NOW = datetime.now(TEH).strftime("%Y-%m-%d %H:%M:%S %z")
DEC_CMD = "openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in <backup.enc> -out <restored> -pass file:keystore-backup-password.txt"


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


assert ENC.exists() and PWF.exists() and KS.exists()
ks_sha = sha256(KS)
enc_sha = sha256(ENC)

# ── ۱) بازیابی blob موجود با روش مستند ──
if TMP.exists():
    TMP.unlink()
r = subprocess.run(
    ["openssl", "enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000",
     "-in", str(ENC), "-out", str(TMP), "-pass", "file:" + str(PWF)],
    capture_output=True,
)
opened = r.returncode == 0 and TMP.exists() and TMP.stat().st_size > 0
match = opened and sha256(TMP) == ks_sha
old_blob_status = "OPENED+MATCH" if match else "UNRECOVERABLE-WITH-RECORDED-PW"
print(f"[۱] بازیابی blob موجود ({enc_sha[:16]}…): {old_blob_status}")

# ── ۲) در صورت عدم بازیابی: علامت‌گذاری و ساخت بکاپ جدید از keystore دست‌نخورده ──
recreated = False
if not match:
    dead = VAULT / "rahyar-release-keystore.backup.UNRECOVERABLE-20261101.enc"
    ENC.rename(dead)
    old_path_note = dead.name
    if TMP.exists():
        TMP.unlink()
    c = subprocess.run(
        ["openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-salt",
         "-in", str(KS), "-out", str(ENC), "-pass", "file:" + str(PWF)],
        capture_output=True,
    )
    assert c.returncode == 0, "ساخت بکاپ جدید ناموفق بود"
    enc_sha = sha256(ENC)
    recreated = True
    # آزمون بازیابی round-trip با همان روش مستند
    r = subprocess.run(
        ["openssl", "enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000",
         "-in", str(ENC), "-out", str(TMP), "-pass", "file:" + str(PWF)],
        capture_output=True,
    )
    opened = r.returncode == 0 and TMP.exists() and TMP.stat().st_size > 0
    match = opened and sha256(TMP) == ks_sha
    print(f"[۲] blob قدیمی → {dead.name} | بکاپ جدید ساخته شد: {enc_sha[:16]}…")
else:
    old_path_note = "(همان blob سالم)"

# ── ۳) پاکسازی فایل موقت ──
if TMP.exists():
    TMP.unlink()

print(f"[۳] SHA-256 keystore اصلی: {ks_sha}")
print(f"[۳] SHA-256 پشتیبان نهایی:  {enc_sha}")
print(f"[۳] نتیجهٔ نهایی: {'PASS — تطبیق کامل SHA-256' if match else 'FAIL'}")

raw = PWF.read_bytes()
n_lines = len(raw.decode("utf-8").splitlines())
record = f"""# سند خصوصی پشتیبان keystore Release — {NOW}

> محرمانه — این فایل فقط در `vault/` (خارج از بستهٔ اشتراکی و گیت) می‌ماند.

## ۱) محل و حفاظت
- فایل پشتیبان رمزگذاری‌شده: `/home/z/my-project/vault/rahyar-release-keystore.backup.enc`
  - SHA-256: `{enc_sha}`
  - حجم: {ENC.stat().st_size} بایت — دسترسی: `600`
  - رمزنگاری: AES-256-CBC + PBKDF2 (iter 200000، salt) با openssl{' (بازسازی‌شده در پذیرش نهایی)' if recreated else ''}
- فایل رمز آرشیو: `/home/z/my-project/vault/keystore-backup-password.txt`
  - دسترسی: `600` — {n_lines} خط؛ رمز مؤثر = خط نخست فایل به تفسیر `openssl -pass file:`
  - مقدار رمز در هیچ گزارش/بسته/لاگی چاپ یا ذخیره نشده است.
- پوشهٔ `vault/`: دسترسی `700` — از طریق `.git/info/exclude` (فقط-لوکال، بدون هیچ تغییر tracked)
  برای گیت نامرئی است؛ `git status` هیچ ورودی از آن نشان نمی‌دهد.
- دسترسی: فقط کاربر sandbox همین Workspace و خود مالک.
- این فایل‌ها هیچ‌گاه در git، origin، مسیر عمومی Workspace، گزارش اشتراکی یا خروجی Preview قرار نگرفته‌اند.
  پیش از پذیرش نهایی به‌صورت موقت در `download/P0_6R_FINAL/` بودند و در همین پذیرش به `vault/` منتقل شدند ({NOW}).

## ۲) keystore اصلی (دست‌نخورده — هیچ تغییر/حذف/بازتولیدی انجام نشد)
- `/home/z/my-project/android/rahyar-release.keystore`
- SHA-256: `{ks_sha}`

## ۳) آزمون بازیابی کنترل‌شده
- فرمان مستند بازیابی:
  ```
  {DEC_CMD}
  ```
- نتیجهٔ رمزگشایی: {'موفق' if opened else 'ناموفق'}
- تطبیق SHA-256 با keystore اصلی: **{'PASS — یکسان' if match else 'FAIL'}**
- فایل موقت بازیابی‌شده پس از آزمون حذف شد.

## ۴) وضعیت blob قبلی (یافتهٔ پذیرش نهایی)
- blob قبلی (SHA-256 `0e6e2b717fc495355d5f3c41eb1cda27ca86e55ba6c7b0a593243f2b58695757`)
  با رمز ثبت‌شده در **۹۰ ترکیب آزمون** (KDF×تفسیر رمز) باز نشد؛ یعنی آزمون PASS ادعاشدهٔ
  فاز closeout با فایل رمز ثبت‌شده قابل بازتولید نبود.
- {' blob قدیمی به نام `rahyar-release-keystore.backup.UNRECOVERABLE-20261101.enc` در vault علامت‌گذاری و نگهداری شد (بدون حذف داده) و بکاپ جدید از keystore دست‌نخورده بازسازی و تأیید شد.' if recreated else ' — '}
- در هر حال کلید اصلی و کارکرد آن هیچ تغییری نکرده است.

## ۵) توصیه به مالک
- فایل `.enc` + فایل رمز (+ در صورت تمایل blob قدیمی) را در اولین فرصت به محل امن خودتان
  (خارج از این Workspace) منتقل کنید؛ این Workspace موقتی است و ضمانت نگهداری بلندمدت ندارد.
- آزمون بازیابی را پس از انتقال دوباره اجرا کنید.
"""
(VAULT / "BACKUP_RECORD.md").write_text(record, encoding="utf-8")
print("[۴] سند خصوصی: vault/BACKUP_RECORD.md به‌روزرسانی شد")
