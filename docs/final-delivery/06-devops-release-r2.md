# 06 — DevOps، Build و انتشار (Agent 7) — R2

## زنجیرهٔ Preview (واقعی)
مرورگر → **لبهٔ پلتفرم (Caddy مدیریت‌شده، config خارج از دسترس sandbox)** → `127.0.0.1:3000` → **سرور تولیدی standalone** (`NODE_ENV=production bun .next/standalone/server.js`). Caddyfile داخل ریپو (پورت 81→3000، سخت‌شدهٔ ۱٫۳٫۰) برای استقرار self-host مستند است — پروسهٔ فعلی استفاده نمی‌کند.

## ریشه‌یابی و رفع 403 (D-1) — تأیید زنده
- **علت**: `sameOriginOk` فقط `Origin.host === Host` را می‌پذیرفت؛ از مسیر Preview، Origin عمومی (`https://…space-z.ai`) ولی Host داخلی است → 403 برای هر POST مرورگر.
- **رفع**: پذیرش `X-Forwarded-Host` فقط وقتی `TRUST_PROXY_HEADERS=1` صریح (fail-closed حفظ شد؛ Sec-Fetch-Site cross-site همچنان رد).
- استقرار فعلی: `TRUST_PROXY_HEADERS=1` در env سرور.
- **Probes روی بیلد تولیدی**: Origin+XFH → 401 (گذر از گارد)؛ بدون XFH → 403. ✓

## Build تولیدی
- `bun run build` → exit 0 (با NODE_OPTIONS=--max-old-space-size=1800 — باکس ۳GB).
- سرو: standalone روی :3000 با DATABASE_URL و TRUST_PROXY_HEADERS=1؛ health = `{"status":"ok","database":"ok"}`.
- Next 16.4.2 + bun 1.3.14 (Dockerfile به 1.3 ارتقا یافت — D-7).

## CI
`.github/workflows/ci.yml` موجود؛ **R2**: پین bun 1.3.14 + concurrency + **گام Secret Guard (T1–T7)**.

## بستهٔ سورس مستقل
- مبنا: `git archive HEAD` با pathspec excludes؛ پیش‌نیازِ مسدودکننده (keystore tracked) **رفع شد** (untrack).
- شامل: src، prisma/schema، public، android (بدون keystore)، tests، docs، .env.example، configs، bun.lock؛ **خارج**: node_modules/.next/db/.env*/.evidence-*/vault/artifacts/download/*.log.
- راستی‌آزمایی: اسکن نام‌فایل ممنوعه + fp-scan رجیستر روی استخراج + (در صورت شبکه) دریل نصب در /tmp.

## Android
- SDK در sandbox موجود نیست → **ساخت APK جدید در این محیط ممکن نیست** (مستند). keystore سالم + backup بازیابی‌پذیر؛ build scripts از env fail-closed استفاده می‌کنند؛ آخرین APKهای منتشرشده از مسیر whitelist `/api/download` قابل سرو نیستند چون فایل‌ها در recycle قبلی از download/ پاک شدند — بازسازی APK نیازمند محیط با SDK است (اقدام مالک/آینده).

## متغیرهای env (census کامل در گزارش Agent 7)
همهٔ envهای خوانده‌شده اکنون در `.env.example` مستندند (افزوده: NEXT_PUBLIC_SITE_URL، ZAI_CONFIG_PATH، RAHYAR_COOKIE_HOST_PREFIX؛ فلیپ F-1: AI_ALLOW_PRIVATE_ENDPOINTS=0 پیش‌فرض).

## اندپوینت‌های ازدست‌رفتهٔ دورهٔ قبل
`download/` قدیمی (APKها، بستهٔ P0_6R) در recycle از دست رفت — در این نشست از git و اسکریپت‌های tracked بازتولید شد؛ APK بازتولیدشدنی نیست (SDK) — مستند در بالا.
