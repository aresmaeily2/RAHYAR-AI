#!/bin/bash
# F2-EMU-BOOT: بوت شبیه‌ساز اندروید (TCG نرم‌افزاری — بدون KVM) + نصب و اجرای خودکار اپ رهیار
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
APK_GLOB="$ROOT/artifacts/android-build/out/Rahyar-Android-v2.1.0-debug.apk"
LOG=$ROOT/artifacts/logs/emulator.log
mkdir -p "$ROOT/artifacts/logs"
export ANDROID_HOME=$SDK
exec >> "$LOG" 2>&1

echo "== boot wrapper started $(date -u) =="

# AVD تضمین‌شده (اگر setup هنوز نساخته باشد)
if ! "$SDK/emulator/emulator" -list-avds 2>/dev/null | grep -q rahyar; then
  echo no | "$SDK/cmdline-tools/latest/bin/avdmanager" --sdk_root=$SDK create avd \
    -n rahyar -k "system-images;android-30;default;x86_64" -d pixel_5 --force
fi

# پاک‌سازی قفل‌های قبلی
AVD_DIR=$HOME/.android/avd/rahyar.avd
rm -f "$AVD_DIR"/*.lock 2>/dev/null || true

# F2-EMU: دادهٔ از پیش ساخته‌شده — رفع محدودیت Disk-Space (لانچر v37 برای
# تصاویر dynamic-partition اندازهٔ 6GB خودخوان می‌سازد و از disk.dataPartition.size
# نمی‌پذیرد). ما ext4 1.2GB با mkfs.ext4 خودِ SDK می‌سازیم، داخل AVD dir می‌گذاریم
# و config.ini را به آن نشان می‌دهیم؛ qcow2-همپوشانی روی همین فایل ساخته می‌شود.
EMU_IMG=$ROOT/artifacts/emu/userdata-qemu.img
if [ ! -s "$EMU_IMG" ]; then
  mkdir -p "$ROOT/artifacts/emu"
  "$SDK/emulator/bin64/mkfs.ext4" -F -q -O ^has_journal,^resize_inode -b 4096 -I 256 -L userdata \
    "$EMU_IMG" 1200M
fi
cp -f "$EMU_IMG" "$AVD_DIR/userdata-qemu.img"
sed -i 's|^disk.dataPartition.path.*|disk.dataPartition.path = userdata-qemu.img|' "$AVD_DIR/config.ini"
rm -f "$AVD_DIR"/*.qcow2 2>/dev/null || true   # بوت سرد هر بار — بازسازی همپوشانی

"$ADB" start-server 2>/dev/null || true

# ── F2-EMU WATCHDOG: TCG boot is fragile (OOM kills) — relaunch qemu until success ──
launch_qemu() {
  rm -f "$AVD_DIR"/*.lock 2>/dev/null || true
  nohup "$SDK/emulator/emulator" -avd rahyar \
    -no-window -no-audio -no-boot-anim -no-accel \
    -gpu swiftshader_indirect -memory 1024 -cores 2 \
    -camera-back none -camera-front none \
    -no-snapshot -no-metrics \
    -qemu -tb-size 268435456 \
    \
    >> /tmp/emulator-qemu.log 2>&1 &
  echo "qemu relaunched PID $! at $(date -u +%H:%M:%S)"
}

BOOTED=""
for ATTEMPT in 1 2 3 4 5 6; do
  launch_qemu
  echo "== attempt $ATTEMPT: waiting for device (10 min) =="
  timeout 600 "$ADB" wait-for-device && {
    echo "== device online — polling sys.boot_completed (up to 30 min) =="
    for i in $(seq 1 180); do
      pgrep -f qemu-system >/dev/null || { echo "qemu died at poll $i"; break; }
      B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
      if [ "$B" = "1" ]; then BOOTED=yes; echo "boot completed at try $i"; break; fi
      sleep 10
    done
  } || echo "wait-for-device timeout attempt $ATTEMPT"
  [ -n "$BOOTED" ] && break
  echo "== killing leftovers, retrying =="
  pkill -f qemu-system 2>/dev/null; sleep 5
done
[ -n "$BOOTED" ] || { echo "BOOT_TIMEOUT_ALL_ATTEMPTS"; exit 1; }

"$ADB" -s emulator-5554 shell getprop ro.build.version.release
"$ADB" -s emulator-5554 shell getprop ro.product.cpu.abi

echo "== install RahyAr debug APK =="
for i in $(seq 1 12); do
  ls "$APK_GLOB" >/dev/null 2>&1 && break
  echo "apk not ready yet ($i) — waiting 30s"; sleep 30
done
"$ADB" -s emulator-5554 install -r "$APK_GLOB" || { echo "INSTALL_FAILED"; exit 1; }

echo "== launch HomeActivity =="
"$ADB" -s emulator-5554 shell am start -n com.rahyarai.app/.HomeActivity
sleep 6
"$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp" | head -2
echo "== EMU_BOOT_DONE $(date -u) =="
