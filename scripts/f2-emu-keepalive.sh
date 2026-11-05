#!/bin/bash
# F2-EMU-KEEPALIVE: نگه‌داشت مداوم شبیه‌ساز — مرگ qemu (OOM سراسری محیط) →
# راه‌اندازی دوباره با همان پرچم‌ها، محافظت oom_score_adj روی فرایند واقعی
# هر ۵ ثانیه، پس از هر بوت: نصب APK (اگر نبود) + اجرای HomeActivity.
# وضعیت صادقانه در لاگ؛ هیچ ادعای زنده‌ماندن بدون بررسی واقعی.
set -u
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
APK=$ROOT/artifacts/android-build/out/Rahyar-Android-v2.1.0-debug.apk
AVD_DIR=$HOME/.android/avd/rahyar24.avd
LOG=$ROOT/artifacts/logs/keepalive.log
QLOG=/tmp/emulator-qemu.log
SERIAL=emulator-5554
export ANDROID_HOME=$SDK

log() { echo "[$(date -u +%F' '%T)] $*" >> "$LOG"; }

launch_qemu() {
  rm -f "$AVD_DIR"/*.lock 2>/dev/null || true
  nohup "$SDK/emulator/emulator" -avd rahyar24 \
    -no-window -no-audio -no-boot-anim -no-accel \
    -gpu swiftshader_indirect -memory 640 -cores 1 \
    -camera-back none -camera-front none \
    -no-snapshot -no-metrics \
    -qemu -tb-size 134217728 >> "$QLOG" 2>&1 &
  log "qemu launched (parent $!)"
}

ensure_app() {
  timeout 20 "$ADB" -s $SERIAL shell true >/dev/null 2>&1 || return 1
  if ! timeout 15 "$ADB" -s $SERIAL shell pm list packages 2>/dev/null | grep -q com.rahyarai.app; then
    [ -f "$APK" ] && timeout 120 "$ADB" -s $SERIAL install -r "$APK" >> "$LOG" 2>&1 && log "APK installed"
  fi
  timeout 15 "$ADB" -s $SERIAL shell am start -n com.rahyarai.app/.HomeActivity >> "$LOG" 2>&1 && log "HomeActivity started"
}

CYCLE=0
log "=== keepalive started (pid $$) ==="
while true; do
  CYCLE=$((CYCLE+1))
  # محافظت OOM — روی همهٔ فرایندهای واقعی qemu-system هر ۵ ثانیه
  for QP in $(pgrep -f qemu-system); do
    [ -w "/proc/$QP/oom_score_adj" ] && echo -300 > "/proc/$QP/oom_score_adj" 2>/dev/null
  done

  if ! pgrep -f qemu-system >/dev/null; then
    log "QEMU_DEAD (cycle $CYCLE) → relaunch"
    launch_qemu
    sleep 20
    continue
  fi

  # اگر دستگاه آنلاین و بوت‌شده است — اپ را تضمین کن (هر ۲۰ دور = ~۱۰۰ ثانیه)
  if [ $((CYCLE % 20)) -eq 0 ]; then
    BOOT=$("$ADB" -s $SERIAL shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    if [ "$BOOT" = "1" ]; then
      if ! timeout 10 "$ADB" -s $SERIAL shell dumpsys window 2>/dev/null | grep -q "rahyarai"; then
        ensure_app
      fi
    fi
  fi
  sleep 5
done
