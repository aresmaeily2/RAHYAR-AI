#!/bin/bash
# gofile retry — server lookup با فالبک به endpoint مستقیم
set -uo pipefail
cd /home/z/my-project/download
OUT=/home/z/my-project/artifacts/upload-links.txt
grep -v "gofile" "$OUT" > /tmp/ul.tmp 2>/dev/null || cp "$OUT" /tmp/ul.tmp
mv /tmp/ul.tmp "$OUT"
echo "=== gofile.io (retry) ===" | tee -a "$OUT"

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

SRV=$(curl -s -m 30 https://api.gofile.io/servers | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['servers'][0]['name'])" 2>/dev/null)
echo "server lookup: '${SRV}'" | tee -a "$OUT"
for f in "${FILES[@]}"; do
  R=""
  if [ -n "$SRV" ]; then
    R=$(curl -s -m 900 -F "file=@$f" "https://${SRV}.gofile.io/contents/uploadfile" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d['data']['downloadPage'] if d.get('status')=='ok' else 'FAIL:'+str(d))
except Exception as e:
    print('FAIL', e)" 2>/dev/null)
  fi
  if [ -z "$R" ] || [[ "$R" == FAIL* ]]; then
    # فالبک: endpoint مستقیم بدون نام سرور
    R=$(curl -s -m 900 -F "file=@$f" "https://api.gofile.io/contents/uploadfile" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d['data']['downloadPage'] if d.get('status')=='ok' else 'FAIL:'+str(d))
except Exception as e:
    print('FAIL', e)" 2>/dev/null)
  fi
  echo "$f => $R" | tee -a "$OUT"
done
echo "=== GOFILE DONE ===" | tee -a "$OUT"
