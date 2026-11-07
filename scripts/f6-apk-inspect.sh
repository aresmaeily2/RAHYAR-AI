#!/usr/bin/env bash
# F6 Agent 2: APK inspection — package, versions, SDK, signature certs for all 4 F5 APKs + old v2.1.0
set -uo pipefail
cd /home/z/my-project
OUT=artifacts/reports/f6
mkdir -p "$OUT"
: > "$OUT/apk-inspection.txt"
log(){ echo "$*" | tee -a "$OUT/apk-inspection.txt"; }

KT=$(ls /usr/lib/jvm/*/bin/keytool 2>/dev/null | head -1)
[ -z "$KT" ] && KT=$(command -v keytool || true)
log "keytool=$KT"
BT=$(ls -d ~/Android/Sdk/build-tools/*/ 2>/dev/null | sort | tail -1)
log "build-tools=$BT"
AAPT=$(ls $BT/aapt2 2>/dev/null || ls $BT/aapt 2>/dev/null || echo "")
APKSIGNER=$(ls $BT/apksigner 2>/dev/null || echo "")
log "aapt=$AAPT apksigner=$APKSIGNER"

for apk in download/RahyAr-F5/Rahyar-user-v2.2.0-release.apk \
           download/RahyAr-F5/Rahyar-owner-v2.2.0-release.apk \
           download/RahyAr-F5/Rahyar-user-v2.2.0-debug.apk \
           download/RahyAr-F5/Rahyar-owner-v2.2.0-debug.apk \
           download/RahyAr-Android/Rahyar-Android-v2.1.0-release-fix1.apk; do
  log "── APK: $apk ($(wc -c < "$apk") bytes)"
  [ -n "$AAPT" ] && $AAPT dump badging "$apk" 2>/dev/null | grep -E "^package|sdkVersion|targetSdkVersion|application-label:" | head -4 | tee -a "$OUT/apk-inspection.txt"
  if [ -n "$KT" ]; then
    $KT -printcert -jarfile "$apk" 2>/dev/null | grep -E "Owner|Issuer|SHA256:|Valid from|Version:" | sed 's/^/  cert /' | tee -a "$OUT/apk-inspection.txt"
  fi
  if [ -n "$APKSIGNER" ]; then
    $APKSIGNER verify --print-certs "$apk" 2>/dev/null | grep -E "SHA-256|Signer" | sed 's/^/  sig /' | tee -a "$OUT/apk-inspection.txt"
  fi
done

echo "=== SHA256 of all 5 APKs ===" | tee -a "$OUT/apk-inspection.txt"
sha256sum download/RahyAr-F5/Rahyar-*.apk download/RahyAr-Android/Rahyar-Android-v2.1.0-*.apk | tee -a "$OUT/apk-inspection.txt"

echo "=== provenance: build metadata in APK (gradle build time if present) ==="
for apk in download/RahyAr-F5/Rahyar-user-v2.2.0-release.apk download/RahyAr-F5/Rahyar-owner-v2.2.0-release.apk; do
  unzip -p "$apk" META-INF/version-info.txt 2>/dev/null | head -5
done
echo "F6-APK-INSPECT-DONE"
