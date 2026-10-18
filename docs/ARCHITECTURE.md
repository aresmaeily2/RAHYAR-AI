# معماری رهیار AI

## نمای کلی

```
مرورگر (SPA فارسی RTL)
   │  fetch نسبی /api/*
   ▼
Middleware (Edge)  ── CSP nonce + strict-dynamic، گارد حضور کوکی، ریدایرکت /login
   ▼
Route Handlers (Node)  ── ۲۱ مسیر API
   │  لایه دفاعی: sameOriginOk → rateLimit → requireUser → readJsonSafe
   ▼
لایه دامنه (src/lib)
   ├── auth.ts (نشست/رمز)      ├── security.ts (نرخ/بدنه/Origin)
   ├── server-tasks.ts          ├── server-profile.ts
   ├── assistant/ (مسیریاب قطعی، گزارش، دفتر اقدامات)
   ├── reminders/scheduler.ts (زمان‌بند ۶۰ثانیه‌ای)
   └── ai/gateway.ts  ← تنها دروازه مدل + جستجوی وب
   ▼
Prisma Client → SQLite (db/custom.db)
```

## تفکیک لایه‌ها و قواعد وابستگی

| لایه | مجاز به استفاده از | ممنوع |
|---|---|---|
| Route Handler | lib، db | منطق تجاری سنگین، دسترسی مستقیم SDK |
| lib دامنه | db، lib پایه | فراخوانی مدل خارج از gateway |
| ai/gateway.ts | ai.ts (SDK)، db | — |
| کامپوننت کلاینت | store، lib قطعی کلاینت | هرگونه import از `server-*` یا SDK |

- SDK مدل (`z-ai-web-dev-sdk`) فقط در دو فایل سرور: `src/lib/ai.ts` و `src/lib/server-search.ts` — و هر دو فقط از دروازه صدا زده می‌شوند.
- هیچ `NEXT_PUBLIC_*` و هیچ رازی در باندل کلاینت نیست.

## Server/Client

- `page.tsx` کلاینت SPA است؛ همه نماها داخل `AppShell` سوییچ می‌شوند. نماهای غیرپیش‌فرض با `next/dynamic` lazy load می‌شوند (تقسیم کد — بخش ۹).
- تمام داده از API می‌آید؛ هیچ کوئری DB سمت کلاینت وجود ندارد.
- State کلاینت: Zustand + `useSyncExternalStore` (جلوگیری از hydration mismatch).

## Middleware (`src/middleware.ts`)

1. **CSP per-request**: nonce تصادفی + `strict-dynamic`؛ `unsafe-eval` فقط در dev؛ `frame-ancestors 'none'`؛ `connect-src 'self'`.
2. **گارد حضور (دفاع لایه ۱)**: بدون کوکی → صفحه‌ها به `/login` و APIها به ۴۰۱. اعتبارسنجی واقعی در هر مسیر با `requireUser` (دفاع لایه ۲) انجام می‌شود.
3. مسیرهای عمومی: `/api/auth/*`، `/api/health`، `/login`، `/manifest.webmanifest`، `/sw.js`، `/robots.txt`، `/icon.svg`، `/fonts/`.

## داده — Prisma/SQLite

- **۱۰ مدل**: User، Session، AiUsage، ActionLog، Task، Subtask، Reminder، ChatMessage، Memory، Setting.
- **مالکیت**: همه مدل‌های متعلق به کاربر `userId` دارند + `onDelete: Cascade` به User. Subtask از طریق Task والد مالکیت‌سنجی می‌شود.
- **ایندکس‌ها**: ترکیبی روی الگوهای خواندن — `Task(userId,status,dueDate)`، `Reminder(userId,fired,remindAt)`، `ChatMessage(userId,createdAt)`، `Memory(userId,createdAt)`، `AiUsage(userId,createdAt)`، `ActionLog(userId,createdAt)`، `Session(userId)`، `Subtask(taskId)`.
- **یکتاها**: `User.username`، `Session.tokenHash`، `Setting(userId,key)`، `ActionLog(userId,idempotencyKey)` (یکتایی سطح کاربر — ضدتکرار در retry).
- **چرخه حیات داده**: هرس چت به ۲۰۰ پیام؛ حافظه ≤۱۰۰؛ یادآور فعال ≤۵۰؛ زیرکار ≤۳۰/کار؛ هرس نشست‌های منقضی توسط زمان‌بند.

## مهاجرت‌ها

- گردش کار: `prisma db push` (اسکیمای افزایشی، بدون فایل migration). تغییرات مخرب همیشه بعد از `bun run backup` و با بررسی صفر بودن داده تکراری اعمال می‌شوند.
- برای استقرار تیمی آینده: مسیر `prisma migrate dev` در دسترس است (`db:migrate`).

## زمان‌بند سرور (`instrumentation.ts` → `reminders/scheduler.ts`)

- هر ۶۰ ثانیه: منقضی‌سازی یادآوری‌های سررسیده، هرس نشست‌های منقضی، بازتولید کارهای تکرارشونده (`respawnRecurringTasks`).
- محدودیت شفاف: وابسته به زنده بودن پروسه سرور (فقط یک نمونه).
