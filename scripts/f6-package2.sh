#!/usr/bin/env bash
# F6 package v2: dual-HEAD provenance clarification + recommit + repackage
set -uo pipefail
cd /home/z/my-project
D=download/RahyAr-F6
GT=$D/github-transfer

echo "== [1] provenance note into docs/reports =="
NOTE='- **خاستگاه بسته:** وضعیت‌های این ماتریس به کد در `57aefdb` تعلق دارند؛ کامیت‌های بعدی فقط مستندات/ابزارند (کنترل: `git diff 57aefdb..HEAD -- src android` = خالی). هش قطعی HEAD بسته در `SOURCE-HEAD.txt` داخل بسته ثبت می‌شود.'
python3 - <<'EOF'
import re
def prepend_after(line_marker, note, path):
    s=open(path).read()
    if 'خاستگاه بسته' in s: return
    lines=s.split('\n')
    for i,l in enumerate(lines):
        if l.startswith(line_marker):
            lines.insert(i+1, note); break
    open(path,'w').write('\n'.join(lines))

NOTE='- **خاستگاه بسته:** وضعیت‌ها به کد در `57aefdb` تعلق دارند؛ کامیت‌های بعدی فقط مستندات/ابزارند (`git diff 57aefdb..HEAD -- src android` = خالی). هش قطعی HEAD بسته در `SOURCE-HEAD.txt` بسته ثبت است.'
prepend_after('- **تاریخ:** 2026-11-07', NOTE, 'docs/audit/REQUIREMENTS_TRACEABILITY_F6.md')
prepend_after('**تفاوت‌های ثبت‌شده F6:**', '- **خاستگاه بسته:** '+NOTE[4:], 'docs/audit/FEATURE_PARITY_F6.md')

for f in ['download/RahyAr-F6/RAHYAR-F6-REPORT-FA.txt','download/RahyAr-F6/REPORT-EN-SUMMARY.txt',
          'download/RahyAr-F6/SECURITY-REPORT-F6-FA.txt','download/RahyAr-F6/TEST-REPORT-F6-FA.txt']:
    s=open(f).read()
    if 'SOURCE-HEAD.txt' not in s:
        lines=s.split('\n')
        lines.insert(1, '[خاستگاه: HEAD کد/آزمون=57aefdb — کامیت‌های بعدی فقط docs/scripts (git diff 57aefdb..HEAD -- src android = خالی) — هش قطعی بسته: SOURCE-HEAD.txt]')
        open(f,'w').write('\n'.join(lines))
print('notes injected')
EOF
cp -f docs/audit/REQUIREMENTS_TRACEABILITY_F6.md "$D/docs/"
cp -f docs/audit/FEATURE_PARITY_F6.md "$D/docs/"

echo "== [2] recommit docs =="
git add docs/audit/REQUIREMENTS_TRACEABILITY_F6.md docs/audit/FEATURE_PARITY_F6.md
git commit -m "F6-DOCS: dual-HEAD provenance clarification (statuses bind to code HEAD 57aefdb; packaging HEAD recorded in package SOURCE-HEAD.txt; git diff 57aefdb..HEAD -- src android = empty)" 2>&1 | tail -1
PKG_HEAD=$(git rev-parse --short HEAD); echo "PKG_HEAD=$PKG_HEAD"

echo "== [3] repackage: bundle/patches/zip/sums =="
rm -f "$GT/rahyar-main-full.bundle"; rm -f "$GT/patches/"*.patch
git bundle create "$GT/rahyar-main-full.bundle" main --tags 2>&1 | tail -1
echo "bundle-main-ref=$(git ls-remote "$GT/rahyar-main-full.bundle" refs/heads/main | cut -f1 | head -c 12)"
git format-patch origin/main..main -o "$GT/patches" >/dev/null 2>&1
AHEAD=$(git rev-list --count origin/main..main)
sed -i "s/^#   HEAD محلی      = .*/#   HEAD محلی      = $PKG_HEAD (F6-FINAL) — درخت کاری پاک/; s/^#   برتری\/عقب‌ماندگی = .*/#   برتری\/عقب‌ماندگی = $AHEAD کامیت جلوتر \/ 0 عقبتر → فقط Fast-forward/; s/^#   bundle و patches از همین HEAD ساخته شده‌اند (.*)/#   bundle و patches از همین HEAD ساخته شده‌اند ($(ls "$GT/patches" | wc -l) پچ مرتب)/" "$GT/PUSH-INSTRUCTIONS.txt"
rm -f "$D"/RahyAr-F6-Source-HEAD-*.zip
git archive --format=zip -o "$D/RahyAr-F6-Source-HEAD-$PKG_HEAD.zip" HEAD
git rev-parse HEAD > "$D/SOURCE-HEAD.txt"
cd artifacts/reports/f6 && rm -f /home/z/my-project/$D/RahyAr-F6-Evidence.zip && zip -qr /home/z/my-project/$D/RahyAr-F6-Evidence.zip . && cd /home/z/my-project
cd "$D"
find . -type f ! -name SHA256SUMS.txt | sort | xargs sha256sum > SHA256SUMS.txt
OK=$(sha256sum -c SHA256SUMS.txt 2>/dev/null | grep -c ': OK$'); FAIL=$(sha256sum -c SHA256SUMS.txt 2>/dev/null | grep -vc ': OK$')
echo "sums: entries=$(wc -l < SHA256SUMS.txt) OK=$OK FAIL=$FAIL"

echo "== [4] final verification =="
git status --short | grep -v '^??' | head -2; echo "(empty = tree clean)"
echo "SOURCE-HEAD=$(cat $D/SOURCE-HEAD.txt)"
unzip -l "$D/RahyAr-F6-Evidence.zip" | tail -1
ls -la "$D" | grep -vE '^total|^d' | awk '{print $5, $9}' | sort -k2
echo "===== F6-PACKAGE-V2-DONE ====="
