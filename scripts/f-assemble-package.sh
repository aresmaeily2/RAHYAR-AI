#!/bin/bash
# ─── مونتاژ بستهٔ نهایی مالک — RahyAr_FINAL_OWNER_DELIVERY ──────
set -euo pipefail
cd /home/z/my-project
ROOT=download/RahyAr_FINAL_OWNER_DELIVERY
rm -rf "$ROOT" download/RahyAr_FINAL_OWNER_DELIVERY.zip
mkdir -p "$ROOT"/{01_APPLICATION,02_FULL_SOURCE_ZIP,03_COMPLETE_SOURCE_TEXT,04_SCREENSHOTS,05_VIDEO,06_DOCUMENTATION,07_AUDIT_REPORT,08_SECURITY_REPORT,09_TEST_RESULTS}
HASH=$(git rev-parse HEAD)
TODAY=$(date +%Y-%m-%d)

# ── 01_APPLICATION: باندل استقرار وب (standalone کامل + استاتیک + public) ──
echo "  [01] deployable web bundle..."
cd .next/standalone && zip -qr "/home/z/my-project/$ROOT/01_APPLICATION/rahyar-web-standalone.zip" . -x "*.log" && cd /home/z/my-project
cd .next && zip -qr /tmp/static.zip static && cd /home/z/my-project && unzip -qo /tmp/static.zip -d /tmp/appstatic && cd "$ROOT/01_APPLICATION" && zip -qr rahyar-web-standalone.zip app-static-placeholder 2>/dev/null || true; cd /home/z/my-project
# ادغام static و public داخل باندل
mkdir -p /tmp/bundlefix && cd /tmp/bundlefix && rm -rf * && unzip -qo "$OLDPWD/$ROOT/01_APPLICATION/rahyar-web-standalone.zip" 2>/dev/null || unzip -qo "/home/z/my-project/$ROOT/01_APPLICATION/rahyar-web-standalone.zip"
unzip -qo /tmp/static.zip
cp -r /home/z/my-project/public ./public
cp /home/z/my-project/prisma/schema.prisma ./schema.prisma 2>/dev/null || true
cp /home/z/my-project/.env.example ./.env.example
cat > START-HERE.sh << 'EOF'
#!/bin/bash
# RahyAr — اجرای باندل استقرار (وب)
# پیش‌نیاز: Node.js 20+ و Bun (https://bun.sh) یا npm
set -e
[ -f .env ] || cp .env.example .env
bun install --no-save prisma @prisma/client 2>/dev/null || npm install prisma @prisma/client --no-save
mkdir -p db
bunx prisma db push --skip-generate || npx prisma db push --skip-generate
echo "سرور روی http://localhost:3000 بالا می‌آید..."
NODE_ENV=production bun .next/standalone/server.js 2>/dev/null || NODE_ENV=production node .next/standalone/server.js
EOF
chmod +x START-HERE.sh
rm -f rahyar-web-standalone.zip
zip -qr /home/z/my-project/$ROOT/01_APPLICATION/rahyar-web-standalone.zip .
cd /home/z/my-project && rm -rf /tmp/bundlefix /tmp/static.zip /tmp/appstatic

# ── 02 + 03: سورس ──
echo "  [02+03] source..."
cp artifacts/delivery-build/RahyAr_R2_Full_Source.zip "$ROOT/02_FULL_SOURCE_ZIP/RahyAr_Full_Source.zip"
cp artifacts/delivery-build/RahyAr_R2_COMPLETE_SOURCE.txt "$ROOT/03_COMPLETE_SOURCE_TEXT/RahyAr_COMPLETE_SOURCE.txt"

