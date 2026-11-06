#!/bin/bash
# F3-APK-BUILD: اثبات کامپایل سورس نهایی (بند ۶.۱) — build تجربی بدون امضا (keystore در ریست از دست رفته)
# خروجی فقط شواهد است؛ تحویلِ رسمی همان APK امضاشدهٔ اثبات‌شده می‌ماند.
set -uo pipefail
ROOT=/home/z/my-project
OUT=/tmp/f3-apk-build.log
: > "$OUT"
export ANDROID_HOME=$ROOT/artifacts/android-sdk
export JAVA_HOME=$ROOT/artifacts/jdk17
export GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx900m -XX:MaxMetaspaceSize=256m -Dorg.gradle.workers.max=1"
cd "$ROOT/android"
echo "== F3-APK-BUILD start $(date -u '+%H:%M:%S') =="
timeout 480 ./gradlew :app:assembleUserRelease --no-daemon -q >> "$OUT" 2>&1
RC=$?
echo "gradle rc=$RC at $(date -u '+%H:%M:%S')"
if [ $RC -eq 0 ]; then
  APK=app/build/outputs/apk/user/release/app-user-release-unsigned.apk
  ls -la "$APK" 2>/dev/null || APK=$(ls app/build/outputs/apk/user/release/*.apk 2>/dev/null | head -1)
  echo "BUILT: $APK ($(stat -c%s "$APK" 2>/dev/null) bytes)"
  echo "-- content comparison vs delivered signed APK --"
  mkdir -p /tmp/apkrb/{new,old}
  unzip -qo "$APK" classes.dex resources.arsc AndroidManifest.xml -d /tmp/apkrb/new 2>/dev/null
  unzip -qo "$ROOT/download/RahyAr-Android/Rahyar-Android-v2.1.0-release.apk" classes.dex resources.arsc AndroidManifest.xml -d /tmp/apkrb/old 2>/dev/null
  for f in classes.dex resources.arsc AndroidManifest.xml; do
    H1=$(sha256sum "/tmp/apkrb/new/$f" 2>/dev/null | cut -d' ' -f1)
    H2=$(sha256sum "/tmp/apkrb/old/$f" 2>/dev/null | cut -d' ' -f1)
    [ "$H1" = "$H2" ] && V=IDENTICAL || V="DIFFER"
    echo "$f: $V"
  done
  "$ANDROID_HOME/build-tools/34.0.0/apksigner" verify --verbose "$APK" 2>&1 | head -3 || echo "(unsigned — expected without keystore)"
  cp -f "$APK" "$ROOT/artifacts/android-build/f3-rebuild-unsigned.apk" 2>/dev/null || { mkdir -p "$ROOT/artifacts/android-build" && cp -f "$APK" "$ROOT/artifacts/android-build/f3-rebuild-unsigned.apk"; }
else
  echo "BUILD_FAILED — tail:"; tail -15 "$OUT"
fi
echo "== F3-APK-BUILD done $(date -u '+%H:%M:%S') =="
