#!/bin/bash
# بسته‌بندی نهایی تحویل RahyAr v2.0.0 — برای GOFILE + Workspace
# استفاده: package-delivery-v2.sh stage1  (سورس + کیت امضا)
#          package-delivery-v2.sh stage2  (باندل + SHA256SUMS — بعد از DOCX نهایی)
set -euo pipefail
ROOT=/home/z/my-project
OUT=$ROOT/download
BK=$ROOT/backups/android-release-keystore
SIGN=$ROOT/artifacts/signing
STAGE=${1:-stage2}
mkdir -p "$OUT" "$SIGN"

if [ "$STAGE" = "stage1" ]; then

echo "== 1) source zip (from HEAD, secret-scanned) =="
cd "$ROOT"
# اسکن امنیتی: هیچ توکن/کلیدی نباید track باشد
if git grep -lE "ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY" HEAD -- . 2>/dev/null; then
  echo "SECRET_PATTERN_FOUND — abort"; exit 1
fi
for f in ".env" "RUN.md" "worklog.md"; do
  git ls-files --error-unmatch "$f" >/dev/null 2>&1 && { echo "FORBIDDEN_TRACKED: $f"; exit 1; } || true
done
if git ls-files | grep -qE "^(db/|upload/|artifacts/|backups/|download/)|\.keystore$|\.jks$|\.db$|keystore\.properties$"; then
  echo "FORBIDDEN_TRACKED_PATH — abort"; exit 1
fi
SRC="$OUT/rahyar-source-v2.0.0.zip"
rm -f "$SRC"
git archive --format=zip --prefix=RahyAr/ -o "$SRC" HEAD
TMP=$(mktemp -d); mkdir -p "$TMP/RahyAr"
{
  echo "RahyAr — Full Source Manifest"
  echo "Generated (UTC) : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Git commit      : $(git rev-parse HEAD) (branch main, local HEAD)"
  echo "Tracked files   : $(git ls-files | wc -l)"
  echo "Version         : 2.0.0 (web product) / Android v2.0.0 (code 20 user, 21 owner)"
  echo "Excluded        : .env (real), db/*, backups/, upload/, artifacts/, download/, worklog.md, any signing key/token"
  echo "Android build   : cd android && ./gradlew :app:assembleUserRelease :app:assembleOwnerRelease (needs Android SDK 34 + JDK 17+)"
  echo "Web build       : bun install && cp .env.example .env && bun run db:generate && bun run db:push && bun run build && bun run start"
} > "$TMP/RahyAr/SOURCE-MANIFEST.txt"
( cd "$TMP" && zip -q "$SRC" RahyAr/SOURCE-MANIFEST.txt )
rm -rf "$TMP"
unzip -t "$SRC" > /dev/null && echo "source zip integrity: OK ($(du -h "$SRC" | cut -f1))"

echo "== 2) encrypted signing kit =="
KIT=$SIGN/rahyar-release-signing-kit
rm -rf "$KIT"; mkdir -p "$KIT"
cp "$BK/rahyar-release.keystore" "$KIT/"
cp "$ROOT/android/keystore.properties" "$KIT/"
/home/z/my-project/artifacts/android-build/tools/bt/android-14/apksigner verify --print-certs "$OUT/rahyar-user-v2.0.0.apk" > "$KIT/certificate.txt" 2>&1
{
  echo "# راهنمای بازیابی کیت امضای رهیار"
  echo "1) رمزگشایی:  openssl enc -d -aes-256-cbc -pbkdf2 -in rahyar-release-signing-kit.zip.enc -out rahyar-release-signing-kit.zip"
  echo "   (رمز را در پیام خصوصی مالک دریافت کنید)"
  echo "2) باز کردن ZIP و کپی keystore + keystore.properties کنار پوشهٔ android/"
  echo "3) بیلد:  cd android && ./gradlew :app:assembleUserRelease :app:assembleOwnerRelease"
  echo "4) هرگز keystore/keystore.properties را commit یا عمومی نکنید (در .gitignore ثبت است)"
} > "$KIT/RESTORE-GUIDE.txt"
KITPW=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"7K"
cd "$SIGN" && zip -qr "$KIT.zip" "$(basename "$KIT")"
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$KIT.zip" -out "$OUT/rahyar-release-signing-kit.zip.enc" -pass pass:"$KITPW" -iter 200000
printf '%s\n' "$KITPW" > "$ROOT/backups/signing-kit-password.txt"
chmod 600 "$ROOT/backups/signing-kit-password.txt"
rm -f "$KIT.zip"
echo "signing kit encrypted (password only in backups/signing-kit-password.txt — sent privately to owner)"

echo "PACKAGE_STAGE1_OK (source zip + signing kit)"
exit 0
fi

# ─────────────── stage2 ───────────────
echo "== stage2: SHA256SUMS + bundle =="
cd "$OUT"

rm -f rahyar-v2.0.0-sha256.txt SHA256SUMS.txt GOFILE-LINKS.txt RahyAr-v2.0.0-bundle.zip
# SHA256SUMS فقط ۵ فایل اصلی (بدون باندل و خودش — جلوگیری از وابستگی حلقوی)
sha256sum rahyar-user-v2.0.0.apk rahyar-owner-v2.0.0.apk rahyar-source-v2.0.0.zip rahyar-v2.0.0-delivery-report.docx rahyar-release-signing-kit.zip.enc > SHA256SUMS.txt
cp SHA256SUMS.txt rahyar-v2.0.0-sha256.txt
cat SHA256SUMS.txt

echo "== bundle =="
mkdir -p /tmp/bundle/RahyAr-v2.0.0
cp rahyar-user-v2.0.0.apk rahyar-owner-v2.0.0.apk rahyar-source-v2.0.0.zip rahyar-v2.0.0-delivery-report.docx rahyar-release-signing-kit.zip.enc rahyar-v2.0.0-sha256.txt /tmp/bundle/RahyAr-v2.0.0/
( cd /tmp/bundle && zip -qr "$OUT/RahyAr-v2.0.0-bundle.zip" RahyAr-v2.0.0 )
rm -rf /tmp/bundle
echo "bundle sha256: $(sha256sum RahyAr-v2.0.0-bundle.zip | awk '{print $1}')"
echo "== final listing =="
stat -c "%s bytes  %n" "$OUT"/* | sort -k2
echo "PACKAGE_STAGE2_OK"
