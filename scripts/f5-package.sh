#!/bin/bash
# F5-PACKAGE: assemble final delivery bundle under download/RahyAr-F5/
set -uo pipefail
cd /home/z/my-project
D=download/RahyAr-F5
mkdir -p "$D/screens-web" "$D/screens-android" "$D/docs"
HEAD=$(git rev-parse --short HEAD)

# 1) screenshots
cp -f download/screenshots/grand/*.png "$D/screens-web/" 2>/dev/null || true
cp -f artifacts/reports/f5/emu/shot-*.png "$D/screens-android/" 2>/dev/null || true
# 2) docs
cp -f docs/audit/REQUIREMENTS_TRACEABILITY_F5.md docs/audit/FEATURE_PARITY_F5.md "$D/docs/"
cp -f docs/AI_PROVIDERS.md docs/CONNECTIONS.md docs/LIMITATIONS_V2_FA.md "$D/docs/" 2>/dev/null || true
# 3) evidence reports
mkdir -p "$D/evidence"
cp -f artifacts/reports/f5/capabilities.txt artifacts/reports/f5/providers2.txt artifacts/reports/f5/sec-matrix.txt "$D/evidence/" 2>/dev/null || true
cp -f artifacts/reports/f5/emu/*.txt artifacts/reports/f5/emu/*.log "$D/evidence/" 2>/dev/null || true
cp -f artifacts/reports/f5/emu/shot-fix1-run1.png "$D/evidence/" 2>/dev/null || true
cp -f /tmp/f5-web-verify.log "$D/evidence/web-verify-run.log" 2>/dev/null || true
cp -f artifacts/reports/grand-e2e.json "$D/evidence/" 2>/dev/null || true
# 4) source zip from exact HEAD
git archive --format=zip -o "$D/RahyAr-F5-Source-HEAD-$HEAD.zip" HEAD
git rev-parse HEAD > "$D/SOURCE-HEAD.txt"
# 5) evidence zip
cd /tmp && rm -rf f5ev && mkdir f5ev && cp -r /home/z/my-project/artifacts/reports/f5/* f5ev/ && cp -f /tmp/f5-audit.log /tmp/f5-audit2.log /tmp/f5-audit3.log /tmp/f5-audit4.log /tmp/f5-recover.log f5ev/ 2>/dev/null
zip -qr "/home/z/my-project/$D/RahyAr-F5-Evidence.zip" f5ev && cd /home/z/my-project
# 6) GitHub transfer (Mission 1 — push BLOCKED: no credentials)
mkdir -p "$D/github-transfer"
git bundle create "$D/github-transfer/rahyar-main-full.bundle" --branches --tags 2>/dev/null
git format-patch 28b64bb..HEAD -o "$D/github-transfer/patches/" >/dev/null 2>&1
cat > "$D/github-transfer/PUSH-INSTRUCTIONS.txt" <<'EOF'
# انتقال تاریخچه محلی به GitHub (مأموریت ۱، بند ۹)
# Push مستقیم در سندباکس BLOCKED است: هیچ اعتبارنامه‌ای (token/gh/credential helper)
# در محیط وجود ندارد و Force Push/بازنویسی تاریخچه ممنوع بود.
# شاخه main محلی ۸۶+ کامیت جلوتر از origin/main است؛ انتقال Fast-forward امن است.
#
# روش ۱ (bundle — کامل):
#   git clone rahyar-main-full.bundle rahyar-repo
#   cd rahyar-repo && git remote set-url origin https://github.com/aresmaeily2/RAHYAR-AI.git
#   git push origin main          # fast-forward — بدون force
#
# روش ۲ (patches):
#   git am patches/*.patch
#
# نکته: origin فعلی مخزن HAMYAR-AI است؛ نام مخزن در مأموریت RAHYAR-AI ذکر شده —
# پیش از push، remote را با مخزن مقصد مالک تنظیم کنید.
EOF
# 7) credential artifact check (private files must NOT be in bundle)
echo "== private artifacts (outside git, outside public zips) =="
ls artifacts/credentials/ backups/android-release-keystore/ 2>/dev/null
echo "F5-PACKAGE-BASE-DONE"
