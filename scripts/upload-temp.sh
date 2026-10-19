#!/bin/bash
# آپلود موقت فایل — زنجیره جایگزین: litterbox(72h) → 0x0.st → tmpfiles.org(60m) → transfer.sh
# خروجی: URL روی stdout
F="$1"
[ -f "$F" ] || { echo "ERR: file not found: $F"; exit 1; }
SIZE=$(du -h "$F" | cut -f1)
NAME=$(basename "$F")
echo " Uploading: $NAME ($SIZE)"
# 1) litterbox — 72 ساعت
U=$(curl -sS --max-time 420 -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@$F" https://litterbox.catbox.moe/resources/internals/api.php 2>&1)
if echo "$U" | rg -q '^https?://'; then echo "OK|$NAME|litterbox-72h|$U"; exit 0; fi
echo "  litterbox failed: $(echo "$U" | head -c 150)"
# 2) 0x0.st — بلندمدت
U=$(curl -sS --max-time 420 -F "file=@$F" https://0x0.st 2>&1)
if echo "$U" | rg -q '^https?://'; then echo "OK|$NAME|0x0.st|$U"; exit 0; fi
echo "  0x0.st failed: $(echo "$U" | head -c 150)"
# 3) tmpfiles.org — 60 دقیقه
U=$(curl -sS --max-time 420 -F "file=@$F" https://tmpfiles.org/api/v1/upload 2>&1 | rg -o 'https?://tmpfiles[^"]+' | head -1)
if [ -n "$U" ]; then echo "OK|$NAME|tmpfiles-60min|$U"; exit 0; fi
echo "  tmpfiles failed"
# 4) transfer.sh
U=$(curl -sS --max-time 420 --upload-file "$F" "https://transfer.sh/$NAME" 2>&1)
if echo "$U" | rg -q '^https?://'; then echo "OK|$NAME|transfer.sh|$U"; exit 0; fi
echo "  transfer.sh failed: $(echo "$U" | head -c 150)"
echo "ALL_FAILED|$NAME"
exit 1
