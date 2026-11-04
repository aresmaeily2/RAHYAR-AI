#!/bin/bash
# RahyAr Android — no-Gradle APK pipeline, v12 (user edition v2.1.0 / versionCode 22)
# ریشهٔ اسکریپت: build-android-apk-v11.sh — با این تفاوت‌ها که با سورس فعلی (v2.1.0) هم‌خوان است:
#  1) app_name دیگر از Gradle flavors نمی‌آید — لایهٔ res تولیدشده در همین پوشه ساخته می‌شود (work-area فقط)
#  2) androidx.webkit:1.11.0 (WebViewAssetLoader برای HomeActivity) روی classpath ECJ و در dex
#  3) دارایی‌های UI محلی (android/src/www) با aapt2 link -A داخل APK بسته می‌شوند
#  4) مانیفست: کپی android/app/gradle/AndroidManifest.xml (v2.1.0) + تزریق package — بدون تغییر src/
#  5) keystore release طبق دستور مأموریت: PKCS12، RSA-4096، CN=RahyAr، validity 10000 — فقط backups/
# خط لوله: aapt2 → ECJ → d8 → package → zipalign → sign (debug + release) → apksigner verify
set -euo pipefail
ROOT=/home/z/my-project
PROJ=$ROOT/android
BT=$ROOT/artifacts/android-build/tools/bt/android-14
ECJ=$ROOT/artifacts/android-build/tools/ecj.jar
PLAT=$ROOT/artifacts/android-build/tools/plat/android-34/android.jar
NOJAR=$ROOT/artifacts/android-build/tools/plat/android-nolibs.jar
WKJAR=$ROOT/artifacts/android-build/tools/webkit/webkit-classes.jar
OUT=$ROOT/artifacts/android-build/out
KS_DIR=$ROOT/backups/android-release-keystore
VC=22; VN=2.1.0                      # user edition — sync with android/app/build.gradle (flavor user)
PKG=com.rahyarai.app
APP_NAME=رهیار

[ -f "$PLAT" ]  || { echo "android.jar missing"; exit 1; }
[ -f "$ECJ" ]   || { echo "ecj.jar missing"; exit 1; }
[ -f "$WKJAR" ] || { echo "webkit-classes.jar missing"; exit 1; }
[ -x "$BT/aapt2" ] || { echo "build-tools missing"; exit 1; }
mkdir -p "$OUT" "$KS_DIR"

# android.jar بدون java/* و javax/* برای ECJ — چون javax.crypto هم در java.base (JDK 21)
# و هم در android.jar هست، ECJ با -source 11 خطای «accessible from more than one module»
# می‌دهد و SecureStore را کامپایل نمی‌کند؛ حذف javax/* از کپی، تداخل را ریشه‌ای برمی‌دارد.
if [ ! -f "$NOJAR" ]; then
  cp "$PLAT" "$NOJAR"
  zip -dq "$NOJAR" "java/*" "javax/*" && echo "stripped java/* + javax/* for ECJ"
fi

rm -rf "$OUT/classes" "$OUT/gen" "$OUT/webkit-classes" "$OUT/gen-res" "$OUT/manifest"
mkdir -p "$OUT/classes" "$OUT/gen" "$OUT/webkit-classes" "$OUT/gen-res/values" "$OUT/manifest"

# ── مانیفست v2.1.0 (بدون صفت package در حالت Gradle) + تزریق package ──
awk 'BEGIN{done=0} { if (!done && $0 ~ /^>[[:space:]]*$/) { print "    package=\"'"$PKG"'\">"; done=1 } else print }' \
  "$PROJ/app/gradle/AndroidManifest.xml" > "$OUT/manifest/AndroidManifest.xml"
grep -q "package=\"$PKG\"" "$OUT/manifest/AndroidManifest.xml" || { echo "manifest package injection failed"; exit 1; }

# ── res لایهٔ تولیدی: app_name (معادل resValue فلور user) ──
cat > "$OUT/gen-res/values/strings.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">$APP_NAME</string>
</resources>
EOF

echo "== 1) resources (aapt2 compile+link, assets=src/www) =="
"$BT/aapt2" compile --dir "$PROJ/src/res" -o "$OUT/res.zip"
"$BT/aapt2" compile --dir "$OUT/gen-res" -o "$OUT/gen-res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$PLAT" \
  --manifest "$OUT/manifest/AndroidManifest.xml" \
  --java "$OUT/gen" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code $VC --version-name "$VN" \
  --auto-add-overlay -A "$PROJ/src/www" \
  "$OUT/res.zip" "$OUT/gen-res.zip"
"$BT/aapt2" link --proto-format -o "$OUT/base.pb.apk" -I "$PLAT" \
  --manifest "$OUT/manifest/AndroidManifest.xml" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code $VC --version-name "$VN" \
  --auto-add-overlay "$OUT/res.zip" "$OUT/gen-res.zip" 2>/dev/null || true

