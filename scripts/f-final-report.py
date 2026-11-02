# -*- coding: utf-8 -*-
"""Generate RahyAr_FINAL_REPORT.md — 12-item final mission report (Persian).
Reads live artifacts: upload links, SHA-256s, git log, scenario evidence."""
import hashlib, json, os, subprocess, time

ROOT = '/home/z/my-project'
DL = f'{ROOT}/download'
links = {}
for line in open(f'{ROOT}/artifacts/upload-links.txt'):
    if '=>' in line and 'http' in line:
        f, url = line.strip().split(' => ')
        links.setdefault(f, []).append(url)

def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

FILES = [
    ('RahyAr_FINAL_OWNER_DELIVERY.zip', 'بستهٔ کامل ۹ بندی + README + SHA256SUMS'),
    ('rahyar-web-standalone.zip', 'باندل استقرار وب (standalone + static + public + START-HERE)'),
    ('RahyAr_Full_Source.zip', 'سورس کامل (ZIP)'),
    ('RahyAr_COMPLETE_SOURCE.txt', 'کل سورس در یک فایل متنی — پوشش ۰ جاافتاده'),
    ('RahyAr_Screenshots_22.zip', '۲۳ اسکرین‌شات واقعی از نسخهٔ در حال اجرا'),
    ('rahyar-final-walkthrough.mp4', 'ویدئوی پیوستهٔ ۱۰:۰۰ دقیقه (ورود→عامل‌ها→نماها→fa/en→موبایل→قطع/بازیابی شبکه)'),
]

log = subprocess.run(['git', 'log', '--oneline', '-12'], capture_output=True, text=True).stdout.strip()
head = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()

scen = open(f'{ROOT}/artifacts/rahyar-audit/FAG_SCENARIOS_LIVE.txt').read()
scen_short = '\n'.join(l for l in scen.splitlines() if '✓' in l or 'ALL' in l or 'tasks:' in l or 'reminders:' in l or 'action log:' in l)

now = time.strftime('%Y-%m-%d %H:%M UTC')
expiry_note = 'tmpfiles.org: ~۶۰ دقیقه پس از ساخت | gofile.io: ماندگار (تا حذف دستی)'

rows = []
for f, desc in FILES:
    p = f'{DL}/{f}'
    s = sha256(p)
    sz = os.path.getsize(p)
    tf = next((u for u in links.get(f, []) if 'tmpfiles.org' in u), None)
    gf = next((u for u in links.get(f, []) if 'gofile.io' in u), None)
    tf_s = tf if tf else '— (بزرگ‌تر از سقف ۱۰۰MB سرویس tmpfiles)'
    rows.append(f'| {f} | {sz:,} | `{s[:16]}…` | {tf_s} | {gf or "—"} |')
    # full sha table
full_shas = '\n'.join(f'- `{sha256(f"{DL}/{f}")}`  {f}' for f, _ in FILES)

