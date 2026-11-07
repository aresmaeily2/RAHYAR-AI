#!/bin/bash
# F5-WEB-VERIFY: single self-contained run — server + E2E + security matrix + video + evidence
# (sandbox reaps background processes between tool calls; everything must be one run)
set -u
cd /home/z/my-project
B=http://127.0.0.1:3001
LOG=/tmp/next-prod.log
MAINOUT=/tmp/f5-web-verify.log
{
echo "===== F5-WEB-VERIFY $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="

pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "standalone/server.js" 2>/dev/null || true
sleep 1
set -a; source .env 2>/dev/null; set +a
NODE_ENV=production PORT=3001 RAHYAR_SETUP_TOKEN=setup-guard AI_ALLOW_PRIVATE_ENDPOINTS=1 nohup node .next/standalone/server.js > $LOG 2>&1 &
disown 2>/dev/null || true
for i in $(seq 1 30); do code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 $B/login 2>/dev/null); [ "$code" = "200" ] && break; sleep 2; done
echo "server-ready=$code"

echo "--- [1] GRAND E2E (smoke + a11y + i18n + calendar) ---"
node tests/e2e/grand-e2e.mjs 2>&1 | tail -22
echo "e2e-exit=$?"

echo "--- [2] SECURITY MATRIX (11 tests) ---"
bash scripts/f5-sec-matrix.sh 2>&1 | tail -15

echo "--- [3] RE-CHECKS after fixes (fresh server) ---"
CJ=/tmp/f5-owner.jar
OP=$(grep owner_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
curl -s -c $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 >/dev/null
r=$(curl -s -o /dev/null -w '%{http_code}' -b $CJ "$B/api/weather?city=Tehran" --max-time 25)
echo "recheck-weather-Tehran=$r (expect 200)"
r=$(curl -s -b $CJ $B/api/data/export --max-time 15 | grep -c "sk-TEST-SECRET\|sk-F5-dummy" || true)
echo "recheck-key-leak=$r (expect 0)"
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"local_rules"}' $B/api/settings/ai/test --max-time 15)
echo "recheck-local-rules-test=$(echo $r | head -c 100)"
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"یک هزینه ۳۰ هزار تومانی تاکسی ثبت کن"}' $B/api/chat --max-time 30)
echo "recheck-expense-chat=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);a=d.get('assistantMessage',{}).get('actions',[]);print(json.dumps(a,ensure_ascii=False)[:150])" 2>/dev/null)"
echo "===== F5-WEB-VERIFY-DONE ====="
} 2>&1 | tee "$MAINOUT"
echo "SAVED: $MAINOUT"
