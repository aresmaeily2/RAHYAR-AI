# F7_SECURITY_AUDIT — امنیت (Agent 4) + امنیت تاریخچهٔ Git (Agent 1)

- **چرخه:** F7 · **تاریخ:** 2026-11-07 · **HEAD پایه:** `5630814`


## ۱. ماتریس امنیت زنده — ۱۱/۱۱ (`artifacts/logs/f7/sec-matrix.log`)

T1/T2 بدون نشست → 401 · T3 /emulator بدون نشست → 307 · T6 غیرمالک → 403 · T8 CSRF cross-origin → 403 · T9 honesty (503 هنگام down) · T10 نرخ: 3×200 سپس 429 · T11 مالک 200.

## ۲. باتری راه‌اندازی OWNER روی DB تازه — S1–S11 (`sec-deep.log`)

S1 بدون توکن 403 · S2 توکن غلط 403 · S3 admin/admin123 → 401 (بدون رمز پیش‌فرض) · S4 ستاپ معتبر 200 · S5 کوکی Secure/HttpOnly/SameSite=lax · S6 استفادۀ دوم توکن 403 (یک‌بارمصرف) · S7 overwrite مالک 403 · S8 ورود با رمز جدید 200 · S9 هش امن (s2:… ۱۶۴ نویسه) · S10 رمز در لاگ = ۰ · S11 plaintext در DB = ۰.

## ۳. نرخ-لیمیت پس از ری‌استارت / ایزوله‌سازی

ورود اشتباه ۱۲ پشت‌سرهم پس از ری‌استارت → 9×401 سپس 429 · دادهٔ user جدا از owner (مالی: ۰ حساب؛ T6/T7 ماتریس) · `resolveExpenseAccountFromText` فقط در محدودهٔ userId.

## ۴. نشت کلید — canary صفر در ۴ مسیر (جزئیات در F7_PROVIDER_MATRIX.md)

## ۵. امنیت تاریخچهٔ Git (Agent 1)

- سه blob حساس (`android/rahyar-release.keystore`, `.evidence-password`, `.evidence-session-token`) فقط در ۹۵ کامیتِ منتشرنشده؛ **۰ کامیت در هر ref ریموت**
- keystore تاریخی بدون رمزِ داخل مخزن باز نمی‌شود (آزمون بازیابی ۸۵ نامزد — کامیت‌شده)
- پاک‌سازی: `git-filter-repo` روی کلون؛ درخت HEAD بیت‌به‌بیت حفظ؛ هر سه مسیر/blob از تاریخچهٔ قابل انتقال حذف؛ bundle/patch پاک + نگاشت کامل commit-map
- ابهام نام remote تعیین تکلیف شد: HAMYAR-AI و RAHYAR-AI **یک مخزن‌اند** (ls-remote هر دو = 28b64bb — ریدایرکت تغییر نام)
- جزئیات: `F7_GIT_SECURITY_AUDIT.md`، `F7_HISTORY_CLEANUP_PLAN.md`، `F7_GIT_TRANSFER_GUIDE.md`

## ۶. یافته‌های این چرخه (با شدت)

| ID | شدت | یافته | وضعیت |
|---|---|---|---|
| GIT-SEC-1 | High (اگر push می‌شد) | سه blob حساس در ۹۵ کامیتِ محلی | **FIXED** — تاریخچهٔ انتقال پاک؛ اثبات V1/V2 |
| FIN-1 | Minor | درج هم‌زمان duplicate → HTTP 500 | **FIXED** — پاسخ duplicate؛ ۵ موازی → ۱ ردیف |
| SEC-CF-1 | Minor | «بله، …» (U+060C) تأیید شمرده نمی‌شد → مسیر مدل + ادعای بی‌اثر (گارد می‌گرفت) | **FIXED** — رگرسیون زنده |
| VOICE-1 | Minor | هنگ TTS بومی بدون failsafe | **FIXED** (25s/20s) |
| VOICE-2 | Major (عملکردی) | چرخهٔ Wake Word پس از اولین خطا می‌مُرد | **FIXED** (backoff + آزمون JVM) |
| AUTH-1 | Minor | جریان رضایت میکروفون در حالت متصل نبود | **FIXED** (need_request/denied + retry) |
| **بحرانی/بااهمیت باز** | — | **هیچ** | — |

## ۷. HTTPS/Production

پیکربندی تولید: `TRUST_PROXY` + same-origin + `__Host-` cookie opt-in (از R2)؛ در سندباکس آزمون روی HTTP محلی انجام می‌شود — TLS پایان-به-انتقال مسئولیت میزبان مالک است (مستند در DEPLOYMENT).
