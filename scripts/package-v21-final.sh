#!/bin/bash
# بسته‌بندی نهایی RahyAr v2.1.0 — ۱۲ قلم رسمی تحویل
set -euo pipefail
ROOT=/home/z/my-project
OUT=$ROOT/download
EV=$OUT/final-v21
mkdir -p "$OUT" "$EV/pkgs"

echo "== 1) Logo Kit =="
KIT="$EV/pkgs/RahyAr-Logo-Kit.zip"
rm -f "$KIT"
( cd "$ROOT" && zip -qr "$KIT" brand/ android/src/res/drawable* android/src/res/mipmap* -x "*.DS_Store" 2>/dev/null || zip -qr "$KIT" brand/ )
unzip -l "$KIT" | tail -2

echo "== 2) Screenshots =="
SS="$EV/pkgs/RahyAr-Screenshots.zip"
rm -f "$SS"
( cd "$EV" && zip -qr "$SS" web/ themes/ splash/ local/ offline/ compare/ brand/ before-v200/ manifest.json )
unzip -l "$SS" | tail -2

echo "== 3) Videos (mp4) =="
cp "$EV/video/RahyAr-Interaction-Video.mp4" "$EV/pkgs/RahyAr-Interaction-Video.mp4" 2>/dev/null || cp "$EV/video/interaction-owner-mobile.mp4" "$EV/pkgs/RahyAr-Interaction-Video.mp4"
cp "$EV/video/RahyAr-Splash-Video.mp4" "$EV/pkgs/RahyAr-Splash-Video.mp4" 2>/dev/null || cp "$EV/video/splash-web-real.mp4" "$EV/pkgs/RahyAr-Splash-Video.mp4"
ls -la "$EV/pkgs/"

echo "== 4) Complete Source (secret-scanned) =="
cd "$ROOT"
if git grep -lE "ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY" HEAD -- . 2>/dev/null; then
  echo "SECRET_PATTERN_FOUND — abort"; exit 1
fi
for f in ".env" "RUN.md" "worklog.md" "android/keystore.properties" "android/local.properties"; do
  git ls-files --error-unmatch "$f" >/dev/null 2>&1 && { echo "FORBIDDEN_TRACKED: $f"; exit 1; } || true
done
if git ls-files | grep -qE "^(db/|upload/|artifacts/|backups/|download/)|\.keystore$|\.jks$|keystore\.properties$|local\.properties$"; then
  echo "FORBIDDEN_TRACKED_PATH — abort"; exit 1
fi
SRC="$EV/pkgs/RahyAr-Complete-Source.zip"
rm -f "$SRC"
git archive --format=zip --prefix=RahyAr/ -o "$SRC" HEAD
TMP=$(mktemp -d); mkdir -p "$TMP/RahyAr"
{
  echo "RahyAr — Full Source Manifest (v2.1.0)"
  echo "Generated (UTC) : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Git commit      : $(git rev-parse HEAD) (branch main)"
  echo "Tracked files   : $(git ls-files | wc -l)"
  echo "Product version : 2.1.0 — Android user vc22 (com.rahyarai.app) / owner vc23 (com.rahyarai.app.owner)"
  echo "Excluded        : .env, db/*, backups/, upload/, artifacts/, download/, worklog.md, any keystore/token/local.properties"
  echo "Android build   : JAVA_HOME=<jdk17+> && cd android && ./gradlew :app:assembleUserRelease :app:assembleOwnerRelease (Android SDK 34; gradle.properties has no machine-specific java.home)"
  echo "Web build       : bun install && cp .env.example .env && bun run db:generate && bun run db:push && bun run build && bun run start"
  echo "Signing         : release keystore is NOT in this zip — generate: keytool -genkeypair -keystore rahyar-release.keystore -alias rahyar -keyalg RSA -keysize 4096 -validity 10950; then android/keystore.properties (gitignored)"
} > "$TMP/RahyAr/SOURCE-MANIFEST.txt"
( cd "$TMP" && zip -q "$SRC" RahyAr/SOURCE-MANIFEST.txt )
rm -rf "$TMP"
unzip -t "$SRC" >/dev/null && echo "source zip integrity OK ($(du -h "$SRC" | cut -f1))"

echo "== 5) APKs =="
cp "$OUT/RahyAr-User.apk" "$EV/pkgs/RahyAr-User.apk"
cp "$OUT/RahyAr-Owner.apk" "$EV/pkgs/RahyAr-Owner.apk"

echo "== PACKAGES STAGED (reports+checksums come next) =="
ls -la "$EV/pkgs/"
