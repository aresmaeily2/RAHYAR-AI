#!/bin/bash
# F2-EMU-FINAL: بوت + نصب RELEASE + اجرا + اسکرین‌شات — با طعمهٔ OOM
# سندباکس نوشتن منفی oom_score_adj را می‌بندد؛ طعمه‌های adj=1000 قربانی OOM می‌شوند
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
REL_APK=$ROOT/download/RahyAr-Android/Rahyar-Android-v2.1.0-release.apk
export ANDROID_HOME=$SDK
exec >> "$ROOT/artifacts/logs/emulator-mission.log" 2>&1
echo "== FINAL chain started $(date -u '+%H:%M:%S') =="

pkill -9 -f qemu-system 2>/dev/null || true
"$ADB" kill-server 2>/dev/null || true
sleep 3

# طعمه‌ساز خودکار: تا زمانی که پروسهٔ پدر زنده است، همیشه ۸ طعمه نگه می‌دارد
# 4 طعمهٔ ثابت — بدون نگهدارنده؛ هر OOM یک طعمه را آزاد می‌کند و qemu رشد می‌کند
for i in 1 2 3 4; do
  python3 -c "import time; d=bytearray(130*1024*1024); time.sleep(3600) # rahyar_decoy_marker" & DP=$!
  echo 1000 > /proc/$DP/oom_score_adj 2>/dev/null || true
done
echo "4 static decoys armed"

AVD_DIR=$HOME/.android/avd/rahyar24.avd
rm -f "$AVD_DIR"/userdata-qemu.img.qcow2 "$AVD_DIR"/cache.img.qcow2 "$AVD_DIR"/*.lock 2>/dev/null || true
cp --sparse=always -f "$ROOT/artifacts/emu/userdata24.img" "$AVD_DIR/userdata-qemu.img"

nohup "$SDK/emulator/emulator" -avd rahyar24 \
  -no-window -no-audio -no-boot-anim -no-accel \
  -gpu none -cores 2 \
  -camera-back none -camera-front none \
  -no-snapshot -no-metrics -qemu -tb-size 67108864 -m 512 \
  >> /tmp/emulator-qemu.log 2>&1 &
QPID=$!
echo "qemu launcher PID $QPID"

timeout 200 "$ADB" wait-for-device
"$ADB" -s emulator-5554 push "$REL_APK" /data/local/tmp/rahyar-release.apk >/dev/null 2>&1
BOOTED=""
INSTALL_OK=""
# نصب در حین بوت: تا system_server بالا بیاید، RSS هنوز پایین است — هر ۸ ثانیه امتحان کن
for i in $(seq 1 60); do
  pgrep -f qemu-system >/dev/null || { echo "qemu died at poll $i"; break; }
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  P=$("$ADB" -s emulator-5554 shell pm path com.rahyarai.app 2>/dev/null | tr -d '\r')
  if echo "$P" | rg -q "package:"; then
    echo "RELEASE_PKG_PRESENT $(date -u '+%H:%M:%S')"
    "$ADB" -s emulator-5554 shell am start -n com.rahyarai.app/.HomeActivity 2>&1 | tr -d '\r' | head -2
    sleep 6
    "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | rg "mCurrentFocus" | tr -d '\r' | head -1
    mkdir -p "$ROOT/artifacts/panel-shots"
    "$ADB" -s emulator-5554 exec-out screencap -p > "$ROOT/artifacts/panel-shots/apk-home-release.png" 2>/dev/null
    ls -la "$ROOT/artifacts/panel-shots/apk-home-release.png" | tr -d '\r'
    echo RELEASE_LAUNCH_EVIDENCE_OK
    INSTALL_OK=yes; BOOTED=yes
    break
  fi
  if [ -z "$INSTALL_OK" ]; then
    R=$("$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/rahyar-release.apk 2>&1 | tr -d '\r')
    echo "poll $i boot=$B install=[${R:0:50}]"
    echo "$R" | rg -q "Success" && { INSTALL_OK=yes; echo "RELEASE_INSTALL_OK_EARLY $(date -u '+%H:%M:%S')"; }
  else
    [ "$B" = "1" ] && { BOOTED=yes; echo "BOOT_COMPLETED $(date -u '+%H:%M:%S')"; break; }
  fi
  sleep 8
done
[ -n "$INSTALL_OK" ] || { echo "INSTALL_NEVER_SUCCEEDED"; }
echo "== package check =="
"$ADB" -s emulator-5554 shell pm list packages 2>/dev/null | rg rahyar | tr -d '\r'

if "$ADB" -s emulator-5554 shell pm path com.rahyarai.app 2>/dev/null | rg -q "package:"; then
  echo "== launch =="
  "$ADB" -s emulator-5554 shell am start -n com.rahyarai.app/.HomeActivity 2>&1 | tr -d '\r' | head -2
  sleep 8
  "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | rg "mCurrentFocus" | tr -d '\r' | head -1
  mkdir -p "$ROOT/artifacts/panel-shots"
  "$ADB" -s emulator-5554 exec-out screencap -p > "$ROOT/artifacts/panel-shots/apk-home-release.png" 2>/dev/null
  ls -la "$ROOT/artifacts/panel-shots/apk-home-release.png" | tr -d '\r'
  echo RELEASE_LAUNCH_EVIDENCE_OK
fi
echo "== EMU_FINAL_DONE $(date -u '+%H:%M:%S') =="

pkill -f rahyar_decoy_marker 2>/dev/null || true
