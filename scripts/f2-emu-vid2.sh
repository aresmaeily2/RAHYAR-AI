#!/bin/bash
# F2-EMU-VID2: ضبط پنل در حین بوت — زمان‌بندی بر اساس منحنی RSS qemu
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
export ANDROID_HOME=$SDK
exec >> "$ROOT/artifacts/logs/emulator-live.log" 2>&1
echo "== VID2 started $(date -u '+%H:%M:%S') =="

pkill -9 -f qemu-system 2>/dev/null || true
pkill -f "standalone/server.js" 2>/dev/null || true
"$ADB" kill-server 2>/dev/null || true
sleep 2

AVD_DIR=$HOME/.android/avd/rahyar24.avd
rm -f "$AVD_DIR"/userdata-qemu.img.qcow2 "$AVD_DIR"/cache.img.qcow2 "$AVD_DIR"/*.lock 2>/dev/null || true
cp --sparse=always -f "$ROOT/artifacts/emu/userdata24.img" "$AVD_DIR/userdata-qemu.img"

# سرور پروداکشن سبک — زودتر بالا بیاید
NODE_ENV=production PORT=3001 nohup node "$ROOT/.next/standalone/server.js" > /tmp/next-prod.log 2>&1 &
echo "prod server starting"

nohup "$SDK/emulator/emulator" -avd rahyar24 \
  -no-window -no-audio -no-boot-anim -no-accel \
  -gpu none -cores 2 \
  -camera-back none -camera-front none \
  -no-snapshot -no-metrics -qemu -tb-size 67108864 -m 768 \
  >> /tmp/emulator-qemu.log 2>&1 &
echo "qemu starting $(date -u '+%H:%M:%S')"

# توقف ۲۵ ثانیه — qemu در فاز اولیه ~1-1.5GB است؛ سرور هم بالا آمده
sleep 25
curl -s -o /dev/null -w "prod-ready:%{http_code}\n" --max-time 30 http://127.0.0.1:3001/login

# ضبط ۴۵ ثانیه‌ای در حین بوت
echo "== recording 45s during boot $(date -u '+%H:%M:%S') =="
sed -i 's|waitForTimeout(60000)|waitForTimeout(45000)|' "$ROOT/scripts/f2-panel-video-prod.mjs"
cd "$ROOT"
OUT=$(timeout 120 node scripts/f2-panel-video-prod.mjs 2>&1 | tail -3)
echo "$OUT"
if echo "$OUT" | rg -q "DONE panel video"; then
  V=$(ls -t download/RahyAr-Android/videos/*.mp4 2>/dev/null | rg -v "owner-90s|web-live" | head -1)
  [ -n "$V" ] && mv -f "$V" download/RahyAr-Android/videos/emulator-panel-owner-live-$(date -u +%m%d-%H%M).mp4 && echo "VIDEO_SAVED"
fi

# ادامه: صبر برای بوت کامل + نصب release (بعد از پایان ضبط)
timeout 200 "$ADB" wait-for-device
for i in $(seq 1 30); do
  pgrep -f qemu-system >/dev/null || { echo "qemu died at poll $i"; break; }
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$B" = "1" ] && { echo "BOOT_COMPLETED $(date -u '+%H:%M:%S')"; break; }
  sleep 7
done
REL_APK=$ROOT/download/RahyAr-Android/Rahyar-Android-v2.1.0-release.apk
"$ADB" -s emulator-5554 push "$REL_APK" /data/local/tmp/rahyar-release.apk >/dev/null 2>&1
R=$("$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/rahyar-release.apk 2>&1 | tr -d '\r')
echo "release install: [$R]"

ls -la "$ROOT/download/RahyAr-Android/videos/" | tail -4 | tr -d '\r'
echo "== VID2 done $(date -u '+%H:%M:%S') =="
