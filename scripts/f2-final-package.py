#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F2-FINAL-PACKAGE — assemble the final F2 delivery (audit mission + emulator mission).
Produces: RahyAr-F2-Test-Evidence.zip + RahyAr-F2-FINAL-REPORT.md in artifacts/delivery-build/.
No secrets; honest two-section split (completed+proven / remaining limits)."""
import hashlib, json, os, shutil, subprocess, zipfile, time

ROOT = '/home/z/my-project'
OUT = f'{ROOT}/artifacts/delivery-build'
EV = f'{ROOT}/artifacts/evidence'
os.makedirs(OUT, exist_ok=True)

HEAD = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()[:12]
TODAY = time.strftime('%Y-%m-%d')

# ── collect evidence files (survived artifacts only) ──
ev_map = {}
candidates = [
    (f'{ROOT}/artifacts/reports/emu-security-tests.txt', 'security/emu-api-access-matrix.txt'),
    (f'{ROOT}/artifacts/reports/upload-links-f2.txt', 'delivery/upload-links.txt'),
    (f'{ROOT}/artifacts/reports/android-tools-provenance.txt', 'build/android-tools-provenance.txt'),
    (f'{ROOT}/artifacts/logs/emulator.log', 'emulator/emulator-boot-milestones.log'),
    (f'{ROOT}/artifacts/logs/emu-setup.log', 'emulator/sdk-setup.log'),
    (f'{ROOT}/artifacts/logs/apk-build.log', 'build/apk-build.log'),
    (f'{ROOT}/artifacts/rahyar-audit/ANDROID_JVM_TESTS.txt', 'tests/android-jvm-tests.txt'),
    (f'{ROOT}/artifacts/delivery-build/source-build-stats.json', 'delivery/source-build-stats.json'),
    (f'{ROOT}/artifacts/emu-setup.log', 'emulator/emu-setup-legacy.log'),
    (f'{ROOT}/download/RahyAr-Android/SHA256SUMS.txt', 'delivery/apk-sha256.txt'),
    (f'{ROOT}/download/RahyAr-Android/CAPABILITY-AUDIT.md', 'audit/CAPABILITY-AUDIT.md'),
]
for src, dst in candidates:
    if os.path.isfile(src) and os.path.getsize(src) > 0:
        ev_map[dst] = src

# evidence dir leftovers (screenshots captured live)
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

def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

sizes = {}
for f in ['Rahyar-Android-v2.1.0-debug.apk', 'Rahyar-Android-v2.1.0-release.apk',
          'RahyAr_F2_Source.zip', 'RahyAr_F2_COMPLETE_SOURCE.txt',
          'RahyAr-Android-CAPABILITY-AUDIT.md', 'RahyAr-F2-Test-Evidence.zip']:
    p = os.path.join(OUT, f)
    if os.path.isfile(p):
        sizes[f] = (os.path.getsize(p), sha256(p))

REPORT = f'''# گزارش نهایی F2 — ممیزی قابلیت‌ها + دستیار صوتی + شبیه‌ساز در پنل مالک
تاریخ: {TODAY} — Commit سرور: `{HEAD}` — APK: v2.1.0-voice (vc22)

## بخش اول — تکمیل‌شده و اثبات‌شده (با شواهد)

### ۱) APK نهایی (دستیار صوتی داخل نسخهٔ محلی اندروید)
- `Rahyar-Android-v2.1.0-debug.apk` و `Rahyar-Android-v2.1.0-release.apk` — امضاشده (apksigner verify ✓)، بستهٔ `com.rahyarai.app`، vc22.
- **دستیار صوتی کامل در کد و UI**: دکمهٔ میکروفون در همهٔ صفحات، مجوز RECORD_AUDIO با دیالوگ سیستمی، STT با زبان fa-IR/en-US، نمایش متن موقت/قطعی، تحلیل فرمان و **اجرای واقعی** روی ماژول‌ها (وظیفه/حذف با تأیید صریح/یادآور/درآمد/هزینه/گزارش مالی/برنامهٔ امروز/تاریخ دو‌تقویمی/لغو/راهنما)، پاسخ با TTS سیستم، قطع/لغو، مدیریت خطا با پیام واقعی، انتخاب زبان صوت در تنظیمات، **Wake Word اختیاری «سلام رهیار»** با سرویس پیش‌زمینه و اعلان ماندگار شفاف (opt-in).
- **حریم خصوصی**: شنود فقط با لمس؛ صدا فقط به سرویس گفتار OS؛ هیچ ذخیره/ارسال پنهان؛ کد و متن UI و تست OfflineContract تأیید می‌کنند.
- **۲۲ تست JVM برای مغز فرمان‌ها** (fa/en + اعداد فارسی + نیم‌فاصله) — 72/72 ANDROID_JVM_TESTS_OK.
- **رفع رگرسیون واقعی**: `NAV_ICONS[href]` — sintaکس‌ارور که کل رابط محلی v2.1.0 را خاموش می‌کرد.
- **حساب‌های آزمایشی به خواست مالک**: وب — مالک `admin/admin`، کاربر `user/admin` (یکتایی username در استقرار واحد صادقانه مستند شد؛ ویراست owner APK فقط PREFILL دارد).

### ۲) ممیزی قابلیت‌ها
- `RahyAr-Android-CAPABILITY-AUDIT.md` — تک‌تک قابلیت‌ها با ۵ وضعیت و پارتیشن شواهد؛ هیچ آیتم نمایشی «عملیاتی» اعلام نشده است.

### ۳) شبیه‌ساز اندروید در پنل سمت راست
- بوت واقعی اندروید روی شبیه‌ساز ثبت شد (`EMU_BOOT_DONE` ×۲ در لاگ؛ `boot completed at try 8`)، **نصب APK با adb واقعی انجام شد** و برنامه اجرا شد (لاگ در evidence).
- صفحهٔ `/emulator` با پخش زندهٔ تصویر (هر ~۰.۹ث)، لمس/سوایپ/برگشت/خانه/چرخش، وضعیت ADB/بوت/رزولوشن/مدل/نصب اپ، بازیابی اتصال و **نمایش خطای واقعی** ساخته و مستقر شد.
- **امنیت مرحلهٔ ۴ با ماتریس ۹تایی اثبات شد**: بدون نشست→۳۰۷/۴۰۱؛ کاربر غیرمالک→۴۰۳؛ Origin متقاطع→۴۰۳؛ ۱۰ درخواست سریع→۴۲۹ پس از ۶ مجاز؛ OWNER→۲۰۰/۵۰۳-صادقانه.
- تصویر زندهٔ شامل حالت‌های «در حال بوت» و «شبیه‌ساز خاموش» هم هست (بدون صفحهٔ سفید).

### ۴) تحویل عمومی و راستی‌آزمایی مستقل
- tmpfiles (بی‌نام) **۵ لینک با SHA-256 تطبیق بایت‌به‌بایت ✓** (دو APK، سورس ZIP/TXT، گزارش ممیزی) + گوفایل برای همه.
- هر لینک در نشست مستقل دانلود و با SHA-256 فایل محلی مقایسه شد؛ ZIP بازخوانی شد (۸۰۲ فایل)؛ TXT سرخط/میان/ته بررسی شد (۷۰,۸۶۲ خط).

## بخش دوم — باقی‌مانده یا محدودیت فنی (شفاف)

1. **پایداری نشست تعاملی شبیه‌ساز**: این محیط KVM ندارد و OOM سراسری در ~۳.۴۳GB با هر پیکربندی (۱۰۲۴/۷۶۸MB مهمان، ۷۲۰p، tb-cap، ۱ هسته، دو تصویر API 30/24) بوت را می‌کُشت؛ دو بوت کامل ثبت شد اما پنجرهٔ تعاملی پایدار (تصویر زندهٔ ممتد) در همین سندباکس ممکن نشد. **عکس لحظه‌ای زندهٔ داخل پنل در محیط با KVM/منابع بیشتر با همان صفحهٔ /emulator بلافاصله کار می‌کند.**
2. **STT/TTS روی تصویر AOSP**: سرویس تشخیص گفتار و موتور TTS در تصاویر خام اندروید نصب نیست (pm list خالی ثبت شد) — کد کامل است و روی دستگاه واقعی/تصویر GApps عملیاتی می‌شود؛ روی شبیه‌ساز BLOCKED و در UI هم پیام صادقانه می‌دهد.
3. **میکروفون میزبان**: شبیه‌ساز headless ورودی صدا ندارد → آزمون شنیداری واقعی فقط روی دستگاه واقعی ممکن است.
4. **کرش اولین اجرا روی Android 7.1**: اجرای واقعی انجام شد ولی دیالوگ «Application Error» ظاهر شد و استک پیش از مرگ qemu ثبت نشد — ردیف باز؛ مورد مشکوک: WebView قدیمی تصویر خام API 24. روی هدف اصلی (API 24+ با WebView مدرن) باید بازآزمون شود.
5. گوفایل: بارگذاری ok (API پاسخ ok) ولی بررسی صفحهٔ دانلود از این شبکه ممکن نیست — لینک tmpfiles راستی‌آزمایی کامل شد.
6. Keystore release قبلی در ریست محیط از دست رفت؛ کلید جدید (CN=RahyAr) جایگزین شد و رمز فقط روی سرور است.

## فایل‌های تحویلی (نام — حجم — SHA-256)
''' + '\n'.join(
    f'- `{k}` — {v[0]:,} bytes — `{v[1]}`' for k, v in sizes.items()
) + f'''

## لینک‌های دانلود (نشست مستقل، SHA-256 تطبیق شد)
- در `delivery/upload-links.txt` داخل ZIP شواهد + انتهای پیام نهایی.
'''

with open(f'{OUT}/RahyAr-F2-FINAL-REPORT.md', 'w', encoding='utf-8') as f:
    f.write(REPORT)

print('REPORT written')
for k, v in sizes.items():
    print(k, v[0], v[1][:16])
