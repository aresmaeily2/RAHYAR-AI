#!/bin/bash
# بازسازی محیط اندروید پس از Reset — دانلود SDK (platform 34 + build-tools 34) و gradle deps
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
BT_DIR=$ROOT/artifacts/android-build/tools
mkdir -p "$SDK" "$BT_DIR/bt" "$BT_DIR/plat"

echo "== 1) cmdline-tools =="
cd "$SDK"
if [ ! -d cmdline-tools ]; then
  curl -4 -sSLo cmdtools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q cmdtools.zip
  mkdir -p cmdline-tools/latest && mv cmdline-tools/bin cmdline-tools/lib cmdline-tools/NOTICE.txt cmdline-tools/source.properties cmdline-tools/latest/ 2>/dev/null || true
  # دایرکتوری extract شده "cmdline-tools" ممکن است خودش همان پوشه باشد
fi
export ANDROID_HOME=$SDK

yes | $SDK/cmdline-tools/latest/bin/sdkmanager --sdk_root=$SDK --licenses >/dev/null 2>&1 || true
$SDK/cmdline-tools/latest/bin/sdkmanager --sdk_root=$SDK "platforms;android-34" "build-tools;34.0.0" "platform-tools" 2>&1 | tail -3

echo "== 2) android.jar copy (برای خط لوله غیر Gradle) =="
mkdir -p "$BT_DIR/plat/android-34"
cp "$SDK/platforms/android-34/android.jar" "$BT_DIR/plat/android-34/android.jar"
mkdir -p "$BT_DIR/bt/android-14"
for t in aapt2 d8 zipalign apksigner; do
  cp "$SDK/build-tools/34.0.0/$t" "$BT_DIR/bt/android-14/$t" 2>/dev/null || true
done
ls -la "$BT_DIR/bt/android-14/" "$BT_DIR/plat/android-34/"

echo "== 3) ECJ =="
if [ ! -f "$BT_DIR/ecj.jar" ]; then
  curl -4 -sSLo "$BT_DIR/ecj.jar" https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.33.0/ecj-3.33.0.jar
fi
ls -la "$BT_DIR/ecj.jar"

echo "== SDK_SETUP_DONE =="
