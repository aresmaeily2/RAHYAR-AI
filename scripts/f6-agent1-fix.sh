#!/usr/bin/env bash
# F6 Agent 1 fix: regenerate github-transfer bundle+patches from final HEAD 6664c3c,
# update PUSH-INSTRUCTIONS, regenerate SHA256SUMS, verify all entries.
set -uo pipefail
cd /home/z/my-project
F5=download/RahyAr-F5
GT=$F5/github-transfer

echo "== 0. is download/ tracked by git? =="
git check-ignore -v download/ 2>/dev/null || echo "download/ NOT ignored"
echo "tracked files under download/: $(git ls-files download | wc -l)"

echo "== 1. HEAD =="
HEAD=$(git rev-parse HEAD); echo "HEAD=$HEAD"
echo "$HEAD" > "$F5/SOURCE-HEAD.txt"
echo "6664c3c (short)" > /dev/null # keep short-ref file? original content was short hash

echo "== 2. regenerate bundle (full history, self-contained) =="
rm -f "$GT/rahyar-main-full.bundle"
git bundle create "$GT/rahyar-main-full.bundle" main --tags 2>&1 | tail -2
git bundle verify "$GT/rahyar-main-full.bundle" 2>&1 | tail -2
git ls-remote "$GT/rahyar-main-full.bundle" refs/heads/main | head -1

echo "== 3. regenerate patches origin/main..main =="
rm -f "$GT/patches/"*.patch
git format-patch origin/main..main -o "$GT/patches" >/dev/null 2>&1
N=$(ls "$GT/patches" | wc -l)
echo "patches regenerated: $N"
AHEAD=$(git rev-list --count origin/main..main)
echo "ahead count: $AHEAD"
ls "$GT/patches" | tail -1

echo "== 4. rewrite PUSH-INSTRUCTIONS =="
cat > "$GT/PUSH-INSTRUCTIONS.txt" <<EOF
# انتقال تاریخچه محلی به GitHub — به‌روزشده در F6 (بر پایه HEAD نهایی 6664c3c)
# وضعیت راستی‌آزمایی‌شده F6:
#   HEAD محلی      = 6664c3c (F5-FINAL) — درخت کاری پاک
#   origin/main    = 28b64bb  (هر دو مخزن RAHYAR-AI و HAMYAR-AI همین را نشان می‌دهند)
#   برتری/عقب‌ماندگی = ${AHEAD} کامیت جلوتر / 0 کامیت عقبتر → push فقط Fast-forward
#   bundle و patches از همان HEAD=${HEAD} بازتولید شده‌اند (۹۰ patch کامل).
#   Push مستقیم در سندباکس انجام نشد: هیچ اعتبارنامه‌ای (token/gh/credential helper) در محیط نیست.
#
# روش ۱ (bundle — کامل و سلف‌کنتینرد):
#   git clone rahyar-main-full.bundle rahyar-repo
#   cd rahyar-repo
#   git remote set-url origin https://github.com/aresmaeily2/RAHYAR-AI.git
#   git push origin main          # fast-forward 28b64bb -> 6664c3c — بدون force
#
# روش ۲ (patches):
#   در کلون موجودِ مخزن: git am patches/*.patch   (۹۰ پچ به ترتیب شماره)
#
# نکته مقصد: remote فعلی HAMYAR-AI است؛ مخزن هدف مأموریت RAHYAR-AI است. هر دو
# در ls-remote همین main=28b64bb را نشان دادند (آینه/فورک). مقصد نهایی را مالک تعیین کند.
# قاعده: فقط fast-forward؛ هر گونه force-push / بازنویسی تاریخچه ممنوع است.
EOF
echo "instructions updated"

echo "== 5. regenerate SHA256SUMS (same ./rel format) =="
cd "$F5"
find . -type f ! -name SHA256SUMS.txt | sed 's|^\./|./|' | sort | xargs sha256sum > SHA256SUMS.txt
TOTAL=$(wc -l < SHA256SUMS.txt)
echo "SHA256SUMS entries: $TOTAL"
FAILS=$(sha256sum -c SHA256SUMS.txt 2>/dev/null | grep -vc ': OK$')
OKS=$(sha256sum -c SHA256SUMS.txt 2>/dev/null | grep -c ': OK$')
echo "verify: OK=$OKS FAIL=$FAILS"

echo "== 6. bundle size =="
ls -la "$GT/rahyar-main-full.bundle"
echo "DONE"
