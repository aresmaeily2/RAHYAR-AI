#!/bin/bash
# F5-EMU-SMS-FOCUSED: strict-timeout SMS receiver test (no long pipes, output to files)
set -uo pipefail
cd /home/z/my-project
export PATH=$PWD/artifacts/android-sdk/platform-tools:$PATH
OUT=artifacts/reports/f5/emu
PKG=com.rahyarai.app
ADB="timeout 25 adb -s emulator-5554"
LOGF=/tmp/f5-sms-focused.log
{
echo "===== F5-SMS-FOCUSED $(date -u '+%H:%M:%S') ====="
timeout 20 adb start-server >/dev/null 2>&1
sleep 2
$ADB shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' > /tmp/bootflag.txt
echo "boot_completed=$(cat /tmp/bootflag.txt)"
# گیرنده ثبت شده؟ (خروجی کوتاه)
$ADB shell "cmd package query-receivers --brief -a android.intent.action.SMS_RECEIVED com.rahyarai.app" 2>/dev/null | tr -d '\r' > "$OUT/receivers.txt" || true
cat "$OUT/receivers.txt" | head -4
# حذف لاگ قبلی
$ADB shell logcat -c 2>/dev/null
echo "-- T-A consent=off --"
timeout 15 adb -s emulator-5554 emu sms send 500012 "varez 3500000 rial bank" > /tmp/emu-console-A.txt 2>&1
echo "console-A: $(cat /tmp/emu-console-A.txt | tr -d '\r' | head -2 | tr '\n' ' ')"
sleep 6
$ADB shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-A.log"
echo "A: $(tail -2 "$OUT/sms-A.log" | tr '\n' '|')"
echo "-- T-B consent=on --"
$ADB shell "run-as $PKG sh -c 'mkdir -p shared_prefs; echo \"<?xml version=\\\"1.0\\\" encoding=\\\"utf-8\\\" standalone=\\\"yes\\\" ?>\" > shared_prefs/rahyar_consents.xml; echo \"<map><boolean name=\\\"sms_consent\\\" value=\\\"true\\\" /><boolean name=\\\"sms_asked\\\" value=\\\"true\\\" /></map>\" >> shared_prefs/rahyar_consents.xml; echo \"</map>\" >> shared_prefs/rahyar_consents.xml; cat shared_prefs/rahyar_consents.xml'" 2>/dev/null | tr -d '\r' > "$OUT/consent-file.txt"
head -2 "$OUT/consent-file.txt"
$ADB shell am force-stop $PKG 2>/dev/null
$ADB shell logcat -c 2>/dev/null
timeout 15 adb -s emulator-5554 emu sms send 500012 "varez be kart 6037 mablagh 3,500,000 rial bank" > /tmp/emu-console-B.txt 2>&1
echo "console-B: $(cat /tmp/emu-console-B.txt | tr -d '\r' | head -2 | tr '\n' ' ')"
sleep 8
$ADB shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-B.log"
echo "B: $(tail -3 "$OUT/sms-B.log" | tr '\n' '|')"
timeout 20 adb -s emulator-5554 exec-out screencap -p > "$OUT/shot-sms-B.png" 2>/dev/null
echo "-- T-C dedup --"
timeout 15 adb -s emulator-5554 emu sms send 500012 "varez be kart 6037 mablagh 3,500,000 rial bank" >/dev/null 2>&1
sleep 6
$ADB shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-C.log"
echo "C: $(tail -2 "$OUT/sms-C.log" | tr '\n' '|')"
echo "-- T-D personal --"
timeout 15 adb -s emulator-5554 emu sms send "+989121234567" "salam farda mibinamet" >/dev/null 2>&1
sleep 6
$ADB shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-D.log"
echo "D: $(tail -1 "$OUT/sms-D.log")"
echo "-- T-E otp --"
timeout 15 adb -s emulator-5554 emu sms send 100080 "kod taid shoma: 48321" >/dev/null 2>&1
sleep 6
$ADB shell "logcat -d -s RahyarSms" 2>/dev/null | tr -d '\r' > "$OUT/sms-E.log"
echo "E: $(tail -1 "$OUT/sms-E.log")"
echo "===== F5-SMS-FOCUSED-DONE ====="
} >> "$LOGF" 2>&1
echo "saved: $LOGF"
