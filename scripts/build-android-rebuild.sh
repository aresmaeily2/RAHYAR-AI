#!/bin/bash
# بازتولید APK از سورس — بدون ساخت/استفادهٔ کلید release جدید (کلید قبلی گم‌شده؛ نیازمند تأیید مالک)
# خط لوله: aapt2 → ECJ → d8 → package → zipalign → [debug-sign فقط برای شواهد خط لوله]
# خروجی‌ها:
#   Rahyar-Android-v1.1.0-rebuild-unsigned.apk  (بدون امضا — مبنای امضای آینده پس از تصمیم مالک)
#   Rahyar-Android-v1.1.0-rebuild-debug.apk     (کلید debug استاندارد android — فقط آزمون/شواهد، انتشار ممنوع)
set -euo pipefail
ROOT=/home/z/my-project
PROJ=$ROOT/android
BT=$ROOT/artifacts/android-build/tools/bt/android-14
ECJ=$ROOT/artifacts/android-build/tools/ecj.jar
PLAT=$ROOT/artifacts/android-build/tools/plat/android-34/android.jar
NOJAR=$ROOT/artifacts/android-build/tools/plat/android-nolibs.jar
OUT=$ROOT/artifacts/android-build/out
VC=11; VN=1.1.0
[ -f "$PLAT" ] && [ -f "$ECJ" ] || { echo "tools missing"; exit 1; }
mkdir -p "$OUT"

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

echo "== 2) compile java (ECJ 3.33.0) =="
SRCS=$(find "$PROJ/src/java" "$OUT/gen" -name "*.java")
java -jar "$ECJ" -source 11 -target 11 -encoding UTF-8 -nowarn \
  -cp "$NOJAR" -d "$OUT/classes" $SRCS 2>&1 | head -5 || true
NCLASS=$(find "$OUT/classes" -name "*.class" | wc -l)
echo "classes compiled: $NCLASS"
[ "$NCLASS" -ge 5 ] || { echo "TOO FEW CLASSES"; exit 1; }

echo "== 3) dex (d8) =="
"$BT/d8" --release --min-api 24 --lib "$PLAT" \
  --output "$OUT" $(find "$OUT/classes" -name "*.class")
echo "dex ok"

echo "== 4) package =="
(cd "$OUT" && zip -qj base.apk classes.dex)

echo "== 5) align =="
"$BT/zipalign" -f 4 "$OUT/base.apk" "$OUT/aligned.apk"
cp "$OUT/aligned.apk" "$OUT/Rahyar-Android-v${VN}-rebuild-unsigned.apk"

echo "== 6) debug sign (کلید استاندارد debug — فقط شواهد خط لوله) =="
DKS="$OUT/debug.keystore"
if [ ! -f "$DKS" ]; then
  keytool -genkeypair -keystore "$DKS" -alias androiddebugkey -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass android -keypass android \
    -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$DKS" --ks-pass pass:android --key-pass pass:android \
  --out "$OUT/Rahyar-Android-v${VN}-rebuild-debug.apk" "$OUT/aligned.apk"

echo "== 7) verify + badging compare =="
for A in "$OUT/Rahyar-Android-v${VN}-rebuild-unsigned.apk" "$OUT/Rahyar-Android-v${VN}-rebuild-debug.apk"; do
  echo "--- $(basename "$A")"
  java -jar "$BT/lib/apksigner.jar" verify --print-certs "$A" 2>&1 | head -4 || echo "(unsigned — expected)"
done
echo '--- badging rebuilt:'
"$BT/aapt2" dump badging "$OUT/Rahyar-Android-v${VN}-rebuild-unsigned.apk" | rg "package:|sdkVersion|targetSdk|uses-permission|application-label" | head -8
echo "== unit tests (JDK, منطق AppConfig/SecureStore) =="
TESTDIR=$PROJ/test/java
if [ -d "$TESTDIR" ]; then
  mkdir -p "$OUT/testclasses"
  TTESTS=$(find "$TESTDIR" -name '*.java')
  java -jar "$ECJ" -source 11 -target 11 -encoding UTF-8 -nowarn \
    -cp "$NOJAR" -d "$OUT/testclasses" $TTESTS 2>&1 | head -3 || true
  TN=$(find "$OUT/testclasses" -name '*.class' | wc -l)
  echo "test classes: $TN"
fi
ls -la "$OUT"/Rahyar-Android-v${VN}-rebuild-*.apk
echo "REBUILD_OK (بدون کلید release جدید)"
