#!/bin/bash
# اعمال ۹ پچ GU2 برنامه‌نویس قبلی — هر پچ یک کامیت با پیام Conventional
# (بخش‌های باینری PNG از قبل untrack شده‌اند؛ exclude فقط برای سازگاری)
set -euo pipefail
cd /home/z/my-project
DIR=artifacts/gu2/patches

apply() { # $1=file $2=subject
  echo "=== $1"
  git apply --exclude='scripts/*.png' "$DIR/$1"
  git add -A
  git commit -q -m "$2" -m "Reviewed-and-applied from rahyar-gu2-patches-small.zip (GU2 audit, this sandbox)"
}

apply 0001-fix-auth-require-out-of-band-RAHYAR_SETUP_TOKEN-for-.patch \
  "fix(auth): require out-of-band RAHYAR_SETUP_TOKEN for first-run owner setup (GU2-SEC1)"

apply 0002-fix-auth-per-account-login-rate-limit-independent-of.patch \
  "fix(auth): per-account login rate limit independent of client IP (GU2-SEC2)"

apply 0003-fix-ai-SSRF-guard-for-OpenAI-compatible-endpoint-no-.patch \
  "fix(ai): SSRF guard for OpenAI-compatible endpoint, no redirects, no body reflection (GU2-SEC3)"

apply 0004-fix-data-validate-import-dates-and-write-atomically-.patch \
  "fix(data): validate import dates and write atomically (GU2-DATA1)"

apply 0005-fix-i18n-keep-Gregorian-digits-Latin-in-Persian-dual.patch \
  "fix(i18n): keep Gregorian digits Latin in Persian dual calendar (GU2-I18N1)"

apply 0006-i18n-en-strings-for-setup-code-account-lockout-impor.patch \
  "i18n: English strings for setup code, account lockout, import (GU2)"

apply 0007-chore-security-safe-TRUST_PROXY-default-document-new.patch \
  "chore(security): safe TRUST_PROXY default + documentation (GU2-SEC4)"

apply 0008-test-regression-tests-for-GU2-security-fixes.patch \
  "test: regression tests for GU2 security fixes (GU2)"

apply 0009-docs-GU2-delivery-report-residual-risks-and-changelo.patch \
  "docs: GU2 delivery report, residual risks and changelog (GU2)"

echo "ALL_PATCHES_APPLIED"
git log --oneline -10
