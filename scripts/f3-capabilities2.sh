#!/bin/bash
# F3-CAP2: بازآزمون ۵ قابلیت با شکل درست payload/پارس (C2/C4/C7/C9b/C11) — پاسخ خام ثبت می‌شود
set -uo pipefail
ROOT=/home/z/my-project
B=http://127.0.0.1:3001
RPT=$ROOT/artifacts/reports/f3
OUT=$RPT/capabilities-retest.txt
: > "$OUT"
log(){ echo "$*" | tee -a "$OUT"; }
cd "$ROOT"
pkill -f "standalone/server.js" 2>/dev/null || true; sleep 1
NODE_ENV=production PORT=3001 nohup node .next/standalone/server.js > /tmp/next-prod-cap2.log 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null --max-time 3 $B/login && break; sleep 2; done
CJ=/tmp/f3cap2.jar; rm -f $CJ
log "# retest $(date -u '+%Y-%m-%d %H:%M:%S UTC') run=f3cap2-$(date -u +%H%M)"
curl -s -c $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"admin"}' $B/api/auth/login --max-time 15 >/dev/null

# C2r: local_rules پاسخ واقعی می‌دهد؟ (پاسخ خام)
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"local_rules"}' $B/api/settings/ai >/dev/null --max-time 15
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"کارهای امروز چیه؟"}' $B/api/chat --max-time 30)
log "C2r local_rules-raw => $(echo "$r" | head -c 350)"
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"zai"}' $B/api/settings/ai >/dev/null --max-time 15

# C4r: چندمرحله‌ای — تاریخچه در همان گفتگو
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"My name is Alireza. Remember it."}' $B/api/chat --max-time 45 >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"What is my name? One word answer."}' $B/api/chat --max-time 45)
log "C4r multi-turn-raw => $(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('assistantMessage',{}).get('content','')[:150])" 2>/dev/null)"

# C7r: یادآور با شکل درست
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"یادآور آزمون F3","remindAt":"2026-12-01T09:00:00.000Z"}' $B/api/reminders --max-time 15)
echo "$r" | grep -q '"id"' && log "C7r reminder => VERIFIED ($(echo "$r" | head -c 130))" || log "C7r reminder => FAIL ($(echo "$r" | head -c 130))"

# C9r: هزینه روی حساب نقدی (شکل {accounts:[..]})
ACC2=$(curl -s -b $CJ $B/api/finance/accounts --max-time 15 | python3 -c "import sys,json;d=json.load(sys.stdin);a=[x for x in d.get('accounts',[]) if x.get('kind')=='cash'];print(a[0]['id'] if a else '')" 2>/dev/null)
log "C9r cash-account-id => $ACC2"
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"type\":\"expense\",\"amount\":250000,\"title\":\"F3 خرید\",\"accountId\":\"$ACC2\"}" $B/api/finance/transactions --max-time 15)
echo "$r" | grep -q '"id"' && log "C9r expense => VERIFIED ($(echo "$r" | head -c 120))" || log "C9r expense => FAIL ($(echo "$r" | head -c 120))"
r=$(curl -s -b $CJ $B/api/finance/transactions --max-time 15)
log "C9r transactions-list => $(echo "$r" | head -c 160)"

# C11r: پیامک — ثبت با رضایت + ضدتکرار (پاسخ خام هر دو مرحله)
SMS='{"text":"بانک سامان خرید 550000 ریال از کارت 1111***2222 موجودی 3000000 ریال","confirm":true}'
r1=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "$SMS" $B/api/sms/import --max-time 15)
log "C11r sms-1st-raw => $(echo "$r1" | head -c 300)"
r2=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "$SMS" $B/api/sms/import --max-time 15)
log "C11r sms-2nd-raw => $(echo "$r2" | head -c 300)"

pkill -f "standalone/server.js" 2>/dev/null || true
echo "F3-CAP2_DONE"
