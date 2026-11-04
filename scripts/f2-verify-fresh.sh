#!/bin/bash
# F2-VERIFY-FRESH: راستی‌آزمایی مستقل لینک‌های تازه — دانلود در نشست مستقل + مقایسه حجم و SHA-256
# ورودی: artifacts/reports/upload-links-f2.txt (قالب: "service FILE => URL")
set -uo pipefail
ROOT=/home/z/my-project
LOG=$ROOT/artifacts/reports/verify-links-f2.txt
: > "$LOG"

declare -A ORIG=(
  ["Rahyar-Android-v2.1.0-debug.apk"]="$ROOT/artifacts/delivery-build/Rahyar-Android-v2.1.0-debug.apk"
  ["Rahyar-Android-v2.1.0-release.apk"]="$ROOT/artifacts/delivery-build/Rahyar-Android-v2.1.0-release.apk"
  ["RahyAr-Android-CAPABILITY-AUDIT.md"]="$ROOT/artifacts/delivery-build/RahyAr-Android-CAPABILITY-AUDIT.md"
  ["RahyAr-F2-Test-Evidence.zip"]="$ROOT/artifacts/delivery-build/RahyAr-F2-Test-Evidence.zip"
  ["RahyAr_F2_Source.zip"]="$ROOT/artifacts/delivery-build/RahyAr_F2_Source.zip"
  ["RahyAr_F2_COMPLETE_SOURCE.txt"]="$ROOT/artifacts/delivery-build/RahyAr_F2_COMPLETE_SOURCE.txt"
  ["RahyAr-F2-FINAL-REPORT.md"]="$ROOT/artifacts/delivery-build/RahyAr-F2-FINAL-REPORT.md"
)

verify_one() {
  local svc="$1" f="$2" url="$3"
  local orig="${ORIG[$f]:-}"
  [ -n "$orig" ] && [ -s "$orig" ] || { echo "[$svc/$f] NO-LOCAL-ORIG" | tee -a "$LOG"; return; }
  local want got wsha gsha dl="$url"
  want=$(stat -c%s "$orig"); wsha=$(sha256sum "$orig" | awk '{print $1}')
  # tmpfiles: دو-مرحله‌ای — صفحه dl لینک واقعی با پیشوند timestamp.hash می‌دهد
  case "$svc" in
    tmpfiles)
      local p1
      p1=$(echo "$url" | sed 's|tmpfiles.org/|tmpfiles.org/dl/|')
      dl=$(curl -sL -m 60 -A "Mozilla/5.0 (verify)" "$p1" | rg -o 'https://tmpfiles.org/dl/[^"]*' | head -1)
      [ -n "$dl" ] || dl="$p1"
      ;;
  esac
  curl -sL -m 900 --retry 2 -A "Mozilla/5.0 (verify-session)" "$dl" -o "/tmp/verify-$f" 2>/dev/null
  got=$(stat -c%s "/tmp/verify-$f" 2>/dev/null || echo 0)
  gsha=$(sha256sum "/tmp/verify-$f" 2>/dev/null | awk '{print $1}')
  if [ "$got" = "$want" ] && [ "$gsha" = "$wsha" ]; then
    echo "[$svc/$f] SHA256+SIZE MATCH: $got bytes $wsha" | tee -a "$LOG"
    case "$f" in
      *.zip) unzip -tq "/tmp/verify-$f" >/dev/null 2>&1 && echo "[$svc/$f] zip-integrity: OK" | tee -a "$LOG" || echo "[$svc/$f] zip-integrity: FAIL" | tee -a "$LOG" ;;
      *.txt) head -c 200 "/tmp/verify-$f" | head -1; wc -l < "/tmp/verify-$f" | xargs echo "[$svc/$f] txt lines:" | tee -a "$LOG" ;;
    esac
  else
    echo "[$svc/$f] MISMATCH got=$got want=$want sha=$gsha" | tee -a "$LOG"
  fi
  rm -f "/tmp/verify-$f"
}

# خواندن لینک‌ها از لاگ آپلود
while read -r line; do
  svc=$(echo "$line" | awk '{print $1}')
  f=$(echo "$line" | awk '{print $2}')
  url=$(echo "$line" | awk '{print $4}')
  [ -n "$url" ] && [[ "$url" == http* ]] && verify_one "$svc" "$f" "$url"
done < "$ROOT/artifacts/reports/upload-links-f2.txt"
echo "=== VERIFY DONE ===" | tee -a "$LOG"
