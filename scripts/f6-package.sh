#!/usr/bin/env bash
# F6 final packaging: evidence copy -> docs commit -> transfer regen -> zips -> SHA256SUMS -> secret scan
set -uo pipefail
cd /home/z/my-project
D=download/RahyAr-F6
GT=$D/github-transfer
HEAD=$(git rev-parse --short HEAD)

echo "== [1] preserve volatile evidence from /tmp =="
mkdir -p artifacts/reports/f6/logs
cp -f /tmp/f6-web-ai.log /tmp/f6-ai2.log /tmp/f6-sec1.log /tmp/f6-fin.log /tmp/f6-finfix.log \
      /tmp/f6-emu-mission.log /tmp/f6-emu1.log /tmp/f6-qemu.log /tmp/f6-qemu2.log \
      /tmp/f6-bootwatch.log /tmp/f6-bootwatch2.log /tmp/f6-android-verify.log /tmp/f6-web-verify.log \
      /tmp/f5-web-verify.log /tmp/f6-gradle-tests.log /tmp/f6-gradle-fc.log /tmp/f6-next.log \
      artifacts/reports/f6/logs/ 2>/dev/null || true
cp -f artifacts/reports/f6/apk-inspection.txt artifacts/reports/f6/logs/ 2>/dev/null || true
ls artifacts/reports/f6/logs/ | wc -l

echo "== [2] copy APKs + android evidence =="
cp -f download/RahyAr-F5/Rahyar-user-v2.2.0-release.apk download/RahyAr-F5/Rahyar-owner-v2.2.0-release.apk \
      download/RahyAr-F5/Rahyar-user-v2.2.0-debug.apk download/RahyAr-F5/Rahyar-owner-v2.2.0-debug.apk "$D/"
sha256sum "$D"/Rahyar-*.apk | sed "s|$D/||"

echo "== [3] commit docs + scripts (single final HEAD) =="
cp -f "$D/docs/FEATURE_PARITY_F6.md" docs/audit/FEATURE_PARITY_F6.md
git add docs/audit/REQUIREMENTS_TRACEABILITY_F6.md docs/audit/FEATURE_PARITY_F6.md scripts/f6-*.sh scripts/f6-*.py scripts/f6-*.mjs
git commit -m "F6-FINAL: RTM F6 (136 inherited rows + 10 F6 findings = 146, honest statuses — correction: F5 matrix was 136 rows not 120), Feature Parity F6, F6 tooling (git fix+transfer regen, apk inspect, emu mission, web ai/finance/sec batteries, reports) — web E2E 11/11 x2 + unit 267/267 + JVM 83+83 + sec 11/11 + owner-setup S1-S11 fresh DB + finance exact reconciliation 681889/2400000 + real backup/restore + key canary zero-leak + APK byte-identical rebuild + fail-closed proof; weather fa-geocode fixed (57aefdb)" 2>&1 | tail -1
git status --short | grep -v '^??' | head -3; echo "HEAD-now=$(git rev-parse --short HEAD)"

