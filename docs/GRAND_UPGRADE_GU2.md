# Rahyar AI — Grand Upgrade GU2 · گزارش تحویل

**وضعیت انتشار: `NOT READY FOR RELEASE`**
دلیل: دروازه‌های Typecheck، Lint، Production Build، Dependency Audit، E2E، Accessibility و اجرای واقعی در مرورگر در محیط این مأموریت قابل اجرا نبودند (جزئیات در بخش ۷). هیچ‌کدام «پاس‌شده» اعلام نمی‌شوند.

## ۱. وضعیت اولیهٔ تأییدشده
| مورد | یافته |
|---|---|
| منبع | آرشیو zip آپلودشده توسط کاربر (`rahyar/`)، نه clone مستقیم GitHub |
| تاریخچهٔ Git | **پوشهٔ `.git` در آرشیو نبود** → شاخه، Commit `2017e39` و وضعیت Remote قابل تأیید نیست |
| نسخه | `package.json` → `rahyar@1.0.0`، Next ^16.1.1، React 19، Prisma 6 (SQLite)، bun |
| فایل‌های حساس در آرشیو | `.env` (فقط `DATABASE_URL`) و `db/custom.db` (۱ کاربر، ۹ کار، ۲ نشست با توکن هش‌شده). هر دو در `.gitignore` هستند و در هیچ Commit این مأموریت وارد نشدند |
| تست‌های خط مبنا | **۱۵۵/۱۵۵ موفق**، ۰ شکست، ۰ Skip (اجرا با harness سازگار با `bun:test` روی Node 22؛ bun در محیط نبود) |
| Backup | `custom-pre-gu2.db` با SQLite backup API، `integrity_check = ok`، خارج از مخزن |

## ۲. یافته‌ها و وضعیت اصلاح
| شناسه | شدت | محل | سناریو | اصلاح | تست |
|---|---|---|---|---|---|
| GU2-SEC1 | **High** (در استقرار عمومی) | `api/auth/setup`, `lib/auth.ts` | روی نصب تازه، اولین بازدیدکننده‌ای که فرم را پر کند مالک می‌شود (owner-claim race) | در تولید، راه‌اندازی فقط با `RAHYAR_SETUP_TOKEN` (مقایسهٔ زمان‌ثابت)؛ بدون آن 503 fail-closed؛ فیلد «کد راه‌اندازی» در UI | ✅ ۵ تست |
| GU2-SEC2 | Medium | `api/auth/login` | سقف ورود فقط به ازای IP بود؛ با چرخش IP (یا `TRUST_PROXY=1` بدون پروکسی) حدس رمز بی‌سقف | سقف دوم ۲۰ تلاش/۱۵ دقیقه به ازای حساب | ✅ ۱ تست |
| GU2-SEC3 | Medium | `ai/providers/openai-compatible.ts` | SSRF: کاربر Endpoint را روی `169.254.169.254` یا سرویس داخلی می‌گذاشت و ۲۰۰ نویسه از پاسخ را در خطا می‌دید؛ ریدایرکت هم دنبال می‌شد | بررسی میزبان + همهٔ IPهای DNS؛ متادیتا/link-local همیشه مسدود؛ شبکهٔ خصوصی با `AI_ALLOW_PRIVATE_ENDPOINTS=0` مسدود؛ `redirect: manual`؛ بدون بازتاب بدنه | ✅ ۴ تست |
| GU2-DATA1 | Medium | `api/data/import` | تاریخ نامعتبر → `Invalid Date` → 500 **و ورود نیمه‌کاره** (بدون تراکنش)؛ آیتم `null` در آرایه → کرش | اعتبارسنجی کامل پیش از نوشتن، `$transaction` همه‌یا‌هیچ، `createMany`، اعتبارسنجی `dueTime` | ⚠️ بدون تست خودکار (نیاز به DB) |
| GU2-I18N1 | Low | `calendar-view.tsx`, `globals.css` | در حالت دوگانهٔ فارسی، تاریخ میلادی زیر عدد شمسی از `ss01` بدنه ارث می‌برد و می‌تواند با گلیف فارسی رندر شود | کلاس `.latin-digits` + `lang="en"` + اندازهٔ 9.5→10.5px | ⚠️ نیاز به بررسی بصری |
| GU2-SEC4 | Low | `.env.example` | پیش‌فرض `TRUST_PROXY_HEADERS=1`؛ کپی مستقیم در استقرار بدون پروکسی = دور زدن rate limit | پیش‌فرض `0` + توضیح | — |
| GU2-PRIV1 | Low | `.gitignore` | ۳۵ اسکرین‌شات `scripts/v2-*, v3-*, rc-*` track می‌شدند، در حالی که سیاست خود پروژه می‌گوید شامل دادهٔ کاربرند | `scripts/*.png` ignore + `git rm --cached` (فایل‌ها روی دیسک حفظ شدند). **اگر قبلاً push شده‌اند در تاریخچهٔ GitHub باقی‌اند**؛ پاک‌سازی تاریخچه نیازمند تصمیم مالک است | — |

