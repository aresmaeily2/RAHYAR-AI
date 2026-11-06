#!/bin/bash
# F3-AUDIT: ممیزی اولیهٔ مأموریت نهایی — بند ۱ (وضعیت Git + حافظه + زیرساخت + SHA + پشتیبان)
set -uo pipefail
ROOT=/home/z/my-project
RPT=$ROOT/artifacts/reports/f3
mkdir -p "$RPT" "$ROOT/artifacts/backup" "$ROOT/artifacts/logs"
OUT=$RPT/f3-audit.txt
{
echo "F3-INITIAL-AUDIT $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "==================== 1) GIT STATE ===================="
cd "$ROOT"
echo "-- HEAD:"; git log --oneline -3
echo "-- branch: $(git rev-parse --abbrev-ref HEAD)  | HEAD sha: $(git rev-parse HEAD)"
echo "-- status (should be clean):"; git status --short | head -5; echo "(lines: $(git status --short | wc -l))"
echo "-- remotes:"; git remote -v; [ -z "$(git remote)" ] && echo "(no remote — git history is local-only; bundle backup below)"
echo "-- untracked/ignored big dirs check:"; git check-ignore artifacts/android-sdk .next download 2>/dev/null | sed 's/^/ignored: /'
echo
echo "==================== 2) HOST MEMORY (تصمیم AVD بر اساس داده) ===================="
free -m
echo "MemAvailable_KB: $(awk '/MemAvailable/{print $2}' /proc/meminfo)"
AV=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
echo "MemAvailable_MB: $AV"
if   [ "$AV" -ge 2300 ]; then echo "AVD_DECISION: GO — memory sufficient for 512MB-guest boot attempt (needs ~1.7GB RSS)"
elif [ "$AV" -ge 1900 ]; then echo "AVD_DECISION: MARGINAL — will attempt 512MB guest with tight monitoring, no OOM bait"
else echo "AVD_DECISION: BLOCKED — below minimum ~1.9GB; per mission 2.3 AVD will NOT be forced (OOM protection)"
fi
echo
echo "==================== 3) INFRASTRUCTURE PRESENCE ===================="
echo "-- SDK: $(ls artifacts/android-sdk/emulator/emulator 2>/dev/null && echo PRESENT || echo MISSING)"
echo "-- AVD: $(ls $HOME/.android/avd/rahyar24.avd/config.ini 2>/dev/null && echo PRESENT || echo MISSING)"
echo "-- build-tools/aapt: $(ls artifacts/android-sdk/build-tools/34.0.0/aapt 2>/dev/null && echo PRESENT || echo MISSING)"
echo "-- pristine userdata: $(ls -la artifacts/emu/userdata24.img 2>/dev/null | awk '{print $5, $9}' || echo MISSING)"
echo "-- standalone build: $(ls .next/standalone/server.js 2>/dev/null && echo PRESENT || echo MISSING)"
echo "-- DB: $(ls -la db/custom.db 2>/dev/null | awk '{print $5, $9}')"
echo "-- deliverables:"; ls -la download/RahyAr-Android/ | awk 'NR>3{print $5, $9}'
echo "-- mission scripts:"; ls scripts/ | grep -E "f2-emu-(recover|crashdiag|mission)|f2-web-e2e|f2-sec-matrix|f2-creds|f2-postcheck" | tr '\n' ' '
echo
echo "-- tool versions:"
[ -x artifacts/android-sdk/platform-tools/adb ] && artifacts/android-sdk/platform-tools/adb --version | head -1
[ -x artifacts/android-sdk/emulator/emulator ] && artifacts/android-sdk/emulator/emulator -version 2>/dev/null | head -1
node --version 2>/dev/null | sed 's/^/node: /'
bun --version 2>/dev/null | sed 's/^/bun: /'
echo
echo "==================== 4) SOURCE-vs-APK FRESHNESS ===================="
echo "-- last commit touching android source:"
git log -1 --format='%h %cd' --date=iso -- android/ src/ 2>/dev/null || echo "(path check: try alt paths)"
git log -1 --format='%h %cd' --date=iso -- 'android/**' 2>/dev/null | sed 's/^/android: /'
echo "-- release APK build time (dex mtime): $(unzip -l download/RahyAr-Android/Rahyar-Android-v2.1.0-release.apk | grep classes.dex | awk '{print $2, $3}')"
echo
echo "==================== 5) BACKUP ===================="
B=artifacts/backup/f3-$(date -u +%Y%m%d-%H%M)
git bundle create "$B.bundle" --all 2>&1 | tail -1
echo "bundle: $(ls -la $B.bundle | awk '{print $5" bytes "$9}')"
git bundle verify "$B.bundle" 2>&1 | tail -1
echo
echo "==================== 6) KEY SHA-256 ===================="
cd download/RahyAr-Android && sha256sum -c SHA256SUMS.txt 2>/dev/null | tail -11
} 2>&1 | tee "$OUT"
echo "AUDIT_SAVED: $OUT"
