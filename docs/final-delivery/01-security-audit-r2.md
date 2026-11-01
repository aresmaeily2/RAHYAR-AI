# 01 — گزارش امنیتی (Agent 1: Security Lead) — مأموریت R2

تاریخ: 2026-11-02 تهران | commit ممیزی: `4653507` → commit اصلاحات: `a7ff761`

## روش
بازبینی کد ۴۱ فایل route + کتابخانه‌های امنیتی، ۵ probe زنده (curl با اعتبار جعلی)، اسکن git. چارچوب: OWASP ASVS-lite + OWASP Top-10 برای اپ‌های LLM.

## ماتریس احراز هویت/مجوز (خلاصه)
- **۱۰۰٪ مسیرهای mutating** گارد `sameOriginOk()` دارند (grep-verify روی ۴۱ فایل).
- **۱۰۰٪ مسیرهای غیرعمومی** `requireUser()` و کوئری‌های scoped با `userId` (مالی با `assertOwned`).
- مسیرهای عمومی: `/api/health`، `/api/download/[file]` (سفیدلیست سخت نام‌فایل — traversal زنده تست شد → 404)، auth.
- users-admin: فقط OWNER؛ خروجی بدون hash؛ UserAudit بدون secret.

## یافته‌ها و سرنوشت
| ID | شدت | موضوع | وضعیت R2 |
|---|---|---|---|
| F-1 | Medium | پیش‌فرضِ باز AI_ALLOW_PRIVATE_ENDPOINTS | **اصلاح شد** → پیش‌فرض deny، فلگ صریح `=1` (openai-compatible.ts) |
| F-2 | Low | GET /api/chat بدون rate limit | **اصلاح شد** → 60/min |
| F-3 | Low | mustChangePassword فقط سمت کلاینت | **پذیرفته‌شده با مستند** — گیت سرور نیازمند تغییر جریان ورود؛ در نسخهٔ بعد |
| F-4 | Low | کوکی بدون پیشوند __Host- | **اصلاح شد** → فلگ opt-in `RAHYAR_COOKIE_HOST_PREFIX=1` (فقط تولید+HTTPS) |
| F-5 | Low | قفل‌شدن username توسط مهاجم (self-DoS) | پذیرفته‌شده — SameSite=Lax + مسیر session-bucket موجود |
| F-6 | Low | خروجی export شامل ai_endpoint_url | **اصلاح شد** → در SECRET_SETTING_KEYS |
| F-7 | Info | APK عمومی بدون auth (کانال انتشار) | پذیرفته‌شده — کانال انتشار عمومی است |

## Threat Model (خلاصه)
- **دارایی‌ها**: دادهٔ خصوصی کاربران (کار/چت/مالی)، قدرت owner، سهمیه مدل، APK و kit امضا (رمزنگاری‌شده).
- **ورودی‌های اصلی**: brute-force login (مهار: RL 10/min + 20/15min + scrypt N=2^16 + timing-equalize)، CSRF (SameSite=Lax + sameOriginOk + Sec-Fetch-Site)، SSRF endpoint کاربر (double-DNS-resolve + block metadata + redirect-manual)، هزینهٔ مدل (RL + سهمیه + kill-switch).
- **کوکی**: 32B random، فقط SHA-256 ذخیره، httpOnly/SameSite=Lax/secure(prod)، TTL 30d، چرخش در تغییر رمز.

## راستی‌آزمایی زنده روی بیلد تولیدی (بعد از اصلاحات)
- `POST /api/auth/login` با Origin خارجی + `X-Forwarded-Host` (و TRUST_PROXY_HEADERS=1) → **401** (گارد گذشت؛ احراز رد شد) ✓
- همان درخواست بدون XFH → **403 fail-closed** ✓ (دفاع CSRF سر جایش)
- traversal روی /api/download → 404 ✓

## Verified OK (نمونه شواهد)
- ReactMarkdown بدون rehype-raw (XSS امن)؛ صفر dangerouslySetInnerHTML؛ CSP nonce + strict-dynamic + frame-ancestors none.
- readJsonSafe: مهار افزایشی ۱۰۰KB؛ LRU سبد نرخ 10k؛ کش‌های bounded.
- پیام‌های خطا فقط فارسی/عمومی — بدون نشت stack به کلاینت.
