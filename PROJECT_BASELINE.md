# PROJECT_BASELINE.md — ممیزی پایهٔ مأموریت تحویل نهایی RahyAr (R2)

- زمان ممیزی: **2026-11-01 23:50 تهران (+0330)**
- مخزن: `/home/z/my-project` → `origin = https://github.com/aresmaeily2/HAMYAR-AI.git`
- branch: `main` — HEAD: `4653507575e6f03cefd8c67cdbda5d5330c1e0f1`
- نسبت به origin/main: **جلو ۲۴ / عقب ۰** (ls-remote در نشست قبلی تأیید شده؛ این نشست فقط وضعیت لوکال مبنای کار است)
- working tree در شروع: تمیز (۰ تغییر tracked)؛ شاخه‌های لوکال: `feature/ambient-motion-polish`، `fix/corrective-mission-360`، `fix/p06r-secrets-closeout`
- tags: `v1.0.0-rc1`، `v1.1.0`، `v1.2.0`

## ۱) وضعیت محیط در شروع مأموریت

| مؤلفه | وضعیت واقعی (مدرك) |
|---|---|
| سرور وب | `next dev` (turbopack، v16.4.2) روی `*:3000` — در شروع نشست **معلق** بود (TCP وصل می‌شد، HTTP پاسخ نمی‌داد؛ ~۳ ساعت بدون پاسخ). پس از kill، سوپروایزر پلتفرم آن را نساخت؛ راه‌اندازی دستی: `bun run dev` → `/api/health` = `200 {"status":"ok","database":"ok"}` |
| Caddy | پروسهٔ پلتفرم `caddy run --config /app/Caddyfile` فعال است؛ config پلتفرم از sandbox قابل خواندن نیست. `Caddyfile` داخل ریپو (نسخهٔ سخت‌شدهٔ ۱٫۳٫۰، پورت ۸۱→۳۰۰۰، مهار بدنهٔ ۱MB، flush SSE) توسط هیچ پروسهٔ فعلی استفاده نمی‌شود |
| دیتابیس | `db/custom.db` (۲۲۵KB) موجود ولی **خالی**: ۱۴ جدول، `User=0، Session=0، Task=0` |
| `.env` | فقط `DATABASE_URL=file:/home/z/my-project/db/custom.db` — بدون هیچ کلید ارائه‌دهندهٔ AI (AI از `z-ai-web-dev-sdk` با اعتبار محیط پلتفرم استفاده می‌کند) |
| Playwright | chromium-1200 + headless shell + ffmpeg نصب (برای E2E و ضبط ویدئو قابل استفاده) |

## ۲) حادثهٔ بازیابی Workspace (مهم — برای مالک)

پوشه‌های untracked / خارج از گیت در بازیابی این نشست **بازنگشته‌اند** و از دست رفتند:
- `download/` — شامل بستهٔ تحویل P0_6R_FINAL (۳۴ فایل، manifest 34/34) و `rahyar-preview-credentials.txt`
- `vault/` — شامل backup رمزنگاری‌شدهٔ keystore + فایل رمز + `BACKUP_RECORD.md`
- `artifacts/rahyar-audit/`

خود keystore اصلی سالم است: `android/rahyar-release.keystore` (tracked، SHA-256 فایل: `d4b7169a21f8f113f7cf8104c0b5dd32…`). **اقدام ترمیمی در همین مأموریت**: بازسازی backup خصوصی + آزمون بازیابی مستقل (بخش C3) و تولید دوبارهٔ کل بستهٔ تحویل از git + اسکریپت‌های tracked. درس ماندگاری: هر خروجی ماندگار باید commit شود یا از طریق اسکریپت tracked بازتولید‌پذیر باشد.

## ۳) رجیستر C1–C10 (بازسازی‌شده از اسکریپت‌های tracked — اثرانگشت = ۱۲ نویسهٔ اول SHA-256 مقدار)

