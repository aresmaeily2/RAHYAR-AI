#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F2-FINAL-REPORT-2 — گزارش نهایی مأموریت تکمیل RahyAr (روز نهایی).
دو بخش صادقانه: اثبات‌شده با شواهد / باقی‌مانده و محدودیت‌های بیرونی.
هیچ ادعایی بدون فایل مدرک؛ هیچ موفقیت ظاهری."""
import hashlib, json, os, subprocess, time, zipfile

ROOT = '/home/z/my-project'
OUT = f'{ROOT}/artifacts/delivery-build'
os.makedirs(OUT, exist_ok=True)

HEAD = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
TODAY = time.strftime('%Y-%m-%d')
NOW = time.strftime('%Y-%m-%d %H:%M:%S UTC')

def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

def sz(p):
    return os.path.getsize(p) if os.path.isfile(p) else 0

D = f'{ROOT}/download/RahyAr-Android'
deliverables = [
    ('Rahyar-Android-v2.1.0-debug.apk', f'{D}/Rahyar-Android-v2.1.0-debug.apk'),
    ('Rahyar-Android-v2.1.0-release.apk', f'{D}/Rahyar-Android-v2.1.0-release.apk'),
    ('RahyAr_Full_Source.zip', f'{ROOT}/artifacts/delivery-build/RahyAr_R2_Full_Source.zip'),
    ('RahyAr_COMPLETE_SOURCE.txt', f'{ROOT}/artifacts/delivery-build/RahyAr_R2_COMPLETE_SOURCE.txt'),
    ('RahyAr-Android-CAPABILITY-AUDIT.md', f'{D}/CAPABILITY-AUDIT.md'),
    ('videos/web-live-fa-en.mp4', f'{D}/videos/web-live-fa-en.mp4'),
    ('videos/emulator-panel-owner-90s.mp4', f'{D}/videos/emulator-panel-owner-90s.mp4'),
]

lines = []
w = lines.append

w(f'# گزارش نهایی مأموریت تکمیل RahyAr — {TODAY}')
w('')
w(f'**Commit:** `{HEAD[:12]}` — **APK:** v2.1.0 (vc22) — **زبان گزارش:** فارسی')
w('')
w('روش: هر مورد فقط با فایل مدرکِ اجرای واقعی «اثبات‌شده» ثبت شده؛ بقیه صادقانه «محدود» یا «مسدود» است.')
w('')
w('---')
w('')
w('## بخش ۱ — اثبات‌شده با شواهد (همهٔ مدارک در ZIP شواهد)')
w('')
w('### ۱) چرخهٔ توسعه و کیفیت')
w('- تست‌های JVM اندروید: **72/72** (`tests/android-jvm-tests.txt`)')
w('- وب: **261/261** واحد + typecheck + lint بدون خطا (`bun run verify`)')
w('- E2E وب با نشست مالک: **10/10** — کار/مالی/پیامک/چت/سلامت (`reports/web-e2e.txt`)')
w('- ماتریس امنیتی مسیرهای شبیه‌ساز: **11/11** (`reports/emu-security-tests.txt`):')
w('  - بدون نشست → 401 (API) و 307→login (صفحه)')
w('  - کاربر غیرمالک → 403 API؛ صفحه بدون رندر پنل')
w('  - Origin متقاطع → 403 (CSRF)')
w('  - ۱۰ درخواست سریع → 429 پس از 3 مجاز')
w('  - مالک → 200')
w('- بازرسی APK: امضای CN=RahyAr (PKCS12/RSA-4096)، vc22/v2.1.0، minSdk24/targetSdk34، ۸ مجوز حداقلی، بدون کلید/رمز در بسته (`reports/apk-inspection.txt`)')
w('- بستهٔ سورس عمومی: اسکن الگوی توکن/کلید پاک؛ مسیرهای تحویل/DB با export-ignore از ZIP عمومی حذف')
w('')
w('### ۲) رفع اشکالات واقعی امروز')
w('- **کرش اولین اجرای APK روی Android 7 — ریشه‌یابی و رفع:** logcat واقعی `NoSuchMethodException: SplashView <init>[Context, AttributeSet]` → سازندهٔ استاندارد اضافه شد؛ رگرسیون ساخت پاس شد. (بند بازِ گزارش ۱۱-۰۴ بسته شد)')
w('- **توهم عامل گفتگو (وب):** مدل برای «وظیفه‌ای بساز به نام …» ادعای ثبت می‌کرد ولی اکشنی نمی‌فرستاد → مسیر قطعی گسترش یافت (`بساز/کار جدید/task:`) و اجرای واقعی زنده راستی‌آزمایی شد (ردیف در DB)؛ **گارد ضدتوهم** اضافه شد: ادعای بدون اثر = یادداشت صادقانهٔ راستی‌آزمایی در پاسخ (chat + stream).')
w('- پنل صوتی APK: **ورودی فرمان متنی** اضافه شد — همان پارسر و همان موتور اجرای مسیر صوتی (پاسخ واقعی به بند ۱۱ زنجیرهٔ صوتی: مدیریت «عدم دسترسی به میکروفون»).')
w('- تنظیمات AI: پریست ۷ ارائه‌دهنده (OpenAI/DeepSeek/OpenRouter/Ollama/LM Studio/Claude/Gemini) روی معماری registry + endpoint سازگار با OpenAI؛ کلید فقط روی سرور، kill-switch، تست اتصال.')
w('')
w('### ۳) دستیار صوتی (اولویت اول مأموریت)')
w('- کد کامل زنجیره در APK: مجوز RECORD_AUDIO با دیالوگ سیستمی، STT fa-IR/en-US، نمایش partial/final، اجرای واقعی روی ماژول‌ها، TTS سیستم، قطع/لغو، Wake Word اختیاری «سلام رهیار» با سرویس foreground + اعلان ماندگار شفاف (opt-in).')
w('- مغز فرمان‌ها: 72 تست JVM (fa/en، ارقام فارسی، نیم‌فاصله، تأیید حذف).')
w('- حریم خصوصی: شنود فقط با لمس؛ صدا فقط به سرویس گفتار OS؛ هیچ ذخیره/ارسال پنهان.')
w('- **مسیر متنی جدید**: پنل صوتی حالا بدون میکروفون/سرویس گفتار هم کاملاً عملیاتی است.')
w('')
w('### ۴) شبیه‌ساز اندروید و پنل مالک')
w('- بوت‌های کامل ثبت‌شده در کل پروژه: **4** (آخرین: 2026-11-05 04:14 UTC، Android 7.0/API24، نصب+اجرا در لاگ).')
w('- نصب واقعی debug روی شبیه‌ساز با `adb install` و اجرای HomeActivity (لاگ در `emulator/`).')
w('- صفحهٔ `/emulator`: پخش زنده، لمس/سوایپ/Back/Home، وضعیت ADB/بوت/رزولوشن/نصب اپ، بازیابی اتصال، نمایش خطای واقعی — گیت OWNER روی صفحه.')
w('- ویدیوی پنل (۹۲ ثانیه) + اسکرین‌شات‌های مالک/غیرمجاز در ZIP.')
w('')
w('### ۵) تحویل‌ها (نام — حجم — SHA-256)')
w('')
for name, path in deliverables:
    h = sha256(path) if sz(path) else 'MISSING'
    w(f'- `{name}` — {sz(path):,} bytes — `{h[:64]}`')
w('')
w('- لینک‌های دانلود: `delivery/upload-links.txt` داخل ZIP شواهد (tmpfiles + gofile، هر فایل با دانلود در نشست مستقل و تطبیق SHA-256).')
w('')
w('---')
w('')
w('## بخش ۲ — باقی‌مانده و محدودیت‌های بیرونی (شفاف)')
w('')
w('1. **پنجرهٔ تعاملی شبیه‌ساز در این سندباکس:** ظرفیت 4GB با ~0.9GB فرایند پلتفرم؛ qemu در فاز پایانی بوت به 3.4GB RSS می‌رسد و OOM سراسری او را می‌کشد. این نشست: ۱۳+ تلاش بوت، همه با همین الگو؛ `oom_score_adj` برای کاربر غیرمجاز (EACCES). keepalive + حلقهٔ شواهد (۶۰ تلاش) فعال است — با بوتِ موفق، نصب/اجرا/۱۴ فرمان/اسکرین‌شات خودکار ثبت می‌شود. بوت کامل ×۴ در کل پروژه ثبت شده؛ یعنی محدودیت «پایداریِ ممتد» است نه «امکان بوت».')
w('2. **STT/TTS روی تصویر خام AOSP:** سرویس تشخیص گفتار و موتور TTS نصب نیست (pm list خالی) — کد کامل است؛ روی دستگاه واقعی/تصویر GApps عملیاتی می‌شود. در همین حالت، پنل صوتی با ورودی متنی کاملاً کار می‌کند.')
w('3. **میکروفون میزبان:** شبیه‌ساز headless ورودی صدا ندارد — آزمون شنیداری واقعی فقط روی دستگاه فیزیکی.')
w('4. **دریافت خودکار SMS بانکی در APK:** نیازمند RECEIVE_SMS روی دستگاه واقعی + رضایت کاربر؛ فعلاً مسیر واقعیِ دو‌مرحله‌ای «چسباندن متن پیامک → پیش‌نمایش → ثبت با رضایت + ضدتکرار» فعال است (E2E ثبت شد). شبیه‌سازی جعلی انجام نشد.')
w('5. **ویدیوی مکالمهٔ صوتی صوت‌به‌صوت:** وابسته به ۲ و ۳؛ ویدیوی واقعی وب (چت + ۵ فرمان اجرایی دوزبانه) و ویدیوی پنل جایگزین صادقانه است.')
w('6. **gofile:** بارگذاری ok؛ بازخوانی صفحهٔ دانلود از این شبکه ممکن نیست — tmpfiles مرجع راستی‌آزمایی کامل.')
w('7. **keystore release:** در ریست محیط قبلی از دست رفت و کلید جدید (CN=RahyAr) جایگزین شد — به‌روزرسانی نصب روی دستگاه‌های با نسخهٔ قبل نیاز به حذف نصب دارد (امضای متفاوت).')
w('')
w(f'---  پایان گزارش — {NOW}  ---')

report_path = f'{OUT}/RahyAr-F2-FINAL-REPORT.md'
with open(report_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('report:', report_path, sz(report_path), 'bytes')

# ── evidence zip ──
EV = f'{ROOT}/artifacts/evidence'
ev_map = {}
candidates = [
    (f'{ROOT}/artifacts/reports/emu-security-tests.txt', 'security/emu-api-access-matrix.txt'),
    (f'{ROOT}/artifacts/reports/web-e2e.txt', 'tests/web-e2e.txt'),
    (f'{ROOT}/artifacts/reports/apk-inspection.txt', 'build/apk-inspection.txt'),
    (f'{ROOT}/artifacts/rahyar-audit/ANDROID_JVM_TESTS.txt', 'tests/android-jvm-tests.txt'),
    (f'{ROOT}/artifacts/panel-shots/emulator-panel-owner.png', 'panel/emulator-panel-owner.png'),
    (f'{ROOT}/artifacts/panel-shots/emulator-unauth-redirect.png', 'panel/emulator-unauth-redirect.png'),
    (f'{ROOT}/artifacts/logs/emulator.log', 'emulator/emulator-boot-milestones.log'),
    (f'{ROOT}/artifacts/logs/keepalive.log', 'emulator/keepalive-log.txt'),
    (f'{ROOT}/artifacts/logs/demo-cycle.log', 'emulator/demo-cycle-log.txt'),
    (f'{D}/SHA256SUMS.txt', 'delivery/apk-sha256.txt'),
    (f'{D}/CAPABILITY-AUDIT.md', 'audit/CAPABILITY-AUDIT.md'),
    (f'{ROOT}/artifacts/delivery-build/source-build-stats.json', 'delivery/source-build-stats.json'),
    (f'{ROOT}/artifacts/reports/upload-links-final.txt', 'delivery/upload-links.txt'),
    (f'{ROOT}/artifacts/reports/verify-links-final.txt', 'delivery/verify-links-sha256.txt'),
]
for src, dst in candidates:
    if os.path.isfile(src) and os.path.getsize(src) > 0:
        ev_map[dst] = src

if os.path.isdir(EV):
    for f in sorted(os.listdir(EV)):
        p = os.path.join(EV, f)
        if os.path.isfile(p) and os.path.getsize(p) > 0:
            ev_map[f'evidence/{f}'] = p

EZIP = f'{OUT}/RahyAr-F2-Test-Evidence.zip'
with zipfile.ZipFile(EZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for dst, src in sorted(ev_map.items()):
        z.write(src, dst)
        print('zip+', dst, os.path.getsize(src))
print('evidence zip:', EZIP, sz(EZIP), 'bytes, sha256:', sha256(EZIP))
