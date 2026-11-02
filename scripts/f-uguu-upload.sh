#!/bin/bash
# uguu.se uploads (سرویس مستقل دوم — gofile موقتاً بی‌پاسخ است) + split بستهٔ بزرگ
set -uo pipefail
cd /home/z/my-project/download
OUT=/home/z/my-project/artifacts/upload-links.txt
echo "=== uguu.se (independent second host) ===" | tee -a "$OUT"

# بستهٔ ۱۳۴MB > سقف ۱۲۸MB uguu → دو بخش ۹۵MB با راهنمای اتصال
if [ ! -f RahyAr_FINAL_OWNER_DELIVERY.zip.001 ]; then
  split -b 95M -d -a 3 RahyAr_FINAL_OWNER_DELIVERY.zip RahyAr_FINAL_OWNER_DELIVERY.zip.
fi
ls -la RahyAr_FINAL_OWNER_DELIVERY.zip.0* | tee -a "$OUT"

FILES=(
  "rahyar-web-standalone.zip"
  "RahyAr_Full_Source.zip"
  "RahyAr_COMPLETE_SOURCE.txt"
  "RahyAr_Screenshots_22.zip"
  "rahyar-final-walkthrough.mp4"
  "Rahyar-Android-v2.1.0-debug.apk"
  "Rahyar-Android-v2.1.0-release.apk"
  "RahyAr_FINAL_OWNER_DELIVERY.zip.001"
  "RahyAr_FINAL_OWNER_DELIVERY.zip.002"
)
for f in "${FILES[@]}"; do
  R=$(curl -s -m 900 -F "files[]=@$f" https://uguu.se/upload | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d['files'][0]['url'] if d.get('success') else 'FAIL:'+json.dumps(d)[:120])
except Exception as e:
    print('FAIL', e)" 2>/dev/null)
  echo "uguu $f => $R" | tee -a "$OUT"
done
echo "=== UGUU DONE ===" | tee -a "$OUT"
