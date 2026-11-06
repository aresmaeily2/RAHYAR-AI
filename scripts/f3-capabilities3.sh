#!/bin/bash
# F3-CAP3: C11 کامل — رضایت صریح → ثبت → ضدتکرار → لغو رضایت
set -uo pipefail
ROOT=/home/z/my-project
B=http://127.0.0.1:3001
RPT=$ROOT/artifacts/reports/f3
OUT=$RPT/capabilities-sms.txt
: > "$OUT"
log(){ echo "$*" | tee -a "$OUT"; }
cd "$ROOT"
pkill -f "standalone/server.js" 2>/dev/null || true; sleep 1
NODE_ENV=production PORT=3001 nohup node .next/standalone/server.js > /tmp/next-prod-cap3.log 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null --max-time 3 $B/login && break; sleep 2; done
CJ=/tmp/f3cap3.jar; rm -f $CJ
log "# sms-consent test $(date -u '+%H:%M:%S UTC')"
curl -s -c $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"admin"}' $B/api/auth/login --max-time 15 >/dev/null
ACC=$(curl -s -b $CJ $B/api/finance/accounts --max-time 15 | python3 -c "import sys,json;d=json.load(sys.stdin);print([a['id'] for a in d.get('accounts',[]) if a.get('kind')=='cash'][0])" 2>/dev/null)
log "target-account => $ACC"

# 1) رضایت صریح کاربر (تنظیمات — همان مسیر UI)
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"smsConsent":true}' $B/api/settings/app --max-time 15)
log "consent-grant => $(echo "$r" | python3 -c "import sys,json;print('smsConsent='+str(json.load(sys.stdin).get('smsConsent')))" 2>/dev/null)"

# 2) ثبت اول — duplicate=False
SMS="{\"text\":\"بانک سامان خرید 650000 ریال از کارت 1111***2222 موجودی 2900000 ریال\",\"confirm\":true,\"accountId\":\"$ACC\"}"
r1=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "$SMS" $B/api/sms/import --max-time 15)
log "sms-1st => $(echo "$r1" | head -c 260)"

# 3) ثبت دوبارهٔ همان — duplicate=True (ضدتکرار هش پیامک)
r2=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "$SMS" $B/api/sms/import --max-time 15)
log "sms-2nd => $(echo "$r2" | head -c 260)"

# 4) لغو رضایت + ثبت سوم → باید باز رضایت بخواهد
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"smsConsent":false}' $B/api/settings/app >/dev/null --max-time 15
r3=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "$SMS" $B/api/sms/import --max-time 15)
log "consent-revoked-3rd => $(echo "$r3" | head -c 120)"

pkill -f "standalone/server.js" 2>/dev/null || true
echo "F3-CAP3_DONE"
