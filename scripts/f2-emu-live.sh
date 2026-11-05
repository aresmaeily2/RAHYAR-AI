#!/bin/bash
# F2-EMU-LIVE: بوت پایدار (-m 768 ضد-OOM) + نصب/اجرای release + ویدیوی زندهٔ پنل — همه در یک پنجره
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
REL_APK=$ROOT/download/RahyAr-Android/Rahyar-Android-v2.1.0-release.apk
export ANDROID_HOME=$SDK
exec >> "$ROOT/artifacts/logs/emulator-live.log" 2>&1
echo "== LIVE chain started $(date -u '+%H:%M:%S') =="

pkill -9 -f qemu-system 2>/dev/null || true
"$ADB" kill-server 2>/dev/null || true
sleep 2

# سرور وب فقط اگر بالا نیست راه اندازی شود
echo "web on platform port 3000 (supervisor-owned)"


if [ ! -s "$ROOT/artifacts/emu/userdata24.img" ]; then
  mkdir -p "$ROOT/artifacts/emu"
  "$SDK/emulator/bin64/mkfs.ext4" -F -q -O ^has_journal,^resize_inode -b 4096 -I 256 -L userdata "$ROOT/artifacts/emu/userdata24.img" 1100M
fi
AVD_DIR=$HOME/.android/avd/rahyar24.avd
rm -f "$AVD_DIR"/userdata-qemu.img.qcow2 "$AVD_DIR"/cache.img.qcow2 "$AVD_DIR"/*.lock 2>/dev/null || true
cp --sparse=always -f "$ROOT/artifacts/emu/userdata24.img" "$AVD_DIR/userdata-qemu.img"

nohup "$SDK/emulator/emulator" -avd rahyar24 \
  -no-window -no-audio -no-boot-anim -no-accel \
  -gpu none -cores 2 \
  -camera-back none -camera-front none \
  -no-snapshot -no-metrics -qemu -tb-size 67108864 -m 768 \
  >> /tmp/emulator-qemu.log 2>&1 &
echo "qemu launcher started"

timeout 150 "$ADB" wait-for-device
BOOTED=""
for i in $(seq 1 40); do
  pgrep -f qemu-system >/dev/null || { echo "qemu died at poll $i"; break; }
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$B" = "1" ] && { BOOTED=yes; echo "BOOT_COMPLETED $(date -u '+%H:%M:%S')"; break; }
  sleep 7
done

if [ -n "$BOOTED" ]; then
  "$ADB" -s emulator-5554 push "$REL_APK" /data/local/tmp/rahyar-release.apk >/dev/null 2>&1
  R=$("$ADB" -s emulator-5554 shell pm install -r /data/local/tmp/rahyar-release.apk 2>&1 | tr -d '\r')
  echo "release install: [$R]"
  echo "$R" | rg -q Success && "$ADB" -s emulator-5554 shell am start -n com.rahyarai.app/.HomeActivity 2>&1 | tr -d '\r' | head -1
  sleep 6
  "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | rg mCurrentFocus | tr -d '\r' | head -1
  mkdir -p "$ROOT/artifacts/panel-shots"
  "$ADB" -s emulator-5554 exec-out screencap -p > "$ROOT/artifacts/panel-shots/apk-home-release.png" 2>/dev/null
  ls -la "$ROOT/artifacts/panel-shots/apk-home-release.png" | tr -d '\r'
  echo "RSS now: $(ps aux | rg qemu-system | rg -v rg | awk '{print int($6/1024)"MB"}' | head -1)"
fi

# ویدیوی پنل — حتی اگر بوت نیمه‌کاره ماند، وضعیت صادقانه ثبت می‌شود
for w in $(seq 1 60); do curl -s -o /dev/null --max-time 4 http://127.0.0.1:3000/login 2>/dev/null && break; sleep 4; done
echo "== recording panel video (60s) $(date -u '+%H:%M:%S') =="
cd "$ROOT" && timeout 150 node scripts/f2-panel-video-live.mjs 2>&1 | tail -2
V=$(ls -t download/RahyAr-Android/videos/*.mp4 2>/dev/null | head -1)
[ -n "$V" ] && mv -f "$V" download/RahyAr-Android/videos/emulator-panel-owner-live-$(date -u +%m%d-%H%M).mp4
ls -la download/RahyAr-Android/videos/ | tail -3 | tr -d '\r'
echo "RSS end: $(ps aux | rg qemu-system | rg -v rg | awk '{print int($6/1024)"MB"}' | head -1)"
echo "== LIVE chain done $(date -u '+%H:%M:%S') =="
pkill -f rahyar_decoy_marker 2>/dev/null || true
