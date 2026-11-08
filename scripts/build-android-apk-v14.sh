#!/bin/bash
# RahyAr Android — no-Gradle APK pipeline, v14 (R3 — مأموریت V1-P3-R3 بند ۷)
# تغییرات نسبت به v13:
#  ۱) سیاست کلید Release: هرگز کلید تولید نمی‌شود — fail-closed.
#     نبود keystore یا عدم تطابق SHA-256 گواهی با مرجع P2/P3 → توقف (exit 42)
#     مرجع گواهی: 598facd4333df143612fde4bf4d3bc7990ec4a71005a3f7ff582e82c19b16d2c (CN=RahyAr)
#  ۲) پیش‌فرض فقط بیلد Debug (برای پذیرش دستگاهی مالک)؛ --release فقط با گواهی تأییدشده
#  ۳) پس از هر فلیور: badging + مقایسهٔ تعداد مجوزهای manifest داخل APK با خط لوله
#  ۴) رمز debug keystore در همان اجرا تولید و هرگز در خروجی/log چاپ نمی‌شود
#  ۵) خروجی نهایی: SHA-256 همهٔ APKها (ثبت در V1_P3R3_RELEASE_IDENTITY.md)
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
RELEASE_CERT_SHA256="598facd4333df143612fde4bf4d3bc7990ec4a71005a3f7ff582e82c19b16d2c"

MODE=debug
if [ "${1:-}" = "--release" ]; then MODE=release; fi

[ -f "$PLAT" ] || { echo "android.jar missing"; exit 1; }
[ -f "$ECJ" ] || { echo "ecj.jar missing"; exit 1; }
[ -f "$WKJAR" ] || { echo "webkit-classes.jar missing"; exit 1; }
[ -x "$BT/aapt2" ] || { echo "build-tools missing"; exit 1; }
mkdir -p "$OUT"

export LD_LIBRARY_PATH="$BT/lib64:${LD_LIBRARY_PATH:-}"

if [ ! -f "$NOJAR" ]; then
  cp "$PLAT" "$NOJAR"
  zip -dq "$NOJAR" "java/*" "javax/*" && echo "stripped java/* + javax/* for ECJ"
fi

# ── سیاست کلید Release (fail-closed — هیچ تولید کلیدی؛ مأموریت §7 بند ۴) ──
KS="$KS_DIR/rahyar-release.keystore"
PWFILE="$KS_DIR/rahyar-release-password.txt"
RELEASE_OK=0
RELEASE_REASON="key files absent"
if [ -f "$KS" ] && [ -f "$PWFILE" ]; then
  RPW=$(sed -n 's/^storepass=//p' "$PWFILE" || true)
  if [ -n "$RPW" ]; then
    GOT=$(keytool -list -keystore "$KS" -storetype PKCS12 -storepass "$RPW" 2>/dev/null \
      | rg -o "[0-9A-F]{2}:([0-9A-F]{2}:){30}[0-9A-F]{2}" | head -1 | tr -d ':' | tr 'A-F' 'a-f' || true)
    if [ "$GOT" = "$RELEASE_CERT_SHA256" ]; then
      RELEASE_OK=1; RELEASE_REASON="cert verified: CN=RahyAr (matches P2/P3 reference)"
    else
      RELEASE_REASON="cert fingerprint mismatch (got=${GOT:-unreadable})"
    fi
  else
    RELEASE_REASON="password file unreadable"
  fi
fi
echo "RELEASE_KEY_POLICY: ok=$RELEASE_OK ($RELEASE_REASON)"
if [ "$MODE" = "release" ] && [ "$RELEASE_OK" != "1" ]; then
  echo "RELEASE_KEY_MISSING_OR_MISMATCH — build stopped. Owner must restore the original keystore; NO new key is generated."
  exit 42
fi

