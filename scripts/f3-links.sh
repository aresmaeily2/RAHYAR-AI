#!/bin/bash
# F3-LINKS: بارگذاری تحویل‌های کلیدی روی tmpfiles + تأیید با دانلود مستقل و تطبیق SHA-256 (بند ۷.۱۲)
set -uo pipefail
ROOT=/home/z/my-project
D=$ROOT/download/RahyAr-Android
RPT=$ROOT/artifacts/reports/f3
OUT=$RPT/links-f3.txt
: > "$OUT"
log(){ echo "$*" | tee -a "$OUT"; }
log "# F3 real download links — verified by independent re-download + SHA-256 match"
log "# generated $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

FILES=(
  "Rahyar-Android-v2.1.0-release.apk"
  "Rahyar-Android-v2.1.0-release-fix1.apk"
  "Rahyar-Android-v2.1.0-debug.apk"
  "RahyAr_Full_Source.zip"
  "RahyAr-F2-Test-Evidence.zip"
  "RahyAr-F2-FINAL-REPORT.md"
  "RahyAr-F3-MISSION-REPORT.txt"
)
for f in "${FILES[@]}"; do
  [ -s "$D/$f" ] || { log "$f => MISSING (skipped)"; continue; }
  SZ=$(stat -c%s "$D/$f")
  UP=$(curl -s -m 300 -F "file=@$D/$f" "https://tmpfiles.org/api/v1/upload" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('url',''))" 2>/dev/null)
  if [ -z "$UP" ]; then log "$f => UPLOAD_FAILED"; continue; fi
  DL2=$(echo "$UP" | sed 's|tmpfiles.org/|tmpfiles.org/dl/|')
  H0=$(sha256sum "$D/$f" | cut -d' ' -f1)
  # لینک مستقیم واقعی داخل صفحهٔ /dl/ است (با توکن) — استخراج و آزمون
  DIRECT=$(curl -sL -m 120 "$DL2" | grep -oE "https://tmpfiles.org/dl/[0-9]+\.[a-f0-9]+/[^\"']*" | head -1)
  if [ -n "$DIRECT" ]; then
    H1=$(curl -sL -m 300 "$DIRECT" 2>/dev/null | sha256sum | cut -d' ' -f1)
    [ "$H0" = "$H1" ] && V="VERIFIED" || V="SHA_MISMATCH"
    log "$f | size=$SZ | $DIRECT | $V"
  else
    log "$f | size=$SZ | $DL2 | DIRECT_EXTRACT_FAILED"
  fi
done
log "# note: tmpfiles links expire after 60 days of inactivity (host policy) — SHA در SHA256SUMS مرجع است"
echo "F3-LINKS_DONE"
