#!/bin/bash
# F5-ANDROID-BUILD: toolchain recovery + fail-closed signed APKs (user/owner x debug/release) + JVM tests
set -uo pipefail
cd /home/z/my-project
MAIN=/tmp/f5-android-build.log
{
echo "===== F5-ANDROID-BUILD $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
AVAIL=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
echo "mem-available-mb=$AVAIL (gate 1900)"
[ "$AVAIL" -lt 1900 ] && { echo "MEMORY-GATE-FAIL — abort per F3 mission rule"; exit 1; }

# ── 1. JDK17 ──
if [ ! -x artifacts/jdk17/bin/java ]; then
  echo "== fetching JDK17 (Temurin) =="
  mkdir -p artifacts/jdk17-dl && cd artifacts/jdk17-dl
  curl -4 -sSLo jdk17.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse" || { echo JDK-DL-FAIL; exit 1; }
  tar xzf jdk17.tar.gz
  D=$(ls -d jdk-17* | head -1)
  rm -rf ../jdk17 && mv "$D" ../jdk17 && cd ../.. && rm -rf artifacts/jdk17-dl
fi
export JAVA_HOME=$PWD/artifacts/jdk17
$JAVA_HOME/bin/java -version 2>&1 | head -1

# ── 2. SDK (build pieces only) ──
SDK=$PWD/artifacts/android-sdk
export ANDROID_HOME=$SDK
if [ ! -x "$SDK/build-tools/34.0.0/apksigner" ]; then
  echo "== fetching SDK cmdline-tools + build-tools + platform =="
  mkdir -p "$SDK" && cd "$SDK"
  curl -4 -sSLo ct.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip || { echo SDK-DL-FAIL; exit 1; }
  rm -rf cmdline-tools && unzip -q ct.zip && mkdir -p cmdline-tools/latest && mv cmdline-tools/bin cmdline-tools/lib cmdline-tools/NOTICE.txt cmdline-tools/source.properties cmdline-tools/latest/ 2>/dev/null || true
  yes | cmdline-tools/latest/bin/sdkmanager --sdk_root=$SDK --licenses >/dev/null 2>&1 || true
  cmdline-tools/latest/bin/sdkmanager --sdk_root=$SDK "platform-tools" "build-tools;34.0.0" "platforms;android-34" 2>&1 | tail -1
  cd ../..
fi
ls "$SDK/build-tools/34.0.0/apksigner" >/dev/null && echo SDK-OK

# ── 3. Release keystore (RSA-4096, CN=RahyAr, fail-closed build) ──
KS=android/rahyar-release.keystore
KSP=android/keystore.properties
if [ ! -f "$KS" ]; then
  echo "== generating release keystore (F5 rotation documented: F4 key lost in sandbox recycle) =="
  KSPASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  "$JAVA_HOME/bin/keytool" -genkeypair -v \
    -keystore "$KS" -storetype PKCS12 -storepass "$KSPASS" \
    -alias rahyar -keypass "$KSPASS" -keyalg RSA -keysize 4096 -validity 10000 \
    -dname "CN=RahyAr, OU=RahyAr AI, O=RahyAr, C=IR" 2>&1 | tail -2
  cat > "$KSP" <<EOF
storeFile=rahyar-release.keystore
storePassword=$KSPASS
keyAlias=rahyar
keyPassword=$KSPASS
EOF
  chmod 600 "$KSP" "$KS"
  # backup: خارج از گیت (backups/ گیت‌نشدنی) — رمز جدا از فایل کلید
  mkdir -p backups/android-release-keystore
  cp "$KS" backups/android-release-keystore/rahyar-release-f5.keystore
  echo "$KSPASS" > backups/android-release-keystore/rahyar-release-f5.password
  chmod 600 backups/android-release-keystore/*
  echo "KEYSTORE-BACKED-UP (passphrase stored separately in backups/, never in git/public zips)"
fi
grep -c "storeFile" "$KSP" >/dev/null && echo KSPROPS-OK

# ── 4. Gradle build: 4 APKs + JVM tests ──
export GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx1100m -XX:MaxMetaspaceSize=320m -Dorg.gradle.workers.max=1"
cd android
echo "== gradle assemble + tests (this may take several minutes) =="
timeout 540 ./gradlew :app:assembleUserDebug :app:assembleOwnerDebug :app:testUserDebug --no-daemon -q > /tmp/f5-gradle1.log 2>&1
RC1=$?
echo "gradle-debug+tests rc=$RC1 $(date -u '+%H:%M:%S')"
[ $RC1 -ne 0 ] && { echo "TAIL:"; tail -25 /tmp/f5-gradle1.log; }
timeout 540 ./gradlew :app:assembleUserRelease :app:assembleOwnerRelease --no-daemon -q > /tmp/f5-gradle2.log 2>&1
RC2=$?
echo "gradle-release rc=$RC2 $(date -u '+%H:%M:%S')"
[ $RC2 -ne 0 ] && { echo "TAIL:"; tail -25 /tmp/f5-gradle2.log; }

# ── 5. Verify + collect ──
cd ..
mkdir -p artifacts/reports/f5/apk download/RahyAr-F5
BT=$SDK/build-tools/34.0.0
for f in android/app/build/outputs/apk/user/debug/app-user-debug.apk \
         android/app/build/outputs/apk/owner/debug/app-owner-debug.apk \
         android/app/build/outputs/apk/user/release/app-user-release.apk \
         android/app/build/outputs/apk/owner/release/app-owner-release.apk; do
  if [ -f "$f" ]; then
    N=$(basename "$f" | sed 's/app-/Rahyar-/; s/-debug/-v2.2.0-debug/; s/-release/-v2.2.0-release/')
    cp "$f" "download/RahyAr-F5/$N"
    V=$($BT/apksigner verify --print-certs "$f" 2>&1 | grep -E "CN=|Verified" | head -2 | tr '\n' ' ')
    S=$(sha256sum "download/RahyAr-F5/$N" | cut -c1-16)
    echo "APK $N size=$(stat -c%s "$f") sha256=$S… cert=[$V]"
  else
    echo "APK-MISSING $f"
    ls android/app/build/outputs/apk/*/release/ 2>/dev/null
  fi
done

# fail-closed proof: temporarily hide keystore and confirm release build REFUSES
mv "$KSP" /tmp/keystore.properties.hidden 2>/dev/null
timeout 240 ./gradlew2 2>/dev/null; cd android && timeout 240 ./gradlew :app:assembleUserRelease --no-daemon -q > /tmp/f5-gradle-fc.log 2>&1
FC=$?
cd ..
echo "FAIL-CLOSED-PROOF rc=$FC (expect nonzero) => $(grep -o 'FAIL-CLOSED[^\"]*' /tmp/f5-gradle-fc.log | head -1)"
mv /tmp/keystore.properties.hidden "$KSP"

echo "===== F5-ANDROID-BUILD-DONE ====="
} 2>&1 | tee "$MAIN"
echo "SAVED: $MAIN"
