#!/usr/bin/env bash
# F6 Agent 2: JVM tests re-run from HEAD + rebuild user-debug for provenance + fail-closed proof
set -uo pipefail
cd /home/z/my-project
{
echo "===== F6-ANDROID-VERIFY $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
AVAIL=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
echo "mem-available-mb=$AVAIL (gate 1900)"
[ "$AVAIL" -lt 1900 ] && { echo "MEMORY-GATE-FAIL"; exit 1; }

export JAVA_HOME=$PWD/artifacts/jdk17
export ANDROID_HOME=$PWD/artifacts/android-sdk
export GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx1100m -XX:MaxMetaspaceSize=320m -Dorg.gradle.workers.max=1"
$JAVA_HOME/bin/java -version 2>&1 | head -1

cd android
echo "== [A] JVM tests (user+owner) =="
timeout 480 ./gradlew :app:testUserDebug :app:testOwnerDebug --no-daemon -q > /tmp/f6-gradle-tests.log 2>&1
echo "tests rc=$?"
grep -hE "tests=|failures=" app/build/test-results/testUserDebugUNIT/*.xml 2>/dev/null | head -0
for d in app/build/test-results/testUserDebugUNIT app/build/test-results/testOwnerDebugUNIT; do
  T=$(grep -h '<testsuite ' $d/*.xml 2>/dev/null | sed -E 's/.*tests="([0-9]+)".*failures="([0-9]+)".*errors="([0-9]+)".*/\1 \2 \3/' | awk '{a+=$1;b+=$2;c+=$3} END{print a" tests, "b" failures, "c" errors"}')
  echo "$d => $T"
done

echo "== [B] rebuild user-debug from HEAD (provenance) =="
timeout 480 ./gradlew :app:assembleUserDebug --no-daemon -q > /tmp/f6-gradle-dbg.log 2>&1
echo "assemble-debug rc=$?"
NEW=app/build/outputs/apk/user/debug/app-user-debug.apk
BT=$ANDROID_HOME/build-tools/34.0.0
if [ -f "$NEW" ]; then
  echo "rebuilt: $(wc -c < $NEW) bytes"
  $BT/apksigner verify --print-certs "$NEW" 2>/dev/null | grep -E 'SHA-256 digest' | head -1
  echo "delivered cert was: 54222d386eb7028ea7ca261987359c70542ad48e724d2362fadd8303b04fdcf0"
  $BT/aapt2 dump badging "$NEW" 2>/dev/null | grep '^package' | head -1
else
  echo "REBUILD-FAILED"; tail -15 /tmp/f6-gradle-dbg.log
fi

echo "== [C] fail-closed proof (hide keystore.properties -> release must REFUSE) =="
mv keystore.properties /tmp/f6-ksp.hidden
timeout 240 ./gradlew :app:assembleUserRelease --no-daemon -q > /tmp/f6-gradle-fc.log 2>&1
FC=$?
mv /tmp/f6-ksp.hidden keystore.properties
echo "fail-closed rc=$FC (expect nonzero)"
grep -o 'FAIL-CLOSED[^"]*' /tmp/f6-gradle-fc.log | head -1
ls app/build/outputs/apk/user/release/ 2>/dev/null | head -3
echo "===== F6-ANDROID-VERIFY-DONE ====="
} 2>&1 | tee /tmp/f6-android-verify.log
