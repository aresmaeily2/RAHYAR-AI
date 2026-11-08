#!/bin/bash
# RahyAr Android — no-Gradle APK pipeline, v13 (v2.4.0 / versionCode 28 user + 29 owner)
# ریشه: build-android-apk-v12.sh (v2.1.0/vc22) — همگام با سورس فعلی:
#  - دو فلور از build.gradle فعلی: user (vc28) و owner (vc29) — نسخه از سورس خوانده می‌شود
#  - هر فلور: ۴ خروجی {debug,release} — امضا fail-closed با env
#  - کلید release فقط در backups/ (خارج از Git) — نسخهٔ قبلی در recycle محیط از دست رفت
#    و کلید تازهٔ PKCS12/RSA-4096 ساخته می‌شود (ثبت در گزارش — گواهی تغییر می‌کند)
# خط لوله: aapt2 → ECJ → d8 → package → zipalign → sign → apksigner verify
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

[ -f "$PLAT" ] || { echo "android.jar missing"; exit 1; }
[ -f "$ECJ" ] || { echo "ecj.jar missing"; exit 1; }
[ -f "$WKJAR" ] || { echo "webkit-classes.jar missing"; exit 1; }
[ -x "$BT/aapt2" ] || { echo "build-tools missing"; exit 1; }
mkdir -p "$OUT" "$KS_DIR"

