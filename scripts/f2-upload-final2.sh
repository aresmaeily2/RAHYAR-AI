#!/bin/bash
# F2-UPLOAD-FINAL-2: بارگذاری ۹ فایل تحویل نهایی روی tmpfiles + gofile
# خروجی: artifacts/reports/upload-links-final.txt (همهٔ لینک‌ها)
set -u
ROOT=/home/z/my-project
OUT=$ROOT/artifacts/delivery-build
LOG=$ROOT/artifacts/reports/upload-links-final.txt
mkdir -p "$OUT"
: > "$LOG"

FILES=(
  "Rahyar-Android-v2.1.0-debug.apk"
  "Rahyar-Android-v2.1.0-release.apk"
  "RahyAr_Full_Source.zip"
  "RahyAr_COMPLETE_SOURCE.txt"
  "RahyAr-Android-CAPABILITY-AUDIT.md"
  "RahyAr-F2-FINAL-REPORT.md"
  "web-live-fa-en.mp4"
  "emulator-panel-owner-90s.mp4"
  "RahyAr-F2-Test-Evidence.zip"
)

gf() {
  local f="$1"
  # گوفایل: انتخاب سرور فعال سپس بارگذاری
  local server r
  server=$(curl -s -m 30 "https://api.gofile.io/servers" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print((d.get('data',{}).get('servers') or [{}])[0].get('name','store1'))
except Exception:
    print('store1')" 2>/dev/null)
  r=$(curl -s -m 1800 -F "file=@$OUT/$f" "https://${server}.gofile.io/contents/uploadfile" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d['data']['downloadPage'] if d.get('status')=='ok' else 'FAIL:'+json.dumps(d)[:150])
except Exception as e:
    print('FAIL',e)")
  echo "gofile|$f|$r" >> "$LOG"
  echo "gofile $f => $r"
}

tf() {
  local f="$1"
  local sz; sz=$(stat -c%s "$OUT/$f")
  if [ "$sz" -gt 104857600 ]; then echo "tmpfiles SKIP (>100MB) $f" >> "$LOG"; return; fi
  local r
  r=$(curl -s -m 900 -F "file=@$OUT/$f" "https://tmpfiles.org/api/v1/upload" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    u=(d.get('data',{}).get('url') or '') if d.get('status')=='success' else ''
    print(u if u else 'FAIL:'+json.dumps(d)[:150])
except Exception as e:
    print('FAIL',e)")
  echo "tmpfiles|$f|$r" >> "$LOG"
  echo "tmpfiles $f => $r"
}

for f in "${FILES[@]}"; do
  [ -s "$OUT/$f" ] || { echo "MISSING $f" | tee -a "$LOG"; continue; }
  echo "== uploading $f ($(stat -c%s "$OUT/$f") bytes) =="
  gf "$f"
  tf "$f"
done
echo "=== UPLOAD DONE ===" | tee -a "$LOG"
