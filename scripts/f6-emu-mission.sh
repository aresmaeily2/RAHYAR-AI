#!/usr/bin/env bash
# F6-EMU-MISSION (merged, single self-contained run):
# boot + release 3-launch crash test + debug SMS chain A-F + data persistence + voice probe
set -uo pipefail
cd /home/z/my-project
SDK=$PWD/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
EMU=$SDK/emulator/emulator
OUT=artifacts/reports/f6/emu
mkdir -p "$OUT"
{
echo "===== F6-EMU-MISSION $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
AVAIL=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
echo "mem-available-mb=$AVAIL (gate 1900)"
[ "$AVAIL" -lt 1900 ] && { echo "MEMORY-GATE-FAIL — honest BLOCKED"; exit 1; }
export ANDROID_HOME=$SDK

pkill -9 -f qemu-system 2>/dev/null || true; pkill -9 -f next-server 2>/dev/null || true; pkill -9 -f "standalone/server.js" 2>/dev/null || true; sleep 2
$ADB start-server >/dev/null 2>&1
AVDDIR=$(ls -d ~/.android/avd/rahyar24.avd 2>/dev/null | head -1)
rm -f "$AVDDIR"/hardware-qemu.ini.lock "$AVDDIR"/multiinstance.lock 2>/dev/null
rm -rf ~/.android/avd/running 2>/dev/null
echo "== boot $(date -u '+%H:%M:%S') =="
nohup "$EMU" -avd rahyar24 -no-window -no-audio -no-boot-anim -no-accel -gpu swiftshader_indirect -cores 1 \
  -memory 512 -no-snapshot > /tmp/f6-qemu.log 2>&1 &
disown 2>/dev/null || true
sleep 4
T0=$(date +%s); BOOTED=0
for i in $(seq 1 150); do
  pgrep -f qemu-system-i386 >/dev/null || { echo "QEMU_DIED poll$i (+$(( $(date +%s)-T0 ))s)"; tail -4 /tmp/f6-qemu.log; break; }
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [ "$B" = "1" ]; then BOOTED=1; echo "EMU_BOOT_DONE +$(( $(date +%s)-T0 ))s"; break; fi
  sleep 2
done
[ "$BOOTED" = "1" ] || { echo "RESULT: no boot — BLOCKED (honest)"; pkill -9 -f qemu-system; exit 1; }

PKG=com.rahyarai.app
REL=download/RahyAr-F5/Rahyar-user-v2.2.0-release.apk
DBG=download/RahyAr-F5/Rahyar-user-v2.2.0-debug.apk
dump_logs(){
  "$ADB" -s emulator-5554 shell logcat -v time -d > "$OUT/logcat-$1.log" 2>&1
  "$ADB" -s emulator-5554 shell logcat -b crash -v time -d > "$OUT/crashbuf-$1.log" 2>&1
  "$ADB" -s emulator-5554 exec-out screencap -p > "$OUT/shot-$1.png" 2>/dev/null
  echo "evidence-$1: logcat=$(wc -l < "$OUT/logcat-$1.log")L crash=$(wc -c < "$OUT/crashbuf-$1.log")B"
}
echo "== [1] RELEASE fresh install + 3 launches =="
"$ADB" -s emulator-5554 uninstall $PKG >/dev/null 2>&1
echo "install-release => $("$ADB" -s emulator-5554 install -r "$REL" 2>&1 | tail -1)"
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1
sleep 8; dump_logs run1
echo "run1 crash-indicators=$(grep -c 'FATAL EXCEPTION\|has stopped' "$OUT/logcat-run1.log" 2>/dev/null || echo 0) (expect 0)"
"$ADB" -s emulator-5554 shell am force-stop $PKG >/dev/null 2>&1; sleep 2
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1
sleep 8; dump_logs run2
echo "run2 crash-indicators=$(grep -c 'FATAL EXCEPTION\|has stopped' "$OUT/logcat-run2.log" 2>/dev/null || echo 0) (expect 0)"
"$ADB" -s emulator-5554 reboot >/dev/null 2>&1
T1=$(date +%s); RB=0
for i in $(seq 1 80); do
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$B" = "1" ] && { RB=1; echo "REBOOT_DONE +$(( $(date +%s)-T1 ))s"; break; }
  sleep 3
done
sleep 4
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1
sleep 8; dump_logs run3
echo "run3 crash-indicators=$(grep -c 'FATAL EXCEPTION\|has stopped' "$OUT/logcat-run3.log" 2>/dev/null || echo 0) (expect 0) reboot_ok=$RB"

echo "== [2] DEBUG build: SMS chain =="
"$ADB" -s emulator-5554 uninstall $PKG >/dev/null 2>&1
echo "install-debug => $("$ADB" -s emulator-5554 install -r "$DBG" 2>&1 | tail -1)"
"$ADB" -s emulator-5554 shell pm grant $PKG android.permission.RECEIVE_SMS 2>&1 | tr -d '\r'
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1; sleep 5
# A: consent OFF
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 3,500,000 ریال بانک ملت" >/dev/null 2>&1
sleep 5
LA=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r'); echo "$LA" > "$OUT/sms-A-consent-off.log"
echo "sms-A-consent-off => $(echo "$LA" | grep RahyarSms | tail -1)"
# B: consent ON
"$ADB" -s emulator-5554 shell run-as $PKG sh -c 'mkdir -p shared_prefs && printf "%s" "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\" ?><map><boolean name=\"sms_consent\" value=\"true\" /><boolean name=\"sms_asked\" value=\"true\" /></map>" > shared_prefs/rahyar_consents.xml' 2>&1 | tr -d '\r'
"$ADB" -s emulator-5554 shell am force-stop $PKG >/dev/null 2>&1
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 3,500,000 ریال بانک ملت" >/dev/null 2>&1
sleep 6
LB=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r'); echo "$LB" > "$OUT/sms-B-consent-on.log"
echo "sms-B-bank-accepted => $(echo "$LB" | grep RahyarSms | tail -2 | tr '\n' ' | ')"
"$ADB" -s emulator-5554 exec-out screencap -p > "$OUT/shot-sms-notification.png" 2>/dev/null
# C: dedup
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 3,500,000 ریال بانک ملت" >/dev/null 2>&1
sleep 5
LC=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r'); echo "$LC" > "$OUT/sms-C-dedup.log"
echo "sms-C-dedup (queue stays 1) => $(echo "$LC" | grep queued | tail -1)"
# D: personal SMS filtered
"$ADB" -s emulator-5554 emu sms send +989121234567 "سلام! فردا ساعت ۵ می‌بینمت" >/dev/null 2>&1
sleep 5
LD=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r'); echo "$LD" > "$OUT/sms-D-personal.log"
echo "sms-D-personal-filtered => $(echo "$LD" | grep RahyarSms | tail -1)"
# E: OTP filtered
"$ADB" -s emulator-5554 emu sms send 100080 "کد تأیید شما: 48321" >/dev/null 2>&1
sleep 5
LE=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r'); echo "$LE" > "$OUT/sms-E-otp.log"
echo "sms-E-otp-filtered => $(echo "$LE" | grep RahyarSms | tail -1)"
# F: consent REVOKED -> processing must stop
"$ADB" -s emulator-5554 shell run-as $PKG sh -c 'printf "%s" "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\" ?><map><boolean name=\"sms_consent\" value=\"false\" /><boolean name=\"sms_asked\" value=\"true\" /></map>" > shared_prefs/rahyar_consents.xml' 2>&1 | tr -d '\r'
"$ADB" -s emulator-5554 shell am force-stop $PKG >/dev/null 2>&1
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 9,000,000 ریال بانک ملت" >/dev/null 2>&1
sleep 5
LF=$("$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r'); echo "$LF" > "$OUT/sms-F-revoked.log"
echo "sms-F-revoked-stops => $(echo "$LF" | grep RahyarSms | tail -1)"

echo "== [3] data persistence across restart =="
Q1=$("$ADB" -s emulator-5554 shell run-as $PKG sh -c 'ls shared_prefs/ 2>/dev/null; cat shared_prefs/rahyar_consents.xml 2>/dev/null' | tr -d '\r' | head -3)
echo "prefs-before: $Q1"
"$ADB" -s emulator-5554 shell am force-stop $PKG >/dev/null 2>&1; sleep 2
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1; sleep 6
Q2=$("$ADB" -s emulator-5554 shell run-as $PKG sh -c 'cat shared_prefs/rahyar_consents.xml 2>/dev/null' | tr -d '\r' | head -1)
echo "prefs-after-restart: $Q2 (consent=false must persist)"
dump_logs persistence

echo "== [4] voice availability probe (honest) =="
"$ADB" -s emulator-5554 shell pm query-services -a android.speech.RecognitionService 2>&1 | tr -d '\r' | head -2
"$ADB" -s emulator-5554 shell pm list packages 2>/dev/null | grep -c -iE 'speech|google.quicksearch' | xargs echo "speech-related-packages="
dump_logs voice-probe

pkill -9 -f qemu-system 2>/dev/null
echo "===== F6-EMU-MISSION-DONE ====="
} > /tmp/f6-emu-mission.log 2>&1
