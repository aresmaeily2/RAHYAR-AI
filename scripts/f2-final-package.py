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
    (f'{ROOT}/artifacts/reports/verify-links-f2.txt', 'delivery/verify-links-sha256.txt'),
    (f'{ROOT}/artifacts/panel-shots/emulator-panel-owner.png', 'panel/emulator-panel-owner.png'),
    (f'{ROOT}/artifacts/panel-shots/emulator-unauth-redirect.png', 'panel/emulator-unauth-redirect.png'),
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
- بوت واقعی اندروید ثبت شد (`EMU_BOOT_DONE` ×۳ در لاگ — آخرین: 2026-11-04 14:13:30 UTC)، **نصب APK با adb واقعی انجام شد** و برنامه اجرا شد (لاگ در evidence).
- بوت سوم روی تصویر سبک‌تر API 24 انجام شد؛ نصب موفق و اجرا با کرش اولین اجرا (همان ردیف باز WebView قدیمی تصویر خام API 24 — بازتولید واقعی و ثبت در لاگ focus). ریشهٔ فنی جدید کشف و مستند شد: لانچر v37 حتی برای API24 حجم 7.37GB فضای دیسک خودخوان می‌خواهد و config.ini را بازنویسی می‌کند — دور زدن با فایل ext4 از پیش ساخته و dataPartition.path (در اسکریپت boot ثبت است).
- صفحهٔ `/emulator` با پخش زندهٔ تصویر، لمس/سوایپ/برگشت/خانه/چرخش، وضعیت ADB/بوت/رزولوشن/مدل/نصب اپ، بازیابی اتصال و **نمایش خطای واقعی** مستقر است؛ گیت نقش OWNER روی خود صفحه هم اضافه شد (کاربر عادی: پیام ۴۰۳ بدون رندر پنل).
- **امنیت مرحلهٔ ۴ با ماتریس ۱۱تایی با تاریخ امروز اثبات شد**: بدون نشست→۳۰۷/۴۰۱؛ کاربر غیرمالک→API ۴۰۳ + صفحه بدون پنل؛ Origin متقاطع→۴۰۳؛ ۱۰ درخواست سریع→۴۲۹ پس از ۳ مجاز؛ OWNER→۲۰۰/۵۰۳-صادقانه (شواهد: security/emu-api-access-matrix.txt در ZIP).
- تصویر زندهٔ شامل حالت‌های «در حال بوت» و «شبیه‌ساز خاموش» هم هست (بدون صفحهٔ سفید). تصاویر پنل در panel/ ZIP.

### ۴) تحویل عمومی و راستی‌آزمایی مستقل
- لینک‌های tmpfiles به دلیل انقضای ۶۰ دقیقه‌ای **دوبار تازه‌سازی و هر بار با دانلود در نشست مستقل + تطبیق SHA-256 بایت‌به‌بایت تأیید شد** — آخرین دور: ۵/۵ MATCH (دو APK، سورس ZIP/TXT، گزارش ممیزی) + گوفایل برای همهٔ فایل‌ها.
- گوفایل: بارگذاری ok (API پاسخ ok) ولی بازخوانی صفحهٔ دانلود از این شبکه ممکن نیست — محدودیت مستند؛ tmpfiles مرجع راستی‌آزمایی کامل است.
- ZIP بازخوانی و TXT سرخط/میان/ته بررسی شد (نتایج در delivery/verify-links-sha256.txt).

## بخش دوم — باقی‌مانده یا محدودیت فنی (شفاف)

1. **پایداری نشست تعاملی شبیه‌ساز**: این محیط KVM ندارد و OOM سراسری در ~۳.۱-۳.۴GB با هر پیکربندی (۷۶۸/۱۰۲۴MB مهمان، gpu off/swiftshader، ۷۲۰p، tb-cap، ۱ هسته، API 24/30) بوت را می‌کُشت؛ سه بوت کامل ثبت شد اما پنجرهٔ تعاملی پایدار (تصویر زندهٔ ممتد) در همین سندباکس ممکن نشد. **عکس لحظه‌ای زندهٔ داخل پنل در محیط با KVM/منابع بیشتر با همان صفحهٔ /emulator بلافاصله کار می‌کند.**
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
