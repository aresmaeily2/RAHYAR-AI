#!/bin/bash
# F5-SMS-FINAL: reinstall new debug APK + full receiver test chain
set -uo pipefail
cd /home/z/my-project
export PATH=$PWD/artifacts/android-sdk/platform-tools:$PATH
OUT=artifacts/reports/f5/emu
PKG=com.rahyarai.app
LOGF=/tmp/f5-sms-final.log
{
echo "===== F5-SMS-FINAL $(date -u '+%H:%M:%S') ====="
timeout 20 adb start-server >/dev/null 2>&1; sleep 1
timeout 40 adb -s emulator-5554 uninstall $PKG 2>/dev/null | tr -d '\r'
timeout 90 adb -s emulator-5554 install -r download/RahyAr-F5/Rahyar-user-v2.2.0-debug.apk 2>&1 | tr -d '\r' > "$OUT/install-debug.txt"
tail -1 "$OUT/install-debug.txt"
timeout 25 adb -s emulator-5554 shell pm grant $PKG android.permission.RECEIVE_SMS 2>&1 | tr -d '\r'
timeout 25 adb -s emulator-5554 shell "run-as $PKG sh -c 'mkdir -p shared_prefs; printf \"<?xml version=\\\"1.0\\\" encoding=\\\"utf-8\\\" standalone=\\\"yes\\\" ?>\\n<map><boolean name=\\\"sms_consent\\\" value=\\\"true\\\" /><boolean name=\\\"sms_asked\\\" value=\\\"true\\\" /></map>\\n\" > shared_prefs/rahyar_consents.xml'" 2>&1 | tr -d '\r' | head -1
timeout 20 adb -s emulator-5554 shell "run-as $PKG cat shared_prefs/rahyar_consents.xml" 2>/dev/null | tr -d '\r' | grep -o 'value="true"' | head -1
$ADB() { timeout 25 adb -s emulator-5554 "$@"; }
echo "-- T-B bank SMS (consent on) --"
timeout 25 adb -s emulator-5554 shell logcat -c 2>/dev/null
timeout 15 adb -s emulator-5554 emu sms send 500012 "varez be kart 6037 mablagh 3,500,000 rial bank" >/dev/null 2>&1
sleep 8
timeout 25 adb -s emulator-5554 shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-B.log"
echo "B: $(grep RahyarSms "$OUT/sms-B.log" | tail -3 | tr '\n' '|')"
timeout 25 adb -s emulator-5554 exec-out screencap -p > "$OUT/shot-sms-B.png" 2>/dev/null
echo "-- T-C dedup (same SMS) --"
timeout 15 adb -s emulator-5554 emu sms send 500012 "varez be kart 6037 mablagh 3,500,000 rial bank" >/dev/null 2>&1
sleep 7
timeout 25 adb -s emulator-5554 shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-C.log"
echo "C: $(grep 'queued' "$OUT/sms-C.log" | tail -2 | tr '\n' '|')"
echo "-- T-D personal (must filter) --"
timeout 15 adb -s emulator-5554 emu sms send "+989121234567" "salam farda mibinamet" >/dev/null 2>&1
sleep 7
timeout 25 adb -s emulator-5554 shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-D.log"
echo "D: $(grep RahyarSms "$OUT/sms-D.log" | tail -1)"
echo "-- T-E OTP (must filter) --"
timeout 15 adb -s emulator-5554 emu sms send 100080 "kod taid shoma 48321" >/dev/null 2>&1
sleep 7
timeout 25 adb -s emulator-5554 shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-E.log"
echo "E: $(grep RahyarSms "$OUT/sms-E.log" | tail -1)"
echo "-- T-A consent=off (revoke via run-as) --"
timeout 25 adb -s emulator-5554 shell "run-as $PKG sh -c 'printf \"<?xml version=\\\"1.0\\\" encoding=\\\"utf-8\\\" standalone=\\\"yes\\\" ?>\\n<map><boolean name=\\\"sms_consent\\\" value=\\\"false\\\" /></map>\\n\" > shared_prefs/rahyar_consents.xml'" 2>/dev/null
timeout 25 adb -s emulator-5554 shell am force-stop $PKG 2>/dev/null
timeout 25 adb -s emulator-5554 shell logcat -c 2>/dev/null
timeout 15 adb -s emulator-5554 emu sms send 500012 "varez 999 rial after-revoke" >/dev/null 2>&1
sleep 7
timeout 25 adb -s emulator-5554 shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-A.log"
echo "A(revoke): $(grep RahyarSms "$OUT/sms-A.log" | tail -1)"
echo "===== F5-SMS-FINAL-DONE ====="
} >> "$LOGF" 2>&1
echo saved
