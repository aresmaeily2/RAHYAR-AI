#!/bin/bash
# آپلود تحویلی‌های RahyAr v2.1.0 در GOFILE + اعتبارسنجی md5/size
# روش اثبات‌شدهٔ مأموریت قبل: آپلود مستقیم روی store1.gofile.io (api.gofile.io در این محیط مسدود است)
set -uo pipefail
OUT=/home/z/my-project/download/final-v23/pkgs
LOG=/home/z/my-project/artifacts/gofile-links-v23.txt
mkdir -p /home/z/my-project/artifacts
[ $# -eq 0 ] && : > "$LOG"

upload_one() {
  local f="$1"
  local localmd5 local_size resp
  localmd5=$(md5sum "$OUT/$f" | awk '{print $1}')
  local_size=$(stat -c %s "$OUT/$f")
  echo ">> uploading $f ($(du -h "$OUT/$f" | cut -f1)) ..."
  resp=$(curl -4 -s -X POST --max-time 1800 \
    -F "file=@$OUT/$f" \
    "https://store1.gofile.io/contents/uploadfile")
  local status page code md5 size
  status=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status",""))' 2>/dev/null)
  if [ "$status" != "ok" ]; then echo "UPLOAD FAILED for $f: $(printf '%s' "$resp" | head -c 200)"; return 1; fi
  page=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["downloadPage"])')
  code=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["code"])')
  md5=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["md5"])')
  size=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["size"])')
  [ "$md5" = "$localmd5" ] || { echo "MD5 MISMATCH for $f (remote=$md5 local=$localmd5)"; return 1; }
  [ "$size" = "$local_size" ] || { echo "SIZE MISMATCH for $f"; return 1; }
  printf '%s\t%s\t%s\t%s\n' "$f" "$size" "$md5" "$page" >> "$LOG"
  echo "   OK: $page"
}

if [ $# -ge 1 ]; then
  for f in "$@"; do upload_one "$f" || exit 1; done
  exit 0
fi

FILES=(
  "$@"
)
for f in "${FILES[@]}"; do upload_one "$f" || exit 1; done
echo "=== PASS1 DONE ==="
cat "$LOG"