# ── 04: اسکرین‌شات‌ها ──
echo "  [04] screenshots..."
cp artifacts/media/final/screenshots/*.png "$ROOT/04_SCREENSHOTS/"
python3 - << PYEOF
import json, os
d = '/home/z/my-project/download/RahyAr_FINAL_OWNER_DELIVERY/04_SCREENSHOTS'
names = sorted(f for f in os.listdir(d) if f.endswith('.png'))
meta = [{"file": f, "content": {
 '01':'ورود (فارسی RTL)','02':'داشبورد امروز','03':'نمای دستیار','04':'پاسخ واقعی مدل',
 '05':'عامل: جمع مخارج با اعداد واقعی','06':'عامل: پیش‌نویس پیام (ارسال نشده)','07':'عامل: قرار+یادآور متصل',
 '08':'وظایف','09':'تقویم شمسی','10':'برنامه روز','11':'مالی: حساب‌ها و تراکنش‌ها','12':'گزارش مالی',
 '13':'تنظیمات یادآور/اعلان','14':'تنظیمات','15':'تم و محیط','16':'مدیریت کاربران (مالک)',
 '17':'داشبورد انگلیسی LTR','18':'وظایف انگلیسی','19':'موبایل: ورود','20':'موبایل: امروز',
 '21':'خطای قطع شبکه','22':'بازیابی پس از اتصال'}}.get(f[:2], f) for f in names]
json.dump({"count": len(names), "commit": "$HASH", "captured": "$TODAY", "shots": meta},
          open(os.path.join(d, 'screenshots-manifest.json'), 'w'), ensure_ascii=False, indent=1)
print('manifest:', len(names))
PYEOF

# ── 05: ویدئو ──
cp artifacts/media/final/rahyar-final-walkthrough.mp4 "$ROOT/05_VIDEO/"
cp artifacts/media/final/video/da914dbcac4cca5e6a153b9eea9cc010.webm "$ROOT/05_VIDEO/rahyar-final-walkthrough-original.webm"

# ── 06: مستندات ──
cat > "$ROOT/06_DOCUMENTATION/INSTALL_GUIDE_FA.md" << 'EOF'
# راهنمای نصب و اجرا (وب)
```bash
unzip rahyar-web-standalone.zip -d rahyar && cd rahyar
./START-HERE.sh     # یا: cp .env.example .env && bunx prisma db push && NODE_ENV=production bun .next/standalone/server.js
```
اولین بازدید: صفحه ورود — اگر DB تازه است، فرم «راه‌اندازی اولیه» username/password مالک می‌سازد (نقش OWNER).
سورس کامل: از ZIP بند 02 یا TXT بند 03 (هر دو = commit $HASH).
EOF
cat > "$ROOT/06_DOCUMENTATION/LIMITATIONS_FA.md" << EOF
# محدودیت‌های صادقانه (تاریخ: $TODAY)
1. **APK اندروید ساخته نشده** — دو دلیل واقعی: (الف) Android SDK در این محیط نصب نیست؛ (ب) در بازیابی پس از wipe پلتفرم، vault/ رمز keystore از دست رفت و بازسازی کلید بدون آن ممکن نیست. اسکریپت‌های build موجودند (scripts/build-android-apk-v11.sh، fail-closed با env).
2. **هوش مصنوعی «مدل میزبان»** فقط روی زیرساخت با کانفیگ .z-ai-config فعال است؛ بدون آن موتور محلی قاعده‌محور (شفاف در UI).
3. **ادغام‌های بیرونی** (ایمیل/تقویم بیرونی، تلگرام/واتساپ، ارسال پیام): فقط کاتالوگ — کد integration وجود ندارد؛ پیش‌نویس پیام عمداً هرگز ارسال نمی‌کند.
4. **Wake-word / گوش‌به‌فرمان پس‌زمینه**: در وب ناممکن (مرورگر اجازهٔ شنیدن مداوم در پس‌زمینه نمی‌دهد)؛ در اندروید نیازمند سرویس foreground + مجوز RECORD_AUDIO — پیاده نشده، صادقانه ثبت شده.
5. **Web Push**: نیست؛ اعلان = in-app + Notification API مرورگر (و AlarmManager بومی در اندروید کد موجود).
EOF
cat > "$ROOT/06_DOCUMENTATION/FEATURES_MATRIX_FA.md" << 'EOF'
# ماتریس قابلیت‌ها در برابر پیاده‌سازی واقعی (شواهد: مسیر فایل)
| قابلیت | وضعیت | شاهد |
|---|---|---|
| چت AI با SSE و سهمیه | کامل | src/app/api/chat/{route,stream}/route.ts، src/lib/ai/gateway.ts |
| چندارائه‌دهنده (میزبان/OpenAI-سازگار/محلی) | کامل | src/lib/ai/providers/{zai,openai-compatible,local-rules}.ts |
| عامل: اجرای واقعی اکشن‌ها (۱۴ نوع) | کامل | src/lib/server-ai.ts executeChatActions، src/lib/ai/action-schema.ts |
| عامل: خلاصهٔ مالی از چت | کامل (این اجرا) | src/lib/finance/summary.ts، روتین قطعی router.ts |
| عامل: پیش‌نویس پیام بدون ارسال | کامل (این اجرا) | server-ai.ts case draft_message |
| عامل: یادآور متصل به سررسید | کامل (این اجرا) | add_task.remindBeforeMin + reminderAtFromDue |
| گارد ضد-ادعای کاذب مدل | کامل (این اجرا) | applyMissionGuard (F-AG3) |
| صوت: گفتار→متن | کامل (وب + اندروید) | src/lib/voice/speech.ts، android VoiceHelper.java |
| صوت: پاسخ گفتاری | کامل | speechSynthesis + TTS بومی؛ تنظیم voiceReplies |
| Wake-word | نیست | — (محدودیت سندی مستند) |
| وظایف/زیرکار/تکرارشونده | کامل | src/lib/server-tasks.ts |
| تقویم شمسی+میلادی+دوگانه | کامل | src/lib/persian-date.ts (۳۵۸ خط، اصلاح کبیسه ۱۴۰۳) |
| یادآور و اعلان | کامل (وب) + کد اندروید | src/lib/reminders/scheduler.ts، ReminderAlarms.java |
| مالی چندحسابی + بودجه | کامل | src/lib/finance/*، /api/finance/* |
| تومان/ریال + پارس پیامک بانکی | کامل (۲۰ بانک، رضایت دومرحله‌ای) | src/lib/sms/parser.ts (B-1/B-2 تست شده) |
| خروجی CSV/XLS/JSON/TXT | کامل | /api/finance/export |
| کاربران/نقش‌ها/جلسه امن | کامل | src/lib/auth.ts (scrypt، توکن هش‌شده) |
| i18n فارسی/انگلیسی RTL/LTR | کامل | src/i18n/ (fa.ts/en.ts) |
| تم‌ها + Ambient | کامل (۹ تم + موتور محیطی) | src/lib/ambient/، src/styles/themes.css |
| Web Push | نیست | docs/REMINDERS_PLATFORMS.md |
EOF

# ── 07: گزارش ممیزی ──
cat > "$ROOT/07_AUDIT_REPORT/AUDIT_REPORT_FA.md" << EOF
# گزارش ممیزی جامع مأموریت نهایی — $TODAY
**commit ممیزی‌شده**: $HASH | روش: مطالعهٔ مستقیم کد + اجرای واقعی (نه اتکا به گزارش‌های قبلی)
## یافته‌های کلیدی
- چرخهٔ عامل واقعی وجود داشت (پروتکل JSON-action با نوشتن واقعی DB و لاگ idempotent) اما ۳ شکاف داشت: اقدام مالی، پیش‌نویس پیام، یادآور خودکار رویداد — هر سه در همین مأموریت پیاده شد (کامیت‌های F-AG1..3).
- آزمون زندهٔ ۵ سناریو یک نقص واقعی را نشان داد: مدل گاهی موفقیت را در reply «ادعا» می‌کند ولی اکشن نمی‌فرستد (S3 حتی JSON برنمی‌گرداند) → گارد پس از اجرا (applyMissionGuard) با فالبک قطعی بسته شد؛ سناریوها اکنون ۵/۵ با اثر واقعی DB.
- باگ نقش owner در seed (USER به‌جای OWNER) — کشف با E2E، اصلاح شد.
- باگ مسیر download در standalone (chdir) — قبلاً اصلاح (RAHYAR_DOWNLOAD_DIR).
- ریگرسیون بیلد fresh-cache (turbopackIgnore) — اصلاح شد.
- wipe پلتفرم: artifacts/vault/download از بین رفتند؛ DB از نو seed و شواهد از نو تولید شد — همهٔ شواهد فعلی تازه و بازتولیدپذیرند.
## صوت
STT (Web Speech + بومی اندروید) و TTS کامل؛ wake-word نه (مستند). در سندباکس بدون میکروفون، آزمون زندهٔ STT ممکن نبود — صریحاً ثبت می‌شود.
EOF

# ── 08: امنیت ──
cat > "$ROOT/08_SECURITY_REPORT/SECURITY_STATUS_FA.md" << EOF
# وضعیت امنیتی — $TODAY (commit $HASH)
- C1..C10 رجیستر کامل: LOCAL_CLEAN / BACKUP_VERIFIED / STRUCTURALLY_UNPUBLISHABLE (جزئیات در گزارش قبلی R2 که مبنای همین نسخه است).
- این بسته: هیچ رمز/توکن/کلیدی ندارد (اسکن secret پیش از بسته‌بندی انجام شد — scripts/tests/run-p06r-secret-tests.sh ALL-PASS).
- CSP با nonce + strict-dynamic؛ frame-ancestors فقط دامنه‌های رسمی پنل؛ گاردهای عاملیت (حذف/فراموشی با فعل صریح)؛ سقف نرخ روی همهٔ APIها؛ پارس پیامک با رضایت دومرحله‌ای.
- توضیح صادقانه: رمز keystore در wipe پلتفرم از دست رفت — سرنخ بازسازی: کلید تازه بسازید (T1–T7 fail-closed از env).
- حساب owner نمایشی با رمز موقت در پیام تحویل — بلافاصله عوض شود.
EOF

# ── 09: آزمون‌ها ──
cat > "$ROOT/09_TEST_RESULTS/TEST_RESULTS_FA.md" << EOF
# نتایج آزمون روی commit تحویلی $HASH ($TODAY)
| آزمون | نتیجه |
|---|---|
| Typecheck (tsc --noEmit) | PASS — صفر خطا |
| Lint (eslint src) | PASS — صفر خطا |
| Unit (bun test) | **۴۷۶/۴۷۶** (۱۵۲۳ expect، ۳۱ فایل) — صفر skip |
| Production build (next build) | PASS |
| Secret tests (T1–T7 + G-C*) | ALL-PASS |
| E2E مرورگر (grand-e2e) | **۱۱/۱۱ PASS — صفر خطای کنسول** (axe: صفر critical/serious) |
| ۵ سناریوی الزامی مأموریت (زنده، اثر واقعی DB) | **۵/۵ PASS** — یادآور ۰۹:۰۰ تهران، جمع مالی ۳,۸۲۵,۰۰۰ ریال واقعی، plan_day واقعی، پیش‌نویس بدون ارسال، قرار+یادآور متصل ۰۸:۰۰ |
| بازیابی پس از قطع شبکه (درون‌اپ) | PASS (اسکرین‌شات 21/22) |
| فا/ان + RTL/LTR | PASS (E2E بندهای 1 و 8) |
| موبایل/دسکتاپ (overflow) | PASS (۰px در هر دو) |
| Preview زنده | در حال اجرا روی پنل — ورود owner 200، داشبورد 200 |
Skip شده: هیچ. آزمون‌نشده به‌علت محیط: STT زنده (بدون میکروفون سندباکس) — صادقانه ثبت شد.
EOF

# ── README + APK نکته ──
cat > "$ROOT/01_APPLICATION/APP-HOW-TO-RUN.md" << EOF
# اجرای برنامه (وب) — $TODAY
**صادقانه: APK اندروید ساخته نشده** (Android SDK نیست + رمز keystore در wipe پلتفرم از دست رفت). فایل ساختگی تحویل داده نمی‌شود. پلتفرم واقعی محصول = وب؛ باندل استقرار همین پوشه است.
مراحل: unzip rahyar-web-standalone.zip && cd rahyar && ./START-HERE.sh
پیش‌نمایش زندهٔ فعلی از پنل چت قابل مشاهده است (ورود: owner — رمز موقت در پیام چت).
EOF
cat > "$ROOT/README_OWNER_DELIVERY.txt" << EOF
RahyAr — بستهٔ تحویل نهایی مأموریت (ساخته‌شده: $TODAY)
commit سورس: $HASH (branch main)

  01_APPLICATION/        باندل استقرار وب + راهنما (APK: ساخته نشده — دلیل مستند)
  02_FULL_SOURCE_ZIP/    سورس کامل ZIP
  03_COMPLETE_SOURCE_TEXT/ کل سورس در یک فایل متنی (پوشش ۰ جاافتاده)
  04_SCREENSHOTS/        ۲۲ اسکرین‌شات واقعی از نسخهٔ در حال اجرا + manifest
  05_VIDEO/              ویدئوی پیوسته ۶۱ ثانیه (ورود→چت→۳ دموی عامل→نماهای اپ→fa/en→موبایل→قطع/بازیابی شبکه)
  06_DOCUMENTATION/      نصب، محدودیت‌های صادقانه، ماتریس قابلیت‌ها
  07_AUDIT_REPORT/       گزارش ممیزی جامع
  08_SECURITY_REPORT/    وضعیت امنیتی C1..C10
  09_TEST_RESULTS/       نتایج کامل آزمون‌ها

راستی‌آزمایی: SHA256SUMS.txt → sha256sum -c SHA256SUMS.txt
EOF

# ── SHA256SUMS ──
cd "$ROOT" && python3 - << PYEOF
import hashlib, os
lines = []
for root, dirs, files in os.walk('.'):
    dirs.sort()
    for f in sorted(files):
        p = os.path.join(root, f)
        rel = os.path.relpath(p, '.')
        if rel == 'SHA256SUMS.txt':
            continue
        h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        lines.append(f"{h}  {rel}")
open('SHA256SUMS.txt', 'w').write('\n'.join(lines) + '\n')
print('checksums:', len(lines))
PYEOF
sha256sum -c SHA256SUMS.txt --quiet && echo "INTEGRITY: ALL OK"
cd /home/z/my-project && zip -qr download/RahyAr_FINAL_OWNER_DELIVERY.zip download/RahyAr_FINAL_OWNER_DELIVERY && (cd download/RahyAr_FINAL_OWNER_DELIVERY && unzip -tq ../RahyAr_FINAL_OWNER_DELIVERY.zip > /dev/null && echo "ZIP: OK") && du -sh download/RahyAr_FINAL_OWNER_DELIVERY download/RahyAr_FINAL_OWNER_DELIVERY.zip