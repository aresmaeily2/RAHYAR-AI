#!/bin/bash
# F2-POSTCHECK3: بازسازی بیلد + سرور standalone روی 3001 + E2E + ماتریس امنیتی — یک تماس
set -uo pipefail
ROOT=/home/z/my-project
OUT=/tmp/postcheck3.log
: > "$OUT"
log(){ echo "[$(date -u '+%H:%M:%S')] $*" >> "$OUT"; }

cd "$ROOT"
log "build start"
export NODE_OPTIONS=--max-old-space-size=1536
NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production timeout 320 bun run build >> "$OUT" 2>&1
BUILD_RC=$?
log "build rc=$BUILD_RC"
[ $BUILD_RC -ne 0 ] && { echo "BUILD_FAILED"; tail -25 "$OUT"; exit 1; }
ls .next/standalone/server.js >/dev/null 2>&1 || { echo "NO_STANDALONE"; tail -25 "$OUT"; exit 1; }

# سرور پروداکشن روی 3001
pkill -f "standalone/server.js" 2>/dev/null || true; sleep 1
NODE_ENV=production PORT=3001 nohup node .next/standalone/server.js > /tmp/next-prod.log 2>&1 &
log "server starting on 3001"
for i in $(seq 1 30); do
  curl -s -o /dev/null --max-time 3 http://127.0.0.1:3001/login && break
  sleep 2
done
log "server ready: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/login)"

# اسکریپت‌ها روی 3001 (بدون تغییر فایل اصلی — نسخهٔ موقت)
sed 's|http://127.0.0.1:3000|http://127.0.0.1:3001|' scripts/f2-web-e2e.sh > /tmp/e2e3001.sh
sed 's|http://127.0.0.1:3000|http://127.0.0.1:3001|' scripts/f2-sec-matrix.sh > /tmp/sec3001.sh
chmod +x /tmp/e2e3001.sh /tmp/sec3001.sh

log "E2E start"
timeout 180 bash /tmp/e2e3001.sh >> "$OUT" 2>&1
log "E2E rc=$?"
log "SEC start"
timeout 120 bash /tmp/sec3001.sh >> "$OUT" 2>&1
log "SEC rc=$?"

echo "== E2E =="
grep -E "^T[0-9]|RESULT|PASS|FAIL" artifacts/reports/web-e2e.txt | head -16
echo "== SEC =="
grep -E "^T[0-9]+|RESULT|PASS|FAIL" artifacts/reports/emu-security-tests.txt | head -14
pkill -f "standalone/server.js" 2>/dev/null || true
echo "POSTCHECK3_DONE"
