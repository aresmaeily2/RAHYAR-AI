#!/bin/bash
# راستی‌آزمایی مستقل نهایی — استخراج لینک امضاشده از صفحه + دانلود + مقایسه بایت
set -uo pipefail
V=/home/z/my-project/artifacts/verify-links.txt
: > "$V"

declare -A MAP=(
  ["pkg"]="wuAIdpQq7JgY/rahyar_final_owner_delivery.zip|/home/z/my-project/download/RahyAr_FINAL_OWNER_DELIVERY.zip"
  ["bundle"]="w7A3duQx7dT5/rahyar-web-standalone.zip|/home/z/my-project/download/rahyar-web-standalone.zip"
  ["srczip"]="wUAjd9QQ7doH/rahyar_full_source.zip|/home/z/my-project/download/RahyAr_Full_Source.zip"
  ["srctxt"]="w4A4dUQh7g0V/rahyar_complete_source.txt|/home/z/my-project/download/RahyAr_COMPLETE_SOURCE.txt"
  ["shots"]="wOAedXQ57Bts/rahyar_screenshots_22.zip|/home/z/my-project/download/RahyAr_Screenshots_22.zip"
  ["video"]="wOAwdsQk7Jbj/rahyar-final-walkthrough.mp4|/home/z/my-project/download/rahyar-final-walkthrough.mp4"
)
for k in pkg bundle srczip srctxt shots video; do
  IFS='|' read -r pagepath orig <<< "${MAP[$k]}"
  DL=$(curl -sL -m 60 "https://tmpfiles.org/$pagepath" | rg -o 'https://tmpfiles.org/dl/[^"]*' | head -1)
  if [ -z "$DL" ]; then echo "[$k] NO-DL-LINK (expired?)" | tee -a "$V"; continue; fi
  curl -sL -m 600 "$DL" -o "/tmp/verify-$k"
  got=$(stat -c%s "/tmp/verify-$k" 2>/dev/null || echo 0)
  orig_size=$(stat -c%s "$orig" 2>/dev/null || echo 0)
  if [ "$got" = "$orig_size" ] && [ "$got" != "0" ]; then
    echo "[$k] size MATCH: $got bytes" | tee -a "$V"
    case $k in
      pkg|bundle|srczip|shots) unzip -tq "/tmp/verify-$k" > /dev/null 2>&1 && echo "[$k] zip-integrity: OK" | tee -a "$V" || echo "[$k] zip-integrity: FAIL" | tee -a "$V";;
      srctxt) python3 -c "
a=open('/tmp/verify-$k','rb').read(); b=open('$orig','rb').read()
print('[$k] content:','IDENTICAL' if a==b else 'DIFF')" | tee -a "$V";;
      video) d=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "/tmp/verify-$k" 2>/dev/null); echo "[$k] video duration: $d s" | tee -a "$V";;
    esac
  else
    echo "[$k] SIZE MISMATCH: got=$got orig=$orig_size" | tee -a "$V"
  fi
  rm -f "/tmp/verify-$k"
done
cat "$V"
