#!/bin/bash
# F2-EMU-EVIDENCE: پس از بوت — نصب debug+release، اجرا، تصاویر واقعی از همهٔ صفحات،
# لمس واقعی، logcat، ویدئوی screenrecord — همه به artifacts/evidence/
set -uo pipefail
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
OUT=$ROOT/artifacts/evidence
mkdir -p "$OUT"
exec >> "$ROOT/artifacts/logs/evidence.log" 2>&1

echo "== evidence started $(date -u) =="
S=emulator-5554

# ── ثبت مشخصات دستگاه ──
{
  echo "== DEVICE INFO =="
  echo "api=$( $ADB -s $S shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "android=$( $ADB -s $S shell getprop ro.build.version.release | tr -d '\r')"
  echo "abi=$( $ADB -s $S shell getprop ro.product.cpu.abi | tr -d '\r')"
  echo "model=$( $ADB -s $S shell getprop ro.product.model | tr -d '\r')"
  echo "ramMB_guest_setting=1024"
  $ADB -s $S shell wm size | tr -d '\r'
  $ADB -s $S shell wm density | tr -d '\r'
} > "$OUT/device-info.txt"
cat "$OUT/device-info.txt"

# وضعیت سرویس گفتار/TTS — شفاف
{
  echo "== SPEECH/TTS AVAILABILITY (honest) =="
  $ADB -s $S shell pm list packages | grep -iE "speech|tts|google" || echo "NO-SPEECH-OR-TTS-PACKAGES"
} > "$OUT/speech-availability.txt"
cat "$OUT/speech-availability.txt"

# ── نصب debug APK ──
echo "== install debug =="
$ADB -s $S install -r "$ROOT/artifacts/android-build/out/Rahyar-Android-v2.1.0-debug.apk" | tee "$OUT/install-debug.txt"
$ADB -s $S shell pm grant com.rahyarai.app android.permission.RECORD_AUDIO || true
echo "== grant RECORD_AUDIO done =="
$ADB -s $S shell pm list packages -p 2>/dev/null | head -1 || true
$ADB -s $S shell dumpsys package com.rahyarai.app | grep -A2 "RECORD_AUDIO" | head -6 > "$OUT/perm-granted.txt" || true

# ── اجرا + logcat ──
$ADB -s $S logcat -c
$ADB -s $S shell am start -n com.rahyarai.app/.HomeActivity
sleep 8
$ADB -s $S logcat -d -s RahyarNativeBridge:V WebViewFactory:V chromium:V CR_WebView:V AndroidRuntime:E > "$OUT/logcat-launch.txt" || true
$ADB -s $S logcat -d | tail -200 > "$OUT/logcat-last200.txt" || true

# ── تصاویر واقعی از صفحات ──
shot() { $ADB -s $S exec-out screencap -p > "$OUT/$1.png"; echo "shot $1"; }
shot 01-launch-home
# لمس واقعی: ناوبری پایین — وظایف (تب دوم از چپ در RTL پایین)؛ استفاده از keyevent + tap روی مختصات واقعی
$ADB -s $S shell input tap 340 2260; sleep 2; shot 02-tasks
$ADB -s $S shell input tap 810 2260; sleep 2; shot 03-reminders
$ADB -s $S shell input tap 1080 2260 2>/dev/null || $ADB -s $S shell input tap 950 2260; sleep 2; shot 04-settings
# اضافه‌کردن وظیفه با لمس واقعی روی دکمهٔ افزودن (کپی از UI) — پس از بازگشت به tasks
$ADB -s $S shell input tap 340 2260; sleep 2
shot 05-before-add-task
# ویدئوی کوتاه از تعامل واقعی (۱۰s): بازکردن پنل صوت
$ADB -s $S shell screenrecord --time-limit 10 /sdcard/voice-ui.mp4 &
VRPID=$!
sleep 1
$ADB -s $S shell input tap 980 2050 2>/dev/null || true   # نزدیک FAB صوت (پایین-چپ در RTL)
sleep 8
wait $VRPID || true
$ADB -s $S pull /sdcard/voice-ui.mp4 "$OUT/voice-ui.mp4" || true

echo "== evidence package (pre) done $(date -u) =="
ls -la "$OUT"
