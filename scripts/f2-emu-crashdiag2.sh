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

decoys_start(){ # F3: تعداد/حجم از محیط — پیش‌فرض 4x150 برای سیکل‌های فقیر
  DECOY_PIDS=()
  local N=${DECOY_N:-4} MB=${DECOY_MB:-150}
  for i in $(seq 1 "$N"); do
    setsid python3 -c "
b = bytearray($MB*1024*1024)
for i in range(0, len(b), 4096): b[i] = 1
import time; time.sleep(3600)
" >/dev/null 2>&1 &
    local P=$!
    echo 1000 > /proc/$P/oom_score_adj 2>/dev/null || true
    DECOY_PIDS+=("$P")
  done
  log "decoys: ${DECOY_PIDS[*]:-none} (${N}x${MB}MB adj=1000)"
}

# F3: استخراج الگوهای الزامی مأموریت (2.8) از لاگ خام
grep_focus(){ # $1=name
  grep -hE "AndroidRuntime|FATAL EXCEPTION|am_crash|lmkd|ActivityManager|chromium|cr_|WebView|Permission|UnsatisfiedLink|ClassNotFound|NoClassDefFound" \
    "$LOGD/logcat-$1.log" "$LOGD/crashbuf-$1.log" 2>/dev/null | head -80 > "$LOGD/focus-$1.log"
  log "focus[$1]: $(wc -l < "$LOGD/focus-$1.log") خط الگو"
}