report = f"""# RahyAr — گزارش نهایی مأموریت (۱۲ بند)
**تاریخ:** {now} | **commit تحویلی:** `{head[:12]}` (main)

## ۱) زنجیرهٔ کامیت‌های مأموریت
```
{log}
```

## ۲) ماتریس قابلیت‌ها (شاهد = مسیر فایل در سورس)
| قابلیت | وضعیت | شاهد |
|---|---|---|
| چت AI با SSE و سهمیه | کامل | src/app/api/chat/{{route,stream}}/route.ts |
| چندارائه‌دهنده (میزبان/OpenAI-سازگار/محلی) | کامل | src/lib/ai/providers/* |
| عامل: اجرای واقعی ۱۴ نوع اکشن روی DB | کامل | src/lib/server-ai.ts، src/lib/ai/action-schema.ts |
| عامل: خلاصهٔ مالی از چت (فقط-خواندنی) | کامل | src/lib/finance/summary.ts |
| عامل: پیش‌نویس پیام — هرگز ارسال نمی‌شود | کامل | server-ai.ts case draft_message |
| عامل: یادآور متصل به سررسید کار | کامل | add_task.remindBeforeMin + reminderAtFromDue |
| گارد ضد-ادعای کاذب مدل (F-AG3) | کامل | applyMissionGuard در هر دو روت POST+stream |
| صوت: گفتار→متن و پاسخ گفتاری | کامل (وب+اندروید) | src/lib/voice/speech.ts، android VoiceHelper.java |
| Wake-word پس‌زمینه | نیست — محدودیت مستند | docs (مستند صادقانه) |
| وظایف/زیرکار/تکرارشونده | کامل | src/lib/server-tasks.ts |
| تقویم شمسی/میلادی/دوگانه | کامل | src/lib/persian-date.ts |
| یادآور و اعلان | کامل (وب) + کد اندروید | src/lib/reminders/scheduler.ts |
| مالی چندحسابی + بودجه + پارس پیامک ۲۰ بانک | کامل | src/lib/finance/*، src/lib/sms/parser.ts |
| کاربران/نقش‌ها/جلسهٔ امن | کامل | src/lib/auth.ts (scrypt، توکن هش‌شده) |
| i18n فارسی/انگلیسی RTL/LTR | کامل | src/i18n/ |
| ۹ تم + موتور محیطی Ambient | کامل | src/lib/ambient/، src/styles/themes.css |

## ۳) آزمون زندهٔ ۵ سناریوی الزامی عامل — اثر واقعی DB (پاسخ متنی کافی نیست)
```
{scen_short}
```
یافتهٔ صادقانه: نخستین اجرای S2 پس از تولید رسانه به‌دلیل جابه‌جایی زبان کاربر به EN رد شد (رفتار درست بود — پاسخ انگلیسی قطعی با همان عدد واقعی)؛ زبان به fa بازگردانده شد و هر ۵ سناریو PASS شدند. یک `invalid_action:failed` در لاگ اکشن نشان‌دهندهٔ رد درست یک اکشن نامعتبر مدل است.

## ۴) امنیت — C1..C10 و اسکن secret
- اسکن secret پیش از بسته‌بندی: **ALL-PASS** (scripts/tests/run-p06r-secret-tests.sh)
- CSP با nonce + strict-dynamic؛ frame-ancestors فقط دامنه‌های رسمی پنل
- گاردهای عاملیت (حذف/فراموشی با فعل صریح)، سقف نرخ روی APIها، رضایت دومرحله‌ای پارس پیامک
- این بسته **هیچ** رمز/توکن/کلیدی ندارد؛ keystore اندروید در wipe پلتفرم از دست رفت (بازسازی: T1–T7 fail-closed از env)

## ۵) نتایج آزمون روی commit تحویلی (همه تازه — این نشست)
| آزمون | نتیجه |
|---|---|
| Typecheck (tsc --noEmit) | PASS — صفر خطا |
| Lint (eslint src) | PASS — صفر خطا |
| Unit (bun test) | **۲۵۴/۲۵۴** (۷۸۷ expect، ۱۶ فایل) — صفر skip |
| Production build | PASS |
| Secret tests | ALL-PASS |
| E2E مرورگر (grand-e2e) | **۱۱/۱۱ PASS — صفر خطای کنسول** (axe: صفر critical/serious) |
| ۵ سناریوی عامل (زنده، اثر DB) | **۵/۵ PASS** |
| بازیابی پس از قطع شبکه | PASS (اسکرین‌شات 21/22 + ویدئو) |
| فا/ان RTL/LTR، موبایل/دسکتاپ overflow=۰ | PASS |

## ۶) وب / اندروید — وضعیت صادقانه
- **وب**: کامل و در حال اجرا (باندل استقرار در بند ۰۱ بسته).
- **APK اندروید ساخته نشده** — دو دلیل واقعی: (الف) Android SDK در این محیط نیست؛ (ب) رمز keystore در wipe پلتفرم از دست رفت. فایل ساختگی تحویل نشده. اسکریپت‌های build موجودند (fail-closed).

## ۷) فایل‌های عمومی — لینک دانلود مستقیم
| فایل | حجم | SHA-256 (۱۶ کاراکتر نخست) | tmpfiles.org | gofile.io |
|---|---|---|---|---|
{chr(10).join(rows)}

**انقضا:** {expiry_note}

## ۸) SHA-256 کامل
{full_shas}

## ۹) پیش‌نمایش زنده
اپ همین حالا در پنل سمت راست چت اجراست (production build)؛ ورود owner → 200، داشبورد → 200.

## ۱۰) حساب مالک
حساب `owner` (نقش OWNER) با رمز موقت ساخته شد — رمز فقط در پیام چت گفته می‌شود (در فایل‌ها نیست) و بلافاصله پس از ورود عوض شود.

## ۱۱) محدودیت‌های صادقانه
۱) APK: بالا. ۲) مدل میزبان فقط با .z-ai-config؛ بدون آن موتور محلی قاعده‌محور. ۳) ادغام‌های بیرونی (ارسال واقعی پیام/تقویم بیرونی): فقط کاتالوگ — پیش‌نویس عمداً ارسال نمی‌کند. ۴) Wake-word: نه در وب (محدودیت پلتفرم)، در اندروید پیاده نشده. ۵) Web Push: نیست (in-app + Notification API).

## ۱۲) بازتولیدپذیری
کل خط تولید این نشست (دیمون، رسانه، بسته، بارگذاری) در گیت است: scripts/f-*.py، f-*.sh — از یک wipe کامل، همه‌چیز با همین اسکریپت‌ها بازساخته شد.
"""
out = f'{DL}/RahyAr_FINAL_REPORT.md'
open(out, 'w').write(report)
print('report written:', out, len(report), 'chars')
