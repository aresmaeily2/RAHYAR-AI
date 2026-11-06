#!/bin/bash
# F3-WEB-CORE: بند ۴ مأموریت — build تازه + E2E ۱۰ + ماتریس ۱۱ + پروب‌های احراز هویت (بند ۳.۹)
# هر آزمون با زمان/HEAD/شناسهٔ اجرا ثبت می‌شود؛ لاگ سرور هم ذخیره می‌شود.
set -uo pipefail
ROOT=/home/z/my-project
OUT=/tmp/f3-web-core.log
RUN_ID="f3-$(date -u +%Y%m%d-%H%M)"
: > "$OUT"
log(){ echo "[$(date -u '+%H:%M:%S')] $*" >> "$OUT"; }
cd "$ROOT"

log "RUN_ID=$RUN_ID HEAD=$(git rev-parse --short HEAD)"
# ---- 1) build تازه از سورس واقعی (4.1) ----
export NODE_OPTIONS=--max-old-space-size=1536
NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production timeout 320 bun run build >> "$OUT" 2>&1
BUILD_RC=$?
BUILD_TIME=$(date -u '+%H:%M:%S')
log "build rc=$BUILD_RC done=$BUILD_TIME"
[ $BUILD_RC -ne 0 ] && { echo "BUILD_FAILED"; tail -20 "$OUT"; exit 1; }
ls .next/standalone/server.js >/dev/null 2>&1 || { echo "NO_STANDALONE"; exit 1; }

# ---- 2) سرور از build تازه (4.2) ----
pkill -f "standalone/server.js" 2>/dev/null || true; sleep 1
: > /tmp/next-prod.log
NODE_ENV=production PORT=3001 nohup node .next/standalone/server.js > /tmp/next-prod.log 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null --max-time 3 http://127.0.0.1:3001/login && break; sleep 2; done
log "server ready http=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/login)"

# ---- 3) E2E + ماتریس (اسکریپت‌های اثبات‌شده روی 3001) ----
sed 's|http://127.0.0.1:3000|http://127.0.0.1:3001|' scripts/f2-web-e2e.sh > /tmp/e2e3001.sh
sed 's|http://127.0.0.1:3000|http://127.0.0.1:3001|' scripts/f2-sec-matrix.sh > /tmp/sec3001.sh
chmod +x /tmp/e2e3001.sh /tmp/sec3001.sh
bun run scripts/f2-creds-admin.ts > /tmp/creds.log 2>&1 && log "creds reset OK" || log "creds reset FAIL"
timeout 180 bash /tmp/e2e3001.sh >> "$OUT" 2>&1; log "E2E rc=$?"
timeout 150 bash /tmp/sec3001.sh >> "$OUT" 2>&1; log "SEC rc=$?"

# ---- 4) پروب‌های احراز هویت (3.9) — جلسهٔ مالک قبل از طوفان نرخ ----
B=http://127.0.0.1:3001
CJ=/tmp/f3-admin.jar; rm -f "$CJ"
log "auth probes start"
r=$(curl -s -c "$CJ" -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"admin"}' $B/api/auth/login --max-time 15)
log "A0 admin session => $(echo "$r" | head -c 60)"
r=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"wrong-pass-123"}' $B/api/auth/login --max-time 15)
log "A1 wrong-password => $r (expect 401)"
r=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"nobody","password":"whatever"}' $B/api/auth/login --max-time 15)
log "A1b unknown-user => $r (expect 401, same message)"
r=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"adm2","password":"longenough123"}' $B/api/auth/setup --max-time 15)
log "A3 setup-when-done => $r (expect 403 done / 503 no-token)"
r=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"currentPassword":"x","newPassword":"longenough123"}' $B/api/auth/password --max-time 15)
log "A4 password-no-session => $r (expect 401/403)"
r=$(curl -s -b "$CJ" -o /dev/null -w '%{http_code}' $B/api/users --max-time 15)
log "A5 users-as-owner => $r (expect 200)"
sleep 22
codes=""; for i in $(seq 1 12); do
  c=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"bad-$i"}' $B/api/auth/login --max-time 10)
  codes="$codes $c"
done
log "A2 login-storm(12) =>$codes (expect mix 401→429)"
r=$(curl -s -b "$CJ" -o /dev/null -w '%{http_code}' $B/api/tasks --max-time 15)
log "A6 owner-session-still-valid => $r (expect 200)"

# ---- 5) ذخیرهٔ شواهد با شناسهٔ اجرا (4.8) ----
RPT=$ROOT/artifacts/reports/f3
mkdir -p "$RPT"
HDR="run=$RUN_ID head=$(git rev-parse --short HEAD) build=$BUILD_TIME host=$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
for f in web-e2e.txt emu-security-tests.txt; do
  { echo "# $HDR"; cat "$ROOT/artifacts/reports/$f"; } > "$RPT/$f"
done
cp /tmp/next-prod.log "$RPT/server-log.txt" 2>/dev/null
cp "$OUT" "$RPT/web-core-log.txt"
echo "== E2E ==";  grep -E "^T[0-9]" "$RPT/web-e2e.txt" | head -11
echo "== SEC ==";  grep -E "^T[0-9]+" "$RPT/emu-security-tests.txt" | head -12
echo "== AUTH =="; grep -E "^A[0-9]" "$RPT/web-core-log.txt"
pkill -f "standalone/server.js" 2>/dev/null || true
echo "F3-WEB-CORE_DONE run=$RUN_ID"
