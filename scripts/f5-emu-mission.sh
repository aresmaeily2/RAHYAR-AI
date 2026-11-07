#!/bin/bash
# F5-EMU-MISSION: single self-contained emulator run — boot (F4 512MB technique),
# release install + 3 launches (fresh/force-stop/reboot), logcat+crash evidence,
# screenshots, and REAL on-device bank-SMS receiver tests (debug build + run-as consent).
set -uo pipefail
cd /home/z/my-project
SDK=$PWD/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
EMU=$SDK/emulator/emulator
OUT=artifacts/reports/f5/emu
mkdir -p "$OUT"
MAIN=/tmp/f5-emu-mission.log
{
echo "===== F5-EMU-MISSION $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
AVAIL=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
echo "mem-available-mb=$AVAIL (gate 1900)"
[ "$AVAIL" -lt 1900 ] && { echo "MEMORY-GATE-FAIL — honest BLOCKED, no destructive retry"; exit 1; }

# ── 1. emulator + system-image + AVD (recover if missing) ──
export ANDROID_HOME=$SDK
if [ ! -x "$EMU" ]; then
  echo "== installing emulator =="
  "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root=$SDK "platform-tools" "emulator" 2>&1 | tail -1
fi
[ -x "$EMU" ] || { echo "EMU-MISSING"; exit 1; }
if [ ! -d "$SDK/system-images/android-24/default/x86" ]; then
  echo "== installing system-image API24 x86 (~1.2GB) =="
  yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root=$SDK --licenses >/dev/null 2>&1
  "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root=$SDK "system-images;android-24;default;x86" 2>&1 | tail -1
fi
if ! "$EMU" -list-avds 2>/dev/null | grep -q rahyar24; then
  echo "== creating AVD rahyar24 =="
  echo no | "$SDK/cmdline-tools/latest/bin/avdmanager" create avd -n rahyar24 -k "system-images;android-24;default;x86" --force 2>&1 | tail -1
  # F2: پیش‌ساختهٔ ext4 userdata (v37 launcher dynamic-partition را نادیده می‌گیرد)
  MKFS=$SDK/emulator/bin64/mkfs.ext4
  AVDDIR=$(ls -d ~/.config/.android/avd/rahyar24.avd 2>/dev/null || ls -d ~/.android/avd/rahyar24.avd 2>/dev/null | head -1)
  echo "AVDDIR=$AVDDIR"
  if [ -n "$AVDDIR" ] && [ -x "$MKFS" ]; then
    rm -f "$AVDDIR/userdata.img"
    "$MKFS" -F -L data -I 64m -O ^has_journal "$AVDDIR/userdata.img" 1200M >/dev/null 2>&1 && echo "userdata.img prebuilt 1200M"
  fi
fi

# ── 2. boot (F4 technique: stale ini cleanup + explicit -memory) ──
pkill -9 -f qemu-system 2>/dev/null || true; sleep 1
AVDDIR=$(ls -d ~/.config/.android/avd/rahyar24.avd 2>/dev/null || ls -d ~/.android/avd/rahyar24.avd 2>/dev/null | head -1)
rm -f "$AVDDIR"/hardware-qemu.ini.lock "$AVDDIR"/multiinstance.lock 2>/dev/null
rm -f ~/.android/avd/rahyyar24* 2>/dev/null
GM=512
echo "== booting emulator guest=${GM}MB $(date -u '+%H:%M:%S') =="
nohup "$EMU" -avd rahyar24 -no-window -no-audio -no-boot-anim -no-accel -gpu swiftshader_indirect -cores 1 \
  -memory $GM -no-snapshot \
  >> /tmp/f5-qemu.log 2>&1 &
disown 2>/dev/null || true
T0=$(date +%s); BOOTED=0
for i in $(seq 1 150); do
  pgrep -f qemu-system >/dev/null || { echo "QEMU_DIED poll$i (+$(( $(date +%s)-T0 ))s)"; tail -6 /tmp/f5-qemu.log; break; }
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [ "$B" = "1" ]; then BOOTED=1; echo "EMU_BOOT_DONE +$(( $(date +%s)-T0 ))s"; break; fi
  sleep 2
done
[ "$BOOTED" = "1" ] || { echo "RESULT: no boot — BLOCKED (honest)"; tail -10 /tmp/f5-qemu.log | tee -a "$OUT/no-boot.log"; pkill -9 -f qemu-system; exit 1; }
"$ADB" -s emulator-5554 shell getprop ro.build.version.release | tr -d '\r' | xargs echo "android-version="
"$ADB" -s emulator-5554 shell getprop ro.build.version.sdk | tr -d '\r' | xargs echo "sdk="

# ── 3. RELEASE install + 3 launches (fresh / force-stop / reboot) ──
REL=download/RahyAr-F5/Rahyar-user-v2.2.0-release.apk
DBG=download/RahyAr-F5/Rahyar-user-v2.2.0-debug.apk
PKG=com.rahyarai.app
dump_logs(){ # tag
  "$ADB" -s emulator-5554 shell logcat -v time -d > "$OUT/logcat-$1.log" 2>&1
  "$ADB" -s emulator-5554 shell logcat -b crash -v time -d > "$OUT/crashbuf-$1.log" 2>&1
  "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp" | head -2 | tr -d '\r' > "$OUT/focus-$1.txt"
  "$ADB" -s emulator-5554 exec-out screencap -p > "$OUT/shot-$1.png" 2>/dev/null
  echo "evidence-$1: logcat=$(wc -l < "$OUT/logcat-$1.log")L crash=$(wc -c < "$OUT/crashbuf-$1.log")B focus=$(head -c 80 "$OUT/focus-$1.txt")"
}
echo "== install RELEASE v2.2.0 =="
"$ADB" -s emulator-5554 uninstall $PKG >/dev/null 2>&1
INS=$("$ADB" -s emulator-5554 install -r "$REL" 2>&1 | tail -1); echo "install-release => $INS"
echo "$INS" > "$OUT/install-release.txt"
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
echo "== run1 fresh launch =="
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" 2>&1 | tr -d '\r' | head -2
sleep 8; dump_logs fix1-run1
CR1=$(grep -c "FATAL EXCEPTION\|has stopped\|Force finishing activity" "$OUT/logcat-fix1-run1.log" 2>/dev/null || true)
echo "run1 crash-indicators=$CR1 (expect 0)"
echo "== run2 force-stop relaunch =="
"$ADB" -s emulator-5554 shell am force-stop $PKG >/dev/null 2>&1; sleep 2
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1
sleep 8; dump_logs fix1-run2
CR2=$(grep -c "FATAL EXCEPTION\|has stopped" "$OUT/logcat-fix1-run2.log" 2>/dev/null || true)
echo "run2 crash-indicators=$CR2 (expect 0)"
echo "== run3 after device reboot =="
"$ADB" -s emulator-5554 reboot >/dev/null 2>&1
T1=$(date +%s); RB=0
for i in $(seq 1 120); do
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$B" = "1" ] && { RB=1; echo "REBOOT_DONE +$(( $(date +%s)-T1 ))s"; break; }
  sleep 3
done
[ "$RB" = "1" ] || echo "reboot-wait-timeout (continuing)"
sleep 4
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1
sleep 8; dump_logs fix1-run3
CR3=$(grep -c "FATAL EXCEPTION\|has stopped" "$OUT/logcat-fix1-run3.log" 2>/dev/null || true)
echo "run3 crash-indicators=$CR3 (expect 0)"

# ── 4. REAL bank-SMS receiver tests (debug build — run-as for consent pref) ──
echo "== SMS E2E on DEBUG build =="
"$ADB" -s emulator-5554 uninstall $PKG >/dev/null 2>&1
INS2=$("$ADB" -s emulator-5554 install -r "$DBG" 2>&1 | tail -1); echo "install-debug => $INS2"
echo "$INS2" > "$OUT/install-debug.txt"
"$ADB" -s emulator-5554 shell pm grant $PKG android.permission.RECEIVE_SMS 2>&1 | tr -d '\r'
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
# T-A: consent OFF (default) — هیچ پردازشی نباید انجام شود
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 3,500,000 ریال بانک ملت" >/dev/null 2>&1
sleep 5
LA=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r')
echo "sms-test-A-consent-off => $(echo "$LA" | grep RahyarSms | tail -2 | tr '\n' ' | ')"
echo "$LA" > "$OUT/sms-test-A.log"
# T-B: consent ON (run-as prefs write) — کاندید باید پذیرفته و صف شود
"$ADB" -s emulator-5554 shell run-as $PKG sh -c 'mkdir -p shared_prefs && cat > shared_prefs/rahyar_consents.xml <<XML
<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<map><boolean name="sms_consent" value="true" /><boolean name="sms_asked" value="true" /></map>
XML' 2>&1 | tr -d '\r'
"$ADB" -s emulator-5554 shell am force-stop $PKG >/dev/null 2>&1
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 3,500,000 ریال بانک ملت" >/dev/null 2>&1
sleep 6
LB=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r')
echo "sms-test-B-bank-accepted => $(echo "$LB" | grep RahyarSms | tail -3 | tr '\n' ' | ')"
echo "$LB" > "$OUT/sms-test-B.log"
"$ADB" -s emulator-5554 exec-out screencap -p > "$OUT/shot-sms-notification.png" 2>/dev/null
# ضدتکرار محلی: همان پیامک دوباره
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 3,500,000 ریال بانک ملت" >/dev/null 2>&1
sleep 5
LB2=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r')
echo "sms-test-C-dedup (queue-size must stay 1) => $(echo "$LB2" | grep 'queued' | tail -2 | tr '\n' ' | ')"
echo "$LB2" > "$OUT/sms-test-C.log"
# T-D: پیامک شخصی — باید فیلتر شود
"$ADB" -s emulator-5554 emu sms send "+989121234567" "سلام! فردا ساعت ۵ می‌بینمت" >/dev/null 2>&1
sleep 5
LD=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r')
echo "sms-test-D-personal-filtered => $(echo "$LD" | grep RahyarSms | tail -1)"
echo "$LD" > "$OUT/sms-test-D.log"
# T-E: OTP غیرمالی — فیلتر
"$ADB" -s emulator-5554 emu sms send 100080 "کد تأیید شما: 48321" >/dev/null 2>&1
sleep 5
LE=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r')
echo "sms-test-E-otp-filtered => $(echo "$LE" | grep RahyarSms | tail -1)"
echo "$LE" > "$OUT/sms-test-E.log"
dump_logs sms-final

# ── 5. finish ──
pkill -9 -f qemu-system 2>/dev/null
ls -la "$OUT" | head -30
echo "===== F5-EMU-MISSION-DONE ====="
} 2>&1 | tee "$MAIN"
echo "SAVED: $MAIN"
