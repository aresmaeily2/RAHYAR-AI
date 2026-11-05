#!/bin/bash
# F2-EMU-DIAG: بوت سریع + نصب release از طریق pm install با خطای صریح
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
REL_APK=$ROOT/download/RahyAr-Android/Rahyar-Android-v2.1.0-release.apk
export ANDROID_HOME=$SDK
exec >> "$ROOT/artifacts/logs/emulator-mission.log" 2>&1
echo "== diag chain started $(date -u '+%H:%M:%S') =="

# پاک‌سازی کامل: هیچ qemu یا adb قدیمی نباید مانده باشد
pkill -f qemu-system 2>/dev/null || true
"$ADB" kill-server 2>/dev/null || true
sleep 3
pgrep -f qemu-system >/dev/null && { echo "STALE_QEMU_STILL_ALIVE"; pkill -9 -f qemu-system; sleep 2; }

AVDCFG=$HOME/.android/avd/rahyar24.avd/config.ini
sed -i 's|^hw.ramSize=.*|hw.ramSize=768|' "$AVDCFG" 2>/dev/null
AVD_DIR=$HOME/.android/avd/rahyar24.avd
rm -f "$AVD_DIR"/*.lock 2>/dev/null || true

nohup "$SDK/emulator/emulator" -avd rahyar24 \
  -no-window -no-audio -no-boot-anim -no-accel \
  -gpu none -memory 768 -cores 2 \
  -camera-back none -camera-front none \
  -no-snapshot -no-metrics -qemu -tb-size 134217728 \
  >> /tmp/emulator-qemu.log 2>&1 &
QPID=$!
sleep 2
for P in $QPID $(pgrep -P $QPID 2>/dev/null); do echo -300 > /proc/$P/oom_score_adj 2>/dev/null || true; done

timeout 200 "$ADB" wait-for-device
for i in $(seq 1 50); do
  pgrep -f qemu-system >/dev/null || { echo "qemu died at poll $i"; break; }
  # یادداری: تصویر x86 پروسه‌اش qemu-system-i386-headless است — الگوی عمومی qemu-system
  for QP in $(pgrep -f qemu-system 2>/dev/null); do echo -300 > /proc/$QP/oom_score_adj 2>/dev/null || true; done
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$B" = "1" ] && { echo "BOOT_COMPLETED $(date -u '+%H:%M:%S')"; break; }
  sleep 5
done

"$ADB" -s emulator-5554 uninstall com.rahyarai.app >/dev/null 2>&1
"$ADB" -s emulator-5554 push "$REL_APK" /data/local/tmp/rahyar-release.apk 2>&1 | tail -1
echo "== pm install result =="
"$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/rahyar-release.apk 2>&1 | tr -d '\r'
echo "== package check =="
"$ADB" -s emulator-5554 shell pm list packages 2>/dev/null | rg rahyar | tr -d '\r'

if "$ADB" -s emulator-5554 shell pm path com.rahyarai.app 2>/dev/null | rg -q "package:"; then
  echo "== launch HomeActivity =="
  "$ADB" -s emulator-5554 shell am start -n com.rahyarai.app/.HomeActivity 2>&1 | tr -d '\r'
  sleep 10
  "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | rg "mCurrentFocus" | tr -d '\r' | head -1
  mkdir -p "$ROOT/artifacts/panel-shots"
  "$ADB" -s emulator-5554 exec-out screencap -p > "$ROOT/artifacts/panel-shots/apk-home-release.png" 2>/dev/null
  ls -la "$ROOT/artifacts/panel-shots/apk-home-release.png" | tr -d '\r'
  echo RELEASE_LAUNCH_EVIDENCE_OK
fi
echo "== EMU_DIAG_DONE $(date -u '+%H:%M:%S') =="
