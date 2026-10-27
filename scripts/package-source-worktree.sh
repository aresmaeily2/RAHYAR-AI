#!/bin/bash
# ─── بستهٔ سورس کامل از Working Tree جاری — بدون Secret/DB/باینری‌های تولیدی ───
# خروجی: /home/z/my-project/download/RahyAr-Full-Source.zip (پیشوند RahyAr-AI/)
set -euo pipefail
ROOT=/home/z/my-project
STAGE=$(mktemp -d)
OUT="$ROOT/download/RahyAr-Full-Source.zip"
mkdir -p "$ROOT/download"

cd "$ROOT"
SHA=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ۱) اسکن راز روی درخت کاری (به‌جز مسیرهای مستثنی)
echo "--- secret scan (working tree) ---"
if rg -l --hidden -g '!node_modules/**' -g '!.next/**' -g '!.git/**' -g '!skills/**' -g '!db/**' \
      -g '!download/**' -g '!upload/**' -g '!*.lock' \
      'sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY' \
      . ; then
  echo "SECRET_PATTERN_FOUND — abort"; exit 1
else
  echo "scan clean"
fi

# ۲) کپی به stage با استثناها
rsync -a \
  --exclude 'node_modules/' --exclude '.next/' --exclude '.git/' --exclude 'db/' \
  --exclude 'upload/' --exclude 'download/' --exclude 'skills/' --exclude '.zscripts/' \
  --exclude 'artifacts/' --exclude 'backups/' --exclude 'release-delivery/' \
  --exclude 'mini-services/' --exclude '.env' --exclude '*.db' --exclude '*.log' \
  --exclude '*.tsbuildinfo' --exclude '.gradle/' --exclude 'android/app/build/' \
  --exclude 'worklog.md' --exclude 'dev.log' --exclude 'server.log' \
  "$ROOT/" "$STAGE/RahyAr-AI/"

# ۳) مانیفست داخل بسته
cat > "$STAGE/RahyAr-AI/SOURCE-MANIFEST.txt" <<EOF
RahyAr AI — Full Source Manifest
================================
Generated (UTC)   : $DATE
Local git HEAD    : $SHA (reference only — this zip is the current working tree, which may be newer)
Web app version   : $(python3 -c "import json;print(json.load(open('package.json'))['version'])")
Android shell     : 2.1.0 (code 21) — android/src/java/com/rahyarai/app/AppVersion.java
App name          : rahyar (RahyAr AI / رهیار)

Contents          : complete source — src/, android/, prisma/, tests/, docs/, scripts/,
                    brand/, public/ (fonts+ambient assets), root configs, .env.example (non-secret),
                    README.md, CHANGELOG.md, RAHYAR_RELEASE.md
Excluded on purpose: .env (real secrets), db/*.db (live data), node_modules/, .next/, .git/,
                    upload/, download/, skills/, logs, zips, artifacts.

Setup             : 1) bun install   2) cp .env.example .env (set DATABASE_URL, RAHYAR_SETUP_TOKEN)
                    3) bun run db:generate && bun run db:push
                    4) bun run build && bun run start   (production, :3000)
                    First-run owner setup requires RAHYAR_SETUP_TOKEN (GU2-SEC1).
Android           : see android/README.md + docs/MOBILE_ARCHITECTURE.md (WebView shell, dual edition)
Verify            : bun run verify  (typecheck + lint + unit tests)
EOF

# ۴) زیپ نهایی
rm -f "$OUT"
(cd "$STAGE" && zip -qr "$OUT" RahyAr-AI)
rm -rf "$STAGE"

echo "OUT: $OUT"
echo "size: $(du -h "$OUT" | cut -f1)"
unzip -l "$OUT" | tail -1
