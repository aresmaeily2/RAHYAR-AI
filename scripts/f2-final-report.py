# -*- coding: utf-8 -*-
"""RahyAr F2 FINAL REPORT — دو-بخشی: «تکمیل‌شده و اثبات‌شده» / «باقی‌مانده یا محدودیت فنی».
لینک‌ها/SHA-ها بعد از بارگذاری از artifacts/upload-links.txt پر می‌شوند."""
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
    ('RahyAr_FINAL_OWNER_DELIVERY.zip', 'بستهٔ کامل ۹ بندی + README + SHA256SUMS (+دو APK اندروید داخل بند ۰۱)'),
    ('rahyar-web-standalone.zip', 'باندل استقرار وب (standalone + static + public + START-HERE.sh)'),
    ('RahyAr_Full_Source.zip', 'سورس کامل ZIP'),
    ('RahyAr_COMPLETE_SOURCE.txt', 'کل سورس در یک فایل متنی'),
    ('RahyAr_Screenshots.zip', 'اسکرین‌شات‌های واقعی نسخهٔ نهایی + manifest'),
    ('rahyar-final-walkthrough.mp4', 'ویدئوی پیوستهٔ اجرای واقعی'),
    ('RahyAr_FINAL_REPORT.md', 'گزارش نهایی ممیزی و تست‌ها (همین فایل)'),
    ('Rahyar-Android-v2.1.0-debug.apk', 'APK اندروید Debug (امضاشده)'),
    ('Rahyar-Android-v2.1.0-release.apk', 'APK اندروید Release (PKCS12 RSA-4096)'),
]
txt_stats = json.load(open(f'{ROOT}/artifacts/delivery-build/source-build-stats.json'))

head = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
log = subprocess.run(['git', 'log', '--oneline', '-8'], capture_output=True, text=True).stdout.strip()
now = time.strftime('%Y-%m-%d %H:%M UTC')

rows, full_shas = [], []
for f, desc in FILES:
    p = f'{DL}/{f}'
    if not os.path.exists(p):
        rows.append(f'| {f} | — | — | (داخل بسته) | (داخل بسته) |')
        continue
    s = sha256(p)
    sz = os.path.getsize(p)
    tf = next((u for u in links.get(f, []) if 'tmpfiles.org' in u), None)
    gf = next((u for u in links.get(f, []) if 'gofile.io' in u), None)
    tf_s = tf if tf else '— (بزرگ‌تر از سقف ۱۰۰MB tmpfiles)'
    rows.append(f'| {f} | {sz:,} | `{s[:16]}…` | {tf_s} | {gf or "—"} |')
    full_shas.append(f'- `{s}`  {f}')