| ID | ماهیت | fp | reach قبلی | وضعیت برای راستی‌آزمایی این مأموریت |
|---|---|---|---|---|
| C1 | رمز owner دورهٔ v2.0/v2.1 (len 11) | `cec51518b9ac` | PUBLIC (origin/main + feature، ~۱۸ اسکریپت شواهد) | افشای تاریخی؛ چرخش/تاریخچه = تصمیم مالک |
| C2 | رمز owner دورهٔ v1.0.0-rc1 (len 15) | `ee0880daa2ca` | PUBLIC | مثل C1 |
| C3 | store-pass + key-pass keystore فعلی (len 7) | `f60ed56a9c82` | PUBLIC (تاریخچه) | حامل‌ها در `cc1d8c4` پاک شدند (بازتأیید شود)؛ keystore فعلی tracked است |
| C4 | store-pass keystore قدیمی (len 10) | `dd65b755befe` | PUBLIC | حامل `scripts/build-android-apk.sh` — پاک‌سازی در cc1d8c4 (بازتأیید شود) |
| C5 | رمز کاربر تست sarika (len 11) | `8eb38003b10d` | PUBLIC | چرخش = مالک؛ حامل‌ها بررسی شود |
| C6 | literal منفی badLogin (len 12) | `e20de4c418c6` | PUBLIC | NOT_APPLICABLE |
| C7 | رمز owner دورهٔ ۳۶۰ (len 17) | `46d0a91d1e48` | LOCAL ONLY (main + fix) | هر push بدون پاک‌سازی آن را عمومی می‌کند |
| C8 | bootstrap password (len 21) | `8aa62d3b0a15` | LOCAL ONLY | fix fail-closed mint + آزمون‌های T1-T7 در cc1d8c4 — اجرای مجدد آزمون‌ها |
| C9 | session token 32B base64url، TTL 24h (len 43) | `ff9d8259a6e5` | LOCAL ONLY | فایل `.evidence-session-token` هنوز tracked؛ TTL منقضی، جدول Session خالی → INACTIVE |
| C10 | رمز جفت username ۱۶نویسه‌ای (len 12) | `9774fdedae3b` | PUBLIC | چرخش/تاریخچه = مالک |

فایل‌های حامل فعلی (روی دیسک، tracked): `.evidence-password` (۲۱B)، `.evidence-session-token` (۴۳B) — تأیید شد روی `origin/main` **نیستند**. قبل از هر push باید از ایندکس خارج شوند.

## ۴) معماری واقعی (خلاصه از سورس)

- **Web**: Next.js 16 App Router + React 19 + TS + Tailwind 4 + shadcn/ui + framer-motion؛ i18n دستی (`src/i18n/{fa,en,core,date,store}.ts`)؛ تم‌ها و Ambient Layer (`src/lib/ambient/*`، `src/styles/{themes,tokens,motion,ambient,glass}.css`)؛ PWA (`public/sw.js`، `manifest.ts`).
- **API**: ~۴۰ route — auth (setup/login/logout/session/password)، chat + chat/stream (SSE)، tasks/subtasks/plan/reminders، finance (accounts/transactions/budgets/export)، sms/import، settings (app/ai/usage/test)، memory/report-daily/users-admin، data (export/import/delete-all)، connections، weather، download/[file]، health.
- **AI**: `src/lib/ai/gateway.ts` + providers (`zai` via z-ai-web-dev-sdk، `openai-compatible`، `local-rules`) + usage logging (`AiUsage`) + سقف مصرف env-based.
- **لایهٔ دفاعی**: `src/lib/security.ts` (rate limiter پنجره‌لغزان + LRU، sameOriginOk، readJsonSafe ۱۰۰KB، cleanText، safeUrl، گاردهای فعل حذف/فراموشی)؛ `src/proxy.ts`.
- **Android**: `android/` — اپ Java + WebView hybrid + tests JUnit + keystore release (tracked) + اسکریپت‌های build.
- **تست‌ها**: ۱۶ فایل unit (`tests/unit/*.test.ts` با bun test) + `tests/e2e/grand-e2e.mjs` (Playwright) + `scripts/tests/run-p06r-secret-tests.sh`.

## ۵) ریسک‌های شروع مأموریت

1. C1/C2/C3/C4/C5/C10 با reach PUBLIC در تاریخچهٔ origin — تا چرخش توسط مالک، معتبر-بالقوه؛ پاک‌سازی تاریخچهٔ origin نیازمند تصمیم مالک است.
2. C7/C8/C9 فقط-لوکال — گارد pre-push الزامی (خروج از ایندکس + gitignore).
3. Preview عمومی: از داخل sandbox قابل استخراج/احراز نیست (نشست قبل: هر سه candidate URL → 404 بیرونی). لینک قطعی فقط از پنل Workspace مالک.
4. گارد same-origin هنگام دسترسی از مسیر پروکسی‌شده ممکن است POST مرورگر را رد کند (Host/Origin بازنویسی‌شده در لبه) — باید ریشه‌یابی و fail-closed-but-correct اصلاح شود.
5. DB خالی = بدون حساب مالک در شروع (ایجاد شد — رمز تصادفی جدید، ذخیرهٔ خصوصی `artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt`، mode 600، هرگز در گزارش/git چاپ نمی‌شود).
6. از دست رفتن فایل‌های untracked در بازیابی (بخش ۲).

## ۶) اعلام وضعیت شروع

مأموریت R2 از این baseline آغاز می‌شود؛ هر ادعای بعدی باید به commit/فایل/خروجی فرمان در `docs/final-delivery/` متصل باشد. تیم ۱۰نفره در `agents/roles.md` و وضعیت اجرا در `docs/final-delivery/MASTER-EXECUTION-STATE.md` نگهداری می‌شود.