# libc++ برای zipalign/apksigner — از build-tools خودش کپی می‌شود
if [ -d /tmp/android-dl/bt34x ] && [ -d /tmp/android-dl/bt34x/*/lib64 ]; then
  cp -rn /tmp/android-dl/bt34x/*/lib64/* "$BT/" 2>/dev/null || true
fi
export LD_LIBRARY_PATH="$BT/lib64:${LD_LIBRARY_PATH:-}"

# android.jar بدون java/* و javax/* برای ECJ (تداخل java.base JDK 21 — تجربهٔ v12)
if [ ! -f "$NOJAR" ]; then
  cp "$PLAT" "$NOJAR"
  zip -dq "$NOJAR" "java/*" "javax/*" && echo "stripped java/* + javax/* for ECJ"
fi

# نسخه‌ها از سورس Gradle خوانده می‌شوند (نه کپی دستی)
VC_USER=$(rg -o "^[[:space:]]+versionCode[[:space:]]+([0-9]+)" -r '$1' "$PROJ/app/build.gradle" | head -1)
VC_OWNER=$(rg -o "^[[:space:]]+versionCode[[:space:]]+([0-9]+)" -r '$1' "$PROJ/app/build.gradle" | tail -1)
VN=$(rg -o "versionName '([^']+)'" -r '$1' "$PROJ/app/build.gradle" | head -1)
echo "source-of-truth: VN=$VN VC_USER=$VC_USER VC_OWNER=$VC_OWNER"

build_flavor(){ # $1=flavor  $2=vc  $3=pkg  $4=app_name  $5=flavor-java-dir
  local FL=$1 VC=$2 PKG=$3 APP_NAME=$4 FLJ=$5
  local W="$OUT/w-$FL"; rm -rf "$W"; mkdir -p "$W/classes" "$W/gen" "$W/gen-res/values" "$W/manifest"
  echo "===== FLAVOR $FL (vc=$VC pkg=$PKG name=$APP_NAME) ====="

  awk 'BEGIN{done=0} { if (!done && $0 ~ /^>[[:space:]]*$/) { print "    package=\"'"$PKG"'\">"; done=1 } else print }' \
    "$PROJ/app/gradle/AndroidManifest.xml" > "$W/manifest/AndroidManifest.xml"
  grep -q "package=\"$PKG\"" "$W/manifest/AndroidManifest.xml" || { echo "manifest package injection failed"; exit 1; }

  cat > "$W/gen-res/values/strings.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">$APP_NAME</string>
</resources>
EOF

  echo "== 1) resources (aapt2 compile+link, assets=src/www) =="
  "$BT/aapt2" compile --dir "$PROJ/src/res" -o "$W/res.zip"
  "$BT/aapt2" compile --dir "$W/gen-res" -o "$W/gen-res.zip"
  "$BT/aapt2" link -o "$W/base.apk" -I "$PLAT" \
    --manifest "$W/manifest/AndroidManifest.xml" \
    --java "$W/gen" \
    --custom-package com.rahyarai.app \
    --min-sdk-version 24 --target-sdk-version 34 \
    --version-code $VC --version-name "$VN" \
    --auto-add-overlay -A "$PROJ/src/www" \
    "$W/res.zip" "$W/gen-res.zip"

  echo "== 2) compile java (ECJ: main + flavor $FL + webkit) =="
  SRCS=$(find "$PROJ/src/java" "$PROJ/src/$FLJ/java" "$W/gen" -name "*.java")
  if ! java -jar "$ECJ" -source 11 -target 11 -encoding UTF-8 -nowarn \
    -cp "$NOJAR:$WKJAR" -d "$W/classes" $SRCS > "$W/ecj.log" 2>&1; then
    echo "ECJ FAILED:"; rg -v "^$" "$W/ecj.log" | head -40; exit 1
  fi
  rg -v "^$" "$W/ecj.log" | head -8 || true
  NCLASS=$(find "$W/classes" -name "*.class" | wc -l)
  echo "app classes compiled: $NCLASS"
  [ "$NCLASS" -ge 5 ] || { echo "TOO FEW CLASSES"; exit 1; }
  for f in $SRCS; do
    b=$(basename "$f" .java)
    find "$W/classes" -name "${b}.class" -o -name "${b}\$*.class" | rg -q . || { echo "MISSING CLASS for $f"; exit 1; }
  done
  echo "per-source class check: OK ($(echo "$SRCS" | wc -w) sources)"

  echo "== 2b) webkit classes for dexing =="
  mkdir -p "$W/webkit-classes"
  (cd "$W/webkit-classes" && unzip -qo "$WKJAR")

  echo "== 3) dex (d8) =="
  "$BT/d8" --release --min-api 24 --lib "$PLAT" \
    --output "$W" $(find "$W/classes" "$W/webkit-classes" -name "*.class")
  ls -la "$W/classes.dex" >/dev/null

  echo "== 4-5) package + align =="
  (cd "$W" && zip -qj base.apk classes.dex)
  "$BT/zipalign" -f 4 "$W/base.apk" "$W/aligned.apk"

  echo "== 6) sign debug =="
  DKS="$OUT/debug.keystore"
  rm -f "$DKS"  # هر بار تازه — fail-closed
  keytool -genkeypair -keystore "$DKS" -alias androiddebugkey -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass ${RAHYAR_KS_STOREPASS:?RAHYAR_KS_STOREPASS required} -keypass ${RAHYAR_KS_STOREPASS:?required} \
    -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
  "$BT/apksigner" sign --ks "$DKS" --ks-pass pass:${RAHYAR_KS_STOREPASS?required} --key-pass pass:${RAHYAR_KS_KEYPASS?RAHYAR_KS_KEYPASS required} \
    --out "$OUT/Rahyar-v${VN}-vc${VC}-${FL}-debug.apk" "$W/aligned.apk"

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
    echo "release keystore generated (PKCS12/RSA-4096; password only in backups/) — NOTE: previous key lost in environment recycle"
  fi
  RPW=$(sed -n 's/^storepass=//p' "$PWFILE")
  [ -n "$RPW" ] || { echo "release password file unreadable"; exit 1; }
  "$BT/apksigner" sign --ks "$KS" --ks-pass pass:"$RPW" --key-pass pass:"$RPW" \
    --out "$OUT/Rahyar-v${VN}-vc${VC}-${FL}-release.apk" "$W/aligned.apk"

  echo "== 8-9) verify + badging ($FL) =="
  for A in "$OUT/Rahyar-v${VN}-vc${VC}-${FL}-debug.apk" "$OUT/Rahyar-v${VN}-vc${VC}-${FL}-release.apk"; do
    echo "--- $(basename "$A")"
    "$BT/apksigner" verify --print-certs "$A" | head -3
  done
  "$BT/aapt2" dump badging "$OUT/Rahyar-v${VN}-vc${VC}-${FL}-release.apk" | rg "package:|application-label|sdkVersion|targetSdkVersion" | head -6
}

build_flavor user  "$VC_USER"  "com.rahyarai.app"        "رهیار"       user
build_flavor owner "$VC_OWNER" "com.rahyarai.app.owner"  "رهیار مالک"  owner

du -h "$OUT"/Rahyar-v${VN}-vc*-*.apk
echo "APK_BUILD_OK"
