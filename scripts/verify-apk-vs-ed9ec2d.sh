#!/usr/bin/env bash
# CONSOL-GOV / DELIVERY-FINAL: verify debug-test.apk contents == source at commit ed9ec2d (fast batch)
set -u
cd /home/z/my-project
T=/home/z/my-project/scripts/tmp-apk-verify
APK_EX=$T/apk_extracted
ZIPBASE=$T/src_zip_extracted/home/z/my-project/android
FAIL=0

echo "=== 0. Export ed9ec2d android/ once via git archive ==="
rm -rf $T/ed9src && mkdir -p $T/ed9src
git archive ed9ec2d android | tar -x -C $T/ed9src
echo "exported: $(find $T/ed9src -type f | wc -l) files"

echo "=== 1. Bundled UI assets (APK assets/*) vs git ed9ec2d android/src/www/* ==="
for pair in "index.html:index.html" "tasks.html:tasks.html" "reminders.html:reminders.html" "settings.html:settings.html" "css/app.css:css/app.css" "js/app.js:js/app.js"; do
  ap="${pair%%:*}"; src="${pair##*:}"
  if cmp -s "$APK_EX/assets/$ap" "$T/ed9src/android/src/www/$src"; then
    echo "MATCH  assets/$ap"
  else
    echo "DIFFER assets/$ap"; FAIL=1
  fi
done

echo "=== 2. Source zip vs git ed9ec2d android/ tree (recursive) ==="
diff -r --brief "$T/ed9src/android" "$ZIPBASE" 2>&1 | grep -v -E 'local\.properties' | head -20
if [ "$(diff -r --brief "$T/ed9src/android" "$ZIPBASE" 2>/dev/null | grep -v -c -E 'local\.properties')" = "0" ] && [ "$(diff -rq "$T/ed9src/android" "$ZIPBASE" 2>/dev/null | wc -l)" = "$(diff -rq "$T/ed9src/android" "$ZIPBASE" 2>/dev/null | grep -c -E 'local\.properties')" ]; then
  :
fi
N=$(diff -r --brief "$T/ed9src/android" "$ZIPBASE" 2>/dev/null | grep -v -E 'local\.properties' | wc -l)
echo "non-local.properties differences: $N"
[ "$N" -eq 0 ] || FAIL=1
echo "zip file count: $(find $ZIPBASE -type f | wc -l) / ed9ec2d file count: $(find $T/ed9src -type f | wc -l)"

echo "=== 3. dex sanity: key classes present (all dex files) ==="
DEX_ALL=$(cat "$APK_EX"/classes*.dex 2>/dev/null)
for cls in "HomeActivity" "LocalStore" "RahyarCore" "RahyarBridge" "WebViewAssetLoader" "LoginActivity" "MainActivity"; do
  if printf '%s' "$DEX_ALL" | strings 2>/dev/null | grep -q "$cls"; then
    echo "CLASS-FOUND $cls"
  else
    echo "CLASS-MISSING $cls"; FAIL=1
  fi
done

echo "=== RESULT ==="
if [ "$FAIL" -eq 0 ]; then echo "ALL-CHECKS-PASSED"; else echo "FAILURES-DETECTED"; fi
exit $FAIL
