#!/bin/bash
# آپلود بسته‌های رهیار به GoFile (کانال تحویل عمومی مصوب) + fallback tmpfiles.org
set -u
cd /home/z/my-project/download/audit-v2
FILES=("pkg/rahyar-android-v2.1.0-user.apk" "pkg/rahyar-android-v2.1.0-owner.apk" "pkg/rahyar-android-source-v2.1.0.zip" "rahyar-v2-screenshots.zip")

echo "── ۱) گرفتن سرور GoFile"
SRV=$(curl -sS "https://api.gofile.io/servers" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['servers'][0]['name'])" 2>/dev/null)
echo "server: ${SRV:-NONE}"

if [ -n "${SRV:-}" ]; then
  for f in "${FILES[@]}"; do
    echo "── آپلود $f"
    RESP=$(curl -sS -F "file=@$f" "https://${SRV}.gofile.io/contents/uploadfile")
    LINK=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['downloadPage'])" 2>/dev/null)
    if [ -n "$LINK" ]; then
      echo "GOFILE OK: $f -> $LINK"
    else
      echo "GOFILE FAIL: $f -> $RESP"
    fi
  done
fi

echo "── ۲) fallback tmpfiles.org (سقف ۱۰۰MB)"
for f in "${FILES[@]}"; do
  RESP=$(curl -sS -F "file=@$f" "https://tmpfiles.org/api/v1/upload" 2>/dev/null)
  LINK=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['url'].replace('tmpfiles.org/','tmpfiles.org/dl/'))" 2>/dev/null)
  echo "TMPFILES: $f -> ${LINK:-FAIL $RESP}"
done
