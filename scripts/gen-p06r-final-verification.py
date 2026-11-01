# -*- coding: utf-8 -*-
"""P0-6R — تولید گزارش تأیید نهایی + کپی شواهد + مانیفست SHA-256.
فقط-نوشتن خروجی؛ هیچ مقدار رمزی در گزارش قرار نمی‌گیرد (فقط اثر انگشت‌های رسمی رجیستر).
"""
import hashlib
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path("/home/z/my-project")
SRC_SHOTS = ROOT / "download/rahyar-preview-shots"
OUT = ROOT / "download/P0_6R"
EV = OUT / "evidence"
EV.mkdir(parents=True, exist_ok=True)

TEHRAN = timezone(timedelta(hours=3, minutes=30))
now = datetime.now(TEHRAN)
now_str = now.strftime("%Y-%m-%d %H:%M:%S") + " (+03:30)"

SHOT_NOTES = {
    "01-login-desktop.png": "صفحهٔ ورود — دسکتاپ (مرحلهٔ زنده‌سازی)",
    "02-after-login.png": "داشبورد پس از ورود (مرحلهٔ زنده‌سازی)",
    "03-chat-waiting.png": "چت — انتظار پاسخ (مرحلهٔ زنده‌سازی)",
    "04-chat-ai-reply.png": "چت — پاسخ واقعی مدل: «سلام علیرضا! من رهیار هستم…»",
    "05-chat-task-action.png": "اجرای عمل از چت — «ثبت شد» + چیپ کار",
    "06-chat-mobile.png": "نمای موبایل — داشبورد (مرحلهٔ زنده‌سازی)",
    "07-reload-login.png": "§1.4 — بارگذاری مجدد: / → /login (رفتار واقعی)",
    "08-dashboard.png": "داشبورد پس از ورود مجدد (نشست تأیید نهایی)",
    "09-assistant-page.png": "صفحهٔ دستیار — نوار ابزار و پیشنهادها",
    "10-message-reply.png": "پیام «وضعیت امروز» + پاسخ قاعده‌محور با دادهٔ واقعی (۰ انجام‌شده، ۱ باقی‌مانده)",
    "11-llm-reply.png": "پیام LLM + پاسخ واقعی مدل: «هر قدم کوچک…» (همان درخواست ردیف AiUsage)",
    "12-task-created.png": "ثبت کار «بازبینی گزارش P0-6R» از رابط کاربری",
    "13-tasks-list.png": "فهرست کارها — کار ثبت‌شده قابل مشاهده (TASK-VISIBLE-IN-LIST)",
    "14-offline-error.png": "خطای آفلاین — toast «ارسال پیام ناموفق بود»",
    "15-mobile-assistant.png": "نمای موبایل 390×844 — دستیار، RTL بدون اسکرول افقی",
}

copied = []
for name, note in SHOT_NOTES.items():
    src = SRC_SHOTS / name
    if src.exists():
        shutil.copy2(src, EV / name)
        copied.append((name, note))

