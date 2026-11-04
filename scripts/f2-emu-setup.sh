#!/bin/bash
# F2-EMU-SETUP: بازسازی کامل ابزار اندروید + شبیه‌ساز (پس از wipe پلتفرم)
# خروجی: SDK کامل در artifacts/android-sdk (build-tools, platform-34, platform-tools/adb, emulator, system-image API30 x86_64) + AVD «rahyar»
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
LOG=$ROOT/artifacts/logs/emu-setup.log
mkdir -p "$SDK" "$ROOT/artifacts/logs"
exec > >(tee -a "$LOG") 2>&1

echo "== [$(date -u +%H:%M:%S)] step 1: cmdline-tools =="
cd "$SDK"
if [ ! -x cmdline-tools/latest/bin/sdkmanager ]; then
  curl -4 -sSLo cmdtools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  sha256sum cmdtools.zip
  rm -rf cmdline-tools && unzip -q cmdtools.zip
  mkdir -p cmdline-tools/latest
  mv cmdline-tools/bin cmdline-tools/lib cmdline-tools/NOTICE.txt cmdline-tools/source.properties cmdline-tools/latest/ 2>/dev/null || true
fi
export ANDROID_HOME=$SDK
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root=$SDK --licenses >/dev/null 2>&1 || true

echo "== [$(date -u +%H:%M:%S)] step 2: build-tools + platform + platform-tools (for APK build + adb) =="
"$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root=$SDK "platforms;android-34" "build-tools;34.0.0" "platform-tools" 2>&1 | tail -2
ls "$SDK/build-tools/34.0.0/" | head -5; ls "$SDK/platform-tools/adb" && echo ADB_OK

echo "== [$(date -u +%H:%M:%S)] step 3: tools needed by no-Gradle pipeline (copy from SDK) =="
T=$ROOT/artifacts/android-build/tools
mkdir -p "$T/bt/android-14" "$T/plat/android-34"
cp "$SDK/platforms/android-34/android.jar" "$T/plat/android-34/android.jar"
for t in aapt2 d8 zipalign apksigner; do cp "$SDK/build-tools/34.0.0/$t" "$T/bt/android-14/$t"; done
cp -r "$SDK/build-tools/34.0.0/lib" "$T/bt/android-14/lib" 2>/dev/null || true
[ -f "$T/ecj.jar" ] || curl -4 -sSLo "$T/ecj.jar" https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.33.0/ecj-3.33.0.jar
ls -la "$T/bt/android-14/aapt2" "$T/plat/android-34/android.jar" "$T/ecj.jar"

echo "== [$(date -u +%H:%M:%S)] step 4: emulator + system-image (biggest download) =="
"$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root=$SDK "emulator" "system-images;android-30;default;x86_64" 2>&1 | tail -2
ls "$SDK/emulator/emulator" && echo EMU_OK
du -sh "$SDK/system-images/android-30/default/x86_64" 2>/dev/null

echo "== [$(date -u +%H:%M:%S)] step 5: create AVD =="
echo no | "$SDK/cmdline-tools/latest/bin/avdmanager" --sdk_root=$SDK create avd -n rahyar -k "system-images;android-30;default;x86_64" -d pixel_5 --force 2>&1 | tail -2
"$SDK/emulator/emulator" -list-avds 2>/dev/null

echo "== EMU_SETUP_DONE [$(date -u +%H:%M:%S)] =="
