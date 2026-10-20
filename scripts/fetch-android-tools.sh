#!/bin/bash
# بازیابی ابزارهای رسمی بیلد اندروید — منبع + نسخه + SHA-256 ثبت می‌شود
set -euo pipefail
ROOT=/home/z/my-project
T=$ROOT/artifacts/android-build/tools
mkdir -p "$T/bt" "$T/plat" "$ROOT/artifacts/reports"
LOG=$ROOT/artifacts/reports/android-tools-provenance.txt
: > "$LOG"

dl() { # url dest
  echo "GET $1"
  curl -fsSL --retry 2 --max-time 300 -o "$2" "$1"
}

# 1) Build-Tools 34 (r34) — dl.google.com رسمی
if [ ! -x "$T/bt/android-14/aapt2" ]; then
  dl "https://dl.google.com/android/repository/build-tools_r34-linux.zip" /tmp/bt34.zip
  unzip -qo /tmp/bt34.zip -d "$T/bt"
fi
echo "build-tools: r34 linux — source: https://dl.google.com/android/repository/build-tools_r34-linux.zip" >> "$LOG"
sha256sum "$T/bt/android-14/aapt2" "$T/bt/android-14/d8" "$T/bt/android-14/apksigner" "$T/bt/android-14/zipalign" "$T/bt/android-14/lib/d8.jar" >> "$LOG" 2>/dev/null || true
"$T/bt/android-14/aapt2" version 2>&1 | sed 's/^/aapt2 version: /' >> "$LOG" || true

# 2) Platform android-34 (android.jar) — dl.google.com رسمی
if [ ! -f "$T/plat/android-34/android.jar" ]; then
  dl "https://dl.google.com/android/repository/platform-34-ext7_r03.zip" /tmp/plat34.zip
  unzip -qo /tmp/plat34.zip -d "$T/plat"
fi
echo "platform: android-34 ext7 r03 — source: https://dl.google.com/android/repository/platform-34-ext7_r03.zip" >> "$LOG"
sha256sum "$T/plat/android-34/android.jar" >> "$LOG"

# 3) ECJ 3.33.0 — Maven Central رسمی
if [ ! -f "$T/ecj.jar" ]; then
  dl "https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.33.0/ecj-3.33.0.jar" "$T/ecj.jar"
fi
echo "ecj: 3.33.0 — source: https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.33.0/ecj-3.33.0.jar" >> "$LOG"
sha256sum "$T/ecj.jar" >> "$LOG"

# 4) bundletool 1.17.2 — GitHub releases رسمی google/bundletool
if [ ! -f "$T/bundletool.jar" ]; then
  dl "https://github.com/google/bundletool/releases/download/1.17.2/bundletool-all-1.17.2.jar" "$T/bundletool.jar" \
    || dl "https://repo1.maven.org/maven2/com/android/tools/build/bundletool/1.17.2/bundletool-1.17.2.jar" "$T/bundletool.jar"
fi
echo "bundletool: 1.17.2 — source: github.com/google/bundletool releases" >> "$LOG"
sha256sum "$T/bundletool.jar" >> "$LOG"

cat "$LOG"
