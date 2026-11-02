#!/bin/bash
# راستی‌آزمایی مستقل لینک‌های عمومی — دانلود واقعی + مقایسه اندازه/بایت + سلامت محتوا
set -uo pipefail
cd /home/z/my-project/download
V=/home/z/my-project/artifacts/verify-links.txt
: > "$V"

check_zip() { unzip -tq "$2" > /dev/null 2>&1 && echo "$1 zip-integrity: OK" || echo "$1 zip-integrity: FAIL"; }
check_txt() {
  local f=$1 orig=$2
  local l1=$(head -2 "$f" | tail -1) lmid=$(sed -n "$(( $(wc -l < "$f") / 2 ))p" "$f" | head -c 60) ll=$(tail -3 "$f" | head -1 | head -c 60)
  local ok=$(python3 -c "
a=open('$f','rb').read(); b=open('$orig','rb').read()
print('IDENTICAL' if a==b else f'DIFF {len(a)} vs {len(b)}')")
  echo "txt-check($f): first=${l1:0:40} mid=${lmid:0:30} tail=${ll:0:30} compare=$ok"
}

echo "════ tmpfiles.org — real anonymous downloads + byte comparison ════" | tee -a "$V"
declare -A MAP=(
  ["bundle"]="wlA2dQOh0peK/rahyar-web-standalone.zip|/home/z/my-project/download/rahyar-web-standalone.zip"
  ["srczip"]="wIAQdUOO0egq/rahyar_full_source.zip|/home/z/my-project/download/RahyAr_Full_Source.zip"
  ["srctxt"]="wUAgd0Ok0DKm/rahyar_complete_source.txt|/home/z/my-project/download/RahyAr_COMPLETE_SOURCE.txt"
  ["shots"]="wBAfdzO00CUR/rahyar_screenshots_22.zip|/home/z/my-project/download/RahyAr_Screenshots_22.zip"
  ["video"]="wYA3doOu0kTi/rahyar-final-walkthrough.mp4|/home/z/my-project/download/rahyar-final-walkthrough.mp4"
)
for k in bundle srczip srctxt shots video; do
  IFS='|' read -r path orig <<< "${MAP[$k]}"
  # صفحهٔ wrapper → استخراج لینک مستقیم توکن‌دار
  WRAP=$(curl -sL -m 60 "https://tmpfiles.org/dl/$path" 2>/dev/null)
  DLURL=$(echo "$WRAP" | grep -oE 'https://tmpfiles\.org/dl/[0-9]+\.[a-f0-9]+/[^"]+' | head -1)
  if [ -z "$DLURL" ]; then echo "[$k] no-direct-link (page changed?)"; continue; fi
  curl -sL -m 280 "$DLURL" -o "/tmp/verify-$k" 2>/dev/null
  local_size=$(stat -c%s "/tmp/verify-$k" 2>/dev/null || echo 0)
  orig_size=$(stat -c%s "$orig" 2>/dev/null || echo 0)
  if [ "$local_size" = "$orig_size" ] && [ "$local_size" != "0" ]; then
    echo "[$k] size MATCH: $local_size bytes" | tee -a "$V"
    case $k in
      bundle|srczip|shots) check_zip "$k" "/tmp/verify-$k" | tee -a "$V";;
      srctxt) check_txt "/tmp/verify-$k" "$orig" | tee -a "$V";;
      video) ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "/tmp/verify-$k" | xargs echo "[$k] video duration(s):" | tee -a "$V";;
    esac
  else
    echo "[$k] SIZE MISMATCH: got=$local_size orig=$orig_size" | tee -a "$V"
  fi
  rm -f "/tmp/verify-$k"
done

echo "════ gofile.io — official links, page reachability ════" | tee -a "$V"
declare -A GMAP=(
  ["pkg"]="IzmbtgYx" ["bundle"]="1HRaf6ly" ["srczip"]="4HjOOV2M"
  ["srctxt"]="0OmSDgxM" ["shots"]="S7TeVTnx" ["video"]="Gm5fEL2B"
)
for k in pkg bundle srczip srctxt shots video; do
  gid=${GMAP[$k]}
  code=000
  for try in 1 2 3; do
    code=$(curl -sL -o /tmp/gp -w "%{http_code}" -m 45 "https://gofile.io/d/$gid" 2>/dev/null)
    [ "$code" = "200" ] && break
    sleep 4
  done
  hit=$(grep -c "gofile\|download" /tmp/gp 2>/dev/null || echo 0)
  echo "gofile/$k ($gid): HTTP $code, app-page-hits=$hit (tries=$try)" | tee -a "$V"
done
rm -f /tmp/gp
echo "════ VERIFY DONE ════" | tee -a "$V"
