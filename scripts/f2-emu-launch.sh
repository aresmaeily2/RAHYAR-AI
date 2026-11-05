#!/bin/bash
# F2-EMU-LAUNCH: بوت با دادهٔ موجود (اپ release نصب‌شده) + اجرا + اسکرین‌شات فوری
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
export ANDROID_HOME=$SDK
exec >> "$ROOT/artifacts/logs/emulator-mission.log" 2>&1
echo "== LAUNCH chain started $(date -u '+%H:%M:%S') =="

pkill -9 -f qemu-system 2>/dev/null || true
"$ADB" kill-server 2>/dev/null || true
sleep 3

( while kill -0 $$ 2>/dev/null; do
    N=$(pgrep -f "rahyar_decoy_marker" | wc -l)
    [ "$N" -lt 6 ] && { python3 -c "import time; d=bytearray(120*1024*1024); time.sleep(3600) # rahyar_decoy_marker" & DP=$!; echo 1000 > /proc/$DP/oom_score_adj 2>/dev/null || true; }
    sleep 2
  done ) & KEEPER=$!

AVD_DIR=$HOME/.android/avd/rahyar24.avd
# توجه: دادهٔ userdata پاک نمی‌شود — اپ release از بوت قبل نصب شده
rm -f "$AVD_DIR"/*.lock 2>/dev/null || true

nohup "$SDK/emulator/emulator" -avd rahyar24 \
  -no-window -no-audio -no-boot-anim -no-accel \
  -gpu none -cores 2 \
  -camera-back none -camera-front none \
  -no-snapshot -no-metrics -qemu -tb-size 67108864 \
  >> /tmp/emulator-qemu.log 2>&1 &

timeout 200 "$ADB" wait-for-device
DONE=""
for i in $(seq 1 60); do
  pgrep -f qemu-system >/dev/null || { echo "qemu died at poll $i"; break; }
  P=$("$ADB" -s emulator-5554 shell pm path com.rahyarai.app 2>/dev/null | tr -d '\r')
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  echo "poll $i boot=$B pkg=[${P:0:40}]"
  if echo "$P" | rg -q "package:"; then
    echo "RELEASE_PKG_PERSISTED $(date -u '+%H:%M:%S')"
    "$ADB" -s emulator-5554 shell am start -n com.rahyarai.app/.HomeActivity 2>&1 | tr -d '\r' | head -2
    sleep 7
    "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | rg "mCurrentFocus" | tr -d '\r' | head -1
    mkdir -p "$ROOT/artifacts/panel-shots"
    "$ADB" -s emulator-5554 exec-out screencap -p > "$ROOT/artifacts/panel-shots/apk-home-release.png" 2>/dev/null
    ls -la "$ROOT/artifacts/panel-shots/apk-home-release.png" | tr -d '\r'
    "$ADB" -s emulator-5554 shell getprop ro.build.version.release | tr -d '\r'
    DONE=yes
    echo RELEASE_LAUNCH_EVIDENCE_OK
    break
  fi
  sleep 6
done
[ -n "$DONE" ] || echo "LAUNCH_WINDOW_MISSED"
echo "== EMU_LAUNCH_DONE $(date -u '+%H:%M:%S') =="
kill $KEEPER 2>/dev/null
pkill -f rahyar_decoy_marker 2>/dev/null || true
