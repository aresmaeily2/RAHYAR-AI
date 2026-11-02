#!/bin/bash
# uguu round-2 — فایل‌های باقی‌مانده با پسوندهای پذیرفته
set -uo pipefail
cd /home/z/my-project/download
OUT=/home/z/my-project/artifacts/upload-links.txt
echo "=== uguu round-2 ===" | tee -a "$OUT"

up() { # $1 = local file, $2 = upload-name
  R=$(curl -s -m 900 -F "files[]=@$1;filename=$2" https://uguu.se/upload | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d['files'][0]['url'] if d.get('success') else 'FAIL:'+json.dumps(d)[:100])
except Exception as e:
    print('FAIL', e)" 2>/dev/null)
  echo "uguu $1 (as $2) => $R" | tee -a "$OUT"
}

up RahyAr_FINAL_OWNER_DELIVERY.zip.000 RahyAr_FINAL_OWNER_DELIVERY.zip.000
up RahyAr_Screenshots_22.zip RahyAr_Screenshots_22.zip.001
up RahyAr_Full_Source.zip RahyAr_Full_Source.zip.001
up rahyar-web-standalone.zip rahyar-web-standalone.zip.001
up Rahyar-Android-v2.1.0-debug.apk Rahyar-Android-v2.1.0-debug.apk.bin
up Rahyar-Android-v2.1.0-release.apk Rahyar-Android-v2.1.0-release.apk.bin
echo "=== UGUU ROUND-2 DONE ===" | tee -a "$OUT"
