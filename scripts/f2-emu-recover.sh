#!/bin/bash
# F2-EMU-RECOVER: بازسازی حداقلی SDK برای بوت (پس از بازیابی سندباکس)
# فقط آنچه بوت می‌خواهد: cmdline-tools + platform-tools(adb) + emulator + system-image API24 x86
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
LOG=$ROOT/artifacts/logs/emu-recover.log
mkdir -p "$SDK" "$ROOT/artifacts/logs" "$ROOT/artifacts/android-build/out"
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

echo "== [$(date -u +%H:%M:%S)] step 2: platform-tools (adb) + emulator =="
"$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root=$SDK "platform-tools" "emulator" 2>&1 | tail -2
ls "$SDK/platform-tools/adb" && echo ADB_OK
ls "$SDK/emulator/emulator" && echo EMU_OK

echo "== [$(date -u +%H:%M:%S)] step 3: system-image API24 x86 (تصویر اثبات‌شدهٔ بوت) =="
"$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root=$SDK "system-images;android-24;default;x86" 2>&1 | tail -2
du -sh "$SDK/system-images/android-24/default/x86" 2>/dev/null

echo "== [$(date -u +%H:%M:%S)] step 4: AVD rahyar24 =="
echo no | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root=$SDK "emulator" >/dev/null 2>&1
echo no | "$SDK/cmdline-tools/latest/bin/avdmanager" create avd --sdk_root=$SDK -n rahyar24 -k "system-images;android-24;default;x86" -d pixel_5 --force 2>&1 | tail -2
"$SDK/emulator/emulator" -list-avds 2>/dev/null

echo "== [$(date -u +%H:%M:%S)] step 5: APK به مسیر مورد انتظار بوت =="
cp -f "$ROOT/download/RahyAr-Android/Rahyar-Android-v2.1.0-debug.apk" "$ROOT/artifacts/android-build/out/Rahyar-Android-v2.1.0-debug.apk"
ls -la "$ROOT/artifacts/android-build/out/"

echo "== EMU_RECOVER_DONE [$(date -u +%H:%M:%S)] =="
