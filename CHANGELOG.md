# Change Log — رهیار AI (Rahyar AI)

## [1.2.0] — 2026-10-27 (ممیزی ۳۶۰ درجه — ارتقای امنیت، کارایی و DevOps)
بر پایهٔ ممیزی مستقل ۳۶۰ درجه (کد/امنیت/پایگاه‌داده/عملکرد/هوش مصنوعی/DevOps)؛
هر یافته پیش از اصلاح روی کد واقعی تأیید شد. وضعیت: نامزد انتشار — نیازمند تأیید نهایی مالک.
آیتم‌های بدون آزمون میدانی با برچسب «آزمایش‌نشده» مشخص‌اند.

### Security
- **Caddyfile — رفع SSRF بحرانی**: بلوک `@transform_port_query` که هر پورت query-string
  (`?XTransformPort=`) را به `localhost:{port}` پروکسی می‌کرد حذف شد؛ به‌جای آن
  سفیدلیست ثابت `/ws/* → localhost:3001`. حملهٔ SSRF به سرویس‌های داخلی مسدود است.
- **احراز هویت — حذف انسداد Event Loop**: `hashPassword`/`verifyPassword`/`burnPasswordTiming`
  از `scryptSync` (N=2^16، ~۹۶MB روی رشتهٔ اصلی) به `crypto.scrypt` ناهمگام مهاجرت
  کردند؛ ورود هم‌زمان دیگر استریم چت سایر کاربران را قطع نمی‌کند. همهٔ ۵ مسیر API
  به‌روزرسانی شد و آزمون رگرسیون «زنده‌بودن حلقهٔ رویداد در حین هش» افزوده شد.
- **اکشن‌های LLM — اعتبارسنجی سختگیرانه پیش از اجرا (OWASP LLM05)**: فایل جدید
  `src/lib/ai/action-schema.ts` — Discriminated Union با Zod مطابق قرارداد واقعی
  اکشن‌ها؛ خروجی مخرب/خراب مدل هرگز به دیتابیس نمی‌رسد (۱۷ آزمون واحد جدید).
- **extractJson مقاوم‌تر شد**: تلاش جایگزین با پیمایش متوازن آکولاد (آگاه از رشته‌ها) —
  متن اضافهٔ پس از JSON پاسخ مدل پاس‌خور می‌شود.

### Database
- **SQLite WAL + مهار هم‌زمانی**: `db.ts` اکنون هنگام بوت
  `journal_mode=WAL`، `synchronous=NORMAL`، `busy_timeout=5000`، `foreign_keys=ON`،
  `temp_store=MEMORY`، `cache_size=-32MB` اعمال می‌کند. پراگماهای per-connection با
  پیش‌فرض `connection_limit=1` (قابل بازنویسی با `RAHYAR_DB_CONNECTION_LIMIT`) روی همهٔ
  کوئری‌ها صادق‌اند — خطای «database is locked» در هم‌زمانی چت و زمان‌بند مهار می‌شود.
- **رفع بکاپِ نادرست (کشف دودآزمایی)**: سرور standalone مسیر نسبی DATABASE_URL را نسبت به
  `.next/standalone/` حل می‌کند؛ بکاپ قبلی فقط `db/custom.db` را می‌گرفت و از
  دیتابیس واقعی پروداکشن (`.next/standalone/db/custom.db`) بی‌خبر بود.
  `backup-db.sh` اکنون جدیدترین فایل موجود را برمی‌دارد و منبع را اعلام می‌کند.

### Performance
- **زمان‌بند — حذف الگوی N+1**: ثبت لاگ منقضی‌های یادآوری به یک تراکنش دسته‌ای
  (`updateMany` + `createMany` در `db.$transaction`) تبدیل شد.
- **پایداری زمان‌بند**: گارد ورود مجدد (`isRunning`)، تایمر `unref` و خاموشی نجیب روی
  SIGTERM/SIGINT؛ respawn تکرارشونده‌ها یک تیک پس از بوت (بازیابی پس از ری‌استارت) و سپس
  ساعتی.

### Dependencies / Frontend
- انتقال `playwright`، `prisma`، `docx`، `image-size`، `sharp` به `devDependencies` —
  باندل/نصب پروداکشن سبک‌تر شد (این بسته‌ها فقط در اسکریپت‌های گزارش/تست استفاده می‌شوند).
- `reactStrictMode: true` (React 19) — نشت افکت/تایمر در توسعه آشکار می‌شود.
- **رفع typecheck شکسته (کد مرده)**: ۶ مؤلفهٔ shadcn بدون وابستگی و بدون هیچ ارجاعی
  حذف شدند (calendar/carousel/chart/drawer/input-otp/resizable) + `builtin.ts` مرده
  (API حذف‌شده را import می‌کرد) + ایمپورت غایب `tailwindcss-animate` از tailwind.config.
