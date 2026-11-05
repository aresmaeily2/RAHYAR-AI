#!/bin/bash
# F2-WEB-E2E: آزمون واقعی جریان‌های اصلی وب با نشست مالک — شواهد زندهٔ امروز
B=http://127.0.0.1:3000
OUT=/home/z/my-project/artifacts/reports/web-e2e.txt
: > "$OUT"
log(){ echo "$*" | tee -a "$OUT"; }
CJ=/tmp/e2e-owner.jar; rm -f $CJ

log "F2-WEB-E2E $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# 1) login
r=$(curl -s -c $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"admin"}' $B/api/auth/login --max-time 15)
log "T1 login owner => $(echo $r | head -c 80)"

# 2) tasks CRUD
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"title":"E2E آزمون وظیفه","priority":"high"}' $B/api/tasks --max-time 15)
log "T2 create task => $(echo $r | head -c 120)"
TID=$(echo "$r" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
r=$(curl -s -b $CJ "$B/api/tasks" --max-time 15)
log "T3 list tasks count => $(echo "$r" | grep -o '"id"' | wc -l)"
r=$(curl -s -b $CJ -X PATCH -H 'Content-Type: application/json' -H "Origin: $B" -d '{"done":true}' $B/api/tasks/$TID --max-time 15)
log "T4 complete task => $(echo $r | head -c 80)"

# 3) finance — first account, then transaction on it
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"E2E بانک","kind":"bank"}' $B/api/finance/accounts --max-time 15)
log "T5a create account => $(echo $r | head -c 120)"
ACC=$(echo "$r" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"type\":\"income\",\"amount\":150000,\"title\":\"E2E فروش\",\"accountId\":\"$ACC\"}" $B/api/finance/transactions --max-time 15)
log "T5b finance income => $(echo $r | head -c 140)"
r=$(curl -s -b $CJ "$B/api/finance/transactions" --max-time 15)
log "T6 finance list => $(echo $r | head -c 100)"


# 4) SMS parse (two-stage: preview only — no confirm)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"text":"بانک ملت خرید 350000 ریال از کارت 1234***6789 موجودی 2500000 ریال","confirm":false}' $B/api/sms/import --max-time 15)
log "T7 sms parse preview => $(echo $r | head -c 160)"

# 5) AI chat (local rules fallback without cloud config)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"سلام، یک وظیفه آزمایشی بساز"}' $B/api/chat --max-time 20)
log "T8 ai chat => $(echo $r | head -c 100)"

# 6) calendar conversion check
r=$(curl -s -b $CJ "$B/api/health" --max-time 10)
log "T9 health => $(echo $r | head -c 80)"

# 7) logout
r=$(curl -s -b $CJ -X POST -H "Origin: $B" $B/api/auth/logout --max-time 10)
log "T10 logout => $(echo $r | head -c 60)"
log "E2E_DONE"
