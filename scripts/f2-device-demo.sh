#!/bin/bash
# F2-DEVICE-DEMO: شواهد کامل روی دستگاه شبیه‌ساز — مشخصات، نصب، اجرای بدون کرش،
# ۱۴ فرمان عملیاتی (۷ فارسی + ۷ انگلیسی) از مسیر پارسر واقعی، هر دو زبان UI،
# پیمایش صفحات، ماندگاری داده. هر گام: اسکرین‌شات واقعی screencap.
# این اسکریپت هیچ پوشهٔ نمایشی نمی‌سازد — خروجی همان چیزی است که دستگاه می‌دهد.
set -u
ROOT=/home/z/my-project
SDK=$ROOT/artifacts/android-sdk
ADB=$SDK/platform-tools/adb
APK=$ROOT/artifacts/android-build/out/Rahyar-Android-v2.1.0-debug.apk
OUT=$ROOT/artifacts/device-demo
S=$OUT/screens
SERIAL=emulator-5554
mkdir -p "$S"
export ANDROID_HOME=$SDK
log() { echo "[$(date -u +%T)] $*" | tee -a "$OUT/demo.log"; }

shot() { # $1 = filename
  "$ADB" -s $SERIAL exec-out screencap -p > "$S/$1" 2>/dev/null
  local sz=$(stat -c%s "$S/$1" 2>/dev/null || echo 0)
  log "shot $1 (${sz}B)"
}

focus() { "$ADB" -s $SERIAL shell dumpsys window 2>/dev/null | grep mCurrentFocus | head -1; }

