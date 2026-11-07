#!/bin/bash
# F5-SMS-DIAG: why didn't the receiver fire?
set -uo pipefail
cd /home/z/my-project
export PATH=$PWD/artifacts/android-sdk/platform-tools:$PATH
OUT=artifacts/reports/f5/emu
PKG=com.rahyarai.app
LOGF=/tmp/f5-sms-diag.log
{
echo "===== F5-SMS-DIAG $(date -u '+%H:%M:%S') ====="
timeout 20 adb start-server >/dev/null 2>&1; sleep 1
timeout 25 adb -s emulator-5554 shell pm list packages 2>/dev/null | tr -d '\r' | grep rahyar || echo "NOT-INSTALLED"
timeout 25 adb -s emulator-5554 shell "dumpsys package $PKG 2>/dev/null | grep -B2 -A6 'SmsReceiver'" 2>/dev/null | tr -d '\r' > "$OUT/manifest-receiver.txt"
head -14 "$OUT/manifest-receiver.txt"
echo "-- registered receivers in activity manager --"
timeout 25 adb -s emulator-5554 shell "dumpsys activity broadcast 2>/dev/null | grep -c rahyarai" 2>/dev/null | tr -d '\r'
echo "-- manifest inside APK (aapt) --"
timeout 20 artifacts/android-sdk/build-tools/34.0.0/aapt dump xmltree download/RahyAr-F5/Rahyar-user-v2.2.0-debug.apk AndroidManifest.xml 2>/dev/null | grep -B1 -A4 "SmsReceiver" | head -12
echo "-- send one more, catch broad logcat around it --"
timeout 20 adb -s emulator-5554 shell logcat -c 2>/dev/null
timeout 15 adb -s emulator-5554 emu sms send 500012 "varez 100 rial test" >/dev/null 2>&1
sleep 8
timeout 25 adb -s emulator-5554 shell "logcat -d -t 400" 2>/dev/null | tr -d '\r' | grep -iE "RahyarSms|SMS_RECEIVED|sms" > "$OUT/sms-broad.log"
wc -l "$OUT/sms-broad.log"; tail -8 "$OUT/sms-broad.log"
echo "===== F5-SMS-DIAG-DONE ====="
} >> "$LOGF" 2>&1
echo done