REPORT = f"""# P0-6R — گزارش تأیید نهایی تحویل Workspace و بستن شواهد امنیتی

تولید: {now_str} — تهران | مأموریت: P0-6R (مرحلهٔ تأیید نهایی) | حالت: فقط-خواندنی روی کد، صفر تغییر tracked

---

## ۱) وضعیت دقیق Git

| قلم | مقدار |
|---|---|
| شاخهٔ جاری | `main` |
| HEAD (کامل) | `61451ab9695eb3a443500c18e2202837cb6eff0b` |
| tracked changes | **0** (git status --porcelain خالی) |
| origin/main | `28b64bb0bc21e162703a59a01f6d828f8c2065d4` |
| پیش/عقب نسبت به origin/main | **۱۸ کامیت جلوتر، ۰ عقب‌تر** (پوش‌نشده) |
| شاخه‌های لوکال | `main`، `fix/corrective-mission-360`، `feature/ambient-motion-polish` |
| شاخه‌های ریموت | `origin/main`، `origin/feature/ambient-motion-polish` (شاخهٔ fix روی origin **نیست**) |
| remote | `https://github.com/aresmaeily2/HAMYAR-AI.git` |

**پاسخ تکمیلی §1 دستور قبلی:** `f103f09a3ed8f4f1b3db27bf5086ae36e6366d6d` موجود است؛ HEAD فعلی = `f103f09` + ۴۷۴ خط اضافات Stage 3A (۶ فایل: اسکریپت‌های گزارش + next.config.ts). گزارش Stage 3A با کد فعلی **سازگار** است (HEAD جلوتر است، نه منحرف).

## ۲) Preview — نتیجهٔ تأیید مستقل (§1)

**نتیجه: تأیید نگاشت Preview از داخل محیط ممکن نشد؛ هیچ URL به‌عنوان «لینک تأییدشده» ارائه نمی‌شود.**

- الگوی ثبت‌شدهٔ رسمی در سند tracked تحویل (`docs/DELIVERY_V2/DELIVERY_INDEX_V2.md`): `https://preview-7317dfe8-***.space-z.ai` — آزمون مجدد در همین نشست:
  - از داخل sandbox: `GET /api/health` → **HTTP 404** (0.06s) و `GET /login` → **HTTP 404**
  - از بیرون (وب‌فچ پلتفرم، مستقل از sandbox): **404 "404 page not found"**
- منابع رسمی داخل sandbox برای استخراج نگاشت «نشست فعلی» همه بدون نتیجه بودند: متغیرهای محیطی (فقط FC_* و DATABASE_URL)، فایل‌های متادیتا، DNS (`100.100.2.136/138` بدون افشای دامنهٔ preview)، Caddyfile و next.config.ts (فقط الگوی `*.space-z.ai` در allowedDevOrigins).
- **محدودیت صریح (بند §1.6):** نگاشت دامنهٔ Preview در لبهٔ Workspace و بیرون از sandbox تأمین می‌شود؛ مرجع قطعی لینک، همان نشانی‌ای است که **پنل Preview سمت راست** نمایش می‌دهد و دکمهٔ «Open in New Tab» باز می‌کند. عمل «باز کردن URL در پنل» از داخل sandbox قابل اجرا نیست (پنل سمت کلاینت مالک است) — به‌جای آن، زنجیرهٔ سرو از داخل راستی‌آزمایی شد.
- **اپ فعال و سالم است** (پایهٔ اتصال پنل): next-server روی `*:3000`، گیت‌وی سخت‌شدهٔ Caddy روی `*:81`، `GET /api/health` از هر دو مسیر → HTTP 200 با `{{"status":"ok","database":"ok",…}}`؛ `/` → 307 → `/login`.
- ورود با بارگذاری مجدد (§1.4): مرورگر تازه → ریدایرکت به `/login` → ورود موفق → داشبورد (تصویر 07 و 08). صفحهٔ Setup یک‌بارمصرف است و در گام زنده‌سازی از مسیر رسمی `/api/auth/setup` مصرف شده؛ صفحهٔ ورود اکنون مستقیماً حالت login را نشان می‌دهد (کد login: mode=`setup` فقط وقتی `setupPasswordPending=true`).

## ۳) شواهد آزمون عملکردی (§2)

فهرست تصاویر واقعی (کپی در `download/P0_6R/evidence/`):

| # | فایل | محتوا |
|---|---|---|
| ۱ | 01-login-desktop.png | صفحهٔ ورود — دسکتاپ |
| ۲ | 02-after-login.png | داشبورد پس از ورود |
| ۳ | 03-chat-waiting.png | چت — انتظار پاسخ |
| ۴ | 04-chat-ai-reply.png | پاسخ واقعی مدل «سلام علیرضا! من رهیار هستم…» |
| ۵ | 05-chat-task-action.png | اجرای عمل از چت — «ثبت شد» |
| ۶ | 06-chat-mobile.png | نمای موبایل — داشبورد |
| ۷ | 07-reload-login.png | بارگذاری مجدد → /login (§1.4) |
| ۸ | 08-dashboard.png | داشبورد (نشست تأیید نهایی) |
| ۹ | 09-assistant-page.png | صفحهٔ دستیار |
| ۱۰ | 10-message-reply.png | پیام + پاسخ قاعده‌محور با دادهٔ واقعی |
| ۱۱ | 11-llm-reply.png | پیام + پاسخ واقعی LLM (همان درخواست ردیف AiUsage) |
| ۱۲ | 12-task-created.png | ثبت کار از UI |
| ۱۳ | 13-tasks-list.png | فهرست کارها — کار قابل مشاهده |
| ۱۴ | 14-offline-error.png | خطای آفلاین — «ارسال پیام ناموفق بود» |
| ۱۵ | 15-mobile-assistant.png | موبایل 390×844 — RTL بدون سرریز |

**توجه دربارهٔ «تصویر صفحهٔ Setup»:** Setup یک‌بارمصرف است و در گام زنده‌سازی از مسیر رسمی API مصرف شد؛ رندر شرطی آن فقط وقتی `setupPasswordPending=true` است. تصویر واقعی وضعیت فعلیِ نقطهٔ ورود = تصویر 07. بازسازی مصنوعی صفحهٔ Setup مستلزم حذف کاربر/دیتابیس بود که تغییر مخرب محسوب می‌شود و انجام نشد.

**مدرک AiUsage (همان درخواست تصویر 11) — بدون هیچ دادهٔ حساس:**

| فیلد | مقدار |
|---|---|
| route | `/api/chat/stream` |
| task / provider / model | `chat` / `zai` / `glm-4-plus` |
| inChars / outChars | 4766 / 1227 |
| latencyMs | 132 |
| status | `ok` |
| costEst | 0.0 |
| createdAt (تهران) | 2026-11-01 20:55:47 +03:30 |

مجموع ردیف‌ها: ۲ (هر دو `glm-4-plus`/`zai`/`ok`). پاسخ «وضعیت امروز» مسیر قاعده‌محور داخلی بود (بدون ردیف AiUsage) — ترکیب واقعی رفتار دستیار: LLM + روتین‌های قطعی با دادهٔ واقعی DB.

**health check نهایی:** `*:3000` و `*:81` → HTTP 200 `{{"status":"ok","database":"ok","latencyMs":~1-4}}` — سرور برای بازبینی مالک فعال نگه داشته شد.

**کنسول و خطاها:** کنسول مرورگر فقط `[HMR] connected` (عادی dev)؛ pageerrors: **0**؛ لاگ سرور (`/tmp/rahyar-dev.log`) بدون خطا؛ RTL و بدون اسکرول افقی در 390px.

## ۴) جدول وضعیت C1–C10 (فقط وضعیت و طرح اصلاح — هیچ تغییر اجرا نشد)

| ID | ماهیت (اثر انگشت رسمی رجیستر P0-6) | reach ثبت‌شده | وضعیت فعلی این نشست | اقدام لازم (تصمیم مالک) |
|---|---|---|---|---|
| C1 | رمز ورود owner دورهٔ v2.0/v2.1 (fp `cec51518b9ac`، len 11) | PUBLIC (origin/main + feature، ۱۴ blob) | reach تغییرنیافته؛ **فعالیت: UNKNOWN** (بدون شواهد محیط استقرار؛ در DB فعلی کاربر قدیمی وجود ندارد) | چرخش + پاک‌سازی تاریخچه |
| C2 | رمز ورود owner دورهٔ v1.0.0-rc1 (fp `ee0880daa2ca`، len 15) | PUBLIC (main + feature + tag) | **UNKNOWN** (همان دلیل C1) | چرخش + پاک‌سازی تاریخچه |
| C3 | store-pass keystore فعلی + key-pass (fp `f60ed56a9c82`، len 7) | PUBLIC (main + feature + tag v1.2.0) | keystore اصلی موجود: `android/rahyar-release.keystore` (اثر انگشت فایل: `d4b7169a21f8f113f7cf8104c0b5dd32…`). **پشتیبان مستقل keystore: وجود ندارد** — `/tmp/my-project/backups/` فقط یک بکاپ DB دارد (`ara-20261016-175335.db`، 77824 بایت). «مقایسه با keystore اصلی» نتیجه‌ای برای مقایسه نیافت: هیچ فایل keystore/jks در آن پوشه نیست. `artifacts/signing/` در این workspace موجود نیست و kit رمزنگاری‌شده نیز یافت نشد | مسیر بازیابی امن = نسخهٔ kit که طبق سند تحویل فقط رمزنگاری‌شده توزیع و رمز آن در پیام خصوصی مالک است؛ ایجاد بکاپ keystore خارج از گیت با مجوز مالک |
| C4 | store-pass keystore قدیمی (fp `dd65b755befe`، len 10) | PUBLIC (main + feature + tags) | فایل حامل (`scripts/build-android-apk.sh`) **همچنان روی origin/main و لوکال** (تأیید ls-tree)؛ دامنهٔ ترمینال: لاگ‌های فعلی `/tmp` فاقد نشانگر storepass (0 مورد، شمارش-فقط)؛ ریسک باقی‌مانده = ترنسکریپت‌های تاریخی نشست‌ها | حذف مقدار از اسکریپت (env var) + چرخش؛ در فهرست修复 باقی می‌ماند |
| C5 | رمز کاربر تست sarika (fp `8eb38003b10d`، len 11) | PUBLIC | **UNKNOWN** | چرخش |
| C6 | literal منفی badLogin — اعتبار قابل استفاده نیست | PUBLIC | NOT_APPLICABLE (بدون ریسک عملی) | فقط پاک‌سازی زیبایی |
| C7 | رمز owner دورهٔ ۳۶۰ (fp `46d0a91d1e48`، len 17) | LOCAL ONLY (main + fix) — هرگز عمومی نشد | تأیید شد: فایل در origin/main **نیست**. اصلاح پیشنهادی: حذف مقدار hardcoded → env var یا حذف اسکریپت + چرخش. ریسک باقی‌مانده: blob در تاریخچهٔ **لوکال** main و fix؛ هر push آینده بدون پاک‌سازی آن را عمومی می‌کند | پاک‌سازی قبل از هر push + چرخش |
| C8 | bootstrap password (fp `8aa62d3b0a15`، len 21) — مسدودکنندهٔ P0-5 | LOCAL ONLY (fix-only + `.evidence-password` main-only) | **اصلاح اعمال‌شده نیست و قابل تأیید نیست**: فایل `scripts/mint-evidence-session.mjs` در worktree اصلی موجود نیست؛ فقط روی شاخهٔ لوکال `fix/corrective-mission-360` است و نسخهٔ فعلی آن در پویش فقط-شمارشی، هیچ نشانگر fail-closed یا T1–T7 ندارد (0 مورد) | اعمال واقعی fix + ساخت آزمون‌های T1–T7 در شاخهٔ مجزا، با مجوز مالک؛ «آماده» ≠ «اصلاح‌شده» |
| C9 | session token (32B base64url، TTL 24h — fp `ff9d8259a6e5`، len 43) | LOCAL ONLY (main) | **CONFIRMED_INACTIVE** — فایل tracked لوکال است (کامیت `87834e5`) اما جدول Session در DB فعلی فقط ۳ نشست امروزِ preview دارد (20:43 و 20:54 تهران)؛ هیچ نشست منطبقی از 2026-10-30 باقی نیست و TTL نیز سپری شده | حذف فایل از ایندکس گیت قبل از هر push |
| C10 | رمز جفت username زیرخطِ ۱۶ کاراکتری (fp `9774fdedae3b`، len 12) | PUBLIC (تاریخچهٔ کامیت عمومی) | **UNKNOWN** | چرخش + پاک‌سازی تاریخچه |

**نکتهٔ احراز:** همهٔ بررسی‌های C3/C4/C7/C8 فقط-خواندنی بودند (ls-tree، log، شمارش rg، متادیتای DB)؛ هیچ مقدار خامی چاپ، جست‌وجوی گسترده یا آزمون ورود نشد. فایل‌های `.evidence-password` و `.evidence-session-token` در worktree موجود و tracked لوکال‌اند — **قبل از هر push باید از ایندکس خارج شوند** (تصمیم مالک).

## ۵) محدودیت‌ها، ریسک‌های باز و تصمیم‌های لازم از مالک

**محدودیت‌ها:**
1. نگاشت Preview فقط در لبهٔ Workspace تأمین می‌شود؛ از داخل sandbox قابل احراز نیست (آزمون دوطرفه: 404). لینک قطعی = پنل Preview سمت راست.
2. صفحهٔ Setup یک‌بارمصرف است؛ بازسازی آن بدون تغییر مخرب DB ممکن نبود (تصویر وضعیت فعلی ارائه شد).
3. عمل «باز کردن URL در پنل» سمت کلاینت مالک است و از داخل sandbox قابل اجرا نیست.

**ریسک‌های باز:**
1. پنج مقدار C1/C2/C3/C4/C5 با reach PUBLIC در origin باقی‌اند (تاریخچه) — تا چرخش، معتبر-بالقوه تلقی شوند.
2. `.evidence-password` / `.evidence-session-token` tracked لوکال‌اند؛ هر push بدون پاک‌سازی = افشای LOCAL ONLYها.
3. ۱۸ کامیت لوکال پوش‌نشده شامل تاریخچهٔ فایل‌های فوق است.
4. C8 فاقد fix تأییدشده است؛ آزمون P0-5 قابل تأیید نیست.
5. بکاپ مستقل keystore در workspace وجود ندارد (فقط DB).

**تصمیم‌های لازم از مالک (هیچ‌کدام بدون مجوز انجام نمی‌شود):**
1. چرخش/تغییر همهٔ مقادیر C1–C5 و C7 پس از هماهنگی.
2. مجوز حذف `.evidence-password` و `.evidence-session-token` از ایندکس + بازنویسی تاریخچه (در صورت تمایل) پیش از هر push.
3. مجوز اعمال fix fail-closed روی C8 در شاخهٔ مجزا + ساخت آزمون‌های T1–T7.
4. ایجاد بکاپ مستقل keystore (خارج از گیت) و نگهداری kit در محل امن مالک.
5. تأیید لینک Preview از پنل و اعلام آن برای بستن §1.

## ۶) انطباق و ممنوع‌ها

Rotate / Revoke / تغییر رمز یا کلید / Push / PR / Merge / Rebase / Reset / Amend / Cherry-pick / Force Push / تغییر تاریخچه / Deploy / هر تغییر امنیتی: **انجام نشد.** صفر تغییر tracked؛ HEAD بدون تغییر؛ سرور فعال نگه داشته شد. هیچ رمز، توکن، کلید API، کوکی یا دادهٔ احراز هویتی در این گزارش، تصاویر یا لاگ‌ها قرار نگرفت (فقط اثر انگشت‌های رسمی رجیستر و هش فایل‌ها).

## ۷) SHA-256 خروجی‌ها

(مانیفست کامل در `download/P0_6R/sha256_manifest.txt`)

---
پایان گزارش — پس از تحویل، طبق دستور: **توقف و انتظار برای تصمیم مالک.**
"""

report_path = OUT / "P0_6R_final_verification_report.md"
report_path.write_text(REPORT, encoding="utf-8")


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


manifest_lines = [f"{sha256(report_path)}  P0_6R_final_verification_report.md"]
for name, _ in sorted(copied):
    manifest_lines.append(f"{sha256(EV / name)}  evidence/{name}")
manifest = OUT / "sha256_manifest.txt"
manifest.write_text(
    "# P0-6R — مانیفست SHA-256 خروجی‌ها — " + now_str + "\n" + "\n".join(manifest_lines) + "\n",
    encoding="utf-8",
)

print("report:", report_path)
print("manifest entries:", len(manifest_lines))
print("evidence copied:", len(copied))
for name, _ in sorted(copied):
    print("  -", name)
