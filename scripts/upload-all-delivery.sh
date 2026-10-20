#!/bin/bash
# آپلود نهایی همهٔ خروجی‌ها — gofile (اصلی) با تأیید md5 سمت سرور + tmpfiles (پشتیبان 60دقیقه‌ای)
set -euo pipefail
cd /home/z/my-project
OUT=release-delivery/LINKS.txt
# resume — فقط بار اول خالی شود؛ در اجرای بعدی حفظ شود
[ -f "$OUT" ] || : > "$OUT"
echo "# Rahyar AI v1.1.0 — لینک‌های دانلود (تولید: $(date -u '+%Y-%m-%d %H:%M UTC'))" >> "$OUT"
echo "# gofile: فایل‌های بی‌استفاده معمولاً پس از ~10 روز حذف می‌شوند (محدودیت سرویس). لینک پایدار = GitHub Release." >> "$OUT"

up() {
  local F="$1"
  local NAME SIZE LMD5 RESP PAGE SERVERMD5 STATUS
  NAME=$(basename "$F")
  # resume: اگر همین فایل قبلاً با موفقیت آپلود شده، رد شو
  if grep -q "OK|gofile|$NAME|" "$OUT" 2>/dev/null; then echo "== $NAME (already uploaded — skip)"; return 0; fi
  SIZE=$(stat -c%s "$F"); LMD5=$(md5sum "$F" | cut -d' ' -f1)
  echo "== $NAME ($SIZE bytes)"
  RESP=$(timeout 240 curl -sS --max-time 230 -F "file=@$F" https://upload.gofile.io/uploadfile 2>&1 || echo CURL_FAIL)
  PAGE=$(echo "$RESP" | python3 -c "import json,sys
try:
    d=json.load(sys.stdin)['data']; print(d.get('downloadPage','')); import sys as s
    s.stderr.write('server_md5='+str(d.get('md5',''))+'\n')
except Exception: print('')" 2>/tmp/gofile-md5.txt)
  SERVERMD5=$(rg -o '[a-f0-9]{32}' /tmp/gofile-md5.txt | head -1 || true)
  if [ -n "$PAGE" ] && [ "$PAGE" != "" ]; then
    if [ "$SERVERMD5" = "$LMD5" ]; then MD5STAT="md5-verified-server-side"; else MD5STAT="MD5_MISMATCH($SERVERMD5)"; fi
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PAGE")
    echo "OK|gofile|$NAME|$SIZE|$LMD5|$PAGE|page_status=$STATUS|$MD5STAT" >> "$OUT"
    echo "   gofile OK: $PAGE (page=$STATUS, $MD5STAT)"
    return 0
  fi
  echo "   gofile failed: $(echo "$RESP" | head -c 120) — fallback tmpfiles"
  U=$(timeout 240 curl -sS --max-time 230 -F "file=@$F" https://tmpfiles.org/api/v1/upload 2>/dev/null | rg -o 'https?://tmpfiles[^"]+' | head -1 || true)
  [ -n "$U" ] && { echo "OK|tmpfiles-60min|$NAME|$SIZE|$LMD5|$U|dl=https://tmpfiles.org/dl/${U#https://tmpfiles.org/}" >> "$OUT"; echo "   tmpfiles OK: $U"; return 0; }
  echo "FAIL|$NAME" >> "$OUT"; echo "   ALL FAILED"; return 1
}

up release-delivery/web/Rahyar-AI-Full-Source-v1.1.0.zip
up release-delivery/web/Rahyar-AI-Reports-v1.1.0.zip
up release-delivery/web/Rahyar-Web-Screenshots-v1.1.0.zip
up release-delivery/android/Rahyar-Android-v1.1.0-release.apk
up release-delivery/android/Rahyar-Android-Source-v1.1.0.zip
up release-delivery/android/Rahyar-Android-v1.1.0-gradle-release-unsigned.aab
up release-delivery/android/Rahyar-Android-v1.1.0-gradle-release-unsigned.apk
up release-delivery/android/Rahyar-Android-v1.1.0-rebuild-unsigned.apk
up release-delivery/reports/ANDROID_APK_REPORT.md
up release-delivery/reports/WEB_RELEASE_REPORT.md
echo '=== LINKS FILE ==='
cat "$OUT"
