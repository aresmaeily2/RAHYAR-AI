#!/usr/bin/env bash
# FINAL-DELIVERY: verify public links by unauthenticated download + SHA-256
set -u
cd /tmp && rm -rf linkverify && mkdir linkverify && cd linkverify
ORIG=/home/z/my-project/release-delivery/v1.2.0
PASS=0; FAIL=0

chk() { # $1=label $2=url $3=origfile $4=extra-processing(cmd or -)
  local label="$1" url="$2" orig="$3" proc="$4"
  curl -sS -L --max-time 120 -o dl.bin "$url" 2>/dev/null
  local code=$(curl -sS -o /dev/null -w '%{http_code}' -L --max-time 120 "$url" 2>/dev/null)
  if [ "$proc" = "-" ]; then
    GOT=$(sha256sum dl.bin | cut -d' ' -f1)
  else
    $proc dl.bin > proc.out 2>/dev/null; GOT=$(sha256sum proc.out | cut -d' ' -f1)
  fi
  WANT=$(sha256sum "$orig" | cut -d' ' -f1)
  if [ "$GOT" = "$WANT" ]; then
    echo "PASS  [$label] http=$code sha256=$GOT"; PASS=$((PASS+1))
  else
    echo "FAIL  [$label] http=$code got=$GOT want=$WANT"; FAIL=$((FAIL+1))
  fi
  echo "      size_downloaded=$(stat -c %s dl.bin 2>/dev/null) size_orig=$(stat -c %s "$orig")"
}

echo "=== 1. filebin APK (direct) ==="
chk "filebin-APK" "https://filebin.net/rahyar-v120-210839/Rahyar-Android-v1.2.0-debug-test.apk" "$ORIG/Rahyar-Android-v1.2.0-debug-test.apk" "-"

echo "=== 2. x0.at APK-as-zip (unzip -> compare APK) ==="
curl -sS -L --max-time 120 -o apkwrap.zip https://x0.at/hQxW.zip 2>/dev/null
unzip -o -q apkwrap.zip -d apkwrap_out
GOT=$(sha256sum apkwrap_out/rahyar-apk-wrapped.zip 2>/dev/null | cut -d' ' -f1)
# wrapped file is the copy; compare against original APK bytes
GOT2=$(cat apkwrap_out/rahyar-apk-wrapped.zip | sha256sum | cut -d' ' -f1)
WANT=$(sha256sum "$ORIG/Rahyar-Android-v1.2.0-debug-test.apk" | cut -d' ' -f1)
if [ "$GOT2" = "$WANT" ]; then echo "PASS  [x0-APK-as-zip] sha256=$GOT2"; PASS=$((PASS+1)); else echo "FAIL  [x0-APK-as-zip] got=$GOT2 want=$WANT"; FAIL=$((FAIL+1)); fi

echo "=== 3. filebin source zip ==="
chk "filebin-SRC" "https://filebin.net/rahyar-v120-210839/Rahyar-Android-Source-v1.2.0.zip" "$ORIG/Rahyar-Android-Source-v1.2.0.zip" "-"

echo "=== 4. x0.at source zip ==="
chk "x0-SRC" "https://x0.at/KIqv.zip" "$ORIG/Rahyar-Android-Source-v1.2.0.zip" "-"

echo "=== 5. filebin install guide ==="
chk "filebin-GUIDE" "https://filebin.net/rahyar-v120-210839/INSTALL_GUIDE_FA.md" "$ORIG/INSTALL_GUIDE_FA.md" "-"

echo "=== 6. x0.at install guide ==="
chk "x0-GUIDE" "https://x0.at/EABI.md" "$ORIG/INSTALL_GUIDE_FA.md" "-"

echo "=== headers of primary APK link ==="
curl -sSI -L --max-time 60 "https://filebin.net/rahyar-v120-210839/Rahyar-Android-v1.2.0-debug-test.apk" 2>/dev/null | grep -i -E 'HTTP/|content-type|content-length|content-disposition' | head -8

echo "=== RESULT: PASS=$PASS FAIL=$FAIL ==="
