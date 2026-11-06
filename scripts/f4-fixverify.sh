#!/bin/bash
# F4-FIXVERIFY: بازسازی با پچ مسیر قطعی فراموشی + آزمون کامل جریان تأیید + موارد باز
set -uo pipefail
ROOT=/home/z/my-project
OUT=/tmp/f4-fixverify.log
: > "$OUT"; log(){ echo "[$(date -u '+%H:%M:%S')] $*" >> "$OUT"; }
cd "$ROOT"
log "build start (forget-lane patch)"
export NODE_OPTIONS=--max-old-space-size=1536
NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production timeout 320 bun run build >> "$OUT" 2>&1
RC=$?
log "build rc=$RC"
[ $RC -ne 0 ] && { echo "BUILD_FAILED"; tail -20 "$OUT"; exit 1; }
pkill -f "standalone/server.js" 2>/dev/null || true; sleep 1
NODE_ENV=production PORT=3001 nohup node .next/standalone/server.js > /tmp/next-prod.log 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null --max-time 3 http://127.0.0.1:3001/login && break; sleep 2; done
log "server ready: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/login)"

B=http://127.0.0.1:3001
RPT=$ROOT/artifacts/reports/f4
O=$RPT/forget-lane-verify.txt
: > "$O"; tee(){ echo "$*" >> "$O"; echo "$*"; }
CJ=/tmp/f4-owner3.jar; rm -f $CJ
curl -s -c $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"admin"}' $B/api/auth/login >/dev/null
J(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }

tee "=== V1: فراموشی مسیر قطعی — درخواست ==="
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"fact":"شماره پرونده ۹۹۸۸۷۷"}' $B/api/memory >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"حقیقت «شماره پرونده» را فراموش کن"}' $B/api/chat --max-time 30)
tee "V1a reply: $(echo "$r" | J "d.get('assistantMessage',{}).get('content','')[:160]")"
tee "V1a mode: $(echo "$r" | J "d.get('mode','')")"
V_BEFORE=$(curl -s -b $CJ $B/api/memory | grep -c "شماره پرونده")
tee "V1b memory-before-confirm=$V_BEFORE (expect 1)"
tee "=== V2: تأیید ==="
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"تأیید"}' $B/api/chat --max-time 30)
tee "V2a reply: $(echo "$r" | J "d.get('assistantMessage',{}).get('content','')[:120]")"
V_AFTER=$(curl -s -b $CJ $B/api/memory | grep -c "شماره پرونده")
tee "V2b memory-after-confirm=$V_AFTER (expect 0) => $([ "$V_BEFORE" = "1" ] && [ "$V_AFTER" = "0" ] && echo "FORGET-CONFIRM PASS" || echo FAIL)"

tee "=== V3: مسیر انصراف ==="
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"fact":"دادهٔ نباید-پاک-شود"}' $B/api/memory >/dev/null
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"حقیقت «نباید-پاک-شود» را فراموش کن"}' $B/api/chat --max-time 30 >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"انصراف"}' $B/api/chat --max-time 30)
tee "V3a reply: $(echo "$r" | J "d.get('assistantMessage',{}).get('content','')[:100]")"
V_KEEP=$(curl -s -b $CJ $B/api/memory | grep -c "نباید-پاک-شود")
tee "V3b memory-after-cancel=$V_KEEP (expect 1) => $([ "$V_KEEP" = "1" ] && echo "CANCEL PASS" || echo FAIL)"

tee "=== V4: عبارت فراموش-نکن نباید لِین فراموشی را فعال کند ==="
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"جلسه فردا را فراموش نکن"}' $B/api/chat --max-time 30)
tee "V4 mode: $(echo "$r" | J "d.get('mode','')") (expect model — نه deterministic)"

tee "=== V5: پیامک پس از لغو رضایت — مرحلهٔ ثبت (نه پیش‌نمایش) ==="
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"smsConsent":false}' $B/api/settings/app >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"text":"بانک صادرات واریز 100000 ریال به حساب 123**4321","confirm":true,"selected":[0],"accountId":"x"}' $B/api/sms/import --max-time 15)
tee "V5 commit-after-revoke => $(echo $r | head -c 110)"
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"smsConsent":true}' $B/api/settings/app >/dev/null

tee "=== V6: آب‌وهوا با انکودینگ درست ==="
code=$(curl -s -b $CJ -G --data-urlencode "city=تهران" -o /tmp/f4-wx2.json -w '%{http_code}' "$B/api/weather" --max-time 25)
tee "V6 weather http=$code body=$(head -c 200 /tmp/f4-wx2.json)"

tee "=== V7: ارسال پیام/ایمیل از چت — فقط پیش‌نویس با تأیید (بخش ۸ مأموریت) ==="
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"برای تیم فنی یک پیام تلگرام با متن «جلسه ساعت ۱۰» آماده کن"}' $B/api/chat --max-time 45)
tee "V7 draft => $(echo "$r" | J "json.dumps(d.get('assistantMessage',{}).get('actions',[]),ensure_ascii=False)[:250]")"
echo "F4-FIXVERIFY_DONE $(date -u '+%H:%M:%S')" | tee -a "$O"
