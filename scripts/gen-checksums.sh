#!/bin/bash
# تولید checksums/SHA256SUMS.txt — هش کامل + نام دقیق (فرمت استاندارد sha256sum -c)
set -euo pipefail
cd /home/z/my-project/release-delivery
OUT=checksums/SHA256SUMS.txt
mkdir -p checksums
{
  echo "# Rahyar AI v1.1.0 — SHA-256 checksums (تولید: $(date -u '+%Y-%m-%d %H:%M UTC'))"
  echo "# فرمت: sha256sum استاندارد — بررسی با: cd release-delivery && sha256sum -c checksums/SHA256SUMS.txt"
} > "$OUT"
find web android reports screenshots -type f ! -name 'LINKS.txt' | sort | while read -r f; do
  sha256sum "$f" >> "$OUT"
done
# LINKS.txt آخر (پس از پایان آپلودها دوباره تولید می‌شود)
[ -f LINKS.txt ] && sha256sum LINKS.txt >> "$OUT" || true
echo "files hashed: $(grep -c -v '^#' "$OUT")"
head -8 "$OUT"
