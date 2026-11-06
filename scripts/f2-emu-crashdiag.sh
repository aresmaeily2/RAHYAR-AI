#!/bin/bash
# F2-EMU-CRASHDIAG: تشخیص زندهٔ کرش release روی API24
# بوت پایدار (-gpu none + tb64MB + -m768) → نصب release → am start → logcat -b crash
# سپس debug به‌عنوان کنترل → مقایسهٔ استک‌ها → اسکرین‌شات از هر دو
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
APKS=$ROOT/download/RahyAr-Android
REL=$APKS/Rahyar-Android-v2.1.0-release.apk
DBG=$APKS/Rahyar-Android-v2.1.0-debug.apk
RPT=$ROOT/artifacts/reports
LOGD=$ROOT/artifacts/logs/crashdiag
mkdir -p "$RPT" "$LOGD" "$ROOT/artifacts/emu"
export ANDROID_HOME=$SDK
exec > >(tee -a "$ROOT/artifacts/logs/emulator-crashdiag.log") 2>&1
echo "== CRASHDIAG started $(date -u '+%Y-%m-%d %H:%M:%S') =="

# ---------- 0) پاکسازی ----------
pkill -9 -f qemu-system 2>/dev/null || true
"$ADB" kill-server 2>/dev/null || true
sleep 2

# ---------- 1) userdata پاک ext4 (رفع چک لانچر v37) ----------
EMU_IMG=$ROOT/artifacts/emu/userdata24.img
MKFS=$SDK/emulator/bin64/mkfs.ext4
[ -x "$MKFS" ] || MKFS=$(command -v mkfs.ext4 || true)
if [ ! -s "$EMU_IMG" ] && [ -n "$MKFS" ]; then
  echo "mkfs.ext4: $MKFS"
  "$MKFS" -F -q -O ^has_journal,^resize_inode -b 4096 -I 256 -L userdata "$EMU_IMG" 1100M && echo PRISTINE_USERDATA_OK
fi
AVD_DIR=$HOME/.android/avd/rahyar24.avd
[ -s "$EMU_IMG" ] && cp --sparse=always -f "$EMU_IMG" "$AVD_DIR/userdata-qemu.img"
sed -i 's|^disk.dataPartition.path.*|disk.dataPartition.path = userdata-qemu.img|' "$AVD_DIR/config.ini"
sed -i 's|^hw.ramSize=.*|hw.ramSize=1024|; s|^hw.lcd.width=.*|hw.lcd.width = 720|; s|^hw.lcd.height=.*|hw.lcd.height = 1520|; s|^hw.lcd.density=.*|hw.lcd.density = 280|' "$AVD_DIR/config.ini"
rm -f "$AVD_DIR"/*.lock "$AVD_DIR"/cache.img.qcow2 2>/dev/null || true
ls -la "$AVD_DIR/userdata-qemu.img"

# ---------- 2) بوت پایدار ----------
"$ADB" start-server >/dev/null 2>&1
nohup "$SDK/emulator/emulator" -avd rahyar24 \
  -no-window -no-audio -no-boot-anim -no-accel \
  -gpu none -cores 2 \
  -camera-back none -camera-front none \
  -no-snapshot -no-metrics \
  -qemu -tb-size 67108864 -m 768 \
  >> /tmp/emulator-qemu.log 2>&1 &
echo "qemu launched $(date -u '+%H:%M:%S')"

BOOTED=""
T0=$(date +%s)
for i in $(seq 1 26); do
  pgrep -f qemu-system >/dev/null || { echo "QEMU_DIED poll $i ($(($(date +%s)-T0))s)"; break; }
  QL=$(pgrep -f qemu-system | head -1); [ -n "$QL" ] && echo "rss[$i]:$(awk '/VmRSS/{print $2}' /proc/$QL/status 2>/dev/null)KB"
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [ "$B" = "1" ]; then BOOTED=yes; echo "BOOT_COMPLETED try $i at $(date -u '+%H:%M:%S') (+$(($(date +%s)-T0))s)"; break; fi
  sleep 7
done
[ -n "$BOOTED" ] || { echo "BOOT_TIMEOUT"; pkill -9 -f qemu-system; exit 1; }
"$ADB" -s emulator-5554 shell getprop ro.build.version.release | tr -d '\r'
"$ADB" -s emulator-5554 shell getprop ro.build.version.sdk | tr -d '\r'

# ---------- 3) تابع شواهد ----------
capture() { # $1=tag $2=package
  local TAG=$1 PKG=$2
  echo "== [$TAG] am start $(date -u '+%H:%M:%S') =="
  "$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" 2>&1 | tr -d '\r'
  sleep 8
  "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp" | head -2 | tr -d '\r'
  "$ADB" -s emulator-5554 shell logcat -b crash -d > "$LOGD/crash-$TAG.log" 2>&1
  echo "crashlog[$TAG]: $(wc -l < "$LOGD/crash-$TAG.log") lines"
  grep -E "FATAL EXCEPTION|Process: |AndroidRuntime" "$LOGD/crash-$TAG.log" | head -8 | tr -d '\r' || echo "(crash buffer empty)"
  "$ADB" -s emulator-5554 shell logcat -d -s AndroidRuntime:E 2>/dev/null | tail -25 > "$LOGD/runtime-$TAG.log"
  "$ADB" -s emulator-5554 exec-out screencap -p > "$LOGD/shot-$TAG.png" 2>/dev/null
  echo "shot[$TAG]: $(file -b "$LOGD/shot-$TAG.png" 2>/dev/null)"
  "$ADB" -s emulator-5554 shell am force-stop "$PKG" >/dev/null 2>&1
}

# ---------- 4) release ----------
echo "== install RELEASE $(date -u '+%H:%M:%S') =="
"$ADB" -s emulator-5554 uninstall com.rahyarai.app >/dev/null 2>&1
"$ADB" -s emulator-5554 push "$REL" /data/local/tmp/rel.apk >/dev/null 2>&1
RI=$("$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/rel.apk 2>&1 | tr -d '\r')
echo "release install: [$RI]"
echo "$RI" >> "$RPT/emu-release-install.txt"; echo "  (crashdiag $(date -u '+%H:%M:%S'))" >> "$RPT/emu-release-install.txt"
capture release com.rahyarai.app

# ---------- 5) debug کنترل ----------
echo "== install DEBUG control $(date -u '+%H:%M:%S') =="
"$ADB" -s emulator-5554 uninstall com.rahyarai.app >/dev/null 2>&1
"$ADB" -s emulator-5554 push "$DBG" /data/local/tmp/dbg.apk >/dev/null 2>&1
DI=$("$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/dbg.apk 2>&1 | tr -d '\r')
echo "debug install: [$DI]"
capture debug com.rahyarai.app

# ---------- 6) خروجی نهایی ----------
echo "== SUMMARY =="
for f in "$LOGD"/crash-*.log; do echo "--- $(basename $f): $(wc -l < $f) lines"; done
ls -la "$LOGD/"
pkill -9 -f qemu-system 2>/dev/null || true
"$ADB" kill-server 2>/dev/null || true
echo "== CRASHDIAG done $(date -u '+%H:%M:%S') =="
