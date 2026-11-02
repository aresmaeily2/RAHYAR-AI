#!/bin/bash
# uguu round-3 — نام‌های تک-پسوندی (.bin) — محتوا بایت‌به‌بایت همان فایل اصلی است
set -uo pipefail
cd /home/z/my-project/download
OUT=/home/z/my-project/artifacts/upload-links.txt
mkdir -p /tmp/uguu-aliases
cp RahyAr_FINAL_OWNER_DELIVERY.zip.000 /tmp/uguu-aliases/RahyAr_FINAL_OWNER_DELIVERY.part1.bin
cp RahyAr_Screenshots_22.zip            /tmp/uguu-aliases/RahyAr_Screenshots_22.bin
cp RahyAr_Full_Source.zip               /tmp/uguu-aliases/RahyAr_Full_Source.bin
cp rahyar-web-standalone.zip            /tmp/uguu-aliases/rahyar-web-standalone.bin
cp Rahyar-Android-v2.1.0-debug.apk      /tmp/uguu-aliases/Rahyar-Android-v2.1.0-debug.bin
cp Rahyar-Android-v2.1.0-release.apk    /tmp/uguu-aliases/Rahyar-Android-v2.1.0-release.bin
echo "=== uguu round-3 (single-ext aliases; content identical) ===" | tee -a "$OUT"
for f in RahyAr_FINAL_OWNER_DELIVERY.part1.bin RahyAr_Screenshots_22.bin RahyAr_Full_Source.bin rahyar-web-standalone.bin Rahyar-Android-v2.1.0-debug.bin Rahyar-Android-v2.1.0-release.bin; do
  R=$(curl -s -m 900 -F "files[]=@/tmp/uguu-aliases/$f" https://uguu.se/upload | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d['files'][0]['url'] if d.get('success') else 'FAIL:'+json.dumps(d)[:100])
except Exception as e:
    print('FAIL', e)" 2>/dev/null)
  echo "uguu $f => $R" | tee -a "$OUT"
done
echo "=== UGUU ROUND-3 DONE ===" | tee -a "$OUT"
