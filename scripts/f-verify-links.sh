#!/bin/bash
# راستی‌آزمایی مستقل نهایی — دانلود واقعی ناشناس + بایت‌مقایسه + ZIP/TXT/ویدئو
set -uo pipefail
cd /home/z/my-project/download
V=/home/z/my-project/artifacts/verify-links.txt
: > "$V"

check_zip() { unzip -tq "$2" > /dev/null 2>&1 && echo "$1 zip-integrity: OK" || echo "$1 zip-integrity: FAIL"; }
check_txt() {
  local f=$1 orig=$2
  local ok=$(python3 -c "
a=open('$f','rb').read(); b=open('$orig','rb').read()
print('IDENTICAL' if a==b else f'DIFF {len(a)} vs {len(b)}')")
  echo "txt-check: first=$(head -2 "$f" | tail -1 | head -c 40) | compare=$ok"
}

echo "════ tmpfiles.org — real anonymous downloads + byte comparison ════" | tee -a "$V"
declare -A MAP=(
  ["bundle"]="wsATd12Hxfat/rahyar-web-standalone.zip|rahyar-web-standalone.zip"
  ["srczip"]="wbAtdn2pxpYd/rahyar_full_source.zip|RahyAr_Full_Source.zip"
  ["srctxt"]="w3AVdK2oxPiB/rahyar_complete_source.txt|RahyAr_COMPLETE_SOURCE.txt"
  ["shots"]="wmAGdw27xB2P/rahyar_screenshots_22.zip|RahyAr_Screenshots_22.zip"
  ["video"]="w9AfdH26xf46/rahyar-final-walkthrough.mp4|rahyar-final-walkthrough.mp4"
  ["apkdbg"]="w1AOdP2txLPv/rahyar-android-v2.1.0-debug.apk|Rahyar-Android-v2.1.0-debug.apk"
  ["apkrel"]="wvA3dn2gxHEf/rahyar-android-v2.1.0-release.apk|Rahyar-Android-v2.1.0-release.apk"
)
for k in bundle srczip srctxt shots video apkdbg apkrel; do
  IFS='|' read -r path orig <<< "${MAP[$k]}"
  WRAP=$(curl -sL -m 90 "https://tmpfiles.org/dl/$path" 2>/dev/null)
  DLURL=$(echo "$WRAP" | grep -oE 'https://tmpfiles\.org/dl/[0-9]+\.[a-f0-9]+/[^"]+' | head -1)
  if [ -z "$DLURL" ]; then echo "[$k] no-direct-link" | tee -a "$V"; continue; fi
  curl -sL -m 280 "$DLURL" -o "/tmp/verify-$k" 2>/dev/null
  ls=$(stat -c%s "/tmp/verify-$k" 2>/dev/null || echo 0); osz=$(stat -c%s "$orig" 2>/dev/null || echo 0)
  if [ "$ls" = "$osz" ] && [ "$ls" != "0" ]; then
    echo "[$k] size MATCH: $ls bytes" | tee -a "$V"
    case $k in
      bundle|srczip|shots) check_zip "$k" "/tmp/verify-$k" | tee -a "$V";;
      srctxt) check_txt "/tmp/verify-$k" "$orig" | tee -a "$V";;
      video) ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "/tmp/verify-$k" | xargs echo "[$k] video duration(s):" | tee -a "$V";;
      apkdbg|apkrel) unzip -tq "/tmp/verify-$k" > /dev/null 2>&1 && echo "[$k] apk-zip-structure: OK" | tee -a "$V";;
    esac
  else
    echo "[$k] SIZE MISMATCH: got=$ls orig=$osz" | tee -a "$V"
  fi
  rm -f "/tmp/verify-$k"
done

echo "════ uguu.se — third copies ════" | tee -a "$V"
declare -A UMAP=(
  ["u-txt"]="https://d.uguu.se/bmQYlFxH.txt|RahyAr_COMPLETE_SOURCE.txt"
  ["u-vid"]="https://n.uguu.se/suADBnFX.mp4|rahyar-final-walkthrough.mp4"
  ["u-p2"]="https://n.uguu.se/nWveErNg.001|RahyAr_FINAL_OWNER_DELIVERY.zip.001"
)
for k in u-txt u-vid u-p2; do
  IFS='|' read -r url orig <<< "${UMAP[$k]}"
  curl -sL -m 280 "$url" -o "/tmp/verify-$k" 2>/dev/null
  ls=$(stat -c%s "/tmp/verify-$k" 2>/dev/null || echo 0); osz=$(stat -c%s "$orig" 2>/dev/null || echo 0)
  [ "$ls" = "$osz" ] && [ "$ls" != "0" ] && echo "[$k] size MATCH: $ls" | tee -a "$V" || echo "[$k] MISMATCH got=$ls orig=$osz" | tee -a "$V"
  rm -f "/tmp/verify-$k"
done

echo "════ gofile.io — official links, page reachability (retries) ════" | tee -a "$V"
for gid in i8aaEFVr uemMcslo r6HThgZm EwsLEZqv iOdxLP8s J7ShKPHg GEVzFZCc pT2dPHxF; do
  code=000
  for try in 1 2 3; do
    code=$(curl -sL -o /tmp/gp -w "%{http_code}" -m 45 "https://gofile.io/d/$gid" 2>/dev/null)
    [ "$code" = "200" ] && break
    sleep 3
  done
  echo "gofile/$gid: HTTP $code (tries=$try)" | tee -a "$V"
done
echo "════ VERIFY DONE ════" | tee -a "$V"
