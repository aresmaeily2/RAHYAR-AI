#!/bin/bash
# F2 بازیابی کنترل‌شده پس از checkpoint rollback — بازسازی کامل ابزارهای اندروید
# restore-build-env.sh (JDK17+Gradle+BT34+PLAT34) → fetch-android-tools.sh (BT/PLAT/ECJ/bundletool)
# → webkit aar (androidx.webkit 1.11.0) → ادغام provenance logs
set -uo pipefail
ROOT=/home/z/my-project
LOG=$ROOT/artifacts/reports/android-tools-provenance.txt
mkdir -p "$ROOT/artifacts/reports"
echo "=== F2-REC tool restore started: $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$LOG"

bash "$ROOT/scripts/fetch-android-tools.sh" >> "$LOG" 2>&1
RC1=$?
echo "fetch-android-tools rc=$RC1" >> "$LOG"

bash "$ROOT/scripts/restore-build-env.sh" >> "$LOG" 2>&1
RC2=$?
echo "restore-build-env rc=$RC2" >> "$LOG"

# webkit-classes.jar برای ECJ/d8 (androidx.webkit 1.11.0 — Maven Central رسمی)
WK=$ROOT/artifacts/android-build/tools/webkit
mkdir -p "$WK"
if [ ! -f "$WK/webkit-classes.jar" ]; then
  curl -fsSL --retry 3 --max-time 300 -o /tmp/webkit.aar \
    "https://repo1.maven.org/maven2/androidx/webkit/webkit/1.11.0/webkit-1.11.0.aar" \
    && unzip -qo /tmp/webkit.aar classes.jar -d /tmp/webkit-x \
    && cp /tmp/webkit-x/classes.jar "$WK/webkit-classes.jar" \
    && echo "webkit: androidx.webkit 1.11.0 — source: repo1.maven.org/androidx/webkit/webkit/1.11.0" >> "$LOG" \
    && sha256sum "$WK/webkit-classes.jar" >> "$LOG"
fi

echo "=== F2-REC tool restore finished rc_fetch=$RC1 rc_restore=$RC2: $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >> "$LOG"
echo "TOOL_RESTORE_DONE rc=$RC1/$RC2" > "$ROOT/artifacts/reports/f2-rec-tools.status"
