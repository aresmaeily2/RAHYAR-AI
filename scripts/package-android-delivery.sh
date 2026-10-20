#!/bin/bash
# بستهٔ سورس اندروید (بدون build output/local.properties/کلید) + اسکن secret + تحویل به release-delivery
set -euo pipefail
cd /home/z/my-project
STAGE=$(mktemp -d)
mkdir -p "$STAGE/rahyar-android-v1.1.0"

# محتوای بسته از git-tracked فایل‌ها + اسکریپت‌های خط لوله
git archive HEAD android/ | tar -x -C "$STAGE/rahyar-android-v1.1.0"
# فایل‌های جدید هنوز commit نشده‌اند → اضافهٔ دستی اگر tracked نباشند
for f in app/build.gradle app/gradle/AndroidManifest.xml app/src/test/java/com/rahyarai/app/AppConfigTest.java \
         settings.gradle build.gradle gradle.properties .gitignore gradlew gradle/wrapper/gradle-wrapper.jar \
         gradle/wrapper/gradle-wrapper.properties README.md src; do
  [ -e "android/$f" ] && cp -r "android/$f" "$STAGE/rahyar-android-v1.1.0/$(dirname "$f" | sed 's/^\.$//')" 2>/dev/null || true
done
mkdir -p "$STAGE/rahyar-android-v1.1.0/scripts"
for s in build-android-apk-v11.sh build-android-rebuild.sh fetch-android-tools.sh make-sdk-layout.sh gen-gradle-manifest.sh; do
  cp "scripts/$s" "$STAGE/rahyar-android-v1.1.0/scripts/" 2>/dev/null || true
done

# حذف قطعی موادی که نباید در ZIP باشند
rm -rf "$STAGE/rahyar-android-v1.1.0/app/build" "$STAGE/rahyar-android-v1.1.0/.gradle" \
       "$STAGE/rahyar-android-v1.1.0/local.properties" "$STAGE/rahyar-android-v1.1.0/build"

echo '=== secret scan ==='
if rg -l -i 'ghp_[A-Za-z0-9]{20}|github_pat_|sk-[A-Za-z0-9_-]{20}|BEGIN (RSA |EC )?PRIVATE KEY|storepass=|BEGIN CERTIFICATE' "$STAGE" 2>/dev/null | grep -v build-android-apk-v11; then
  echo 'SECRET HIT — ABORT'; exit 1
fi
rg -l 'HAMYAR TOKEN|upload/HAMYAR' "$STAGE" && { echo 'TOKEN REF HIT — ABORT'; exit 1; } || true

cd "$STAGE" && zip -qr /home/z/my-project/release-delivery/android/Rahyar-Android-Source-v1.1.0.zip rahyar-android-v1.1.0
unzip -l /home/z/my-project/release-delivery/android/Rahyar-Android-Source-v1.1.0.zip | tail -3
rm -rf "$STAGE"

# کپی artifactهای بیلد به تحویل
OUT=/home/z/my-project/artifacts/android-build/out
cp /home/z/my-project/artifacts/recovered/Rahyar-Android-v1.1.0-release.apk /home/z/my-project/release-delivery/android/
cp "$OUT/Rahyar-Android-v1.1.0-rebuild-unsigned.apk" "$OUT/Rahyar-Android-v1.1.0-rebuild-debug.apk" /home/z/my-project/release-delivery/android/
cp /home/z/my-project/android/app/build/outputs/apk/release/app-release-unsigned.apk /home/z/my-project/release-delivery/android/Rahyar-Android-v1.1.0-gradle-release-unsigned.apk
cp /home/z/my-project/android/app/build/outputs/bundle/release/app-release.aab /home/z/my-project/release-delivery/android/Rahyar-Android-v1.1.0-gradle-release-unsigned.aab
ls -la /home/z/my-project/release-delivery/android/
echo ANDROID_PACKAGING_OK
