#!/bin/bash
# آپلود تحویلی‌های RahyAr v2.0.0 در GOFILE + اعتبارسنجی (md5/size صفحهٔ دانلود)
# نکته: api.gofile.io از این محیط مسدود است؛ آپلود مستقیم روی store1.gofile.io انجام می‌شود
set -euo pipefail
OUT=/home/z/my-project/download
LOG=/home/z/my-project/artifacts/gofile-links.txt
GTP=/home/z/my-project/backups/gofile-guest-token.txt
: > "$LOG"

upload_one() {
  local f="$1"
  local localmd5 local_size resp
  localmd5=$(md5sum "$OUT/$f" | awk '{print $1}')
  local_size=$(stat -c %s "$OUT/$f")
  echo ">> uploading $f ($(du -h "$OUT/$f" | cut -f1)) ..."
  resp=$(curl -4 -s -X POST --max-time 900 \
    -F "file=@$OUT/$f" \
    "https://store1.gofile.io/contents/uploadfile")
  local status page code fid md5 size gtok
  status=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status",""))')
  [ "$status" = "ok" ] || { echo "UPLOAD FAILED for $f: $(printf '%s' "$resp" | head -c 300)"; exit 1; }
  page=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["downloadPage"])')
  code=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["code"])')
  fid=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["id"])')
  md5=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["md5"])')
  size=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["size"])')
  gtok=$(printf '%s' "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"].get("guestToken",""))')
  # ── اعتبارسنجی: md5 و size باید با فایل محلی یکی باشد ──
  [ "$md5" = "$localmd5" ] || { echo "MD5 MISMATCH for $f: remote=$md5 local=$localmd5"; exit 1; }
  [ "$size" = "$local_size" ] || { echo "SIZE MISMATCH for $f: remote=$size local=$local_size"; exit 1; }
  # ── اعتبارسنجی: صفحهٔ دانلود باید 200 بدهد و نام فایل در آن باشد ──
  local page_html
  page_html=$(curl -4 -s --max-time 30 -L "$page")
  echo "$page_html" | grep -q "$f" || { echo "PAGE CHECK FAILED for $f (name not on page)"; exit 1; }
  printf '%s\t%s\t%s\t%s\t%s\n' "$f" "$size" "$md5" "$code" "$page" >> "$LOG"
  [ -n "$gtok" ] && printf '%s\n' "$gtok" > "$GTP"
  echo "   OK: $page (md5 verified, page 200 + filename present)"
}

FILES=(
  rahyar-user-v2.0.0.apk
  rahyar-owner-v2.0.0.apk
  rahyar-source-v2.0.0.zip
  rahyar-v2.0.0-sha256.txt
  rahyar-v2.0.0-delivery-report.docx
  rahyar-release-signing-kit.zip.enc
  RahyAr-v2.0.0-bundle.zip
)
for f in "${FILES[@]}"; do upload_one "$f"; done

echo
echo "===== GOFILE LINKS (all verified) ====="
column -t -s $'\t' "$LOG"
echo "UPLOAD_ALL_OK"
