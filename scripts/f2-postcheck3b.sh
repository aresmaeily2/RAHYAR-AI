#!/bin/bash
# F2-POSTCHECK3B: creds reset + server 3001 + E2E + SEC — یک تماس
set -uo pipefail
ROOT=/home/z/my-project
OUT=/tmp/postcheck3b.log
: > "$OUT"
log(){ echo "[$(date -u '+%H:%M:%S')] $*" >> "$OUT"; }
cd "$ROOT"

log "creds reset"
bun run scripts/f2-creds-admin.ts >> "$OUT" 2>&1
log "creds rc=$? -> $(tail -3 "$OUT" | head -2)"

pkill -f "standalone/server.js" 2>/dev/null || true; sleep 1
NODE_ENV=production PORT=3001 nohup node .next/standalone/server.js > /tmp/next-prod.log 2>&1 &
for i in $(seq 1 30); do
  curl -s -o /dev/null --max-time 3 http://127.0.0.1:3001/login && break
  sleep 2
done
log "server ready: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/login)"

timeout 180 bash /tmp/e2e3001.sh >> "$OUT" 2>&1
log "E2E rc=$?"
timeout 120 bash /tmp/sec3001.sh >> "$OUT" 2>&1
log "SEC rc=$?"

echo "== E2E (3001) =="
grep -E "^T[0-9]" artifacts/reports/web-e2e.txt | head -12
echo "== SEC (3001) =="
grep -E "^T[0-9]+" artifacts/reports/emu-security-tests.txt | head -12
echo "== SUMMARY =="
P=$(grep -cE "=> \{|PASS" artifacts/reports/web-e2e.txt)
grep -q '"error":"نام کاربری' artifacts/reports/web-e2e.txt && echo "E2E_LOGIN_FAIL" || echo "E2E_LOGIN_OK"
pkill -f "standalone/server.js" 2>/dev/null || true
echo "POSTCHECK3B_DONE"
