#!/usr/bin/env bash
# V1 delivery package — APKs + reports + evidence + source + SHA256SUMS
set -uo pipefail
cd /home/z/my-project
D=download/RahyAr-V1
HEAD=$(git rev-parse HEAD)
mkdir -p "$D/apks" "$D/reports" "$D/evidence/shots"
echo "head=$HEAD" > "$D/SOURCE-HEAD.txt"

# 1) source zip from git archive (same HEAD)
git archive --format=zip -o "$D/RahyAr-V1-Complete-Source.zip" HEAD
echo "source-zip: $(wc -c < "$D/RahyAr-V1-Complete-Source.zip") bytes"

# 2) APKs (from verified build outputs)
cp artifacts/logs/f8/apk/Rahyar-*.apk "$D/apks/"

# 3) reports
cp docs/audit/VOICE_BASELINE_AUDIT.md docs/audit/VOICE_ARCHITECTURE.md \
   docs/audit/VOICE_TEST_REPORT_FA_EN.md docs/audit/VOICE_SECURITY_PERMISSIONS.md \
   docs/audit/VOICE_QA_INDEPENDENT.md docs/audit/VOICE_OWNER_GUIDE.md "$D/reports/"

# 4) evidence — logs + shots + video (canary hygiene like F7)
cp artifacts/logs/f8/jvm-tests-v1b.log artifacts/logs/f8/unit-tests-v1.log \
   artifacts/logs/f8/lint.log artifacts/logs/f8/voice-agent-scenarios.log \
   artifacts/logs/f8/build-v1.log "$D/evidence/" 2>/dev/null || true
cp artifacts/logs/f8/apk/apk-inspection.txt artifacts/logs/f8/apk/reproducibility.txt "$D/evidence/" 2>/dev/null || true
cp artifacts/logs/f8/shots/*.png "$D/evidence/shots/" 2>/dev/null || true
cp artifacts/logs/f8/v1-web-run.webm "$D/evidence/" 2>/dev/null || true
# canary scrub (defensive — value was synthetic)
grep -rl "F8-CANARY\|F6-CANARY\|LEAKCANARY" "$D/evidence" 2>/dev/null | while read -r f; do
  sed -i 's/sk-F8-CANARY-[0-9]*/sk-F8-C/g; s/F8-CANARY-7710/F8-C-7710/g; s/F6-CANARY/F8-C/g; s/LEAKCANARY/LEAKC/g' "$f"; done

# 5) blocked list
cat > "$D/BLOCKED.md" <<'EOF'
# V1 — فهرست موارد BLOCKED (صادقانه، با مانع دقیق)

| # | مورد | مانع | مسیر حل |
|---|---|---|---|
| 1 | صوت واقعی روی دستگاه: STT fa/en، TTS fa/en، میکروفون، مکالمهٔ پیوسته، بَرج-این | سندباکس بدون دستگاه فیزیکی، بدون adb، بدون /dev/kvm (بازبینی 2026-11-08) | مالک جدول ۲۰-مرحله‌ای را با APK v2.4.0 اجرا کند (VOICE_TEST_REPORT_FA_EN.md §۴) |
| 2 | Wake Word در آرام/پرنویز + FP/FN + باتری + reboot | همان مانع ۱ | همان |
| 3 | لغو مجوز میکروفون از Settings روی دستگاه | همان مانع ۱ | همان |
| 4 | Logcat واقعی و ویدئوی اجرای اندروید | همان مانع ۱ | هنگام آزمون مالک ثبت شود |
| 5 | نصب APK روی گوشی (اولین اجرا) | همان مانع ۱ | راهنمای مالک §الف |
| 6 | ارتقای درجا از APKهای F7 (v2.3.0) | گواهی F7 با بازیافت سندباکس از دست رفت (خارج از Git بود)؛ v2.4.0 با گواهی جدید V1 امضا شده | نصب تازه پس از حذف نسخهٔ قبلی؛ اگر گواهی F7 نزد مالک پشتیبان است، با همان keystore.properties می‌توان rebuild بایت‌معادل-گواهی انجام داد |
| 7 | TTS ابری با کیفیت بالاتر (اختیاری) | نیاز به کلید/هزینه/ارسال صدا به بیرون — تصمیم مالک | در صورت تأیید مالک به‌صورت ماژول اختیاری با اعلام هزینه/حریم خصوصی |
EOF

# 6) SHA256SUMS
cd "$D" && sha256sum RahyAr-V1-Complete-Source.zip apks/*.apk BLOCKED.md SOURCE-HEAD.txt > SHA256SUMS.txt
find transfer -type f | sort | while read -r f; do sha256sum "$f"; done >> SHA256SUMS.txt
find evidence reports -type f | sort | while read -r f; do sha256sum "$f"; done >> SHA256SUMS.txt
echo "===== PACKAGE CONTENTS ====="
ls -la "$D" "$D/apks" "$D/reports" | head -40
echo "===== SHA256SUMS (head) ====="
head -12 SHA256SUMS.txt
echo "total-entries=$(wc -l < SHA256SUMS.txt)"
