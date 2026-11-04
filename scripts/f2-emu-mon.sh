#!/bin/bash
# F2-EMU-MON: ثبت logcat مهمان + RSS میزبان هر ۸ ثانیه — برای تشخیص فاز مرگ OOM
ADB=/home/z/my-project/artifacts/android-sdk/platform-tools/adb
OUT=/tmp/emu-mon.log
: > "$OUT"
for i in $(seq 1 400); do
  R=$(pgrep -f qemu-system-x86 | head -1)
  if [ -n "$R" ]; then
    RSS=$(awk '/VmRSS/{print int($2/1024)}' /proc/$R/status 2>/dev/null)
    LC=$("$ADB" -s emulator-5554 logcat -d -t 12 2>/dev/null | tail -8 | tr '\n' '|' | cut -c1-400)
    echo "[$(date -u +%H:%M:%S)] rss=${RSS:-?} $LC" >> "$OUT"
  else
    echo "[$(date -u +%H:%M:%S)] QEMU_DEAD" >> "$OUT"
    sleep 20
  fi
  sleep 8
done
