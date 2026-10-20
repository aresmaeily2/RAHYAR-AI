#!/bin/bash
# بیلد APK اندروید رهیار v1.1.0 — native client بدون Gradle
# خط لوله: aapt2 → ECJ → d8 → package → zipalign → sign (debug + release) → apksigner verify
# کلید release: پس‌تصادفی، فقط در backups/ (هرگز در repo/ZIP/گزارش)
set -euo pipefail
ROOT=/home/z/my-project
PROJ=$ROOT/android
BT=/home/z/my-project/artifacts/android-build/tools/bt/android-14
ECJ=/home/z/my-project/artifacts/android-build/tools/ecj.jar
PLAT=/home/z/my-project/artifacts/android-build/tools/plat/android-34/android.jar
NOJAR=/home/z/my-project/artifacts/android-build/tools/plat/android-nolibs.jar
OUT=/home/z/my-project/artifacts/android-build/out
KS_DIR=$ROOT/backups/android-release-keystore
VC=11; VN=1.1.0

[ -f "$PLAT" ] || { echo "android.jar missing"; exit 1; }
[ -f "$ECJ" ] || { echo "ecj.jar missing"; exit 1; }
mkdir -p "$OUT" "$KS_DIR"

# android.jar بدون java/* برای ECJ (رفع تداخل با java.base JDK 21)
if [ ! -f "$NOJAR" ]; then
  cp "$PLAT" "$NOJAR"
  zip -dq "$NOJAR" "java/*" && echo "stripped java/* for ECJ"
fi

rm -rf "$OUT/classes" "$OUT/gen"; mkdir -p "$OUT/classes" "$OUT/gen"

echo "== 1) resources (aapt2 compile+link) =="
"$BT/aapt2" compile --dir "$PROJ/src/res" -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$PLAT" \
  --manifest "$PROJ/src/AndroidManifest.xml" \
  --java "$OUT/gen" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code $VC --version-name "$VN" \
  --auto-add-overlay "$OUT/res.zip"
"$BT/aapt2" link --proto-format -o "$OUT/base.pb.apk" -I "$PLAT" \
  --manifest "$PROJ/src/AndroidManifest.xml" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code $VC --version-name "$VN" \
  --auto-add-overlay "$OUT/res.zip" 2>/dev/null || true

echo "== 2) compile java (ECJ) =="
SRCS=$(find "$PROJ/src/java" "$OUT/gen" -name "*.java")
java -jar "$ECJ" -source 11 -target 11 -encoding UTF-8 -nowarn \
  -cp "$NOJAR" -d "$OUT/classes" $SRCS 2>&1 | rg -v "^$" | head -5 || true
NCLASS=$(find "$OUT/classes" -name "*.class" | wc -l)
echo "classes compiled: $NCLASS"
[ "$NCLASS" -ge 5 ] || { echo "TOO FEW CLASSES"; exit 1; }

echo "== 3) dex (d8) =="
"$BT/d8" --release --min-api 24 --lib "$PLAT" \
  --output "$OUT" $(find "$OUT/classes" -name "*.class")
ls -la "$OUT/classes.dex" >/dev/null
echo "dex ok"

echo "== 4) package =="
(cd "$OUT" && zip -qj base.apk classes.dex)

echo "== 5) align =="
"$BT/zipalign" -f 4 "$OUT/base.apk" "$OUT/aligned.apk"

echo "== 6) sign debug =="
DKS="$OUT/debug.keystore"
if [ ! -f "$DKS" ]; then
  keytool -genkeypair -keystore "$DKS" -alias androiddebugkey -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass android -keypass android \
    -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$DKS" --ks-pass pass:android --key-pass pass:android \
  --out "$OUT/Rahyar-Android-v${VN}-debug.apk" "$OUT/aligned.apk"

echo "== 7) sign release =="
KS="$KS_DIR/rahyar-release.keystore"
PWFILE="$KS_DIR/rahyar-release-password.txt"
if [ ! -f "$KS" ]; then
  RPW=$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"9z"
  keytool -genkeypair -keystore "$KS" -alias rahyar -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass "$RPW" -keypass "$RPW" \
    -dname "CN=Rahyar Release, O=RahyarAI, C=IR" >/dev/null 2>&1
  printf 'storepass=%s\nalias=rahyar\n' "$RPW" > "$PWFILE"
  chmod 600 "$PWFILE"
  echo "release keystore generated (password stored only in backups/)"
fi
RPW=$(sed -n 's/^storepass=//p' "$PWFILE")
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:"$RPW" --key-pass pass:"$RPW" \
  --out "$OUT/Rahyar-Android-v${VN}-release.apk" "$OUT/aligned.apk"

echo "== 8) verify signatures =="
for A in "$OUT/Rahyar-Android-v${VN}-debug.apk" "$OUT/Rahyar-Android-v${VN}-release.apk"; do
  echo "--- $(basename "$A")"
  "$BT/apksigner" verify --print-certs "$A" | head -4
done

echo "== 9) badging =="
"$BT/aapt" dump badging "$OUT/Rahyar-Android-v${VN}-release.apk" | rg "package:|application-label|sdkVersion|uses-permission" | head -8

du -h "$OUT"/Rahyar-Android-v${VN}*.apk
echo "APK_BUILD_OK"
