#!/bin/bash
# F2-EMU-CRASHDIAG2: تشخیص کرش release با بودجهٔ حافظهٔ کمتر این سندباکس
# - مهمان 512MB (سقف RSS ~1.7GB) + طعمهٔ OOM (adj=1000 مجاز) + نصب حین بوت
# - خروجی به فایل (نه pipe) تا در صورت مرگ qemu، اسکریپت تمیز تمام شود
# - در شکست بوت 512 → تلاش دوم با 768
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
APKS=$ROOT/download/RahyAr-Android
REL=$APKS/Rahyar-Android-v2.1.0-release.apk
DBG=$APKS/Rahyar-Android-v2.1.0-debug.apk
RPT=$ROOT/artifacts/reports
LOGD=$ROOT/artifacts/logs/crashdiag
OUT=/tmp/crashdiag2-run.log
mkdir -p "$RPT" "$LOGD" "$ROOT/artifacts/emu"
export ANDROID_HOME=$SDK

log(){ echo "[$(date -u '+%H:%M:%S')] $*" >> "$OUT"; }

decoys_start(){
  DECOY_PIDS=()
  for i in 1 2 3 4; do
    setsid python3 -c "
b = bytearray(150*1024*1024)
for i in range(0, len(b), 4096): b[i] = 1
import time; time.sleep(3600)
" >/dev/null 2>&1 &
    local P=$!
    echo 1000 > /proc/$P/oom_score_adj 2>/dev/null || true
    DECOY_PIDS+=("$P")
  done
  log "decoys: ${DECOY_PIDS[*]} (4x150MB adj=1000)"
}
decoys_stop(){
  for P in "${DECOY_PIDS[@]:-}"; do kill -9 "$P" 2>/dev/null || true; done
  log "decoys stopped"
}

