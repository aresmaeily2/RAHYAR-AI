# 05 — QA: گزارش آزمون (Agent 6 + اجرای مجدد R2)

## نتایج نهایی (روی commit تحویل)
| آزمون | فرمان | نتیجه |
|---|---|---|
| Typecheck | `bun run typecheck` | **PASS — 0 خطا** |
| Lint | `bun run lint` | **PASS — 0 issue** |
| Unit | `bun test tests/unit` | **PASS — ۲۲۲/۲۲۲** (۱۵ فایل، 736 expect، ~1.9s) |
| Secret guard | `bash scripts/tests/run-p06r-secret-tests.sh` | **ALL-PASS** (T1–T7 + G-C7/G-C7b/G-C34×3) |
| Dependency audit | npm audit (lockfile موقت) | ۲۶ مورد (۱۵ high) — **همگی زنجیرهٔ transitive/build**؛ تنها direct: `zod@4.3.5 <4.6.6` (GHSA-mrhx-c7xc-m3w5) — ارتقای پیشنهادی در نسخهٔ بعد (تغییر lockfile خارج از برش امنیتی R2؛ ریسک اکسپلویت در این استقرار: پایین — ورودی‌ها با cleanText/readJsonSafe مهار می‌شوند) |
| Secret scan | fp-scan رجیستر روی tracked | C1/C2/C4/C5/C7/C10 = **0** |
| Build تولیدی | `bun run build` | **PASS — exit 0** (standalone + static + public) |
| E2E زنده | `node scripts/r2-live-e2e.mjs` | **PASS** — جدول پایین |
| Backup/restore | بازیابی keystore (openssl) | **PASS — SHA-256 منطبق** |

## ماتریس ۲۰گانهٔ الزامی (وضعیت R2)
| # | دسته | وضعیت | مدرک |
|---|---|---|---|
| 1-3 | typecheck/lint/unit | **PASS** | جدول بالا |
| 4 | integration | PARTIAL→**بهبود** | live-api-tests موجود؛ E2E زندهٔ جدید مسیرهای API+UI را پوشش داد |
| 5-6 | E2E / API | **اجرای واقعی شد** | `scripts/r2-live-e2e.mjs` — login/chat real-AI/tasks CRUD/calendar/settings/lang/mobile |
| 7 | security scans | PASS | probes + fp-scan + unit امنیتی |
| 8 | dependency audit | اجرا شد | npm audit + bun outdated |
| 9 | secret scanning | PASS | T1-T7 + push guard |
| 10-11 | build + artifact | **PASS** | standalone ساخته و سرو شد؛ اسکن خروجی در بسته |
| 12 | migration | PARTIAL | `tests/database-runtime-build.sh` (push روی پروژهٔ temp)؛ migrations dir نداریم (documented) |
| 13 | console/network | PASS | pageErrors=0، failedRequests=0؛ دو 401 کنسول = probe نشست پیش از ورود (رفتار مورد انتظار) |
| 14-15 | mobile/desktop | **PASS** | 390×844 (سرریز افقی=0px) + 1280×800 |
| 16-17 | fa RTL / en LTR | **PASS** | html[lang=fa,dir=rtl]؛ تعویض→lang=en,dir=ltr؛ بازگشت→fa (E2E JSON) |
| 18 | offline/recovery | PARTIAL | SW ثبت شد (fonts/icon)؛ ادعای آفلاین کامل نداریم (honest)؛ recovery سرور: keep-server + restart-drill اسکریپت موجود |
| 19 | authn/authz | PASS | ماتریس Agent 1 + probes 401/403 |
| 20 | backup/restore | PASS (keystore) |vault rebuild؛ DB: backup-db.sh موجود |

## E2E زندهٔ R2 — جزئیات (JSON: /tmp/r2-e2e-result.json)
- **AI واقعی**: `aiIsRealModel: true` — پاسخ ۲۲۷ نویسه‌ای مدل میزبان (نه قواعد محلی).
- tasks: ساخت UI → یافتن در API → حذف (تمیز کامل) ✓
- تعویض زبان: fa→**en/ltr**→**fa** (langAfterRestore=fa) ✓
- موبایل 390px: overflow=**0px** ✓
- کنترل تک-ارسال: یک Enter = **دقیقاً ۱ ردیف** (scripts/r2-single-send-test.mjs) — رخداد تکراری در اجرای اول، آرتیفکت اتوماسیون بود نه باگ محصول.
- ویدئو: `evidence/rahyar-desktop-run.webm` (۲۸ ثانیه) + `evidence/rahyar-mobile-run.webm` + ۸ اسکرین‌شات.

## افزوده‌های پیشنهادی بعدی (از Agent 6)
`audit-deps.sh` در verify، آزمون backup-restore واحد، playwright.config با storageState، E2E با کاربر آزمایشی disposable، migration-smoke واحد.
