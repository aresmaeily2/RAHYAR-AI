# استقرار رهیار AI

## پیش‌نیازها

- bun 1.3+ (یا Node 20+)، ~200MB دیسک
- پورت 3000 (یا هر پورت دلخواه) پشت پروکسی TLS (توصیه: Caddy)

## گام‌به‌گام

```bash
# ۱) کد + وابستگی‌ها
git clone <repo> rahyar && cd rahyar      # یا کپی بسته سورس
cp .env.example .env                       # DATABASE_URL و TRUST_PROXY_HEADERS را تنظیم کنید
bun install

# ۲) دیتابیس
bun run db:generate
bun run db:push                            # ساخت جداول SQLite

# ۳) تولید بیلد پروداکشن (standalone)
bun run build

# ۴) اجرا
PORT=3000 NODE_ENV=production bun .next/standalone/server.js
# یا: bun run start

# ۵) راه‌اندازی اولیه مالک
# مرورگر → /login → «راه‌اندازی اولیه»: رمز ≥۸ نویسه (فقط یک‌بار، ادعای اتمیک sentinel)
```

## پیکربندی کلیدی (.env)

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `DATABASE_URL` | `file:.../db/custom.db` | مسیر مطلق فایل SQLite |
| `TRUST_PROXY_HEADERS` | `1` | پشت Caddy/nginx = 1؛ دسترسی مستقیم = 0 (وگرنه rate-limit با هدر جعلی دور زده می‌شود) |
| `RAHYAR_AI_DISABLED` | `0` | `1` = کلید قطع همه فراخوانی‌های مدل و جستجوی وب |
| `AI_USER_DAILY_LIMIT` / `AI_USER_MONTHLY_LIMIT` / `AI_SYSTEM_DAILY_LIMIT` | ۶۰ / ۹۰۰ / ۳۰۰ | سهمیه‌های دروازه (۰ = بی‌سقف — توصیه نمی‌شود) |
| `AI_MAX_INPUT_CHARS` / `AI_MAX_OUTPUT_CHARS` | ۲۴۰۰۰ / ۴۰۰۰ | سقف طول هر فراخوانی |

## امنیت استقرار

- TLS اجباری (کوکی `secure` در production). پشت پروکسی، سرآیندهای `X-Forwarded-For` را پروکسی بازنویسی کند.
- پوشه `db/` و `.env` و `backups/` خارج از دسترس وب باشند (این اپ فایل استاتیک از `public/` سرو می‌کند و به db دسترسی وب ندارد).
- backup دوره‌ای: `bun run backup` (VACUUM INTO با integrity_check) + نگهداری خارج از سرور.
- بازیابی: توقف سرویس → جایگزینی `db/custom.db` با پشتیبان → اجرای سرویس (اسکریپت خروجی backup دستور دقیق چاپ می‌کند).

## عملیات

- Health: `GET /api/health` — برای uptime monitor خارجی مناسب است.
- لاگ: stdout پروسه (dev: `dev.log`) — بدون محتوای خصوصی کاربر.
- مقیاس: تک‌نمونه‌ای (rate-limit و زمان‌بند درون‌حافظه‌ای). چندنمونه‌ای در حال حاضر پشتیبانی نمی‌شود.
- به‌روزرسانی: `git pull` → `bun install` → `db:push` → `build` → ری‌استارت پروسه؛ داده کاربر دست‌نخورده می‌ماند.
