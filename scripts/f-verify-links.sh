#!/bin/bash
# ─── راستی‌آزمایی مستقل نهایی F2 — هر لینک در نشست ناشناس تازه ═══════
# برای هر فایل: دانلود واقعی → مقایسهٔ SHA-256 بایت‌به‌بایت با نسخهٔ محلی
# → تست ZIP/TXT/ویدئو/APK. tmpfiles: استخراج لینک مستقیم token‌دار از صفحهٔ dl.
# gofile: صفحهٔ عمومی (دانلود مستقیمش نیازمند توکن مرورگر است — check HTTP + size API).
set -uo pipefail
cd /home/z/my-project/download
V=/home/z/my-project/artifacts/verify-links.txt
: > "$V"
LINKS=/home/z/my-project/artifacts/upload-links.txt

sha() { python3 -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" "$1"; }

# ── tmpfiles.org: دانلود ناشناس واقعی + SHA-256 ════
echo "════ tmpfiles.org — anonymous download + SHA-256 byte-match ════" | tee -a "$V"
python3 - "$LINKS" <<'PYEOF' > /tmp/tf-map.txt
import sys
for line in open(sys.argv[1]):
    if '=>' in line and 'tmpfiles.org' in line:
        f, url = line.strip().split(' => ')
        print(f"{f}\t{url}")
PYEOF
while IFS=$'\t' read -r f url; do
  [ -f "$f" ] || continue
  WRAP=$(curl -sL -m 90 "$url" 2>/dev/null)
  DLURL=$(echo "$WRAP" | grep -oE 'https://tmpfiles\.org/dl/[0-9]+\.[a-f0-9]+/[^"]+' | head -1)
  if [ -z "$DLURL" ]; then echo "[$f] tmpfiles: no-direct-link (پادشده یا نشت)" | tee -a "$V"; continue; fi
  curl -sL -m 280 "$DLURL" -o "/tmp/verify-tf" 2>/dev/null
  LSHA=$(sha "/tmp/verify-tf" 2>/dev/null); OSHA=$(sha "$f")
  LSZ=$(stat -c%s "/tmp/verify-tf" 2>/dev/null || echo 0); OSZ=$(stat -c%s "$f")
  if [ "$LSHA" = "$OSHA" ] && [ "$LSHA" != "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" ]; then
    echo "[$f] tmpfiles SHA-256 MATCH ($LSZ bytes)" | tee -a "$V"
    case "$f" in
      *.zip) unzip -tq "/tmp/verify-tf" >/dev/null 2>&1 && echo "[$f] zip-integrity: OK" | tee -a "$V" || echo "[$f] zip-integrity: FAIL" | tee -a "$V";;
      *.apk) unzip -tq "/tmp/verify-tf" >/dev/null 2>&1 && echo "[$f] apk-zip-structure: OK" | tee -a "$V";;
      *.txt) echo "[$f] head: $(head -2 /tmp/verify-tf | tail -1 | head -c 50) | mid: $(sed -n "$(( $(wc -l < /tmp/verify-tf) / 2 ))p" /tmp/verify-tf | head -c 40)" | tee -a "$V";;
      *.mp4) ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "/tmp/verify-tf" 2>/dev/null | xargs echo "[$f] video duration(s):" | tee -a "$V";;
    esac
  else
    echo "[$f] tmpfiles SHA MISMATCH: got=$LSHA ($LSZ bytes) expected=$OSHA ($OSZ bytes)" | tee -a "$V"
  fi
  rm -f /tmp/verify-tf
done < /tmp/tf-map.txt

# ── gofile.io: صفحهٔ عمومی + API size ─═══
echo "════ gofile.io — page reachability + content size via API ════" | tee -a "$V"
python3 - "$LINKS" <<'PYEOF' > /tmp/gf-map.txt
import sys
for line in open(sys.argv[1]):
    if '=>' in line and 'gofile.io' in line:
        f, url = line.strip().split(' => ')
        print(f"{f}\t{url}")
PYEOF
while IFS=$'\t' read -r f url; do
  gid=$(basename "$url")
  code=000
  for try in 1 2 3; do
    code=$(curl -sL -o /tmp/gp -w "%{http_code}" -m 45 "https://gofile.io/d/$gid" 2>/dev/null)
    [ "$code" = "200" ] && break
    sleep 3
  done
  INFO=$(curl -s -m 30 "https://api.gofile.io/contents/$gid" 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)['data']
    ch=d.get('children',{})
    tot=sum(int(c.get('size',0)) for c in ch.values()) or int(d.get('size',0))
    print(f\"files={len(ch)} size={tot}\")
except Exception as e:
    print('api-info-unavailable')" 2>/dev/null)
  OSZ=$(stat -c%s "$f" 2>/dev/null || echo 0)
  echo "gofile/$gid ($f): HTTP $code | api: $INFO | local-size: $OSZ" | tee -a "$V"
done < /tmp/gf-map.txt

echo "════ VERIFY DONE ════" | tee -a "$V"
grep -cE "SHA-256 MATCH" "$V" | xargs echo "tmpfiles SHA-match count:" | tee -a "$V"
