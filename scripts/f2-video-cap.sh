#!/bin/bash
# F2-VIDEO-CAP: ضبط ویدیوی واقعی اجرا — چارچوب‌بندی screencap هر ۱.۲ ثانیه
# سپس مونتاژ با ffmpeg (H.264). ضبط تا توقف؛ مونتاژ جداگانه.
set -u
ROOT=/home/z/my-project
ADB=$ROOT/artifacts/android-sdk/platform-tools/adb
FR=$ROOT/artifacts/device-demo/frames
mkdir -p "$FR"
N=0
while [ $N -lt 900 ]; do
  "$ADB" -s emulator-5554 exec-out screencap -p > "$FR/$(printf '%05d' $N).png" 2>/dev/null
  SZ=$(stat -c%s "$FR/$(printf '%05d' $N).png" 2>/dev/null || echo 0)
  [ "$SZ" -lt 2000 ] && rm -f "$FR/$(printf '%05d' $N).png"
  N=$((N+1))
  sleep 1.2
done
echo "capture finished: $N frames" >> "$ROOT/artifacts/logs/demo-cycle.log"