- **رفع تم باران**: صحنهٔ `rain` در `ambient-scene` ثبت نشده بود — `RainScene` SVG ایستا
  اضافه شد.

### DevOps
- **GitHub Actions CI** (`.github/workflows/ci.yml`): install با lockfile قفل‌شده،
  db:generate/db:push آزمایشی، `bun run verify` (typecheck+lint+test) و بیلد تولید.
- **Dockerfile چندمرحله‌ای**: deps → builder → runner غیر-root (کاربر rahyar)،
  HEALTHCHECK روی `/api/health`، `.dockerignore` مینیمال.
- **Retention بکاپ**: چک‌سام SHA-256 + نگهداری ۳۰ نسخهٔ آخر
  (`BACKUP_RETENTION_COUNT` قابل تنظیم).
- **مهاجرت Next 16**: `src/middleware.ts` → `src/proxy.ts` (قرارداد Proxy) — کارکرد
  عیناً همان (CSP با nonce + گیت نشست).

### Verified
- `bun run verify`: typecheck سبز (برای نخستین بار — خطاهای پیش‌آیند رفع شد)،
  lint پاک، **۲۱۵ آزمون واحد پاس** (۱۷ آزمون جدید).
- بیلد تولید standalone موفق؛ دودآزمایی: `/api/health` ok، بوت زمان‌بند،
  اعمال PRAGMA (journal_mode=wal تأیید روی فایل)، بکاپ انتها-به-انتها آزمایش شد.
- «آزمایش‌نشده»: Docker image روی ماشین واقعی، CI روی GitHub (مخزن فعلاً ۴۰۴)،
  رفتار StrictMode در حالت توسعه روی دستگاه واقعی.

## [1.1.0] — 2026-10-20 (Grand Upgrade & Production Release — مرحلهٔ ممیزی/اصلاح)
گزارش کامل: `docs/GRAND_UPGRADE_FINAL.md`

### Security
- scrypt ارتقا یافت: هش‌های جدید `s2` با N=2^16 (سازگاری رو به عقب با `s1`) — GRAND-F4
- ورود موفق سبد نرخ حساب را پاک می‌کند (جلوگیری از خود-قفل‌شدگی کاربر فعال) — SEC-F4
- سقف حافظهٔ لیمیتر (FIFO 10k کلید) در برابر سیل کلیدهای جعلی XFF — SEC-F3
- Endpoint خصوصی/loopback هوش مصنوعی فقط برای مالک (ذخیره + تست) — SEC-F1
- resolve دوم DNS پیش از fetch — کاهش TOCTOU/rebinding — SEC-F2
- سرآیندهای COOP/CORP + هشدار بوت برای `RAHYAR_ALLOW_OPEN_SETUP=1` در تولید — SEC-F8/F9
- نام کاربری ورود lowercase (سازگار با ایجاد حساب) — SEC-F11

### Fixed (Critical/High)
- **GRAND-F1**: نصب تازه مالک را با نقش USER می‌ساخت — مدیریت کاربران قفل بود؛ اکنون `role:'OWNER'` در همان ادعای اتمیک setup
- **GRAND-F9**: فرم ورود username ثابت می‌فرستاد — ۲۰ کاربر استاندارد از UI نمی‌توانستند وارد شوند؛ فیلد نام کاربری اضافه شد
- **GRAND-F10**: `appearance-boot.js` توسط CSP strict-dynamic بلاک بود (فلش تم)؛ nonce گرفته + `/ambient/ocean|minimal.webp` 404 رفع شد (تغییرنام تم‌ها)

### i18n / Accessibility
- نشت‌های فارسی در حالت انگلیسی بسته شد (کلیدهای جاافتاده + JSX خام + toast) — GRAND-F2
- صفحه‌های error/loading دوزبانه شدند؛ skip-link؛ برچسب‌های orb واکنش‌گرا؛ انیمیشن framer-motion زیر prefers-reduced-motion (MotionConfig) — GRAND-F3
- نمودار برنامه: انیمیشن height → scaleY (بدون reflow) — GRAND-F3

### AI / Finance
- مسیر گمشدهٔ `POST /api/settings/ai/test` پیاده شد (دکمهٔ «تست اتصال» کار می‌کند) — GRAND-F5
- فرادادهٔ مصرف استریم: مدل واقعی + وضعیت خطا — GRAND-F5
- مرز ماه مالی یکدست تهران شد (قبلاً server-local در تراکنش‌ها و UTC در بودجه) — GRAND-F6

### Dependencies
- ممیزی وابستگی (نخستین اجرا): next 16.1→16.4.2 (critical)، prisma 6.19.2، sharp 0.35.5 — 1 critical→0؛ ۸ high باقی فقط در ابزار dev/CLI بدون اصلاح غیرشکننده (مستند) — GRAND-F7

