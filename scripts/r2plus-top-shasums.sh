#!/bin/bash
# Top-level SHA256SUMS.txt: package-relative section + standalone top-level files section
set -euo pipefail
cd /home/z/my-project/download

python3 - << 'PYEOF'
import hashlib, os

def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()

pkg_sums = open('RahyAr_R2_OWNER_DELIVERY/SHA256SUMS.txt').read().rstrip()

top_files = [
    'RahyAr_R2_OWNER_DELIVERY.zip',
    'RahyAr_R2_Full_Source.zip',
    'RahyAr_R2_COMPLETE_SOURCE.txt',
    'RahyAr_R2_Screenshots_16.zip',
    'RahyAr_R2_Walkthrough_Video.mp4',
    'RahyAr_R2_Walkthrough_Video.webm',
    'RahyAr_R2_FINAL_REPORT.md',
    'README-OWNER-DELIVERY.md',
]

with open('SHA256SUMS.txt', 'w') as out:
    out.write("# RahyAr R2 — SHA-256 manifest (commit b8dc856)\n")
    out.write("# بخش ۱: فایل‌های داخل بستهٔ RahyAr_R2_OWNER_DELIVERY (مسیرها نسبت به ریشهٔ بسته)\n")
    out.write("#   بررسی: داخل پوشهٔ باز‌شده  →  sha256sum -c SHA256SUMS.txt\n")
    out.write("\n")
    out.write(pkg_sums + "\n")
    out.write("\n# بخش ۲: فایل‌های تحویل سطح بالا (همین پوشه)\n")
    for f in top_files:
        out.write(f"{sha(f)}  {f}\n")
print("top-level SHA256SUMS.txt written")
PYEOF

# verify section 2 from download root
for f in RahyAr_R2_OWNER_DELIVERY.zip RahyAr_R2_Full_Source.zip RahyAr_R2_COMPLETE_SOURCE.txt RahyAr_R2_Screenshots_16.zip RahyAr_R2_Walkthrough_Video.mp4 RahyAr_R2_Walkthrough_Video.webm README-OWNER-DELIVERY.md; do
  grep "  $f$" SHA256SUMS.txt | sha256sum -c --quiet
done && echo "TOP-LEVEL SECTION VERIFY: ALL OK"

# served copy matches?
diff <(curl -s http://127.0.0.1:3000/api/download/SHA256SUMS.txt) SHA256SUMS.txt > /dev/null && echo "SERVED COPY MATCHES" || echo "SERVED COPY DIFFERS"
