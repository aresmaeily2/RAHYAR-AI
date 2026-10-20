#!/bin/bash
# بازیابی کامل ابزارهای بیلد پس از ریست محیط — منبع رسمی + SHA-256 (provenance)
set -uo pipefail
ROOT=/home/z/my-project
A=$ROOT/artifacts
T=$A/android-build/tools
S=$A/android-sdk
mkdir -p "$T/bt" "$T/plat" "$A/reports" "$S/licenses" "$A/gradle" "$A/jdk"
LOG=$A/reports/android-tools-provenance.txt
: > "$LOG"

dl() { curl -fsSL --retry 3 --max-time 900 -o "$2" "$1"; }

echo "=== [1/6] Temurin JDK 17 ===" | tee -a "$LOG"
if [ ! -x "$A/jdk/jdk-17.0.13+11/bin/javac" ]; then
  dl "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse" /tmp/jdk17.tar.gz \
    && tar -xzf /tmp/jdk17.tar.gz -C "$A/jdk" \
    && mv "$A/jdk"/jdk-17* "$A/jdk/jdk-17.0.13+11" 2>/dev/null || true
fi
JDK=$(ls -d "$A/jdk"/jdk-17* 2>/dev/null | head -1)
"$JDK/bin/javac" -version 2>&1 | sed 's/^/javac: /' | tee -a "$LOG"
sha256sum "$JDK/bin/javac" 2>/dev/null | tee -a "$LOG"

echo "=== [2/6] Gradle 8.10.2 ===" | tee -a "$LOG"
if [ ! -f "$A/gradle/gradle-8.10.2/bin/gradle" ]; then
  dl "https://services.gradle.org/distributions/gradle-8.10.2-bin.zip" /tmp/gradle.zip \
    && unzip -qo /tmp/gradle.zip -d "$A/gradle"
fi
"$A/gradle/gradle-8.10.2/bin/gradle" --version 2>&1 | grep -E "Gradle|JVM:" | head -3 | tee -a "$LOG"

echo "=== [3/6] Build-Tools r34 ===" | tee -a "$LOG"
if [ ! -x "$T/bt/android-14/aapt2" ]; then
  dl "https://dl.google.com/android/repository/build-tools_r34-linux.zip" /tmp/bt34.zip \
    && unzip -qo /tmp/bt34.zip -d "$T/bt"
fi
"$T/bt/android-14/aapt2" version 2>&1 | sed 's/^/aapt2 version: /' | tee -a "$LOG"
sha256sum "$T/bt/android-14/aapt2" "$T/bt/android-14/apksigner" "$T/bt/android-14/zipalign" 2>/dev/null | tee -a "$LOG"

echo "=== [4/6] Platform android-34 ===" | tee -a "$LOG"
if [ ! -f "$T/plat/android-34/android.jar" ]; then
  dl "https://dl.google.com/android/repository/platform-34-ext7_r03.zip" /tmp/plat34.zip \
    && unzip -qo /tmp/plat34.zip -d "$T/plat"
fi
ls -la "$T/plat/android-34/android.jar" 2>/dev/null | tee -a "$LOG"
sha256sum "$T/plat/android-34/android.jar" 2>/dev/null | tee -a "$LOG"

echo "=== [5/6] Android SDK layout + licenses ===" | tee -a "$LOG"
mkdir -p "$S/platforms" "$S/build-tools"
ln -sfn "$T/plat/android-34" "$S/platforms/android-34"
ln -sfn "$T/bt/android-14" "$S/build-tools/34.0.0"
# license hashes رسمی (در دسترس عمومی sdk)
printf "8933bad161af4178b1185d1a37fbf41ea5269c55\n" > "$S/licenses/android-sdk-license"
printf "84831b9409646a918e30573bab4c9c91346d8abd\n" > "$S/licenses/android-sdk-preview-license"
printf "24333f8a63b6825ea9c5514f83c2829b004d1fee\n" >> "$S/licenses/android-sdk-license"
echo "sdk layout done" | tee -a "$LOG"

echo "=== [6/6] local.properties ===" | tee -a "$LOG"
printf "sdk.dir=%s\n" "$S" > "$ROOT/local.properties"
cat "$ROOT/local.properties" | tee -a "$LOG"

echo "=== PROVENANCE SOURCES ===" | tee -a "$LOG"
cat >> "$LOG" <<'EOF'
jdk: https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse (Temurin GA)
gradle: https://services.gradle.org/distributions/gradle-8.10.2-bin.zip
build-tools: https://dl.google.com/android/repository/build-tools_r34-linux.zip
platform: https://dl.google.com/android/repository/platform-34-ext7_r03.zip
EOF
echo "ALL DONE" | tee -a "$LOG"
