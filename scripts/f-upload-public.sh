#!/bin/bash
# ─── فاز ۶ مأموریت: بارگذاری عمومی tmpfiles + gofile + راستی‌آزمایی مستقل ──
set -uo pipefail
cd /home/z/my-project/download
OUT=/home/z/my-project/artifacts/upload-links.txt
: > "$OUT"

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

echo "=== tmpfiles.org ===" | tee -a "$OUT"
for f in "${FILES[@]}"; do
  R=$(curl -s -m 240 -F "file=@$f" https://tmpfiles.org/api/v1/upload | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('url','FAIL') if d.get('status')=='success' else 'FAIL')" 2>/dev/null)
  echo "$f => $R" | tee -a "$OUT"
done

echo "=== gofile.io ===" | tee -a "$OUT"
SERVER=$(curl -s -m 30 https://api.gofile.io/servers | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['servers'][0]['name'])" 2>/dev/null)
echo "server: $SERVER" | tee -a "$OUT"
for f in "${FILES[@]}"; do
  R=$(curl -s -m 600 -F "file=@$f" "https://${SERVER}.gofile.io/contents/uploadfile" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d['data']['downloadPage'] if d.get('status')=='ok' else 'FAIL:'+str(d.get('status')))
except Exception as e:
    print('FAIL', e)" 2>/dev/null)
  echo "$f => $R" | tee -a "$OUT"
done

echo "=== DONE ===" | tee -a "$OUT"
cat "$OUT"
