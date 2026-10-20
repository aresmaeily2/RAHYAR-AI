#!/bin/bash
# AUDIT-2: بازتولید SHA256SUMS.txt با همان ساختار/ترتیب قبلی + تأیید نهایی sha256sum -c
set -euo pipefail
cd /home/z/my-project/release-delivery
OUT=checksums/SHA256SUMS.txt

# همان 32 فایل قبلی با همان ترتیب (android → reports → screenshots → web → LINKS.txt)
{
  echo "# Rahyar AI v1.1.0 — SHA-256 checksums (تولید: 2026-10-20 ممیزی نهایی UTC)"
  echo "# فرمت: sha256sum استاندارد — بررسی با: cd release-delivery && sha256sum -c checksums/SHA256SUMS.txt"
  find android reports screenshots web -type f | LC_ALL=C sort | while read -r f; do
    sha256sum "$f"
  done
  sha256sum INSTALL_GUIDE_FA.md LINKS.txt
} > "$OUT"

echo "--- entries: $(grep -vc '^#' "$OUT") ---"
sha256sum -c "$OUT"
echo "ALL_CHECKSUMS_OK"