### بررسی‌شده و سالم
- همهٔ ۳۵ مسیر API: `requireUser` + فیلتر `userId` روی همهٔ خواندن/نوشتن‌های دارای شناسه (IDOR یافت نشد)؛ `sameOriginOk` روی متدهای تغییردهنده؛ rate limit روی همه به‌جز `connections` (فقط خواندن کاتالوگ استاتیک).
- رمز: scrypt N=16384 + نمک تصادفی + `timingSafeEqual`؛ توکن نشست ۳۲ بایت، فقط SHA-256 در DB؛ کوکی httpOnly/SameSite=Lax/Secure.
- CSP با nonce و `strict-dynamic`، بدون `unsafe-eval` در تولید؛ HSTS، XFO=DENY، nosniff.
- Agent: حذف کار و فراموشی حافظه فقط با فعل صریح در پیام کاربر (دفاع تزریق غیرمستقیم).
- خروجی داده کلیدهای محرمانه را حذف می‌کند (`SECRET_SETTING_KEYS`).
- SQL: فقط یک `$queryRaw` با template ثابت (`SELECT 1`).

## ۳. ریسک‌های باقی‌مانده (حل‌نشده)
| ریسک | شدت | اقدام لازم |
|---|---|---|
| کلید API کاربر (`ai_endpoint_key`) به‌صورت متن ساده در جدول `Setting` | Medium | رمزنگاری AES-GCM با کلید از env (`RAHYAR_DATA_KEY`) + migration داده |
| Rate limiter درون‌حافظه‌ای؛ با ری‌استارت یا چند نمونه ریست می‌شود | Low (تک‌نمونه) | برای چند نمونه: Redis/SQLite-backed |
| `src/middleware.ts` در Next 16 deprecated است (نام جدید `proxy.ts`) | Low | تغییر نام پس از تأیید با build واقعی |
| `RUN.md` رمز حساب پیش‌نمایش (`owner`) را منتشر کرده | Medium اگر DB همراه منتشر شود | رمز را پس از اولین ورود عوض کنید؛ `db/custom.db` را منتشر نکنید |
| ممیزی کامل UI/UX، Ambient، Voice، SMS و Prompt Injection سمت مدل | — | در این مأموریت فقط در سطح کد و به‌صورت جزئی بررسی شد |

## ۴. دروازه‌های کیفیت — نتایج واقعی
| دروازه | نتیجه |
|---|---|
| Unit tests | **۱۶۵/۱۶۵ موفق** (۱۵۵ قبلی + ۱۰ جدید)، ۰ Skip — runner: Node 22 + harness سازگار با `bun:test` (نه خود bun) |
| Typecheck (`tsc`) | ❌ اجرا نشد — `node_modules` موجود نیست و محیط به اینترنت/رجیستری npm دسترسی ندارد. فقط parse همهٔ فایل‌های `.ts` تغییرکرده با `stripTypeScriptTypes` موفق بود (`.tsx` بررسی نشد) |
| Lint | ❌ اجرا نشد (همان دلیل) |
| Production build | ❌ اجرا نشد |
| Dependency audit | ❌ اجرا نشد (نیاز به رجیستری) |
| E2E / Accessibility / مرورگر / اسکرین‌شات | ❌ اجرا نشد — مرورگر و وابستگی‌ها در محیط نبودند. **هیچ ادعای بصری در این گزارش وجود ندارد** |

## ۵. اجرای محلی برای تکمیل دروازه‌ها
```bash
bun install && bunx prisma generate
bun run verify            # typecheck + lint + test
bun run build && bun run start
bunx npm audit --omit=dev # یا: bun pm audit (در نسخه‌های جدید bun)
```
پیش از استقرار عمومی: `RAHYAR_SETUP_TOKEN` (برای نصب تازه)، `TRUST_PROXY_HEADERS=1` فقط پشت Caddy، و در صورت چندکاربره `AI_ALLOW_PRIVATE_ENDPOINTS=0`.

## ۶. Commitها
فهرست در `git log` همین بسته. Push انجام **نشد**: محیط به GitHub دسترسی شبکه‌ای ندارد.

## ۷. چک‌لیست انتشار
- [x] بدون Critical/High شناخته‌شدهٔ حل‌نشده در کد بررسی‌شده
- [x] تست‌های واحد سبز (۱۶۵)
- [x] Secretها و DB در Commitها نیستند
- [ ] Typecheck / Lint / Build
- [ ] Dependency audit
- [ ] بررسی واقعی UI فارسی/انگلیسی در Desktop/Tablet/Mobile
- [ ] E2E و Accessibility
- [ ] رمزنگاری کلید Endpoint
- [ ] Push به GitHub و تأیید CI
