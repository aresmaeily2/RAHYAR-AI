#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-emulator-acceptance}"
DEBUG_APK="${2:-ci-android-artifacts/RahyAr-Android-v3.0.0-debug.apk}"
RELEASE_APK="${3:-ci-android-artifacts/RahyAr-Android-v3.0.0-release.apk}"
AVD_NAME="RahyAr_API35"
PKG="ai.rahyar.android"

mkdir -p "$OUT_DIR/screenshots"

export ANDROID_SDK_ROOT="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"

boot_avd() {
  local tag="$1"
  echo "=== Booting AVD $AVD_NAME ($tag) ==="
  nohup emulator -avd "$AVD_NAME" \
    -no-window -no-audio -no-boot-anim -no-snapshot-load \
    -gpu swiftshader_indirect -memory 4096 -partition-size 8192 \
    > "$OUT_DIR/emulator-boot-${tag}.log" 2>&1 &
  EMU_PID=$!
  adb wait-for-device
  for i in $(seq 1 120); do
    BOOT=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    if [ "$BOOT" = "1" ]; then
      echo "Emulator booted ($tag) after $((i*2))s"
      break
    fi
    sleep 2
  done
  sleep 8
  adb shell input keyevent 82 || true
  adb shell wm dismiss-keyguard || true
  adb devices -l > "$OUT_DIR/adb-devices-${tag}.txt"
  cat "$OUT_DIR/adb-devices-${tag}.txt"
}

stop_avd() {
  echo "=== Stopping AVD cleanly ==="
  adb emu kill || true
  sleep 8
}

dump_sqlite() {
  local out_db="$1"
  local out_json="$2"
  adb exec-out "run-as $PKG cat databases/rahyar_native.db" > "$out_db"
  python3 - "$out_db" "$out_json" <<'PY'
import sqlite3, json, sys
conn = sqlite3.connect(sys.argv[1])
cur = conn.cursor()
res = {}
for tbl in ["tasks", "reminders", "finance_accounts", "finance_txs", "agent_audit", "app_prefs"]:
    rows = cur.execute(f"SELECT * FROM {tbl}").fetchall()
    res[tbl] = {"count": len(rows), "rows": rows}
with open(sys.argv[2], "w", encoding="utf-8") as f:
    json.dump(res, f, ensure_ascii=False, indent=2)
print("SQLITE_DUMP:", {k: v["count"] for k, v in res.items()})
PY
}

# 1. Create AVD (Android 15 API 35, x86_64, Google APIs, 4GB RAM, 8GB Storage)
echo "no" | avdmanager create avd -f -n "$AVD_NAME" -k "system-images;android-35;google_apis;x86_64" -d pixel_6
CFG="$HOME/.android/avd/${AVD_NAME}.avd/config.ini"
sed -i '/^hw\.ramSize=/d;/^disk\.dataPartition\.size=/d' "$CFG"
printf "hw.ramSize=4096\ndisk.dataPartition.size=8192M\nhw.keyboard=yes\n" >> "$CFG"
cp "$CFG" "$OUT_DIR/avd-config.ini"

