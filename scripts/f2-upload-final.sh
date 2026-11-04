#!/bin/bash
# F2-UPLOAD-FINAL: بارگذاری تحویل نهایی روی gofile (store3) + tmpfiles و ثبت لینک‌ها
set -uo pipefail
ROOT=/home/z/my-project
OUT=$ROOT/artifacts/delivery-build
LOG=$ROOT/artifacts/reports/upload-links-f2.txt
mkdir -p "$OUT"
: > "$LOG"

FILES=(
  "Rahyar-Android-v2.1.0-debug.apk"
  "Rahyar-Android-v2.1.0-release.apk"
  "RahyAr-Android-CAPABILITY-AUDIT.md"
  "RahyAr-F2-Test-Evidence.zip"
  "RahyAr_F2_Source.zip"
  "RahyAr_F2_COMPLETE_SOURCE.txt"
)

gf() {
  local f="$1"
  local r
  r=$(curl -s -m 1800 -F "file=@$OUT/$f" "https://store3.gofile.io/contents/uploadfile" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d['data']['downloadPage'] if d.get('status')=='ok' else 'FAIL:'+json.dumps(d)[:150])
except Exception as e:
    print('FAIL',e)")
  echo "gofile $f => $r" | tee -a "$LOG"
}

tf() {
  local f="$1"
  local sz; sz=$(stat -c%s "$OUT/$f")
  if [ "$sz" -gt 104857600 ]; then echo "tmpfiles SKIP (>100MB) $f" | tee -a "$LOG"; return; fi
  local r
  r=$(curl -s -m 900 -F "file=@$OUT/$f" "https://tmpfiles.org/api/v1/upload" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    u=(d.get('data',{}).get('url') or '') if d.get('status')=='success' else ''
    print(u if u else 'FAIL:'+json.dumps(d)[:150])
except Exception as e:
    print('FAIL',e)")
  echo "tmpfiles $f => $r" | tee -a "$LOG"
}

for f in "${FILES[@]}"; do
  [ -s "$OUT/$f" ] || { echo "MISSING $f" | tee -a "$LOG"; continue; }
  gf "$f"
  tf "$f"
done
echo "=== UPLOAD DONE ===" | tee -a "$LOG"