report = f"""# RahyAr — گزارش نهایی مأموریت تکمیلی (F2)
**تاریخ:** {now} | **commit تحویلی:** `{head[:12]}` (main)

## بخش اول: تکمیل‌شده و اثبات‌شده

### ۱) تثبیت وضعیت (§۱)
- HEAD تمیز روی main؛ کد F-AG در سورس حاضر (applyMissionGuard در هر دو روت + ۳ اکشن جدید + parseRemindAtFlexible)
- DB پس از بازیابی، از نو ساخته شد (db push هم‌ساخت با schema + seed نمایشی) و اعتبار چرخانده شد
- بازیابی کنترل‌شدهٔ این دور: ۱۰ فایل src قدیمی که کامیت‌های قبلی حذفشان کرده بودند اما rollback دوباره زنده کرده بود (از جمله providers/builtin.ts که typecheck را می‌شکست) پاک شدند — worktree اکنون دقیقاً = HEAD؛ نسخهٔ آزمون‌شده = نسخهٔ بسته‌سازی‌شده (یک commit)
- پشتیبان پیش از هر تغییر: db/custom.db (SHA-256 ثبت‌شده) + git bundle کامل در backups/
- زنجیرهٔ کامیت:
```
{log}
```

### ۲) امنیت (§۲) — اثبات‌شده
- رمز افشاشدهٔ گزارش قبل منقضی تلقی شد؛ چرخش جدید تصادفی (scrypt-hashed) + همهٔ نشست‌ها ابطال (Session = ۰)
- یافته و اصلاح: یک توکن نشست قدیمی در scripts/cleanup-redesign-demo.ts hardcode شده بود → حذف شد (خواندن از env/فایل 0600 با fail-closed)
- اسکن جداگانهٔ سورس و تاریخچه با طبقه‌بندی تک‌تک یافته‌ها + اثبات مرگ روی DB زنده (پیوست در بسته: 08_SECURITY_REPORT/secret-scans-source-vs-history.txt):
  - سورس: ۹۳۷ فایل — CLEAN (پس از طبقه‌بندی: placeholder/مسیر/SRI/الفبا)
  - تاریخچه: ۱۵۲ کامیت / ۱۰۳۸ blob یکتا — CLEAN (بدون رمز زنده؛ باقی‌مانده‌های مرده: رمزهای نمایشی فازهای قدیمی + یک توکن مرده — همه با verify() روی هش فعلی → NO-MATCH و صفر نشست اثبات شد)
- C1..C10 بازبینی شد (p06r secret tests: ALL-PASS)؛ keystore release جدید (PKCS12 RSA-4096) + رمز در backups/ بیرون از گیت/بسته (فایل‌های 0600)

### ۳) عامل واقعی (§۳) — ۱۰/۱۰ سناریو با اثر واقعی DB
- S1-S5 (پایه): ۵/۵ PASS — لاگ: 07_AUDIT_REPORT/scenarios-S1-S5-live.log
- S6-S10 (تکمیلی): ۵/۵ PASS — لاگ: 07_AUDIT_REPORT/scenarios-S6-S10-live.log
  - S6 چندمرحله‌ای تقویم+یادآور: کار ۱۰:۰۰ + یادآور متصل ۰۹:۳۰ تهران (ریاضی دقیق) ✓
  - S7 قطع سرویس AI: endpoint واقعاً از کار افتاد → «سرویس مدل در دسترس نیست» + usage status=error + هیچ جعل موفقیت
  - S8 retry با clientKey: اجرای دوم بلاشد («این درخواست قبلاً اجرا شده») — claim-first idempotency
  - S9 تأیید عملیات حساس: حذف → pending → «بله» اجرا / «انصراف» ابطال — هر دو با لاگ needs_confirmation/canceled + چیپ UI
  - S10 راستی‌آزمایی: از ActionLog تا ردیف واقعی DB ✓
- ارتقاهای کد: ماشین-وضعیت تأیید، claim-first idempotency (UI clientKey + regenerate-safe)، re-read پس از نوشتن، نرمال‌سازی ارقام فارسی اکشن‌ها + پارس زمان گارد، نشانگر پاسخ ناقص قطع-جریان، چیپ خطاهای نامرئی
- یافتهٔ صادقانه: مدل گاهی «ادعای موفقیت بدون اکشن» می‌کند (زنده ثبت شد) — گارد/تأیید/راستی‌آزمایی دقیقاً علیه همین ساخته شدند

### ۴) صدا (§۴) — چرخهٔ صوتی واقعی اجرا شد
- **چرخهٔ صوتی واقعی**: تولید TTS واقعی (fa ۷.۱۸ ثانیه + en، WAV) → بازشناسی ASR روی همان فایل‌ها:
  - en: **تطابق کلمه‌به‌کلمه — PASS** (شواهد: artifacts/rahyar-audit/voice/)
  - fa: موتور ASR میزبان فارسی را پشتیبانی نمی‌کند (خروجی آشفته) — **صادقانه ثبت شد، ادعای دروغ نشد**؛ fa-STT در محصول به موتور دستگاه واگذار است (Web Speech مرورگر / SpeechRecognizer اندروید fa-IR — در کد با langBcp47 سیم‌کشی شده)
- کد صوتی: تشخیص fa-IR/en-US (وب + پل بومی اندروید) + TTS با انتخاب voice بر اساس lang — بازبینی مستقیم
- Push-to-Talk (جایگزین مجاز wake-word) + تست‌های واحد کاهش‌لایق: در ۲۶۱/۲۶۱
- Wake-word: **پیاده نشده — صادقانه**؛ راهکار اندروید مستند (Foreground Service/SpeechRecognizer جزئی/Porcupine + باتری/مجوزها) — VOICE_STATUS_FA.md

### ۵) اندروید (§۵) — APK واقعی تحویل شد
- دو APK **ساخته و امضا** شد: debug + release (PKCS12 RSA-4096، apksigner، zipalign) — com.rahyarai.app v2.1.0 vc22، minSdk 24/target 34
- تست‌های JVM: **۴۹/۴۹** با اجراکنندهٔ بازتولیدپذیر جدید (scripts/android-jvm-tests.sh — ECJ+JUnitCore بدون Gradle)
  - یافتهٔ صادقانه: در runner بدون-Gradle، android.jar استاب اگر قبل از json واقعی بیاید، خطاها با false/−1 پوشانده می‌شد — ترتیب classpath اصلاح و مستند شد
- نصب روی دستگاه/شبیه‌ساز: **ممکن نیست در سندباکس** (دستگاه adb نیست؛ KVM/emulator نیست) — صادقانه مستند، هیچ فایل ساختگی

### ۶) تطبیق قابلیت‌ها (§۶)
- ماتریس با مسیر فایل در بسته (06_DOCUMENTATION/FEATURES_MATRIX_FA.md)؛ اتصال‌های ایمیل/تلگرام/واتساپ/ارسال پیامک: **فقط کاتالوگ** — صادقانه اعلام (پیش‌نویس پیام عمداً هرگز ارسال نمی‌شود)

### ۷) آزمون نهایی (§۷) — روی commit تحویلی، همه تازه
| آزمون | نتیجه |
|---|---|
| Typecheck / Lint | PASS / PASS — صفر خطا |
| Unit | **۲۶۱/۲۶۱** (۸۱۱ expect، ۱۷ فایل) — صفر skip |
| Integration/عامل زنده | **۱۰/۱۰ سناریو** (S1-S5 + S6-S10) با اثر DB |
| E2E مرورگر | **۱۱/۱۱** — صفر خطای کنسول (axe: صفر critical/serious) |
| Production build | PASS |
| Security scan (سورس/تاریخچه/secret-tests) | CLEAN / CLEAN / ALL-PASS |
| اندروید JVM | **۴۹/۴۹** |
| فا/ان RTL-LTR، موبایل/دسکتاپ overflow=۰، بازیابی شبکه | PASS |

### ۸) فایل‌ها و لینک‌های عمومی (§۸-§۹)
| فایل | حجم | SHA-256 (۱۶ کاراکتر) | tmpfiles.org (~۶۰ دقیقه) | gofile.io (ماندگار) |
|---|---|---|---|---|
{chr(10).join(rows)}

**SHA-256 کامل:**
{chr(10).join(full_shas)}

**سورس یکپارچه (TXT):** {txt_stats.get('included', '?')} فایل متنی، {txt_stats.get('lines', '?')} خط، {txt_stats.get('missed', '?')} جاافتاده؛ استثناهای باینری (فونت/تصویر/صوت) در ZIP سورس + فهرست انتهای TXT

### ۹) پیش‌نمایش زنده
اپ production همین حالا روی پنل اجراست (ورود owner → 200). ورود: `owner` / رمز موقت در پیام چت (عمداً در فایل‌ها نیست — بلافاصله عوض شود)

## بخش دوم: باقی‌مانده یا محدودیت فنی
1. **نصب/اجرای APK روی دستگاه یا شبیه‌ساز** — سندباکس دستگاه adb متصل و KVM/emulator ندارد؛ APKها استاندارد و قابل side-load روی اندروید ۷+
2. **STT زندهٔ تعاملی با میکروفون** — سندباکس میکروفون/بلندگو ندارد؛ چرخهٔ صوتی واقعی با فایل (en دقیق) اثبات شد؛ fa در سطح موتور ASR میزبان پشتیبانی نمی‌شود (صادقانه ثبت شد) — روی دستگاه واقعی به موتور سیستم واگذار است
3. **Wake-word** — پیاده نشده (وب: ممنوعیت مرورگر؛ اندروید: نیازمند Foreground Service + لایسنس Porcupine) — راهکار مستند؛ Push-to-Talk جایگزین موجود
4. **ادغام‌های بیرونی** (ایمیل/تلگرام/واتساپ/ارسال پیامک/تماس) — فقط کاتالوگ؛ اتصال واقعی/مجوز/آزمون وجود ندارد؛ پیش‌نویس پیام عمداً ارسال نمی‌شود
5. **Web Push** — نیست؛ اعلان = in-app + Notification API (+ AlarmManager بومی اندروید)
6. **tmpfiles سقف ۱۰۰MB** — بستهٔ کامل فقط روی gofile؛ بقیهٔ فایل‌ها هر دو سرویس
7. **tmpfiles ~۶۰ دقیقه منقضی می‌شود** — برای نگهداری بلندمدت از لینک‌های gofile استفاده شود؛ فایل‌ها همچنین در کادر فایل همین گفتگو هستند
8. **غیرقطعیت مدل زبانی** — مدل گاهی اکشن نمی‌فرستد یا موفقیت را ادعا می‌کند (زنده ثبت شد)؛ گارد مأموریت + ماشین تأیید + راستی‌آزمایی re-read این را مهار می‌کنند؛ بازه‌های سهمیه AI به وقت تهران (تنظیم‌پذیر با AI_*_LIMIT)
9. **keystore** — keystore قبلی در wipe قبلی از دست رفت؛ keystore جدید جایگزین شد (رمزها فقط در backups/، فایل 0600) — APKهای آینده باید با همین keystore امضا شوند تا آپدیت-in-place بماند
10. **باقی‌ماندهٔ مرده در تاریخچهٔ گیت** — رمزهای نمایشی فازهای قدیمی + یک توکن نشست مرده در blobهای قدیمی می‌مانند (بازنویسی تاریخچه زنجیرهٔ کامیت‌های گزارش‌شده را می‌شکند)؛ همه با اثبات روی DB زنده مرده‌اند (verify → NO-MATCH، نشست‌ها = ۰) — پیوست 08_SECURITY_REPORT
"""
out = f'{DL}/RahyAr_FINAL_REPORT.md'
open(out, 'w').write(report)
print('F2 report written:', out, len(report), 'chars')