# 2. First Boot
boot_avd "initial"
{
  echo "AVD=$AVD_NAME"
  echo "ANDROID_RELEASE=$(adb shell getprop ro.build.version.release | tr -d '\r')"
  echo "ANDROID_SDK=$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "CPU_ABI=$(adb shell getprop ro.product.cpu.abi | tr -d '\r')"
  echo "MODEL=$(adb shell getprop ro.product.model | tr -d '\r')"
  echo "TIMESTAMP_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT_DIR/emulator-info.txt"
cat "$OUT_DIR/emulator-info.txt"

# 3. Verify v3.0.0-rc.1 published Debug APK SHA-256 & Smoke Install (§2.2)
echo "=== Verifying published v3.0.0-rc.1 Debug APK ==="
RC1_APK="$OUT_DIR/rc1-debug.apk"
curl -fsSL "https://github.com/aresmaeily2/RAHYAR-AI/releases/download/v3.0.0-rc.1/RahyAr-Android-v3.0.0-debug.apk" -o "$RC1_APK"
RC1_SHA=$(sha256sum "$RC1_APK" | awk '{print $1}')
echo "RC1_DEBUG_SHA256=$RC1_SHA" | tee "$OUT_DIR/rc1-verify.txt"
if [ "$RC1_SHA" != "8dd0e26cb49957076967eee736dcc530b68ab42fe64c27881279d7365c33dc64" ]; then
  echo "ERROR: v3.0.0-rc.1 SHA-256 mismatch!"
  exit 1
fi
adb install -r "$RC1_APK" | tee "$OUT_DIR/rc1-install.txt"
adb shell am start -W -n "$PKG/.MainActivity" | tee "$OUT_DIR/rc1-launch.txt"
sleep 4
adb shell pidof "$PKG" | tee -a "$OUT_DIR/rc1-launch.txt"
adb uninstall "$PKG"
rm -f "$RC1_APK"

# 4. Install & Functional Test Latest Debug APK
echo "=== Installing & Testing Final Debug APK ==="
adb logcat -c
adb install -r "$DEBUG_APK" | tee "$OUT_DIR/debug-install.txt"
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS || true
adb shell am start -W -n "$PKG/.MainActivity" \
  --ez seed_acceptance_data true \
  --es start_tab home --es set_lang fa --es set_theme dark | tee "$OUT_DIR/debug-launch.txt"
sleep 5
adb shell pidof "$PKG" | tee -a "$OUT_DIR/debug-launch.txt"
adb exec-out screencap -p > "$OUT_DIR/screenshots/01-home-fa-dark.png"

capture_screen() {
  local name="$1"; shift
  adb shell am start -W -n "$PKG/.MainActivity" "$@" > /dev/null
  sleep 3
  adb exec-out screencap -p > "$OUT_DIR/screenshots/${name}.png"
  echo "Captured ${name}.png ($(stat -c%s "$OUT_DIR/screenshots/${name}.png") bytes)"
}

capture_screen "02-calendar-fa"          --es start_tab calendar --es set_lang fa --es set_theme dark
capture_screen "03-tasks-reminders"      --es start_tab tasks    --es set_lang fa --es set_theme dark
capture_screen "04-finance-int64-csv"    --es start_tab finance  --es set_lang fa --es set_theme dark
capture_screen "05-agent-l0-l3"          --es start_tab agent    --es set_lang fa --es set_theme dark
capture_screen "06-settings-fa"          --es start_tab settings --es set_lang fa --es set_theme dark
capture_screen "07-home-en-ltr"          --es start_tab home     --es set_lang en --es set_theme dark
capture_screen "08-calendar-en-zero-leak" --es start_tab calendar --es set_lang en --es set_theme dark
capture_screen "09-home-light-reduced-motion" --es start_tab home --es set_lang fa --es set_theme light --es set_reduced_motion true

# Verify SQLite state BEFORE Emulator Restart
dump_sqlite "$OUT_DIR/rahyar-before-restart.db" "$OUT_DIR/sqlite-before-restart.json"
adb logcat -d > "$OUT_DIR/logcat-debug-before-restart.txt"

# 5. REAL EMULATOR RESTART & PERSISTENCE TEST (§2.4)
echo "=== Closing App & Cold-Restarting Emulator ==="
adb shell am force-stop "$PKG"
stop_avd
boot_avd "post-restart"

# Trigger/Wait for BOOT_COMPLETED + inspect BootRescheduleReceiver log
sleep 6
adb logcat -d | grep -E "RahyArBoot|RahyArReminder|BOOT_COMPLETED|BootRescheduleReceiver" > "$OUT_DIR/boot-receiver-logcat.txt" || true
cat "$OUT_DIR/boot-receiver-logcat.txt"

adb shell am start -W -n "$PKG/.MainActivity" --es start_tab home --es set_lang fa --es set_theme dark | tee "$OUT_DIR/post-restart-launch.txt"
sleep 4
adb exec-out screencap -p > "$OUT_DIR/screenshots/10-post-restart-persistence.png"

dump_sqlite "$OUT_DIR/rahyar-after-restart.db" "$OUT_DIR/sqlite-after-restart.json"

python3 - "$OUT_DIR/sqlite-before-restart.json" "$OUT_DIR/sqlite-after-restart.json" <<'PY'
import json, sys
b = json.load(open(sys.argv[1], encoding="utf-8"))
a = json.load(open(sys.argv[2], encoding="utf-8"))
for k in ["tasks", "reminders", "finance_accounts", "finance_txs"]:
    assert b[k]["count"] > 0, f"Empty {k} before restart"
    assert a[k]["count"] == b[k]["count"], f"Mismatch in {k}: before={b[k]['count']} after={a[k]['count']}"
print("PERSISTENCE_VERIFIED_ACROSS_EMULATOR_RESTART=PASS")
PY

adb logcat -d > "$OUT_DIR/logcat-debug-after-restart.txt"
if grep -E "FATAL EXCEPTION|ANR in $PKG" "$OUT_DIR/logcat-debug-before-restart.txt" "$OUT_DIR/logcat-debug-after-restart.txt"; then
  echo "ERROR: Crash or ANR detected in Debug APK logcat!"
  exit 1
fi
echo "DEBUG_LOGCAT_ZERO_CRASH_ANR=PASS"

# 6. SIGNED RELEASE APK TEST ON EMULATOR (§3.2)
if [ -f "$RELEASE_APK" ]; then
  echo "=== Uninstalling Debug & Installing SIGNED Release APK ==="
  adb uninstall "$PKG"
  adb logcat -c
  adb install "$RELEASE_APK" | tee "$OUT_DIR/release-install.txt"
  adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS || true
  adb shell dumpsys package "$PKG" | grep -E "versionCode|versionName|permission|signing" | head -n 40 > "$OUT_DIR/dumpsys-release-package.txt"
  cat "$OUT_DIR/dumpsys-release-package.txt"
  if grep -q "RECEIVE_SMS" "$OUT_DIR/dumpsys-release-package.txt"; then
    echo "ERROR: RECEIVE_SMS found in Release APK!"
    exit 1
  fi
  adb shell am start -W -n "$PKG/.MainActivity" --ez seed_acceptance_data true --es start_tab home --es set_lang fa --es set_theme dark | tee "$OUT_DIR/release-launch.txt"
  sleep 5
  adb shell pidof "$PKG" | tee -a "$OUT_DIR/release-launch.txt"
  adb exec-out screencap -p > "$OUT_DIR/screenshots/11-release-apk-home.png"
  capture_screen "12-release-apk-finance" --es start_tab finance --es set_lang fa --es set_theme dark
  adb logcat -d > "$OUT_DIR/logcat-release.txt"
  if grep -E "FATAL EXCEPTION|ANR in $PKG" "$OUT_DIR/logcat-release.txt"; then
    echo "ERROR: Crash or ANR detected in Signed Release APK logcat!"
    exit 1
  fi
  echo "RELEASE_APK_EMULATOR_VERIFIED=PASS"
fi

stop_avd
rm -f "$OUT_DIR/rahyar-before-restart.db" "$OUT_DIR/rahyar-after-restart.db"
echo "ALL_ANDROID_EMULATOR_ACCEPTANCE_TESTS=PASS"
