#!/bin/bash
# تأیید دانلود واقعی بایت‌به‌بایت از tmpfiles (استخراج لینک توکن‌دار از HTML → دانلود → SHA-256)
set -euo pipefail
cd /tmp
declare -A URLS=(
  [release.apk]="https://tmpfiles.org/wiAan6Cddzkj/rahyar-android-v1.1.0-release.apk"
  [debug-test.apk]="https://tmpfiles.org/w0AZnXCvd24G/rahyar-android-v1.1.0-debug-test.apk"
  [INSTALL_GUIDE_FA.md]="https://tmpfiles.org/wIAznpCldVmu/install_guide_fa.md"
)
declare -A EXPECTED=(
  [release.apk]="840a79fdf7df81e0cc60ecb8ce13e117af7bfc7ad1823436ba077bb1cd15af3a"
  [debug-test.apk]="7df2c7a8081c9586ffc4bd3243112bf6ee87c244a5db88dadecce142f54b6181"
)
for name in release.apk debug-test.apk INSTALL_GUIDE_FA.md; do
  page=$(curl -fsSL --max-time 30 "${URLS[$name]}")
  real=$(echo "$page" | grep -oP 'href="\Khttps://tmpfiles\.org/dl/[0-9a-f.]+/[^"]+' | head -1)
  if [ -z "$real" ]; then echo "FAIL(no-token-url) $name"; continue; fi
  curl -fsSL --max-time 60 -o "t-$name" "$real"
  got=$(sha256sum "t-$name" | cut -d' ' -f1)
  if [ "$name" == "INSTALL_GUIDE_FA.md" ]; then
    echo "OK $name sha256=$got (bytes=$(stat -c%s "t-$name"))"
  elif [ "$got" == "${EXPECTED[$name]}" ]; then
    echo "PASS $name sha256=$got"
  else
    echo "FAIL $name got=$got expected=${EXPECTED[$name]}"
  fi
  rm -f "t-$name"
done