# ── ۰) انتظار برای بوت کامل ──
log "waiting for boot_completed…"
for i in $(seq 1 120); do
  B=$("$ADB" -s $SERIAL shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$B" = "1" ] && { log "BOOT OK (try $i)"; break; }
  pgrep -f qemu-system >/dev/null || { log "QEMU DIED during wait"; exit 2; }
  sleep 10
done
[ "$B" = "1" ] || { log "BOOT TIMEOUT"; exit 2; }

# ── ۱) مشخصات دستگاه ──
{
  echo "== device specs $(date -u) =="
  echo "android_version=$("$ADB" -s $SERIAL shell getprop ro.build.version.release | tr -d '\r')"
  echo "api_level=$("$ADB" -s $SERIAL shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "abi=$("$ADB" -s $SERIAL shell getprop ro.product.cpu.abi | tr -d '\r')"
  echo "model=$("$ADB" -s $SERIAL shell getprop ro.product.model | tr -d '\r')"
  echo "resolution=$("$ADB" -s $SERIAL shell wm size | tr -d '\r')"
  echo "density=$("$ADB" -s $SERIAL shell wm density | tr -d '\r')"
  echo "mem_total_kb=$("$ADB" -s $SERIAL shell cat /proc/meminfo 2>/dev/null | head -1)"
} > "$OUT/specs.txt"
log "specs recorded"

# ── ۲) نصب APK دیباگ (نسخهٔ اصلاح‌شده) ──
log "installing debug APK…"
"$ADB" -s $SERIAL install -r "$APK" 2>&1 | tee -a "$OUT/demo.log"

# ── ۳) اجرای سرد بدون فرمان — اسپلش و خانه + بررسی کرش ──
"$ADB" -s $SERIAL logcat -c 2>/dev/null
"$ADB" -s $SERIAL shell am start -n com.rahyarai.app/.HomeActivity >/dev/null 2>&1
sleep 3; shot 01-splash.png
sleep 9; shot 02-home-fa.png
log "focus after launch: $(focus)"
"$ADB" -s $SERIAL logcat -d -b crash 2>/dev/null > "$OUT/crash-buffer.txt"
CRASHN=$(grep -c "FATAL EXCEPTION" "$OUT/crash-buffer.txt" 2>/dev/null || echo 0)
log "fatal exceptions in crash buffer: $CRASHN"

# ── ۴) پنل صوتی فارسی (دکمهٔ شناور — RTL چپ‌پایین) ──
"$ADB" -s $SERIAL shell input tap 41 1417; sleep 3
shot 03-voice-panel-fa.png
"$ADB" -s $SERIAL shell input keyevent 4; sleep 2

# ── ۵) هفت فرمان عملیاتی فارسی — مسیر پارسر واقعی (هوک فقط-دیباگ) ──
run_fa() { # $1=name $2=command
  "$ADB" -s $SERIAL shell am force-stop com.rahyarai.app
  sleep 2
  "$ADB" -s $SERIAL shell am start -n com.rahyarai.app/.HomeActivity --es rahyar_command "$2" >/dev/null 2>&1
  sleep 12
  shot "10-fa-$1.png"
  log "fa command [$1] done: $2"
}
run_fa task      'وظیفه اضافه کن نان بخر'
run_fa reminder  'یادم بیار تماس با دکتر'
run_fa income    'درآمد 500000 فروش'
run_fa expense   'هزینه 200000 خرید میوه'
run_fa report    'گزارش مالی'
run_fa plan      'برنامه امروز'
run_fa date      'تاریخ امروز'

# ── ۶) تعویض زبان به انگلیسی (هوک فقط-دیباگ) + صفحه‌ها ──
"$ADB" -s $SERIAL shell am force-stop com.rahyarai.app; sleep 2
"$ADB" -s $SERIAL shell am start -n com.rahyarai.app/.HomeActivity --es rahyar_js "RH.saveProfile({lang:'en'});location.reload()" >/dev/null 2>&1
sleep 14
shot 20-en-home.png
"$ADB" -s $SERIAL shell input tap 450 1490; sleep 5; shot 21-en-tasks.png
"$ADB" -s $SERIAL shell input tap 270 1490; sleep 5; shot 22-en-reminders.png
"$ADB" -s $SERIAL shell input tap 90 1490;  sleep 5; shot 23-en-settings.png
"$ADB" -s $SERIAL shell input tap 630 1490; sleep 5; shot 24-en-index.png

# ── ۷) هفت فرمان عملیاتی انگلیسی ──
run_en() { # $1=name $2=command
  "$ADB" -s $SERIAL shell am force-stop com.rahyarai.app
  sleep 2
  "$ADB" -s $SERIAL shell am start -n com.rahyarai.app/.HomeActivity --es rahyar_command "$2" >/dev/null 2>&1
  sleep 12
  shot "30-en-$1.png"
  log "en command [$1] done: $2"
}
run_en task     'add task buy bread'
run_en reminder 'remind me to call the doctor'
run_en income   'income 500000 sold books'
run_en expense  'expense 200000 bought fruit'
run_en report   'finance report'
run_en plan     'today plan'
run_en date     'todays date'

# ── ۸) بازگشت به فارسی + صفحه‌های فارسی ──
"$ADB" -s $SERIAL shell am force-stop com.rahyarai.app; sleep 2
"$ADB" -s $SERIAL shell am start -n com.rahyarai.app/.HomeActivity --es rahyar_js "RH.saveProfile({lang:'fa'});location.reload()" >/dev/null 2>&1
sleep 14
shot 40-fa-index.png
"$ADB" -s $SERIAL shell input tap 450 1490; sleep 5; shot 41-fa-tasks.png
"$ADB" -s $SERIAL shell input tap 270 1490; sleep 5; shot 42-fa-reminders.png
"$ADB" -s $SERIAL shell input tap 90 1490;  sleep 5; shot 43-fa-settings.png

# ── ۹) ماندگاری داده: ری‌استارت کامل اپ، وظیفهٔ ثبت‌شده باید بماند ──
"$ADB" -s $SERIAL shell am force-stop com.rahyarai.app; sleep 3
"$ADB" -s $SERIAL shell am start -n com.rahyarai.app/.HomeActivity >/dev/null 2>&1
sleep 12
"$ADB" -s $SERIAL shell input tap 450 1490; sleep 5
shot 50-persist-tasks-after-restart.png
log "persistence shot done; focus: $(focus)"

# ── ۱۰) لاگ‌کت نهایی + جمع‌بندی ──
"$ADB" -s $SERIAL logcat -d 2>/dev/null | grep -E "rahyarai|AndroidRuntime|VoiceHelper" | tail -120 > "$OUT/logcat-app.txt"
echo "== CRASH_COUNT=$CRASHN ==" > "$OUT/summary.txt"
ls -la "$S" >> "$OUT/summary.txt"
log "DEMO_DONE (crash count: $CRASHN)"