# F3: دامپ کامل زمان‌دار (2.7)
dump_logcat(){ # $1=name
  "$ADB" -s emulator-5554 shell logcat -v time -d > "$LOGD/logcat-$1.log" 2>&1
  "$ADB" -s emulator-5554 shell logcat -b crash -v time -d > "$LOGD/crashbuf-$1.log" 2>&1
  grep_focus "$1"
  log "logcat[$1]: $(wc -l < "$LOGD/logcat-$1.log") + crashbuf $(wc -l < "$LOGD/crashbuf-$1.log") خط"
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

capture(){ # $1=tag $2=package — F3: logcat -c قبل از اجرا برای سیگنال تمیز
  local TAG=$1 PKG=$2
  log "[$TAG] am start"
  "$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
  "$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" 2>&1 | tr -d '\r' >> "$OUT"
  echo >> "$OUT"
  sleep 8
  "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp" | head -2 | tr -d '\r' > "$LOGD/focus-$TAG.txt"
  cat "$LOGD/focus-$TAG.txt" >> "$OUT"; echo >> "$OUT"
  dump_logcat "$TAG"
  grep -E "FATAL EXCEPTION|Process: " "$LOGD/crashbuf-$TAG.log" 2>/dev/null | head -4 | tr -d '\r' >> "$OUT" || true
  grep -q "FATAL" "$LOGD/crashbuf-$TAG.log" 2>/dev/null || echo "(crash buffer empty)" >> "$OUT"
  "$ADB" -s emulator-5554 exec-out screencap -p > "$LOGD/shot-$TAG.png" 2>/dev/null
  log "shot[$TAG]: $(file -b "$LOGD/shot-$TAG.png" 2>/dev/null)"
  "$ADB" -s emulator-5554 shell am force-stop "$PKG" >/dev/null 2>&1
}

rel_focus(){ grep -q "com.rahyarai.app" "$LOGD/focus-$1.txt" 2>/dev/null; }

: > "$OUT"
trap 'pkill -9 -f qemu-system 2>/dev/null; decoys_stop; "$ADB" kill-server 2>/dev/null' EXIT

echo "== CRASHDIAG2 $(date -u '+%Y-%m-%d %H:%M:%S') ==" | tee -a "$OUT"
free -m | head -2 >> "$OUT"
log "MemAvailable: $(awk '/MemAvailable/{print $2}' /proc/meminfo)KB"

# F3-2.3: سقف امن — با منابع ناکافی شبیه‌ساز به‌اجرا درنمی‌آید (حفاظت OOM فرایندهای دیگر)
AV0=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
if [ "${AV0:-0}" -lt 1900 ]; then
  log "ABORT: MemAvailable=${AV0}MB < 1900MB — طبق مأموریت 2.3 شبیه‌ساز اجرا نمی‌شود (BLOCKED)"
  echo "RESULT: BLOCKED MemAvailable=${AV0}MB"
  cat "$OUT"; exit 2
fi
log "memory gate passed: ${AV0}MB >= 1900MB"

# userdata پاک
EMU_IMG=$ROOT/artifacts/emu/userdata24.img
MKFS=$SDK/emulator/bin64/mkfs.ext4
[ -x "$MKFS" ] || MKFS=$(command -v mkfs.ext4 || true)
if [ ! -s "$EMU_IMG" ]; then
  "$MKFS" -F -q -O ^has_journal,^resize_inode -b 4096 -I 256 -L userdata "$EMU_IMG" 1100M && log "PRISTINE_USERDATA_OK"
fi
AVD_DIR=$HOME/.android/avd/rahyar24.avd
cp --sparse=always -f "$EMU_IMG" "$AVD_DIR/userdata-qemu.img"
sync
sleep 5
log "post-copy sync done (writeback flush before qemu)"
sed -i 's|^disk.dataPartition.path.*|disk.dataPartition.path = userdata-qemu.img|' "$AVD_DIR/config.ini"
sed -i 's|^hw.lcd.width=.*|hw.lcd.width = 720|; s|^hw.lcd.height=.*|hw.lcd.height = 1520|; s|^hw.lcd.density=.*|hw.lcd.density = 280|' "$AVD_DIR/config.ini"

decoys_start
boot_one "${G1:-512}" || { log "retry at ${G2:-640}"; boot_one "${G2:-640}" || { echo "RESULT: no boot"; cat "$OUT"; exit 1; }; }
T_MISSION=$(date +%s)
left(){ echo $(( 540 - $(date +%s) + T_MISSION )); }

log "ver=$( "$ADB" -s emulator-5554 shell getprop ro.build.version.release | tr -d '\r') sdk=$( "$ADB" -s emulator-5554 shell getprop ro.build.version.sdk | tr -d '\r')"

# ---- F3-2.7 مرحلهٔ ۱: logcat قبل از نصب (clean install) ----
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
dump_logcat preinstall

# ---- F3-2.6: clean install RELEASE + لاگ حین/پس از نصب ----
"$ADB" -s emulator-5554 uninstall com.rahyarai.app >/dev/null 2>&1
"$ADB" -s emulator-5554 push "$REL" /data/local/tmp/rel.apk >/dev/null 2>&1
RI=$("$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/rel.apk 2>&1 | tr -d '\r')
log "release install: [$RI]"
echo "$RI  (f3 clean-install $(date -u '+%H:%M:%S'))" >> "$RPT/emu-release-install.txt"
dump_logcat install-release

# ---- F3-2.7 مرحلهٔ ۳: اولین اجرا + پس از نتیجه ----
capture release-run1 com.rahyarai.app

# ---- F3-2.10: اگر اجرا شد → اجرای مجدد (بستن/بازکردن) + ریبوت دستگاه — ۳ اجرای متوالی ----
if rel_focus release-run1; then
  log "RELEASE RUN1 OK — relaunch test"
  capture release-run2 com.rahyarai.app
  if rel_focus release-run2 && [ "$(left)" -gt 200 ]; then
    log "RELEASE RUN2 OK — device reboot test ($(left))s left"
    "$ADB" -s emulator-5554 reboot >/dev/null 2>&1
    for i in $(seq 1 18); do
      B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
      [ "$B" = "1" ] && { log "REBOOT_COMPLETED try $i"; break; }
      sleep 7
    done
    capture release-run3 com.rahyarai.app
  fi
fi

# ---- F3-2.9: کنترل DEBUG روی همان محیط و مراحل نصب یکسان ----
"$ADB" -s emulator-5554 uninstall com.rahyarai.app >/dev/null 2>&1
"$ADB" -s emulator-5554 push "$DBG" /data/local/tmp/dbg.apk >/dev/null 2>&1
DI=$("$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/dbg.apk 2>&1 | tr -d '\r')
log "debug install: [$DI]"
dump_logcat install-debug
capture debug-run1 com.rahyarai.app

# ---- نتیجهٔ نهایی ----
echo "== RESULT ==" | tee -a "$OUT"
grep -E "BOOT_COMPLETED|REBOOT_COMPLETED|install:|focus-|crashlog|shot\[|FATAL|Process:|ABORT" "$OUT" | tail -30
echo "-- focus files --"; for f in "$LOGD"/focus-*.txt; do echo "$f: $(head -c 120 "$f" 2>/dev/null)"; done
pkill -9 -f qemu-system 2>/dev/null || true
decoys_stop
"$ADB" kill-server 2>/dev/null || true
echo "== CRASHDIAG2 done $(date -u '+%H:%M:%S') ==" | tee -a "$OUT"
