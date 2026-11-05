#!/bin/bash
# F2-EMU-MISSION: بوت + نصب RELEASE + اجرا + شواهد — همه در یک پنجره
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
REL_APK=$ROOT/download/RahyAr-Android/Rahyar-Android-v2.1.0-release.apk
LOG=$ROOT/artifacts/logs/emulator-mission.log
mkdir -p "$ROOT/artifacts/logs"
export ANDROID_HOME=$SDK
exec >> "$LOG" 2>&1

echo "== mission chain started $(date -u '+%H:%M:%S') =="

# پیکربندی سبک ضد-OOM روی AVD
AVDCFG=$HOME/.android/avd/rahyar24.avd/config.ini
[ -f "$AVDCFG" ] && sed -i 's|^hw.ramSize=.*|hw.ramSize=1024|; s|^hw.lcd.width=.*|hw.lcd.width = 720|; s|^hw.lcd.height=.*|hw.lcd.height = 1520|; s|^hw.lcd.density=.*|hw.lcd.density = 280|' "$AVDCFG"

# دادهٔ از پیش ساختهٔ ext4 (رفع چک فضای لانچر v37)
EMU_IMG=$ROOT/artifacts/emu/userdata24.img
if [ ! -s "$EMU_IMG" ]; then
  mkdir -p "$ROOT/artifacts/emu"
  "$SDK/emulator/bin64/mkfs.ext4" -F -q -O ^has_journal,^resize_inode -b 4096 -I 256 -L userdata "$EMU_IMG" 1100M
fi
AVD_DIR=$HOME/.android/avd/rahyar24.avd
if [ ! -s "$AVD_DIR/userdata-qemu.img" ]; then
  cp --sparse=always -f "$EMU_IMG" "$AVD_DIR/userdata-qemu.img"
fi
sed -i 's|^disk.dataPartition.path.*|disk.dataPartition.path = userdata-qemu.img|' "$AVD_DIR/config.ini"
rm -f "$AVD_DIR"/*.lock 2>/dev/null || true

"$ADB" start-server 2>/dev/null || true

nohup "$SDK/emulator/emulator" -avd rahyar24 \
  -no-window -no-audio -no-boot-anim -no-accel \
  -gpu swiftshader_indirect -memory 1024 -cores 2 \
  -camera-back none -camera-front none \
  -no-snapshot -no-metrics \
  -qemu -tb-size 268435456 \
  >> /tmp/emulator-qemu.log 2>&1 &
QPID=$!
sleep 2
for P in $QPID $(pgrep -P $QPID 2>/dev/null); do echo -300 > /proc/$P/oom_score_adj 2>/dev/null || true; done
echo "qemu launched PID $QPID"

BOOTED=""
timeout 480 "$ADB" wait-for-device && {
  for i in $(seq 1 90); do
    pgrep -f qemu-system >/dev/null || { echo "qemu died at poll $i"; break; }
    for QP in $(pgrep -f qemu-system-x86 2>/dev/null); do echo -300 > /proc/$QP/oom_score_adj 2>/dev/null || true; done
    B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    [ "$B" = "1" ] && { BOOTED=yes; echo "BOOT_COMPLETED try $i at $(date -u '+%H:%M:%S')"; break; }
    sleep 5
  done
}
[ -n "$BOOTED" ] || { echo "BOOT_TIMEOUT at $(date -u '+%H:%M:%S')"; exit 1; }

"$ADB" -s emulator-5554 shell getprop ro.build.version.release | tr -d '\r'
"$ADB" -s emulator-5554 shell getprop ro.build.version.sdk | tr -d '\r'

echo "== install RELEASE APK (با حذف نسخهٔ امضای متفاوت قبلی) =="
"$ADB" -s emulator-5554 uninstall com.rahyarai.app >/dev/null 2>&1
"$ADB" -s emulator-5554 install -r "$REL_APK" && echo RELEASE_INSTALL_OK || { echo RELEASE_INSTALL_FAILED; exit 1; }

echo "== launch HomeActivity =="
"$ADB" -s emulator-5554 shell am start -n com.rahyarai.app/.HomeActivity | tr -d '\r'
sleep 8
"$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | rg "mCurrentFocus" | head -1

echo "== evidence screenshots =="
mkdir -p "$ROOT/artifacts/panel-shots"
"$ADB" -s emulator-5554 exec-out screencap -p > "$ROOT/artifacts/panel-shots/apk-home-release.png" 2>/dev/null
ls -la "$ROOT/artifacts/panel-shots/apk-home-release.png"
"$ADB" -s emulator-5554 shell pm list packages | rg rahyar | tr -d '\r'

echo "== EMU_MISSION_DONE $(date -u '+%H:%M:%S') =="
