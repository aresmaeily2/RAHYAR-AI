#!/bin/bash
# راستی‌آزمایی مستقل لینک‌های عمومی — دانلود واقعی + مقایسه اندازه + سلامت محتوا
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
  echo "txt-check($f): first=$l1 mid=${lmid:0:30}... tail=${ll:0:30} compare=$ok"
}

echo "════ tmpfiles.org — real downloads ════" | tee -a "$V"
declare -A MAP=(
  ["pkg"]="wuAIdpQq7JgY/rahyar_final_owner_delivery.zip|/home/z/my-project/download/RahyAr_FINAL_OWNER_DELIVERY.zip"
  ["bundle"]="w7A3duQx7dT5/rahyar-web-standalone.zip|/home/z/my-project/download/rahyar-web-standalone.zip"
  ["srczip"]="wUAjd9QQ7doH/rahyar_full_source.zip|/home/z/my-project/download/RahyAr_Full_Source.zip"
  ["srctxt"]="w4A4dUQh7g0V/rahyar_complete_source.txt|/home/z/my-project/download/RahyAr_COMPLETE_SOURCE.txt"
  ["shots"]="wOAedXQ57Bts/rahyar_screenshots_22.zip|/home/z/my-project/download/RahyAr_Screenshots_22.zip"
  ["video"]="wOAwdsQk7Jbj/rahyar-final-walkthrough.mp4|/home/z/my-project/download/rahyar-final-walkthrough.mp4"
)
for k in pkg bundle srczip srctxt shots video; do
  IFS='|' read -r path orig <<< "${MAP[$k]}"
  curl -sL -m 300 "https://tmpfiles.org/dl/$path" -o "/tmp/verify-$k" 2>/dev/null
  local_size=$(stat -c%s "/tmp/verify-$k" 2>/dev/null || echo 0)
  orig_size=$(stat -c%s "$orig" 2>/dev/null || echo 0)
  if [ "$local_size" = "$orig_size" ] && [ "$local_size" != "0" ]; then
    echo "[$k] size MATCH: $local_size bytes" | tee -a "$V"
    case $k in
      pkg|bundle|srczip|shots) check_zip "$k" "/tmp/verify-$k" | tee -a "$V";;
      srctxt) check_txt "/tmp/verify-$k" "$orig" | tee -a "$V";;
      video) ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "/tmp/verify-$k" | xargs echo "[$k] video duration:" | tee -a "$V";;
    esac
  else
    echo "[$k] SIZE MISMATCH: got=$local_size orig=$orig_size" | tee -a "$V"
  fi
  rm -f "/tmp/verify-$k"
done

echo "════ gofile.io — public page access ════" | tee -a "$V"
for gid in dOm8BVdV SMp3tNeN FrcsAvX0 bNDfNi60 LFqDwFSR MPoi4VFh; do
  code=$(curl -sL -o /tmp/gp -w "%{http_code}" -m 60 "https://gofile.io/d/$gid" 2>/dev/null)
  hit=$(grep -c "RahyAr\|rahyar" /tmp/gp 2>/dev/null || echo 0)
  echo "gofile/$gid: HTTP $code, content-hits=$hit" | tee -a "$V"
done
rm -f /tmp/gp
cat "$V"
