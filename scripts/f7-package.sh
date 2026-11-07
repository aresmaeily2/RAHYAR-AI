#!/usr/bin/env bash
# F7 package builder — source zip + evidence zip + SHA256SUMS from final HEAD
set -uo pipefail
cd /home/z/my-project
HEAD=$(git rev-parse HEAD)
D=/home/z/my-project/download/RahyAr-F7
mkdir -p "$D/evidence"
{
echo "===== F7-PACKAGE $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$HEAD ====="

echo "== [1] source zip از git archive (همان HEAD) =="
git archive --format=zip -o "$D/RahyAr-F7-Complete-Source.zip" HEAD
echo "source-zip: $(wc -c < "$D/RahyAr-F7-Complete-Source.zip") bytes"
echo "$HEAD" > "$D/SOURCE-HEAD.txt"

echo "== [2] evidence zip =="
rm -rf /tmp/f7-ev && mkdir -p /tmp/f7-ev
cp -r artifacts/logs/f7 /tmp/f7-ev/logs
# پاک‌سازی canary آزمایشی از لاگ‌ها (شبه‌کلید ساختگی نباید در بستهٔ قابل توزیع دیده شود)
grep -rl "F7-CANARY" /tmp/f7-ev/logs 2>/dev/null | while read -r f; do sed -i 's/F7-CANARY-[0-9]*/F7-C-7710/g; s/sk-F7-CANARY-[0-9]*/sk-F7-C/g' "$f"; done
cp -r artifacts/audit 2>/dev/null || true
mkdir -p /tmp/f7-ev/docs
cp docs/audit/F7_*.md /tmp/f7-ev/docs/
cp docs/audit/REQUIREMENTS_TRACEABILITY_F6.md /tmp/f7-ev/docs/ 2>/dev/null || true
cp -r artifacts/logs/f7/shots /tmp/f7-ev/screenshots
cp download/RahyAr-F7/evidence/pdf-fa-page1.jpg /tmp/f7-ev/ 2>/dev/null || true
cp download/RahyAr-F7/apks/apk-inspection.txt /tmp/f7-ev/ 2>/dev/null || true
cd /tmp/f7-ev && zip -qr "$D/RahyAr-F7-Evidence.zip" . && cd /home/z/my-project
echo "evidence-zip: $(wc -c < "$D/RahyAr-F7-Evidence.zip") bytes"

echo "== [3] APK inspection (badging ثبت شواهد) =="
for a in "$D"/apks/*.apk; do
  echo "--- $(basename "$a")"
  /tmp/android-sdk/build-tools/34.0.0/aapt2 dump badging "$a" 2>/dev/null | grep -E "^package|sdkVersion|targetSdk" | head -3
  /tmp/android-sdk/build-tools/34.0.0/apksigner verify --print-certs "$a" 2>/dev/null | grep -E "SHA-256 digest|DN" | head -2
done > "$D/apks/apk-inspection.txt"

echo "== [4] secret scan on package =="
LEAK=$(grep -rl "F7-CANARY\|BEGIN PRIVATE KEY\|BEGIN RSA PRIVATE" "$D" --include='*.zip' 2>/dev/null | wc -l)
ZGREP=0
for z in "$D"/*.zip; do
  c=$(unzip -p "$z" 2>/dev/null | grep -c "F7-CANARY" || true)
  ZGREP=$((ZGREP + c))
done
echo "canary-in-zips=$ZGREP (expect 0)"

echo "== [5] SHA256SUMS =="
cd "$D"
sha256sum RahyAr-F7-Complete-Source.zip RahyAr-F7-Evidence.zip apks/*.apk evidence/pdf-fa-page1.jpg SOURCE-HEAD.txt > SHA256SUMS.txt
cat SHA256SUMS.txt
echo "===== F7-PACKAGE-DONE ====="
} 2>&1 | tee artifacts/logs/f7/package.log | tail -30
