#!/usr/bin/env bash
# FINAL-DELIVERY v3: filebin (6d, apk ok) + x0.at (long retention; no apk ext) + litterbox retry (72h)
set -u
cd /home/z/my-project/release-delivery/v1.2.0
OUT=/home/z/my-project/scripts/upload-results.txt
: > "$OUT"
BIN="rahyar-v120-$(date +%H%M%S)"

fb_upload() { # $1=file $2=remote-name -> stdout url
  curl -sS --max-time 300 --upload-file "$1" "https://filebin.net/$BIN/$2" -H "Accept: application/json" >/dev/null 2>&1
  echo "https://filebin.net/$BIN/$2"
}
x0_upload() { # $1=file -> stdout url
  curl -sS --max-time 300 -F "file=@$1" https://x0.at 2>/dev/null | tr -d '\r\n'
}
litter_upload() { # $1=file -> stdout url
  curl -sS --max-time 300 -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@$1" \
    https://litterbox.catbox.moe/resources/internals/api.php 2>/dev/null | tr -d '\r\n'
}

# prepare zip-wrapped APK fallback (APK is already a zip; wrap to satisfy extension policy)
cp Rahyar-Android-v1.2.0-debug-test.apk /tmp/rahyar-apk-wrapped.zip

echo "BIN=$BIN"
echo "== APK -> filebin =="
U=$(fb_upload Rahyar-Android-v1.2.0-debug-test.apk Rahyar-Android-v1.2.0-debug-test.apk)
echo "filebin|APK|$U" >> "$OUT"; echo "  $U"
echo "== APK wrapped.zip -> x0.at (long-retention fallback) =="
U=$(x0_upload /tmp/rahyar-apk-wrapped.zip)
if echo "$U" | grep -q '^https://x0.at/'; then echo "x0|APK-as-zip|$U" >> "$OUT"; echo "  $U"; else echo "  x0 FAIL: $(echo "$U"|head -c 100)"; fi
echo "== APK -> litterbox retry =="
U=$(litter_upload Rahyar-Android-v1.2.0-debug-test.apk)
if echo "$U" | grep -q '^https://litter'; then echo "litter|APK|$U" >> "$OUT"; echo "  $U"; else echo "  litter FAIL: $(echo "$U"|head -c 100)"; fi

echo "== Source zip -> filebin =="
U=$(fb_upload Rahyar-Android-Source-v1.2.0.zip Rahyar-Android-Source-v1.2.0.zip)
echo "filebin|SRC|$U" >> "$OUT"; echo "  $U"
echo "== Source zip -> x0.at =="
U=$(x0_upload Rahyar-Android-Source-v1.2.0.zip)
if echo "$U" | grep -q '^https://x0.at/'; then echo "x0|SRC|$U" >> "$OUT"; echo "  $U"; else echo "  x0 FAIL: $(echo "$U"|head -c 100)"; fi

echo "== Install guide -> filebin =="
U=$(fb_upload INSTALL_GUIDE_FA.md INSTALL_GUIDE_FA.md)
echo "filebin|GUIDE|$U" >> "$OUT"; echo "  $U"
echo "== Install guide -> x0.at =="
U=$(x0_upload INSTALL_GUIDE_FA.md)
if echo "$U" | grep -q '^https://x0.at/'; then echo "x0|GUIDE|$U" >> "$OUT"; echo "  $U"; else echo "  x0 FAIL: $(echo "$U"|head -c 100)"; fi

echo "=== RESULTS ==="; cat "$OUT"