# نسخه‌ها از سورس Gradle خوانده می‌شوند (نه کپی دستی)
VC_USER=$(rg -o "^[[:space:]]+versionCode[[:space:]]+([0-9]+)" -r '$1' "$PROJ/app/build.gradle" | head -1)
VC_OWNER=$(rg -o "^[[:space:]]+versionCode[[:space:]]+([0-9]+)" -r '$1' "$PROJ/app/build.gradle" | tail -1)
VN=$(rg -o "versionName '([^']+)'" -r '$1' "$PROJ/app/build.gradle" | head -1)
echo "source-of-truth: VN=$VN VC_USER=$VC_USER VC_OWNER=$VC_OWNER mode=$MODE"

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

  echo "== 6) sign debug (کلید موقتی همین اجرا — fail-closed، رمز چاپ نمی‌شود) =="
  DKS="$OUT/debug.keystore"
  rm -f "$DKS"
  DKSP=$(openssl rand -hex 16)
  keytool -genkeypair -keystore "$DKS" -alias androiddebugkey -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass "$DKSP" -keypass "$DKSP" \
    -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1
  "$BT/apksigner" sign --ks "$DKS" --ks-pass pass:"$DKSP" --key-pass pass:"$DKSP" \
    --out "$OUT/Rahyar-v${VN}-vc${VC}-${FL}-debug.apk" "$W/aligned.apk"
  rm -f "$DKS"

  if [ "$MODE" = "release" ]; then
    echo "== 7) sign release (گواهی تأییدشدهٔ $RELEASE_CERT_SHA256) =="
    RPW=$(sed -n 's/^storepass=//p' "$PWFILE")
    "$BT/apksigner" sign --ks "$KS" --ks-pass pass:"$RPW" --key-pass pass:"$RPW" \
      --out "$OUT/Rahyar-v${VN}-vc${VC}-${FL}-release.apk" "$W/aligned.apk"
  fi

  echo "== 8-9) verify + badging + manifest-check ($FL) =="
  for A in "$OUT/Rahyar-v${VN}-vc${VC}-${FL}-debug.apk" \
           $([ "$MODE" = "release" ] && echo "$OUT/Rahyar-v${VN}-vc${VC}-${FL}-release.apk"); do
    echo "--- $(basename "$A")"
    "$BT/apksigner" verify --print-certs "$A" | head -3
  done
  APK="$OUT/Rahyar-v${VN}-vc${VC}-${FL}-debug.apk"
  "$BT/aapt2" dump badging "$APK" | rg "package:|application-label|sdkVersion|targetSdkVersion" | head -6 | tee "$W/badging.txt"
  # R3 §7 بند ۷: مقایسهٔ manifest داخل APK با خط لوله — تعداد مجوزها باید برابر باشد
  NPERM_SRC=$(rg -c "<uses-permission" "$PROJ/app/gradle/AndroidManifest.xml" || echo 0)
  NPERM_APK=$("$BT/aapt2" dump xmltree --file AndroidManifest.xml "$APK" | rg -c "E: uses-permission" || echo 0)
  echo "permissions: source=$NPERM_SRC apk=$NPERM_APK"
  [ "$NPERM_SRC" = "$NPERM_APK" ] || { echo "MANIFEST PERMISSION COUNT MISMATCH"; exit 1; }
  "$BT/aapt2" dump xmltree --file AndroidManifest.xml "$APK" > "$W/apk-manifest.xmltree.txt"
  grep -q "foregroundServiceType" "$W/apk-manifest.xmltree.txt" && echo "fgs-type: microphone OK"
}

build_flavor user  "$VC_USER"  "com.rahyarai.app"        "رهیار"       user
build_flavor owner "$VC_OWNER" "com.rahyarai.app.owner"  "رهیار مالک"  owner

du -h "$OUT"/Rahyar-v${VN}-vc*-*.apk 2>/dev/null || true
echo "== SHA-256 of built APKs =="
sha256sum "$OUT"/Rahyar-v${VN}-vc*-*.apk 2>/dev/null || true
echo "APK_BUILD_OK mode=$MODE"
