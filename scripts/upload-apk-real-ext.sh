#!/usr/bin/env bash
# APK-EXT-2: upload real .apk (original bytes, original extension) to hosts that accept APK
set -u
F=/home/z/my-project/release-delivery/v1.2.0/Rahyar-Android-v1.2.0-debug-test.apk
NAME="Rahyar-Android-v1.2.0-debug-test.apk"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

try_catbox() {
  curl -sS --max-time 120 -A "$UA" -F "reqtype=fileupload" -F "fileToUpload=@$F" \
    https://catbox.moe/user/api.php 2>&1 | tr -d '\r\n'
}
try_gofile() {
  local srv=$(curl -4 -sS --max-time 45 https://api.gofile.io/servers 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['servers'][0]['name'])" 2>/dev/null)
  [ -z "$srv" ] && return 1
  curl -4 -sS --max-time 180 -F "file=@$F" "https://${srv}.gofile.io/contents/uploadfile" 2>/dev/null \
    | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print('PAGE='+d.get('downloadPage',''));print('LINK='+d.get('link',''))" 2>/dev/null
}
try_0x0() {
  curl -sS --max-time 120 -A "$UA" -F "file=@$F" https://0x0.st 2>&1 | tr -d '\r\n'
}
try_fileditch() {
  curl -sS --max-time 180 -A "$UA" -F "file=@$F" https://up1.fileditch.com/upload.php 2>&1 | head -c 400
}
try_kraken() {
  local st=$(curl -sS --max-time 45 -A "$UA" -H "Referer: https://krakenfiles.com" https://krakenfiles.com/api/upload/server 2>/dev/null)
  local url=$(echo "$st" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',''))" 2>/dev/null)
  [ -z "$url" ] && return 1
  curl -sS --max-time 180 -A "$UA" -F "file=@$F" "$url" 2>/dev/null \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('PAGE=https://krakenfiles.com'+d['data'].get('url',''))" 2>/dev/null
}

echo "== catbox (permanent) =="
R=$(try_catbox); echo "resp: $(echo "$R" | head -c 150)"
echo "$R" | grep -q '^https://files.catbox.moe/' && { echo "SUCCESS|catbox|$R"; exit 0; }
echo "== gofile (~10 days) =="
R=$(try_gofile); echo "resp: $(echo "$R" | head -c 200)"
echo "$R" | grep -q '^PAGE=https://gofile.io' && { echo "SUCCESS|gofile|$R"; exit 0; }
echo "== 0x0.st (long retention) =="
R=$(try_0x0); echo "resp: $(echo "$R" | head -c 150)"
echo "$R" | grep -q '^https://x0' && { echo "SUCCESS|0x0|$R"; exit 0; }
echo "== fileditch =="
R=$(try_fileditch); echo "resp: $(echo "$R" | head -c 300)"
echo "$R" | grep -q 'https://files.fileditch.com' && { echo "SUCCESS|fileditch|$R"; exit 0; }
echo "== krakenfiles =="
R=$(try_kraken); echo "resp: $(echo "$R" | head -c 200)"
echo "$R" | grep -q '^PAGE=https://krakenfiles.com/' && { echo "SUCCESS|kraken|$R"; exit 0; }
echo "ALL_HOSTS_FAILED"
exit 1
