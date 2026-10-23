#!/bin/bash
# بسته‌بندی تأیید مستقل v2.1.0-post-fix — سورس از HEAD (8cb0ad4) + شواهد + گزارش
set -euo pipefail
ROOT=/home/z/my-project
OUT=$ROOT/download/final-v23
EV=$ROOT/artifacts/verification
mkdir -p "$OUT/pkgs" "$OUT/evidence"

echo "== 0) اسکن secret روی HEAD =="
cd "$ROOT"
if git grep -lE "ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY" HEAD -- . 2>/dev/null; then
  echo "SECRET_PATTERN_FOUND — abort"; exit 1
fi
for f in ".env" "worklog.md" "android/keystore.properties" "android/local.properties"; do
  git ls-files --error-unmatch "$f" >/dev/null 2>&1 && { echo "FORBIDDEN_TRACKED: $f"; exit 1; } || true
done
if git ls-files | grep -qE "^(db/|upload/|artifacts/|backups/|download/)|\.keystore$|\.jks$"; then
  echo "FORBIDDEN_TRACKED_PATH — abort"; exit 1
fi
echo "scan clean"

echo "== 1) سورس کامل از HEAD با SOURCE-MANIFEST =="
SRC="$OUT/pkgs/RahyAr-Complete-Source.zip"
rm -f "$SRC"
git archive --format=zip --prefix=RahyAr/ -o "$SRC" HEAD
TMP=$(mktemp -d); mkdir -p "$TMP/RahyAr"
{
  echo "RahyAr — Full Source Manifest (v2.1.0 post-fix V23)"
  echo "Generated (UTC) : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Git commit      : $(git rev-parse HEAD) (branch main)"
  echo "Tracked files   : $(git ls-files | wc -l)"
  echo "Product version : 2.1.0 — Android user vc22 (com.rahyarai.app) / owner vc23 (com.rahyarai.app.owner)"
  echo "Note            : this bundle supersedes the e06e2bd bundle (GoFile ERTukfNV)."
  echo "                  Delta e06e2bd..HEAD = weekday-fix (nlp/server-tasks/server-ai + tests) + delivery scripts only."
  echo "Excluded        : .env, db/*, backups/, upload/, artifacts/, download/, worklog.md, any keystore/token/local.properties"
  echo "Android build   : JAVA_HOME=<jdk17+> && cd android && ./gradlew :app:assembleUserRelease :app:assembleOwnerRelease (Android SDK 34)"
  echo "Web build       : bun install && cp .env.example .env && bun run db:generate && bun run db:push && bun run build && bun run start"
  echo "Signing         : release keystore is NOT in this zip (v2.1.0 signing key was lost in env reset — see verification report §2)"
} > "$TMP/RahyAr/SOURCE-MANIFEST.txt"
( cd "$TMP" && zip -q "$SRC" RahyAr/SOURCE-MANIFEST.txt )
rm -rf "$TMP"
unzip -t "$SRC" >/dev/null && echo "source zip integrity OK ($(du -h "$SRC" | cut -f1))"

echo "== 2) اسکرین‌شات‌ها =="
SS="$OUT/pkgs/RahyAr-Screenshots.zip"
rm -f "$SS"
( cd "$ROOT/download/final-v21" && zip -qr "$SS" web/ themes/ splash/ local/ brand/ manifest.json )
echo "screenshots: $(unzip -l "$SS" | tail -1 | awk '{print $2}') entries"

echo "== 3) ویدیوها =="
cp "$ROOT/download/final-v21/video/RahyAr-Splash-Video.mp4" "$OUT/pkgs/" 2>/dev/null || cp "$ROOT/download/final-v21/video/splash-web-real.mp4" "$OUT/pkgs/RahyAr-Splash-Video.mp4"
cp "$ROOT/download/final-v21/video/RahyAr-Interaction-Video.mp4" "$OUT/pkgs/" 2>/dev/null || cp "$ROOT/download/final-v21/video/interaction-owner-mobile.mp4" "$OUT/pkgs/RahyAr-Interaction-Video.mp4"
cp "$ROOT/download/final-v21/video/chat-real-model-interaction.mp4" "$OUT/pkgs/RahyAr-Chat-Real-Model.mp4"

echo "== 4) شواهد JSON =="
cp "$EV/ai-timed-evidence.json" "$EV/agent-weekday-fix-evidence.json" "$EV/../../offline-evidence.json" "$EV/../../ai-real-evidence.json" "$EV/../../agent-real-evidence.json" "$OUT/evidence/" 2>/dev/null || true
cp "$ROOT/artifacts/verify-downloads/download-results.csv" "$OUT/evidence/gofile-download-results.csv" 2>/dev/null || true

echo "== 5) APKهای تحویل‌شده (دانلودشده از GoFile — مرجع) =="
cp "$ROOT/artifacts/verify-downloads/RahyAr-User.apk" "$ROOT/artifacts/verify-downloads/RahyAr-Owner.apk" "$OUT/pkgs/" 2>/dev/null || true

echo "== STAGED =="
ls -la "$OUT/pkgs/" "$OUT/evidence/"