boot_one(){ # $1=guest MB
  local GM=$1
  log "boot attempt: guest=${GM}MB"
  pkill -9 -f qemu-system 2>/dev/null || true; sleep 2
  sed -i "s|^hw.ramSize=.*|hw.ramSize=$GM|" "$AVD_DIR/config.ini"
  rm -f "$AVD_DIR"/*.lock 2>/dev/null || true
  "$ADB" start-server >/dev/null 2>&1
  nohup "$SDK/emulator/emulator" -avd rahyar24 \
    -no-window -no-audio -no-boot-anim -no-accel \
    -gpu none -cores 2 \
    -camera-back none -camera-front none \
    -no-snapshot -no-metrics \
    -qemu -tb-size 67108864 -m "$GM" \
    >> /tmp/emulator-qemu.log 2>&1 &
  local T0=$(date +%s)
  for i in $(seq 1 22); do
    pgrep -f qemu-system >/dev/null || { log "QEMU_DIED poll $i (+$(($(date +%s)-T0))s)"; return 1; }
    local QL=$(pgrep -f qemu-system | head -1)
    local RSS=$(awk '/VmRSS/{print $2}' /proc/$QL/status 2>/dev/null)
    local B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    if [ "$B" = "1" ]; then log "BOOT_COMPLETED try $i (+$(($(date +%s)-T0))s) rss=${RSS}KB"; return 0; fi
    [ $((i % 4)) = 0 ] && log "poll $i rss=${RSS}KB"
    sleep 7
  done
  log "BOOT_TIMEOUT guest=$GM"
  return 1
}

capture(){ # $1=tag $2=package
  local TAG=$1 PKG=$2
  log "[$TAG] am start"
  "$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" 2>&1 | tr -d '\r' >> "$OUT"
  echo >> "$OUT"
  sleep 8
  "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp" | head -2 | tr -d '\r' >> "$OUT"
  echo >> "$OUT"
  "$ADB" -s emulator-5554 shell logcat -b crash -d > "$LOGD/crash-$TAG.log" 2>&1
  log "crashlog[$TAG]: $(wc -l < "$LOGD/crash-$TAG.log") lines"
  grep -E "FATAL EXCEPTION|Process: " "$LOGD/crash-$TAG.log" | head -4 | tr -d '\r' >> "$OUT" || echo "(crash buffer empty)" >> "$OUT"
  "$ADB" -s emulator-5554 exec-out screencap -p > "$LOGD/shot-$TAG.png" 2>/dev/null
  log "shot[$TAG]: $(file -b "$LOGD/shot-$TAG.png" 2>/dev/null)"
  "$ADB" -s emulator-5554 shell am force-stop "$PKG" >/dev/null 2>&1
}

: > "$OUT"
trap 'pkill -9 -f qemu-system 2>/dev/null; decoys_stop; "$ADB" kill-server 2>/dev/null' EXIT

echo "== CRASHDIAG2 $(date -u '+%Y-%m-%d %H:%M:%S') ==" | tee -a "$OUT"
free -m | head -2 >> "$OUT"
log "MemAvailable: $(awk '/MemAvailable/{print $2}' /proc/meminfo)KB"

# userdata پاک
EMU_IMG=$ROOT/artifacts/emu/userdata24.img
MKFS=$SDK/emulator/bin64/mkfs.ext4
[ -x "$MKFS" ] || MKFS=$(command -v mkfs.ext4 || true)
if [ ! -s "$EMU_IMG" ]; then
  "$MKFS" -F -q -O ^has_journal,^resize_inode -b 4096 -I 256 -L userdata "$EMU_IMG" 1100M && log "PRISTINE_USERDATA_OK"
fi
AVD_DIR=$HOME/.android/avd/rahyar24.avd
cp --sparse=always -f "$EMU_IMG" "$AVD_DIR/userdata-qemu.img"
sed -i 's|^disk.dataPartition.path.*|disk.dataPartition.path = userdata-qemu.img|' "$AVD_DIR/config.ini"
sed -i 's|^hw.lcd.width=.*|hw.lcd.width = 720|; s|^hw.lcd.height=.*|hw.lcd.height = 1520|; s|^hw.lcd.density=.*|hw.lcd.density = 280|' "$AVD_DIR/config.ini"

decoys_start
boot_one 512 || { log "retry at 768"; boot_one 768 || { echo "RESULT: no boot"; cat "$OUT"; exit 1; }; }

log "ver=$( "$ADB" -s emulator-5554 shell getprop ro.build.version.release | tr -d '\r') sdk=$( "$ADB" -s emulator-5554 shell getprop ro.build.version.sdk | tr -d '\r')"

# نصب RELEASE (حین پنجرهٔ پایدار)
"$ADB" -s emulator-5554 uninstall com.rahyarai.app >/dev/null 2>&1
"$ADB" -s emulator-5554 push "$REL" /data/local/tmp/rel.apk >/dev/null 2>&1
RI=$("$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/rel.apk 2>&1 | tr -d '\r')
log "release install: [$RI]"
echo "$RI  (crashdiag2 $(date -u '+%H:%M:%S'))" >> "$RPT/emu-release-install.txt"
capture release com.rahyarai.app

# کنترل: DEBUG
"$ADB" -s emulator-5554 uninstall com.rahyarai.app >/dev/null 2>&1
"$ADB" -s emulator-5554 push "$DBG" /data/local/tmp/dbg.apk >/dev/null 2>&1
DI=$("$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/dbg.apk 2>&1 | tr -d '\r')
log "debug install: [$DI]"
capture debug com.rahyarai.app

echo "== RESULT ==" | tee -a "$OUT"
grep -E "BOOT_COMPLETED|install:|am start|crashlog|shot|mCurrentFocus|FATAL|Process:" "$OUT" | tail -25
pkill -9 -f qemu-system 2>/dev/null || true
decoys_stop
"$ADB" kill-server 2>/dev/null || true
echo "== CRASHDIAG2 done $(date -u '+%H:%M:%S') ==" | tee -a "$OUT"
