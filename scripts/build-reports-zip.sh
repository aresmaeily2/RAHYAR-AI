#!/bin/bash
# ساخت Rahyar-AI-Release-Reports.zip + تصویر ساختار + صحت‌سنجی
set -euo pipefail
cd /home/z/my-project
RD=release-delivery
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

# ── ۱) مونتاژ محتوا در stage ──
mkdir -p "$STAGE/reports/evidence" "$STAGE/docs" "$STAGE/screenshots"
cp "$RD"/DELIVERY-REPORT.md "$RD"/reports/*.md "$STAGE/reports/"
cp artifacts/reports/test-run-*.log artifacts/reports/users-scenario-*.log "$STAGE/reports/evidence/" 2>/dev/null || true
cp docs/*.md "$STAGE/docs/"
cp CHANGELOG.md README.md RAHYAR_RELEASE.md "$STAGE/"
cp "$RD"/screenshots/*.png "$STAGE/screenshots/"

OUT="$RD/Rahyar-AI-Release-Reports.zip"
rm -f "$OUT"
( cd "$STAGE" && zip -qr "$OLDPWD/$OUT" . )
echo "== built: $(du -h "$OUT" | cut -f1), $(unzip -l "$OUT" | tail -1 | awk '{print $2}') entries"

# ── ۲) صحت + اسکن ممنوع ──
unzip -t "$OUT" >/dev/null && echo "zip integrity: OK"
echo "-- forbidden scan (expect only 'no match') --"
unzip -l "$OUT" | rg -i "\.env$|\.db$|keystore|\.jks$|worklog\.md|RUN\.md|owner-cred|HAMYAR TOKEN|\.jar$" || echo "clean ✓"
sha256sum "$OUT" | tee "$RD/Rahyar-AI-Release-Reports.zip.sha256"

# ── ۳) تصویر واقعی ساختار پوشهٔ تحویل (PNG) ──
TREE=$( { echo "release-delivery/"; command ls -la "$RD" | tail -n +2 | awk '{printf "  %-46s %10s\n", $NF, $5}'; \
  echo "download/screenshots/"; command ls "$RD/screenshots" | sed 's/^/  /'; } )
python3 - "$RD/delivery-structure.png" "$TREE" <<'PY'
import sys
from PIL import Image, ImageDraw, ImageFont
out, tree = sys.argv[1], sys.argv[2]
lines = tree.splitlines()
F = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
fb = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
f1, f2 = ImageFont.truetype(F, 26), ImageFont.truetype(fb, 40)
W, LH, PAD = 1180, 40, 40
H = PAD*2 + 90 + LH*len(lines)
img = Image.new("RGB", (W, H), "#0f172a")
d = ImageDraw.Draw(img)
d.text((PAD, PAD-6), "Rahyar AI - release-delivery structure", font=f2, fill="#7dd3fc")
d.text((PAD, PAD+52), "real listing - 2026-10-19 - " + "/home/z/my-project/release-delivery/", font=f1, fill="#64748b")
y = PAD+110
for ln in lines:
    d.text((PAD, y), ln, font=f1, fill=( "#e2e8f0" if not ln.startswith("  ") else "#cbd5e1"))
    y += LH
img.save(out)
print("structure png:", out, img.size)
PY
ls -la "$RD" | tail -n +2
