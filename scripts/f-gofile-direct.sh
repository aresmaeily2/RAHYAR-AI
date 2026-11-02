#!/bin/bash
# gofile DIRECT — api.gofile.io از این شبکه مسدود است ولی store3.gofile.io جواب می‌دهد
set -uo pipefail
cd /home/z/my-project/download
OUT=/home/z/my-project/artifacts/upload-links.txt
echo "=== gofile.io (direct store3) ===" | tee -a "$OUT"
FILES=(
  "RahyAr_FINAL_OWNER_DELIVERY.zip"
  "rahyar-web-standalone.zip"
  "RahyAr_Full_Source.zip"
  "RahyAr_COMPLETE_SOURCE.txt"
  "RahyAr_Screenshots_22.zip"
  "rahyar-final-walkthrough.mp4"
  "Rahyar-Android-v2.1.0-debug.apk"
  "Rahyar-Android-v2.1.0-release.apk"
)
for f in "${FILES[@]}"; do
  R=$(curl -s -m 1800 -F "file=@$f" "https://store3.gofile.io/contents/uploadfile" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d['data']['downloadPage'] if d.get('status')=='ok' else 'FAIL:'+json.dumps(d)[:120])
except Exception as e:
    print('FAIL', e)" 2>/dev/null)
  echo "gofile-direct $f => $R" | tee -a "$OUT"
done
echo "=== GOFILE-DIRECT DONE ===" | tee -a "$OUT"
