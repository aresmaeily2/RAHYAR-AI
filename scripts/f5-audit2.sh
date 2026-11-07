#!/usr/bin/env bash
# F5-AUDIT2: local-vs-github divergence + RTM location + push capability
cd /home/z/my-project
{
echo "===== A. AHEAD/BEHIND ====="
git rev-list --count 28b64bb..HEAD
git rev-list --count HEAD..28b64bb
echo "--- commits local-only (28b64bb..HEAD) ---"
git log --oneline --no-decorate 28b64bb..HEAD | head -30

echo "===== B. FILE-BY-FILE DIFF SUMMARY (28b64bb..HEAD) ====="
git diff --stat 28b64bb..HEAD | tail -8
echo "--- changed file list (first 60) ---"
git diff --name-status 28b64bb..HEAD | head -60

echo "===== C. REMOTE CONTAINMENT ====="
for c in 9aac0cb 95a73e7 e534155; do
  echo "refs containing $c:"
  git branch -r --contains "$c" 2>/dev/null | head -5
done

echo "===== D. TRACEABILITY / RTM FILES (tracked) ====="
git ls-files | grep -iE 'traceability|RTM' | head -10
echo "--- also on disk ---"
ls -la download/RahyAr-Android/ 2>/dev/null | head -25

echo "===== E. F4 REPORT FILES (tracked) ====="
git ls-files | grep -iE 'F4|REPORT' | grep -vE 'scripts/|tests/' | head -20

echo "===== F. PUSH CAPABILITY (no secrets printed) ====="
echo "credential.helper = $(git config --get credential.helper 2>/dev/null || echo '(unset)')"
if [ -f "$HOME/.git-credentials" ]; then echo "~/.git-credentials EXISTS ($(grep -c . "$HOME/.git-credentials") lines)"; else echo "~/.git-credentials MISSING"; fi
command -v gh >/dev/null 2>&1 && echo "gh CLI present" || echo "gh CLI absent"
env | grep -cE '^(GITHUB|GH)_' | xargs -I{} echo "github-ish env vars: {}"

echo "===== G. DRY-RUN PUSH (does auth work? no mutation) ====="
GIT_TERMINAL_PROMPT=0 timeout 25 git push --dry-run origin main 2>&1 | head -5

echo "===== H. ANDROID GRADLE / SIGNING CONFIG ====="
grep -nE 'keystore|signingConfig|storeFile' android/app/build.gradle | head -10
ls android/keystore.properties 2>/dev/null || echo "keystore.properties MISSING (fail-closed required)"
git ls-files | grep -iE '\.keystore$|\.jks$|keystore\.properties' | head -5
echo "(tracked keystore files above — must be empty)"

echo "===== I. VERSION / PACKAGE ====="
grep -nE 'applicationId|versionCode|versionName' android/app/build.gradle | head -6
} 2>&1 | tee /tmp/f5-audit2.log
echo "SAVED: /tmp/f5-audit2.log"
