#!/bin/bash
# ساخت Rahyar-AI-Full-Source.zip — سورس کامل HEAD بدون هیچ Secret/DB/کلید
set -euo pipefail
cd /home/z/my-project
RD=release-delivery
mkdir -p "$RD"
OUT="$RD/Rahyar-AI-Full-Source.zip"
rm -f "$OUT"

SHA=$(git rev-parse HEAD)
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
NFILES=$(git ls-files | wc -l)

# 1) اسکن امنیتی محتوای HEAD پیش از بسته‌بندی: هیچ الگوی توکن/کلید نباید باشد
echo "--- secret scan on tracked files ---"
if git grep -lE "ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY" HEAD -- . ; then
  echo "SECRET_PATTERN_FOUND — abort"; exit 1
else
  echo "scan clean (no token/key patterns)"
fi
# فایل‌های ممنوع نباید track باشند
for f in ".env" "RUN.md" "worklog.md"; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then echo "FORBIDDEN_TRACKED: $f — abort"; exit 1; fi
done
if git ls-files | rg -q "^(db/|upload/|artifacts/|backups/|download/)|\.keystore$|\.jks$|\.db$"; then
  echo "FORBIDDEN_TRACKED_PATH — abort"; exit 1
fi
echo "tracked-file policy clean"

# 2) git archive با پیشوند پوشه
git archive --format=zip --prefix=Rahyar-AI/ -o "$OUT" HEAD
echo "archive base: $(du -h "$OUT" | cut -f1), $(unzip -l "$OUT" | tail -1 | awk '{print $2}') files"

# 3) مانیفست منبع (داخل پوشه Rahyar-AI/)
TMP=$(mktemp -d)
mkdir -p "$TMP/Rahyar-AI"
cat > "$TMP/Rahyar-AI/SOURCE-MANIFEST.txt" <<EOF
Rahyar AI — Full Source Manifest
================================
Generated (UTC) : $DATE
Git commit      : $SHA (branch main, local HEAD)
Tracked files   : $NFILES
Version         : $(python3 -c "import json;print(json.load(open('package.json'))['version'])")
App name        : rahyar (Rahyar AI / رهیار)

Contents        : complete source (src/, prisma/, tests/, docs/, scripts/),
                  .env.example (non-secret template), CHANGELOG.md, README.md,
                  RAHYAR_RELEASE.md
Excluded by     : .env (real), db/*.db, backups/, upload/, artifacts/, download/,
design          : worklog.md, RUN.md (contains real credentials), any signing key,
                  any GitHub token. See .gitignore.

Setup           : README.md + docs/DEPLOYMENT.md + RAHYAR_RELEASE.md
                  1) bun install
                  2) cp .env.example .env  (set DATABASE_URL, RAHYAR_SETUP_TOKEN)
                  3) bun run db:generate && bun run db:push
                  4) bun run build && bun run start   (production, :3000)
                  First-run owner setup requires RAHYAR_SETUP_TOKEN (GU2-SEC1).
Verify          : bun run verify  (typecheck + lint + unit tests)
EOF
( cd "$TMP" && zip -q "$OLDPWD/$OUT" Rahyar-AI/SOURCE-MANIFEST.txt )
rm -rf "$TMP"

# 4) صحت و فهرست ممنوع
unzip -t "$OUT" >/dev/null && echo "zip integrity: OK"
echo "--- forbidden scan inside zip (must be empty) ---"
unzip -l "$OUT" | rg -i "\.env$|\.db$|keystore|\.jks$|worklog|RUN\.md|owner-cred|TOKEN|artifacts/|upload/|backups/" || echo "clean ✓"
echo "--- final ---"
du -h "$OUT"; unzip -l "$OUT" | tail -1
sha256sum "$OUT" | tee "$RD/Rahyar-AI-Full-Source.zip.sha256"
