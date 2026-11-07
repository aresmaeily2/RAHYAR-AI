#!/bin/bash
# F5-SMS-DEEP: full-logcat capture around one SMS to find delivery truth
set -uo pipefail
cd /home/z/my-project
export PATH=$PWD/artifacts/android-sdk/platform-tools:$PATH
OUT=artifacts/reports/f5/emu
LOGF=/tmp/f5-sms-deep.log
{
echo "===== F5-SMS-DEEP $(date -u '+%H:%M:%S') ====="
timeout 20 adb start-server >/dev/null 2>&1; sleep 1
timeout 25 adb -s emulator-5554 shell logcat -c 2>/dev/null
timeout 15 adb -s emulator-5554 emu sms send 500012 "deep test varez 100 rial" >/dev/null 2>&1
sleep 9
timeout 40 adb -s emulator-5554 shell "logcat -d" 2>/dev/null | tr -d '\r' > /tmp/deep-logcat.txt
wc -l /tmp/deep-logcat.txt
grep -iE "rahyarai|SmsReceiver|RahyarSms|Denial|blocked|skip" /tmp/deep-logcat.txt | grep -v MessagingApp > "$OUT/sms-deep-filter.txt"
wc -l "$OUT/sms-deep-filter.txt"; head -12 "$OUT/sms-deep-filter.txt"
grep -iE "GsmInbound|InboundSms" /tmp/deep-logcat.txt | head -6
echo "===== F5-SMS-DEEP-DONE ====="
} >> "$LOGF" 2>&1
echo done
