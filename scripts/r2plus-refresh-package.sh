#!/bin/bash
# R2+ refresh: sync README into package, regen SHA256SUMS, rebuild OWNER_DELIVERY.zip
set -euo pipefail
cd /home/z/my-project/download

PKG=RahyAr_R2_OWNER_DELIVERY

# 1) README sync (top-level -> package)
cp -f README-OWNER-DELIVERY.md "$PKG/README-OWNER-DELIVERY.md"

# 2) Regenerate SHA256SUMS.txt (same scope/format: README + all package files, package-relative)
cd "$PKG"
python3 - << 'PYEOF'
import hashlib, os
entries = []
for root, dirs, files in os.walk('.'):
    for f in sorted(files):
        p = os.path.join(root, f)
        rel = os.path.relpath(p, '.')
        if rel == 'SHA256SUMS.txt':
            continue
        h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        entries.append((h, rel))
entries.sort(key=lambda x: x[1])
with open('SHA256SUMS.txt', 'w') as out:
    for h, rel in entries:
        out.write(f"{h}  {rel}\n")
print(f"SHA256SUMS.txt: {len(entries)} entries")
PYEOF
cd ..

# 3) Rebuild OWNER_DELIVERY.zip (exclude the zip itself)
rm -f RahyAr_R2_OWNER_DELIVERY.zip
cd "$PKG" && zip -qr ../RahyAr_R2_OWNER_DELIVERY.zip . -x "SHA256SUMS.txt" && cd ..
# SHA256SUMS excluded from the zip? NO — it must be INSIDE. Previous zip contained it.
rm -f RahyAr_R2_OWNER_DELIVERY.zip
cd "$PKG" && zip -qr ../RahyAr_R2_OWNER_DELIVERY.zip . && cd ..
echo "OWNER_DELIVERY.zip rebuilt: $(du -h RahyAr_R2_OWNER_DELIVERY.zip | cut -f1)"

# 4) Verify: sha256sum -c inside package
cd "$PKG" && sha256sum -c SHA256SUMS.txt --quiet && echo "INTEGRITY: ALL OK" || echo "INTEGRITY: FAIL"

# 5) Verify zip integrity + inner checksum match
cd ..
unzip -t RahyAr_R2_OWNER_DELIVERY.zip > /dev/null && echo "ZIP: OK"
mkdir -p /tmp/odcheck && rm -rf /tmp/odcheck/* && unzip -qo RahyAr_R2_OWNER_DELIVERY.zip -d /tmp/odcheck
cd /tmp/odcheck && sha256sum -c SHA256SUMS.txt --quiet && echo "ZIP-INNER INTEGRITY: ALL OK" || echo "ZIP-INNER: FAIL"
