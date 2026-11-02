#!/bin/bash
# ─── تست‌های JVM اندروید — اجرای مستقیم JUnit4 بدون Gradle ──────────
# کامپایل: ECJ 3.33.0 (فقط لایهٔ app — java/* و javax/* از JDK واقعی)
# اجرا: org.junit.runner.JUnitCore روی JDK میزبان (21)
# fail-closed: هر خطای کامپایل یا تست → exit 1
set -euo pipefail
ROOT=/home/z/my-project
T=$ROOT/artifacts/android-build/tools
OUT=$ROOT/artifacts/android-build/out
PROJ=$ROOT/android
NOJAR=$T/plat/android-nolibs.jar
CP="$OUT/classes:$T/test-libs/json-20240303.jar:$T/test-libs/junit-4.13.2.jar:$T/test-libs/hamcrest-core-1.3.jar:$T/webkit/webkit-classes.jar:$NOJAR"
# نکتهٔ ترتیب: NOJAR (android.jar استاب) باید «آخر» باشد — وگرنه org.json استاب از آن لود
# می‌شود و RuntimeException("Stub!") داخل LocalStore با false/−1 پوشانده می‌شود (باگ واقعی خط اول اجرا)

[ -f "$NOJAR" ] || { echo "android-nolibs.jar missing — run build-android-apk-v12.sh first"; exit 1; }
[ -x "$OUT/classes" ] || { echo "app classes missing — run build-android-apk-v12.sh first"; exit 1; }
ls "$T/test-libs/junit-4.13.2.jar" >/dev/null || { echo "junit jar missing"; exit 1; }

rm -rf "$OUT/test-classes"
mkdir -p "$OUT/test-classes"
SRCS=$(find "$PROJ/app/src/test/java" -name "*.java")
echo "test sources: $(echo "$SRCS" | wc -w)"

java -jar "$T/ecj.jar" -source 11 -target 11 -encoding UTF-8 -nowarn \
  -cp "$CP" -d "$OUT/test-classes" $SRCS > "$OUT/ecj-tests.log" 2>&1 || {
  echo "ECJ TEST COMPILE FAILED:"; rg -v "^$" "$OUT/ecj-tests.log" | head -30; exit 1; }
rg -v "^$" "$OUT/ecj-tests.log" | head -5 || true
NTEST=$(find "$OUT/test-classes" -name "*.class" | wc -l)
echo "test classes compiled: $NTEST"

CLASSES=$(cd "$OUT/test-classes" && find . -name "*Test.class" | sed 's|^\./||; s|\.class$||; s|/|.|g' | sort)
echo "running: $CLASSES"
java -Drahyar.www.dir="$PROJ/src/www" -Xmx1024m -cp "$OUT/test-classes:$CP" org.junit.runner.JUnitCore $CLASSES 2>&1 | tee "$ROOT/artifacts/rahyar-audit/ANDROID_JVM_TESTS.txt" | tail -6
grep -q "^OK (" "$ROOT/artifacts/rahyar-audit/ANDROID_JVM_TESTS.txt" && echo "ANDROID_JVM_TESTS_OK" || { echo "JVM TESTS FAILED"; exit 1; }
