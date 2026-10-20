#!/bin/bash
# ساخت بسته‌های وب نسخهٔ 1.1.0 در ساختار جدید release-delivery/{web,reports,checksums}
# ۱) سورس کامل HEAD (اسکن secret)  ۲) گزارش‌ها+شواهد+اسکرین‌شات  ۳) SHA256SUMS
set -euo pipefail
cd /home/z/my-project
RD=release-delivery
WEB="$RD/web"
SHA=$(git rev-parse --short HEAD)
VERSION=$(python3 -c "import json;print(json.load(open('package.json'))['version'])")

mkdir -p "$WEB" "$RD/checksums"

# ─── ۱) ZIP سورس کامل ───
SRC_ZIP="$WEB/Rahyar-AI-Full-Source-v${VERSION}.zip"
rm -f "$SRC_ZIP"
echo "--- secret scan on tracked files ---"
if git grep -lE "ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY" HEAD -- . ; then
  echo "SECRET_PATTERN_FOUND — abort"; exit 1
else echo "scan clean"; fi
for f in ".env" "RUN.md" "worklog.md"; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then echo "FORBIDDEN_TRACKED: $f — abort"; exit 1; fi
done
if git ls-files | rg -q "^(db/|upload/|artifacts/|backups/|download/)|\.keystore$|\.jks$|\.db$"; then
  echo "FORBIDDEN_TRACKED_PATH — abort"; exit 1
fi
git archive --format=zip --prefix="rahyar-ai-v${VERSION}/" -o "$SRC_ZIP" HEAD
{ echo "Rahyar AI — Full Source Bundle"
  echo "Version: ${VERSION}  Commit: $(git rev-parse HEAD)  Generated: $(date -u +%FT%TZ)"
  echo "Files: $(git ls-files | wc -l)  Build: bun run build  Tests: bun run verify"
  echo "Excludes (by .gitignore): .env, db/*.db, upload/, artifacts/, backups/, download/, release-delivery/, worklog.md"
} > /tmp/SOURCE-MANIFEST.txt
zip -qj "$SRC_ZIP" /tmp/SOURCE-MANIFEST.txt 2>/dev/null || true
echo "SRC ZIP: $(du -h "$SRC_ZIP" | cut -f1) · $(unzip -l "$SRC_ZIP" | tail -1 | awk '{print $2}') entries"
unzip -t "$SRC_ZIP" >/dev/null && echo "src zip integrity: OK"

# ─── ۲) ZIP گزارش‌ها + شواهد ───
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/reports/evidence" "$STAGE/docs" "$STAGE/screenshots" "$STAGE/checksums"
cp "$RD/reports/WEB_RELEASE_REPORT.md" "$STAGE/reports/"
cp docs/GRAND_UPGRADE_FINAL.md docs/THREAT_MODEL.md docs/DEPLOYMENT.md docs/AI_PROVIDERS.md docs/API.md docs/MOBILE_ARCHITECTURE.md "$STAGE/docs/" 2>/dev/null || true
cp CHANGELOG.md README.md RAHYAR_RELEASE.md .env.example "$STAGE/"
cp artifacts/reports/baseline-verify-*.log artifacts/reports/prod-build-20261020.log \
   artifacts/reports/users-scenario-*.log artifacts/reports/grand-e2e-run.log \
   artifacts/reports/live-security-b.log artifacts/reports/restart-resilience.log \
   "$STAGE/reports/evidence/" 2>/dev/null || true
cp artifacts/reports/dependency-audit.json "$STAGE/reports/evidence/"
cp download/screenshots/grand/*.png "$STAGE/screenshots/"
OUT="$WEB/Rahyar-AI-Reports-v${VERSION}.zip"
rm -f "$OUT"
( cd "$STAGE" && zip -qr "$OLDPWD/$OUT" . )
echo "REPORTS ZIP: $(du -h "$OUT" | cut -f1) · $(unzip -l "$OUT" | tail -1 | awk '{print $2}') entries"
unzip -t "$OUT" >/dev/null && echo "reports zip integrity: OK"

# ─── ۳) اسکن ممنوع داخل هر دو ZIP ───
for Z in "$SRC_ZIP" "$OUT"; do
  echo "-- forbidden scan: $(basename "$Z")"
  unzip -l "$Z" | rg -i "\.env$|custom\.db|keystore|\.jks$|worklog\.md|RUN\.md|owner-cred|setup-token|HAMYAR TOKEN|users-list" && { echo "FORBIDDEN CONTENT — abort"; exit 1; } || echo "clean ✓"
done

# ─── ۴) SHA-256 ───
cd "$RD"
{ sha256sum web/*.zip; } > checksums/SHA256SUMS.txt
cat checksums/SHA256SUMS.txt
echo "ZIPS-DONE"
