#!/bin/bash
# F2-CRASH-HUNT: در پنجرهٔ کوتاه پس از بوت — استک کرش + تصویر + اجرای دوباره اپ
set -uo pipefail
ADB=/home/z/my-project/artifacts/android-sdk/platform-tools/adb
OUT=/home/z/my-project/artifacts/evidence
mkdir -p "$OUT"
S=emulator-5554

for i in $(seq 1 120); do
  ON=$($ADB devices 2>/dev/null | grep -c "$S\b" || true)
  [ "$ON" -ge 1 ] && break
  sleep 5
done
echo "device online $(date -u)"
timeout 120 $ADB -s $S wait-for-device 2>/dev/null || true

B=0
for i in $(seq 1 150); do
  B=$(timeout 25 $ADB -s $S shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$B" = "1" ] && break
  sleep 6
done
echo "boot_completed=$B $(date -u)"
[ "$B" = "1" ] || exit 1

# فوراً پس از بوت:
timeout 20 $ADB -s $S shell 'logcat -d -b crash' > "$OUT/crash-buffer.txt" 2>/dev/null || true
timeout 20 $ADB -s $S shell 'logcat -d | grep -iE "rahyar|FATAL|AndroidRuntime" | tail -60' > "$OUT/crash-grep.txt" 2>/dev/null || true
timeout 15 $ADB -s $S exec-out screencap -p > "$OUT/c1-postboot.png" 2>/dev/null || true

# اجرای دوبارهٔ اپ و گرفتن تصویر واقعی
timeout 15 $ADB -s $S shell am start -n com.rahyarai.app/.HomeActivity 2>&1 | head -3
sleep 10
timeout 15 $ADB -s $S exec-out screencap -p > "$OUT/c2-app-relaunch.png" 2>/dev/null || true
timeout 20 $ADB -s $S shell 'logcat -d -b crash | tail -40' > "$OUT/crash-buffer2.txt" 2>/dev/null || true
timeout 15 $ADB -s $S shell 'dumpsys window | grep -E "mCurrentFocus" | head -2' > "$OUT/focus.txt" 2>/dev/null || true

echo "== crash hunt done =="
head -40 "$OUT/crash-buffer2.txt" 2>/dev/null
cat "$OUT/focus.txt" 2>/dev/null
