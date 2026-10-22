#!/bin/bash
# بازسازی APKهای RahyAr v2.0.0 از سورس واقعی (پس از Reset محیط)
# خط لوله: Gradle 8.10.2 + AGP 8.7.3 + JDK 21 — دو ویراست user/owner
# امضا: کلید release جدید RSA-4096 — فقط در backups/ (خارج از گیت) و keystore.properties (gitignored)
# خروجی: download/rahyar-user-v2.0.0.apk و download/rahyar-owner-v2.0.0.apk
set -euo pipefail
ROOT=/home/z/my-project
PROJ=$ROOT/android
SDK=$ROOT/artifacts/android-sdk
OUTD=$ROOT/download
BK=$ROOT/backups/android-release-keystore
BT=$ROOT/artifacts/android-build/tools/bt/android-14

export ANDROID_HOME=$SDK
export ANDROID_SDK_ROOT=$SDK
mkdir -p "$OUTD" "$BK"

[ -f "$SDK/platforms/android-34/android.jar" ] || { echo "platform 34 missing"; exit 1; }
[ -x "$BT/aapt2" ] || { echo "build-tools missing"; exit 1; }

# ── کلید release (اگر موجود نبود، جدید ساخته می‌شود — RSA-4096، ۳۰ سال) ──
KS="$BK/rahyar-release.keystore"
if [ ! -f "$KS" ]; then
  RPW=$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"9z"
  keytool -genkeypair -keystore "$KS" -alias rahyar -keyalg RSA -keysize 4096 \
    -validity 10950 -storepass "$RPW" -keypass "$RPW" \
    -dname "CN=RahyAr Release, O=RahyAr, L=Tehran, C=IR" >/dev/null 2>&1
  printf 'storeFile=%s\nstorePassword=%s\nkeyAlias=rahyar\nkeyPassword=%s\n' "$KS" "$RPW" "$RPW" > "$PROJ/keystore.properties"
  chmod 600 "$PROJ/keystore.properties" "$KS"
  echo "NEW release keystore generated (outside git; password only in backups/)"
fi

cd "$PROJ"

# ── تست واحد هر دو ویراست + بیلد Release ──
./gradlew --no-daemon -q \
  :app:testUserDebugUnitTest \
  :app:testOwnerDebugUnitTest \
  :app:assembleUserRelease \
  :app:assembleOwnerRelease

# ── کپی خروجی‌ها با نام رسمی ──
UAPK=app/build/outputs/apk/user/release/app-user-release.apk
OAPK=app/build/outputs/apk/owner/release/app-owner-release.apk
[ -f "$UAPK" ] || { echo "user APK missing"; exit 1; }
[ -f "$OAPK" ] || { echo "owner APK missing"; exit 1; }
cp "$UAPK" "$OUTD/rahyar-user-v2.0.0.apk"
cp "$OAPK" "$OUTD/rahyar-owner-v2.0.0.apk"

# ── صحت‌سنجی امضا / تراز / badging ──
echo "== apksigner verify =="
"$BT/apksigner" verify --print-certs "$OUTD/rahyar-user-v2.0.0.apk" | head -5
"$BT/apksigner" verify --print-certs "$OUTD/rahyar-owner-v2.0.0.apk" | head -5

echo "== zipalign -c 4 =="
"$BT/zipalign" -c 4 "$OUTD/rahyar-user-v2.0.0.apk" && echo "user aligned OK"
"$BT/zipalign" -c 4 "$OUTD/rahyar-owner-v2.0.0.apk" && echo "owner aligned OK"

echo "== badging =="
"$BT/aapt2" dump badging "$OUTD/rahyar-user-v2.0.0.apk" | grep -E "^package:|application-label:|sdkVersion|targetSdk" | head -5
echo "---"
"$BT/aapt2" dump badging "$OUTD/rahyar-owner-v2.0.0.apk" | grep -E "^package:|application-label:|sdkVersion|targetSdk" | head -5

echo "== sizes + sha256 =="
stat -c "%n %s bytes" "$OUTD"/rahyar-*-v2.0.0.apk
sha256sum "$OUTD"/rahyar-*-v2.0.0.apk

echo "APK_V2_REBUILD_OK"
