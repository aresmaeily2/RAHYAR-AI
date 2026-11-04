#!/bin/bash
# F2-EMU-BOOT: بوت شبیه‌ساز اندروید (TCG نرم‌افزاری — بدون KVM) + نصب و اجرای خودکار اپ رهیار
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
APK_GLOB="$ROOT/artifacts/android-build/out/Rahyar-Android-v2.1.0-debug.apk"
LOG=$ROOT/artifacts/logs/emulator.log
mkdir -p "$ROOT/artifacts/logs"
export ANDROID_HOME=$SDK
exec >> "$LOG" 2>&1

echo "== boot wrapper started $(date -u) =="

# AVD تضمین‌شده (اگر setup هنوز نساخته باشد)
if ! "$SDK/emulator/emulator" -list-avds 2>/dev/null | grep -q rahyar; then
  echo no | "$SDK/cmdline-tools/latest/bin/avdmanager" --sdk_root=$SDK create avd \
    -n rahyar -k "system-images;android-30;default;x86_64" -d pixel_5 --force
fi

# پاک‌سازی قفل‌های قبلی
AVD_DIR=$HOME/.android/avd/rahyar.avd
rm -f "$AVD_DIR"/*.lock 2>/dev/null || true

nohup "$SDK/emulator/emulator" -avd rahyar \
  -no-window -no-audio -no-boot-anim -no-accel \
  -gpu swiftshader_indirect -memory 2048 -cores 2 \
  -camera-back none -camera-front none \
  -no-snapshot -wipe-data \
  > /tmp/emulator-qemu.log 2>&1 &

echo "emulator PID $!"
"$ADB" start-server 2>/dev/null || true

echo "== waiting for device =="
timeout 900 "$ADB" wait-for-device || { echo "WAIT_TIMEOUT"; exit 1; }

echo "== polling sys.boot_completed (up to 40 min, TCG is slow) =="
BOOTED=""
for i in $(seq 1 240); do
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [ "$B" = "1" ]; then BOOTED=yes; echo "boot completed at try $i"; break; fi
  sleep 10
done
[ -n "$BOOTED" ] || { echo "BOOT_TIMEOUT"; exit 1; }

"$ADB" -s emulator-5554 shell getprop ro.build.version.release
"$ADB" -s emulator-5554 shell getprop ro.product.cpu.abi

echo "== install RahyAr debug APK =="
for i in $(seq 1 12); do
  ls "$APK_GLOB" >/dev/null 2>&1 && break
  echo "apk not ready yet ($i) — waiting 30s"; sleep 30
done
"$ADB" -s emulator-5554 install -r "$APK_GLOB" || { echo "INSTALL_FAILED"; exit 1; }

echo "== launch HomeActivity =="
"$ADB" -s emulator-5554 shell am start -n com.rahyarai.app/.HomeActivity
sleep 6
"$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp" | head -2
echo "== EMU_BOOT_DONE $(date -u) =="