echo "== 2) compile java (ECJ: app + user flavor + webkit) =="
SRCS=$(find "$PROJ/src/java" "$PROJ/src/user/java" "$OUT/gen" -name "*.java")
# fail-closed: اگر ECJ خطا بدهد، بیلد باید متوقف شود (نه اینکه کلاس ناقص dex شود)
if ! java -jar "$ECJ" -source 11 -target 11 -encoding UTF-8 -nowarn \
  -cp "$NOJAR:$WKJAR" -d "$OUT/classes" $SRCS > "$OUT/ecj.log" 2>&1; then
  echo "ECJ FAILED:"; rg -v "^$" "$OUT/ecj.log" | head -40; exit 1
fi
rg -v "^$" "$OUT/ecj.log" | head -10 || true
NCLASS=$(find "$OUT/classes" -name "*.class" | wc -l)
echo "app classes compiled: $NCLASS"
[ "$NCLASS" -ge 5 ] || { echo "TOO FEW CLASSES"; exit 1; }
# sanity: برای هر سورس، حداقل یک .class هم‌نام باید تولید شده باشد
for f in $SRCS; do
  b=$(basename "$f" .java)
  find "$OUT/classes" -name "${b}.class" -o -name "${b}\$*.class" | rg -q . || { echo "MISSING CLASS for $f"; exit 1; }
done
echo "per-source class check: OK ($(echo "$SRCS" | wc -w) sources)"

echo "== 2b) unpack webkit classes for dexing =="
(cd "$OUT/webkit-classes" && unzip -qo "$WKJAR")
NWK=$(find "$OUT/webkit-classes" -name "*.class" | wc -l)
echo "webkit classes: $NWK"

echo "== 3) dex (d8: app + webkit) =="
"$BT/d8" --release --min-api 24 --lib "$PLAT" \
  --output "$OUT" $(find "$OUT/classes" "$OUT/webkit-classes" -name "*.class")
ls -la "$OUT/classes.dex" >/dev/null
echo "dex ok"

echo "== 4) package =="
(cd "$OUT" && zip -qj base.apk classes.dex)

echo "== 5) align =="
"$BT/zipalign" -f 4 "$OUT/base.apk" "$OUT/aligned.apk"

echo "== 6) sign debug =="
DKS="$OUT/debug.keystore"
rm -f "$DKS"  # هر بار تازه — رمز در env همین اجراست (fail-closed)
keytool -genkeypair -keystore "$DKS" -alias androiddebugkey -keyalg RSA -keysize 2048 \
  -validity 10000 -storepass ${RAHYAR_KS_STOREPASS:?RAHYAR_KS_STOREPASS is required (fail-closed)} -keypass ${RAHYAR_KS_STOREPASS:?RAHYAR_KS_STOREPASS is required (fail-closed)} \
  -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
"$BT/apksigner" sign --ks "$DKS" --ks-pass pass:${RAHYAR_KS_STOREPASS?RAHYAR_KS_STOREPASS-required} --key-pass pass:${RAHYAR_KS_KEYPASS?RAHYAR_KS_KEYPASS-required} \
  --out "$OUT/Rahyar-Android-v${VN}-debug.apk" "$OUT/aligned.apk"

echo "== 7) sign release =="
KS="$KS_DIR/rahyar-release.keystore"
PWFILE="$KS_DIR/rahyar-release-password.txt"
if [ ! -f "$KS" ]; then
  RPW=$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"9z"
  keytool -genkeypair -storetype PKCS12 -keystore "$KS" -alias rahyar -keyalg RSA -keysize 4096 \
    -validity 10000 -storepass "$RPW" -keypass "$RPW" \
    -dname "CN=RahyAr, O=RahyAr, C=IR" >/dev/null 2>&1
  printf 'storepass=%s\nalias=rahyar\n' "$RPW" > "$PWFILE"
  chmod 600 "$PWFILE" "$KS"
  echo "release keystore generated (PKCS12/RSA-4096; password stored only in backups/)"
fi
RPW=$(sed -n 's/^storepass=//p' "$PWFILE")
[ -n "$RPW" ] || { echo "release password file unreadable"; exit 1; }
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:"$RPW" --key-pass pass:"$RPW" \
  --out "$OUT/Rahyar-Android-v${VN}-release.apk" "$OUT/aligned.apk"

echo "== 8) verify signatures =="
for A in "$OUT/Rahyar-Android-v${VN}-debug.apk" "$OUT/Rahyar-Android-v${VN}-release.apk"; do
  echo "--- $(basename "$A")"
  "$BT/apksigner" verify --print-certs "$A" | head -4
done

echo "== 9) badging =="
"$BT/aapt2" dump badging "$OUT/Rahyar-Android-v${VN}-release.apk" | rg "package:|application-label|sdkVersion|targetSdkVersion|uses-permission" | head -10

du -h "$OUT"/Rahyar-Android-v${VN}*.apk
echo "APK_BUILD_OK"
