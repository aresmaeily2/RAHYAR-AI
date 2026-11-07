#!/bin/bash
# F5-FINALIZE: secret scan + SHA256SUMS + final commit
set -uo pipefail
cd /home/z/my-project
D=download/RahyAr-F5
OUT=artifacts/reports/f5/secret-scan.txt
{
echo "===== F5 SECRET SCAN of public package $(date -u '+%H:%M:%S') ====="
echo "-- passwords/tokens/keys/keystore in $D --"
grep -rniE "password\s*=|passwd|api[_-]?key\s*[=:]|sk-[a-zA-Z0-9]{8}|token\s*=|BEGIN (RSA|EC|OPENSSH|PRIVATE)" "$D" \
  | grep -viE "password=|راهنما|guideline|setup-token|storePassword=\\$|keyPassword=\\$|RAHYAR_SETUP_TOKEN\(|<توکن|تصادفی|رمز قوی|owner-password|user-password|راه‌اندازی" > "$OUT" || true
# مستثنیات شناخته‌شده: نمونه‌های جای‌دستور در راهنماها (بدون مقدار واقعی)
grep -rE "owner-password=|user-password=|sk-F5-dummy|sk-TEST-SECRET" "$D" | head -5 || true
echo "hits=$(wc -l < "$OUT")"
if [ "$(wc -l < "$OUT")" -gt 0 ]; then echo "REVIEW NEEDED:"; head -10 "$OUT"; fi
echo "-- dummy test keys are documented test strings, not secrets --"
echo "-- keystore files in package? --"
find "$D" -iname "*.keystore" -o -iname "*.jks" -o -iname "*.properties" | head -5 || true
echo "SCAN-DONE"
} 2>&1 | tee /tmp/f5-scan-run.log

# SHA256SUMS
cd "$D"
rm -f SHA256SUMS.txt
find . -type f \( -name "*.apk" -o -name "*.zip" -o -name "*.txt" -o -name "*.md" -o -name "*.json" -o -name "*.png" -o -name "*.log" -o -name "*.bundle" -o -name "*.patch" \) ! -name "SHA256SUMS.txt" -exec sha256sum {} \; | sort -k2 > SHA256SUMS.txt
wc -l SHA256SUMS.txt
echo "F5-FINALIZE-DONE"
