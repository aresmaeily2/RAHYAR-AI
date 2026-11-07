#!/bin/bash
# F5-EMU-ATTACH: attach to RUNNING qemu (or boot if needed) and run full install/launch/SMS sequence
set -uo pipefail
cd /home/z/my-project
SDK=$PWD/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
OUT=artifacts/reports/f5/emu
mkdir -p "$OUT"
{
echo "===== F5-EMU-ATTACH $(date -u '+%Y-%m-%d %H:%M:%S UTC') ====="
if ! pgrep -f qemu-system >/dev/null; then
  echo "qemu not running — launching (memory 512)"
  nohup $SDK/emulator/emulator -avd rahyar24 -no-window -no-audio -no-boot-anim -no-accel -gpu swiftshader_indirect -cores 1 -memory 512 -no-snapshot -no-metrics >> /tmp/f5-qemu.log 2>&1 &
  disown 2>/dev/null || true
  sleep 8
fi
T0=$(date +%s); BOOTED=0
for i in $(seq 1 140); do
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [ "$B" = "1" ]; then BOOTED=1; echo "EMU_BOOT_DONE +$(( $(date +%s)-T0 ))s"; break; fi
  pgrep -f qemu-system >/dev/null || { echo "QEMU_DIED poll$i"; break; }
  sleep 3
done
[ "$BOOTED" = "1" ] || { echo "NO-BOOT — honest BLOCKED"; exit 1; }
"$ADB" -s emulator-5554 shell getprop ro.build.version.release | tr -d '\r' | xargs echo "android-version="
"$ADB" -s emulator-5554 shell getprop ro.build.version.sdk | tr -d '\r' | xargs echo "sdk="

PKG=com.rahyarai.app
REL=download/RahyAr-F5/Rahyar-user-v2.2.0-release.apk
DBG=download/RahyAr-F5/Rahyar-user-v2.2.0-debug.apk
dump_logs(){
  "$ADB" -s emulator-5554 shell logcat -v time -d > "$OUT/logcat-$1.log" 2>&1
  "$ADB" -s emulator-5554 shell logcat -b crash -v time -d > "$OUT/crashbuf-$1.log" 2>&1
  "$ADB" -s emulator-5554 shell dumpsys window 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp" | head -2 | tr -d '\r' > "$OUT/focus-$1.txt"
  "$ADB" -s emulator-5554 exec-out screencap -p > "$OUT/shot-$1.png" 2>/dev/null
  echo "evidence-$1: logcat=$(wc -l < "$OUT/logcat-$1.log")L crash=$(wc -c < "$OUT/crashbuf-$1.log")B focus=[$(head -c 90 "$OUT/focus-$1.txt")]"
}

echo "== install RELEASE v2.2.0 (fail-closed signed CN=RahyAr) =="
"$ADB" -s emulator-5554 uninstall $PKG >/dev/null 2>&1
INS=$("$ADB" -s emulator-5554 install -r "$REL" 2>&1 | tail -1); echo "install-release => $INS"; echo "$INS" > "$OUT/install-release.txt"
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
echo "== run1 fresh =="
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" 2>&1 | tr -d '\r' | head -2
sleep 9; dump_logs fix1-run1
echo "run1 fatal=$(grep -c 'FATAL EXCEPTION' "$OUT/logcat-fix1-run1.log") anr=$(grep -c 'has stopped' "$OUT/logcat-fix1-run1.log")"
echo "== run2 force-stop relaunch =="
"$ADB" -s emulator-5554 shell am force-stop $PKG; sleep 2
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1
sleep 9; dump_logs fix1-run2
echo "run2 fatal=$(grep -c 'FATAL EXCEPTION' "$OUT/logcat-fix1-run2.log")"
echo "== run3 after reboot =="
"$ADB" -s emulator-5554 reboot >/dev/null 2>&1
T1=$(date +%s); RB=0
for i in $(seq 1 100); do
  B=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$B" = "1" ] && { RB=1; echo "REBOOT_DONE +$(( $(date +%s)-T1 ))s"; break; }
  sleep 3
done
sleep 5
"$ADB" -s emulator-5554 shell am start -n "$PKG/.HomeActivity" >/dev/null 2>&1
sleep 9; dump_logs fix1-run3
echo "run3 fatal=$(grep -c 'FATAL EXCEPTION' "$OUT/logcat-fix1-run3.log")"

echo "== SMS E2E on DEBUG build =="
"$ADB" -s emulator-5554 uninstall $PKG >/dev/null 2>&1
INS2=$("$ADB" -s emulator-5554 install -r "$DBG" 2>&1 | tail -1); echo "install-debug => $INS2"; echo "$INS2" > "$OUT/install-debug.txt"
"$ADB" -s emulator-5554 shell pm grant $PKG android.permission.RECEIVE_SMS 2>&1 | tr -d '\r'
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
echo "-- T-A consent=off (default): no processing expected --"
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 3,500,000 ریال بانک ملت" >/dev/null 2>&1
sleep 6
"$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r' > "$OUT/sms-test-A.log"
echo "A-log: $(grep RahyarSms "$OUT/sms-test-A.log" | tail -2 | tr '\n' '|')"
echo "-- T-B consent=on via run-as: bank SMS must be accepted+queued --"
"$ADB" -s emulator-5554 shell run-as $PKG sh -c 'mkdir -p shared_prefs && printf "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\" ?>\n<map><boolean name=\"sms_consent\" value=\"true\" /><boolean name=\"sms_asked\" value=\"true\" /></map>\n" > shared_prefs/rahyar_consents.xml' 2>&1 | tr -d '\r' | head -1
"$ADB" -s emulator-5554 shell run-as $PKG cat shared_prefs/rahyar_consents.xml 2>/dev/null | tr -d '\r' | head -2
"$ADB" -s emulator-5554 shell am force-stop $PKG; sleep 1
"$ADB" -s emulator-5554 shell logcat -c 2>/dev/null
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 3,500,000 ریال بانک ملت" >/dev/null 2>&1
sleep 7
"$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r' > "$OUT/sms-test-B.log"
echo "B-log: $(grep RahyarSms "$OUT/sms-test-B.log" | tail -3 | tr '\n' '|')"
"$ADB" -s emulator-5554 exec-out screencap -p > "$OUT/shot-sms-notification.png" 2>/dev/null
echo "-- T-C dedup: same SMS again, queue must stay 1 --"
"$ADB" -s emulator-5554 emu sms send 500012 "واریز به کارت 6037-9912 مبلغ 3,500,000 ریال بانک ملت" >/dev/null 2>&1
sleep 6
"$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r' > "$OUT/sms-test-C.log"
echo "C-log: $(grep RahyarSms "$OUT/sms-test-C.log" | tail -2 | tr '\n' '|')"
echo "-- T-D personal SMS from mobile number: must be filtered --"
"$ADB" -s emulator-5554 emu sms send "+989121234567" "سلام! فردا ساعت ۵ می‌بینمت" >/dev/null 2>&1
sleep 6
"$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r' > "$OUT/sms-test-D.log"
echo "D-log: $(grep RahyarSms "$OUT/sms-test-D.log" | tail -1)"
echo "-- T-E OTP non-financial: must be filtered --"
"$ADB" -s emulator-5554 emu sms send 100080 "کد تأیید شما: 48321" >/dev/null 2>&1
sleep 6
"$ADB" -s emulator-5554 shell logcat -d -s RahyarSms 2>/dev/null | tr -d '\r' > "$OUT/sms-test-E.log"
echo "E-log: $(grep RahyarSms "$OUT/sms-test-E.log" | tail -1)"
dump_logs sms-final
echo "===== F5-EMU-ATTACH-DONE ====="
} 2>&1 | tee /tmp/f5-emu-attach.log
