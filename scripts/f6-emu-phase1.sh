#!/usr/bin/env bash
# F6-EMU-PHASE1: boot API24 + release install + 3 launches (fresh/force-stop/reboot) + crash evidence
set -uo pipefail
cd /home/z/my-project
SDK=$PWD/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
EMU=$SDK/emulator/emulator
OUT=artifacts/reports/f6/emu
mkdir -p "$OUT"
{
echo "===== F6-EMU-PHASE1 $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
AVAIL=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
echo "mem-available-mb=$AVAIL (gate 1900)"
[ "$AVAIL" -lt 1900 ] && { echo "MEMORY-GATE-FAIL — honest BLOCKED"; exit 1; }
export ANDROID_HOME=$SDK
[ -x "$EMU" ] || { echo "EMU-MISSING"; exit 1; }

pkill -9 -f qemu-system 2>/dev/null || true; sleep 1
AVDDIR=$(ls -d ~/.config/.android/avd/rahyar24.avd 2>/dev/null || ls -d ~/.android/avd/rahyar24.avd 2>/dev/null | head -1)
rm -f "$AVDDIR"/hardware-qemu.ini.lock "$AVDDIR"/multiinstance.lock 2>/dev/null
GM=512
echo "== booting emulator guest=${GM}MB $(date -u '+%H:%M:%S') =="
nohup "$EMU" -avd rahyar24 -no-window -no-audio -no-boot-anim -no-accel -gpu swiftshader_indirect -cores 1 \
  -memory $GM -no-snapshot >> /tmp/f6-qemu.log 2>&1 &
disown 2>/dev/null || true
T0=$(date +%s); BOOTED=0
for i in $(seq 1 140); do
  pgrep -f qemu-system >/dev/null || { echo "QEMU_DIED poll$i (+$(( $(date +%s)-T0 ))s)"; tail -6 /tmp/f6-qemu.log; break; }
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [ "$B" = "1" ]; then BOOTED=1; echo "EMU_BOOT_DONE +$(( $(date +%s)-T0 ))s"; break; fi
  sleep 2
done
[ "$BOOTED" = "1" ] || { echo "RESULT: no boot — BLOCKED (honest)"; tail -10 /tmp/f6-qemu.log | tee -a "$OUT/no-boot.log"; pkill -9 -f qemu-system; exit 1; }
"$ADB" -s emulator-5554 shell getprop ro.build.version.release | tr -d '\r' | xargs echo "android-version="
"$ADB" -s emulator-5554 shell getprop ro.build.version.sdk | tr -d '\r' | xargs echo "sdk="

REL=download/RahyAr-F5/Rahyar-user-v2.2.0-release.apk
PKG=com.rahyarai.app
dump_logs(){
  "$ADB" -s emulator-5554 shell logcat -v time -d > "$OUT/logcat-$1.log" 2>&1
  "$ADB" -s emulator-5554 shell logcat -b crash -v time -d > "$OUT/crashbuf-$1.log" 2>&1
  "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp" | head -2 | tr -d '\r' > "$OUT/focus-$1.txt"
  "$ADB" -s emulator-5554 exec-out screencap -p > "$OUT/shot-$1.png" 2>/dev/null
  echo "evidence-$1: logcat=$(wc -l < "$OUT/logcat-$1.log")L crash=$(wc -c < "$OUT/crashbuf-$1.log")B focus=$(head -c 70 "$OUT/focus-$1.txt")"
}
echo "== install RELEASE v2.2.0 (fresh) =="
"$ADB" -s emulator-5554 uninstall $PKG >/dev/null 2>&1
INS=$("$ADB" -s emulator-5554 install -r "$REL" 2>&1 | tail -1); echo "install-release => $INS"
echo "$INS" > "$OUT/install-release.txt"
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
echo "== run1 fresh launch =="
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" 2>&1 | tr -d '\r' | head -2
sleep 8; dump_logs run1
echo "run1 crash-indicators=$(grep -c 'FATAL EXCEPTION\|has stopped\|Force finishing activity' "$OUT/logcat-run1.log" 2>/dev/null || echo 0) (expect 0)"
echo "== run2 force-stop relaunch =="
"$ADB" -s emulator-5554 shell am force-stop $PKG >/dev/null 2>&1; sleep 2
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1
sleep 8; dump_logs run2
echo "run2 crash-indicators=$(grep -c 'FATAL EXCEPTION\|has stopped' "$OUT/logcat-run2.log" 2>/dev/null || echo 0) (expect 0)"
echo "== run3 after reboot =="
"$ADB" -s emulator-5554 reboot >/dev/null 2>&1
T1=$(date +%s); RB=0
for i in $(seq 1 100); do
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$B" = "1" ] && { RB=1; echo "REBOOT_DONE +$(( $(date +%s)-T1 ))s"; break; }
  sleep 3
done
[ "$RB" = "1" ] || echo "reboot-wait-timeout (continuing)"
sleep 4
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1
sleep 8; dump_logs run3
echo "run3 crash-indicators=$(grep -c 'FATAL EXCEPTION\|has stopped' "$OUT/logcat-run3.log" 2>/dev/null || echo 0) (expect 0)"
echo "== data persistence across restart (app data dir survives) =="
"$ADB" -s emulator-5554 shell run-as $PKG ls -la shared_prefs files 2>/dev/null | head -8 | tr -d '\r'
echo "phase1-done — emulator LEFT RUNNING for phase2"
echo "===== F6-EMU-PHASE1-DONE ====="
} 2>&1 | tee /tmp/f6-emu1.log
