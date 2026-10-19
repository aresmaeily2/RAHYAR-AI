#!/bin/bash
# بیلد APK پوسته اندروید رهیار — بدون Gradle/SDK کامل (aapt2 + ECJ + d8 + apksigner)
set -euo pipefail
ROOT=/home/z/my-project/artifacts/android-build
BT=$ROOT/tools/bt/android-14
ECJ=$ROOT/tools/ecj.jar
OUT=$ROOT/out
SRC=$ROOT/src
RES=$ROOT/res
ASSETS=$ROOT/assets
JAR=$(find $ROOT/tools/plat -name android.jar | head -1)

echo "android.jar = $JAR"
[ -x "$BT/aapt2" ] || { echo "aapt2 missing"; exit 1; }
[ -f "$JAR" ] || { echo "android.jar missing"; exit 1; }

# نسخه بدون java/* برای ECJ (رفع تداخل با java.base در JDK 21)
NOJAR=$ROOT/tools/plat/android-nolibs.jar
if [ ! -f "$NOJAR" ]; then
  cp "$JAR" "$NOJAR"
  zip -dq "$NOJAR" "java/*" && echo "stripped java/* -> $NOJAR"
fi

rm -rf "$OUT"
mkdir -p "$OUT/classes"

echo "== 1) resources (aapt2 compile+link) =="
"$BT/aapt2" compile --dir "$RES" -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" \
  --manifest "$SRC/AndroidManifest.xml" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 1 --version-name 1.0.0 \
  --auto-add-overlay -A "$ASSETS" "$OUT/res.zip"

echo "== 2) compile java (ECJ) =="
java -jar "$ECJ" -source 11 -target 11 -encoding UTF-8 \
  -cp "$NOJAR" -d "$OUT/classes" $(find "$SRC" -name "*.java")

echo "== 3) dex (d8) =="
"$BT/d8" --release --min-api 24 --lib "$JAR" \
  --output "$OUT" $(find "$OUT/classes" -name "*.class")
ls -la "$OUT/classes.dex"

echo "== 4) package =="
(cd "$OUT" && zip -qj base.apk classes.dex)

echo "== 5) align =="
"$BT/zipalign" -f 4 "$OUT/base.apk" "$OUT/aligned.apk"

echo "== 6) sign =="
KS="$ROOT/rahyar.keystore"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -alias rahyar -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass rahyar1404 -keypass rahyar1404 \
    -dname "CN=Rahyar, O=RahyarAI, C=IR"
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:rahyar1404 --key-pass pass:rahyar1404 \
  --out "$OUT/Rahyar-Android-v1.0.0.apk" "$OUT/aligned.apk"

echo "== 7) verify =="
"$BT/apksigner" verify --print-certs "$OUT/Rahyar-Android-v1.0.0.apk" | head -6
"$BT/aapt" dump badging "$OUT/Rahyar-Android-v1.0.0.apk" | head -5
du -h "$OUT/Rahyar-Android-v1.0.0.apk"
echo "APK_BUILD_OK"