### Quality
- E2E + دسترس‌پذیری: `tests/e2e/grand-e2e.mjs` — ۱۱ بررسی روی build پروداکشن (ورود، ایجاد کار از UI، قرارداد تقویم دوزبانه، مدیریت کاربران، ۳ نما، گارد صفر-خطای-کنسول) + axe-core — همه سبز
- تست‌های واحد: ۱۸۱/۱۸۱ سبز (tsc + eslint هم سبز)

## [1.0.1-gu2] — 2026-10-19 (NOT READY FOR RELEASE)
### Security
- First-run owner setup requires `RAHYAR_SETUP_TOKEN` in production (GU2-SEC1)
- Per-account login rate limit (GU2-SEC2)
- SSRF guard on OpenAI-compatible endpoint; redirects not followed; no response-body reflection (GU2-SEC3)
- Safe `TRUST_PROXY_HEADERS=0` default; screenshots with user data untracked
### Fixed
- Data import: invalid dates no longer cause 500 + partial import; writes are atomic (GU2-DATA1)
- Persian dual calendar: Gregorian sub-date keeps Latin digits, slightly larger (GU2-I18N1)
### Tests
- 10 new regression tests (165 total). See docs/GRAND_UPGRADE_GU2.md

تمام تغییرات قابل توجه این پروژه در این فایل ثبت می‌شود.
قالب بر پایهٔ [Keep a Changelog](https://keepachangelog.com/) و نسخه‌بندی معنایی (SemVer).

## [1.0.0] — 2026-10-19 — انتشار نهایی

نسخهٔ کامل انتشار؛ بر بستر سخت‌سازی امنیتی rc2 (گزارش `docs/RED_TEAM_AUDIT_RC2.md`) و موج ارتقای نهایی «مأموریت ارتقای جامع» (گزارش `docs/GRAND_UPGRADE_RC3.md`).

### امنیت
- سرآیند `Strict-Transport-Security` (max-age=63072000، includeSubDomains) به مجموعهٔ سرآیندهای امن اضافه شد — GU-SEC1.
- سقف خروجی/ورودی مدل، سهمیه‌بندی و ثبت مصرف بدون محتوا (میراث rc2) — بدون تغییر و مجدداً راستی‌آزمایی‌شده.

### حریم خصوصی
- «پاک‌سازی کامل داده» اکنون فراداده‌های شخصی مصرف مدل (AiUsage) و دفتر اقدامات (ActionLog) را هم حذف می‌کند — حق فراموشی کامل‌تر (GDPR) — GU-PRIV1.

### تجربهٔ کاربری و دسترس‌پذیری
- مرز خطای سراسری اپ (`error.tsx`): به‌جای صفحهٔ سفید، پیام فارسی + تلاش مجدد + بازگشت به خانه — GU-UX1.
- اسکلت بارگذاری سطح اپ (`loading.tsx`) با پشتیبانی `prefers-reduced-motion` — GU-UX2.

### کارایی و بهداشت مخزن
- حذف ۷ وابستگی بدون مصرف (recharts، react-day-picker، embla-carousel-react، react-resizable-panels، input-otp، vaul، tailwindcss-animate) و ۷ کامپوننت UI بی‌استفاده + کانفیگ میراث Tailwind v3 — دنبالهٔ پاک‌سازی RT-7 — GU-PERF1.

### انتشار
- نسخهٔ پکیج از `0.2.1` به `1.0.0` — GU-REL1.
- متای OpenGraph/Twitter/metadataBase برای پیش‌نمایش درست لینک در پیام‌رسان‌ها — GU-REL2.
- مستندات انتشار و راهنمای اجرا به‌روزرسانی شد — GU-REL3.

## [1.0.0-rc2] — 2026-10-19 — سخت‌سازی امنیتی (Red Team + Blue Team)

- RT-1 (High): اعتماد به سرآیندهای پروکسی fail-closed شد (ضد دورزدن سقف نرخ با XFF جعلی).
- RT-2/3 (Medium): گارد فرمول‌نویسی CSV در خروجی‌ها؛ حذف کلید Endpoint از `data/export`.
- RT-4..6 (Low): محدودسازی `/health`، کش‌های باندشده آب‌وهوا، `trimChatHistory` مشترک هر دو مسیر چت.
- RT-7: حذف ۱۳ وابستگی بدون مصرف.
- گزارش کامل ۱۸ بندی: `docs/RED_TEAM_AUDIT_RC2.md`.

## [1.0.0-rc1] — 2026-10-19 — نخستین کاندید انتشار

- نخستین نسخهٔ کامل: چت عاملیت با استریم، مسیریاب نیت قطعی، کارها/زیرکارها، تقویم شمسی، مالی شخصی، ورود پیامک بانکی، حافظه بلندمدت، یادآوری صوتی، لایهٔ تجربهٔ محیطی (Ambient)، PWA فارسی RTL.
