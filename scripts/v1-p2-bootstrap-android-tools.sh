#!/usr/bin/env bash
# V1-P2 — بوت‌استرپ ابزارهای build اندروید (بدون Gradle/SDK کامل)
# ابزارهای قبلی در recycle محیط از بین رفته بودند؛ این اسکریپت همان چیدمان
# artifacts/android-build/tools را از منابع رسمی بازمی‌سازد:
#   build-tools 34 (aapt2/d8/zipalign/apksigner) ← dl.google.com
#   platform android-34 (android.jar)           ← dl.google.com
#   ECJ 3.33.0 / JUnit 4.13.2 / hamcrest 1.3 / org.json ← repo1.maven.org
#   androidx.webkit 1.11.0 (classes.jar)        ← dl.google.com (maven androidx)
set -euo pipefail
T=/home/z/my-project/artifacts/android-build/tools
DL=/tmp/android-dl
mkdir -p "$T/bt/android-14" "$T/plat/android-34" "$T/webkit" "$T/test-libs" "$DL"
cd "$DL"

fetch(){ [ -f "$2" ] || curl -sSL --retry 3 -o "$2" "$1"; echo "got: $2 ($(du -h "$2" | cut -f1))"; }

echo "== 1) build-tools 34.0.0 =="
fetch https://dl.google.com/android/repository/build-tools_r34-linux.zip bt34.zip
unzip -qo bt34.zip -d bt34x
BTDIR=$(find bt34x -maxdepth 1 -type d | tail -1)
cp -f "$BTDIR/aapt2" "$BTDIR/zipalign" "$BTDIR/apksigner" "$BTDIR/d8" "$T/bt/android-14/"
cp -rf "$BTDIR/lib" "$T/bt/android-14/" 2>/dev/null || true
# d8/apksigner اسکریپت‌ها به lib/ نیاز دارند — نسبی نگه داشته می‌شود
ls -la "$T/bt/android-14/aapt2" "$T/bt/android-14/d8" "$T/bt/android-14/apksigner" 2>/dev/null || true

echo "== 2) platform android-34 (android.jar) =="
fetch https://dl.google.com/android/repository/platform-34-ext12_r01.zip p34.zip
unzip -qo p34.zip -d p34x
AJ=$(find p34x -name android.jar | head -1)
[ -n "$AJ" ] || { echo "android.jar not found"; exit 1; }
cp -f "$AJ" "$T/plat/android-34/android.jar"
du -h "$T/plat/android-34/android.jar"

echo "== 3) ECJ + test libs from Maven Central =="
fetch https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.33.0/ecj-3.33.0.jar "$T/ecj.jar"
fetch https://repo1.maven.org/maven2/junit/junit/4.13.2/junit-4.13.2.jar "$T/test-libs/junit-4.13.2.jar"
fetch https://repo1.maven.org/maven2/org/hamcrest/hamcrest-core/1.3/hamcrest-core-1.3.jar "$T/test-libs/hamcrest-core-1.3.jar"
fetch https://repo1.maven.org/maven2/org/json/json/20240303/json-20240303.jar "$T/test-libs/json-20240303.jar"

echo "== 4) androidx.webkit 1.11.0 (classes.jar) =="
fetch https://dl.google.com/android/maven2/androidx/webkit/webkit/1.11.0/webkit-1.11.0.aar webkit.aar
unzip -qo webkit.aar classes.jar -d webkitx
cp -f webkitx/classes.jar "$T/webkit/webkit-classes.jar"

echo "== BOOTSTRAP OK =="
ls -R "$T" | head -30