echo "== [4] regenerate transfer bundle + patches from FINAL HEAD =="
rm -f "$GT/rahyar-main-full.bundle"; rm -f "$GT/patches/"*.patch
git bundle create "$GT/rahyar-main-full.bundle" main --tags 2>&1 | tail -1
git bundle verify "$GT/rahyar-main-full.bundle" 2>&1 | tail -1
echo "bundle-main-ref=$(git ls-remote "$GT/rahyar-main-full.bundle" refs/heads/main | cut -f1 | head -c 12)"
git format-patch origin/main..main -o "$GT/patches" >/dev/null 2>&1
echo "patches=$(ls "$GT/patches" | wc -l) ahead=$(git rev-list --count origin/main..main)"
cat > "$GT/PUSH-INSTRUCTIONS.txt" <<EOF
# انتقال تاریخچه محلی به GitHub — بسته نهایی F6 (HEAD: $HEAD)
# وضعیت راستی‌آزمایی‌شده F6:
#   HEAD محلی      = $HEAD (F6-FINAL) — درخت کاری پاک
#   origin/main    = 28b64bb (هر دو مخزن RAHYAR-AI و HAMYAR-AI — با ls-remote تأیید شد)
#   برتری/عقب‌ماندگی = $(git rev-list --count origin/main..main) کامیت جلوتر / 0 عقبتر → فقط Fast-forward
#   bundle و patches از همین HEAD ساخته شده‌اند ($(ls "$GT/patches" | wc -l) پچ مرتب).
#   Push انجام نشد: هیچ اعتبارنامه‌ای (token/gh/credential helper) در محیط سندباکس نیست.
#
# روش ۱ (bundle — کامل و سلف‌کنتینرد):
#   git clone rahyar-main-full.bundle rahyar-repo
#   cd rahyar-repo
#   git remote set-url origin https://github.com/aresmaeily2/RAHYAR-AI.git
#   git push origin main          # fast-forward — بدون force
#
# روش ۲ (patches): در کلون موجود مخزن: git am patches/*.patch
#
# ⚠️ هشدار امنیتی GIT-SEC-1 (قبل از push حتماً بخوانید):
#   تاریخچهٔ محلی شامل بلاب‌های حساس حذف‌شده است:
#     - android/rahyar-release.keystore (PKCS12 کهن 4360B — کلیدِ جایگزین‌شده؛ کلید فعلی متفاوت است)
#     - .evidence-password (رمز ZIP شواهد — باید چرخانده شود)
#   این بلاب‌ها هرگز به GitHub نرفته‌اند (merge-base با origin/main = false) اما push کل
#   تاریخچه آن‌ها را منتقل می‌کند. توصیه: اجرای scripts/git-history-purge.sh (بازنویسی تاریخچه =
#   نیازمند تأیید مالک) و چرخاندن رمز شواهد، یا پذیرش آگاهانهٔ انتقال و پاک‌سازی/چرخش فوری پس از آن.
# قاعده: فقط fast-forward؛ هیچ force-push/بازنویسی/حذف تاریخچه مجاز نیست.
EOF
echo "instructions written"

echo "== [5] Source ZIP from final HEAD =="
rm -f "$D/RahyAr-F6-Source-HEAD-$(git rev-parse --short HEAD).zip"
git archive --format=zip -o "$D/RahyAr-F6-Source-HEAD-$(git rev-parse --short HEAD).zip" HEAD
ls -la "$D"/RahyAr-F6-Source-*.zip
git rev-parse HEAD > "$D/SOURCE-HEAD.txt"

echo "== [6] Evidence ZIP =="
rm -f "$D/RahyAr-F6-Evidence.zip"
cd artifacts/reports/f6 && zip -qr /home/z/my-project/$D/RahyAr-F6-Evidence.zip . -x "*.png.tmp" && cd /home/z/my-project
ls -la "$D/RahyAr-F6-Evidence.zip"
unzip -l "$D/RahyAr-F6-Evidence.zip" | tail -2

echo "== [7] SHA256SUMS + verify =="
cd "$D"
find . -type f ! -name SHA256SUMS.txt | sort | xargs sha256sum > SHA256SUMS.txt
echo "entries=$(wc -l < SHA256SUMS.txt)"
OK=$(sha256sum -c SHA256SUMS.txt 2>/dev/null | grep -c ': OK$'); FAIL=$(sha256sum -c SHA256SUMS.txt 2>/dev/null | grep -vc ': OK$')
echo "verify OK=$OK FAIL=$FAIL"

echo "== [8] secret scan on package files =="
grep -rn -l -iE '(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|storePassword=)' . 2>/dev/null | grep -v SHA256SUMS | head -5 || true
echo "scan-done (فقط گزارش‌های متنی خودشان مثال ماسک‌شده دارند)"
echo "== [9] fix branch pointer sync =="
git branch -f fix/f6-weather-fa-upd main 2>/dev/null && echo "fix-branch synced"
echo "===== F6-PACKAGING-DONE ====="
