#!/bin/bash
# ─── آپلود ۴ تحویلی به tmpfiles.org + تأیید واقعی دانلود (SHA-256) ───
# لینک فقط وقتی چاپ می‌شود که فایل برگردانده‌شده بایت‌به‌بایت با اصل یکی باشد.
# پشتیبان: litterbox (۷۲ ساعت) برای هر فایل.
set -uo pipefail
D=/home/z/my-project/download
RESULT=/home/z/my-project/download/upload-links.txt
: > "$RESULT"

upload_one() {
  local F="$1" NAME SHA RESP PAGE DL GOT REAL GOT2
  NAME=$(basename "$F")
  SHA=$(sha256sum "$F" | cut -d' ' -f1)
  echo "── $NAME ($(du -h "$F" | cut -f1)) → tmpfiles.org"
  RESP=$(curl -sS --max-time 420 -F "file=@$F" https://tmpfiles.org/api/v1/upload 2>&1 || echo CURL_ERR)
  PAGE=$(echo "$RESP" | grep -o 'https://tmpfiles\.org/[^"]*' | head -1)
  if [ -z "$PAGE" ]; then
    echo "TMPFILES_FAIL|$NAME|$(echo "$RESP" | head -c 120)"
  else
    # مسیر مستقیم: درج /dl/ در URL صفحه
    DL=$(echo "$PAGE" | sed 's#https://tmpfiles\.org/#https://tmpfiles.org/dl/#')
    GOT=""
    if curl -fsSL --max-time 180 -A "Mozilla/5.0" -o /tmp/vf.bin "$DL" 2>/dev/null; then
      GOT=$(sha256sum /tmp/vf.bin | cut -d' ' -f1)
    fi
    if [ "$GOT" != "$SHA" ]; then
      # جایگزین: استخراج لینک توکن‌دار از HTML صفحه
      REAL=$(curl -fsSL --max-time 30 -A "Mozilla/5.0" "$PAGE" 2>/dev/null | grep -oP 'href="\Khttps://tmpfiles\.org/dl/[^"]+' | head -1 || true)
      if [ -n "$REAL" ] && curl -fsSL --max-time 180 -A "Mozilla/5.0" -o /tmp/vf.bin "$REAL" 2>/dev/null; then
        GOT2=$(sha256sum /tmp/vf.bin | cut -d' ' -f1)
        [ "$GOT2" == "$SHA" ] && { DL="$REAL"; GOT="$GOT2"; }
      fi
    fi
    if [ "$GOT" == "$SHA" ]; then
      echo "TMPFILES_VERIFIED|$NAME|$DL|$SHA" | tee -a "$RESULT"
    else
      echo "TMPFILES_VERIFY_FAIL|$NAME|$DL|got=${GOT:-none}|want=$SHA" | tee -a "$RESULT"
    fi
  fi
  # ── پشتیبان ۷۲ ساعته ──
  echo "   پشتیبان: litterbox (72h)"
  BU=$(curl -sS --max-time 420 -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@$F" https://litterbox.catbox.moe/resources/internals/api.php 2>&1 || echo CURL_ERR)
  if echo "$BU" | grep -q '^https\?://'; then
    if curl -fsSL --max-time 180 -o /tmp/vb.bin "$BU" 2>/dev/null && [ "$(sha256sum /tmp/vb.bin | cut -d' ' -f1)" == "$SHA" ]; then
      echo "LITTERBOX_VERIFIED|$NAME|$BU|$SHA" | tee -a "$RESULT"
    else
      echo "LITTERBOX_VERIFY_FAIL|$NAME|$BU" | tee -a "$RESULT"
    fi
  else
    echo "LITTERBOX_FAIL|$NAME|$(echo "$BU" | head -c 120)" | tee -a "$RESULT"
  fi
  rm -f /tmp/vf.bin /tmp/vb.bin
}

for F in \
  "$D/RahyAr-All-Source-Code.md" \
  "$D/RahyAr-Screenshots-latest.zip" \
  "$D/RahyAr-Full-Source.zip" \
  "$D/Claude-Opus-360-Audit-Fix-Upgrade-Prompt.md"
do
  [ -f "$F" ] || { echo "MISSING|$F" | tee -a "$RESULT"; continue; }
  upload_one "$F"
done
echo "═══ خلاصه ═══"
cat "$RESULT"
