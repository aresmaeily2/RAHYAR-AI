#!/bin/bash
# F4-FOLLOWUP: تعیین تکلیف موارد باز A1/A5/B3/A7/D4/E/H — هر مورد با مدرک خام
B=http://127.0.0.1:3001
OUT=/home/z/my-project/artifacts/reports/f4/capabilities-followup.txt
: > "$OUT"; log(){ echo "$*" | tee -a "$OUT"; }
J(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }
CJ=/tmp/f4-owner.jar
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"admin"}' $B/api/auth/login --max-time 15) >/dev/null
curl -s -c $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"admin"}' $B/api/auth/login --max-time 15 >/dev/null

log "=== R1: یادآور از مسیر گفتگو (A1) — پاسخ کامل ==="
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"برای فردا ساعت ۹ صبح یادآوری کن با تیم پشتیبانی تماس بگیرم"}' $B/api/chat --max-time 45)
echo "$r" | python3 -m json.tool 2>/dev/null | head -40 | tee -a "$OUT"
A1ACT=$(echo "$r" | J "json.dumps(d.get('assistantMessage',{}).get('actions',[]),ensure_ascii=False)[:200]" 2>/dev/null)
log "R1-actions=[$A1ACT]"
r=$(curl -s -b $CJ $B/api/reminders --max-time 10)
log "R1-reminders-list => $(echo $r | J "json.dumps(d.get('reminders',d),ensure_ascii=False)[:300]" 2>/dev/null)"

log "=== R2: breakdown با کلید درست (added) ==="
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"title":"طراحی لندینگ جدید","priority":"medium"}' $B/api/tasks --max-time 15)
TID=$(echo "$r" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{}' $B/api/tasks/$TID/breakdown --max-time 45)
log "R2 added=$(echo "$r" | J "d.get('added','ERR')" 2>/dev/null) subtasks=$(echo "$r" | J "len((d.get('task') or {}).get('subtasks') or [])" 2>/dev/null)"

log "=== R3: حذف حافظه با body (B3) ==="
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"fact":"آزمون حذف حافظه f4"}' $B/api/memory --max-time 10)
MID=$(echo "$r" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
r=$(curl -s -b $CJ -X DELETE -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"id\":\"$MID\"}" $B/api/memory --max-time 10)
log "R3 delete($MID) => $(echo $r | head -c 60)"
r=$(curl -s -b $CJ $B/api/memory --max-time 10)
log "R3 verify-gone=$(echo "$r" | grep -c 'آزمون حذف حافظه f4') (expect 0)"

log "=== R4: فراموشی با تأیید صریح (A7 دنبالهٔ کامل) ==="
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"fact":"کد پستی دفتر ۱۲۳۴۵"}' $B/api/memory >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"حقیقت «کد پستی دفتر» را فراموش کن"}' $B/api/chat --max-time 45)
log "R4a forget-request => $(echo "$r" | J "d.get('assistantMessage',{}).get('content','')[:150]" 2>/dev/null)"
r=$(curl -s -b $CJ $B/api/memory --max-time 10)
log "R4b still-there-before-confirm=$(echo "$r" | grep -c 'کد پستی دفتر') (expect 1 — نباید بی‌تأیید پاک شود)"
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"تأیید"}' $B/api/chat --max-time 30)
log "R4c confirm => $(echo "$r" | J "d.get('assistantMessage',{}).get('content','')[:120]" 2>/dev/null)"
r=$(curl -s -b $CJ $B/api/memory --max-time 10)
log "R4d gone-after-confirm=$(echo "$r" | grep -c 'کد پستی دفتر') (expect 0)"

log "=== R5: بودجه با دستهٔ معتبر food (D4) ==="
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"category":"food","monthlyLimit":100000}' $B/api/finance/budgets --max-time 10)
log "R5a budget-food => $(echo $r | head -c 100)"
r=$(curl -s -b $CJ $B/api/finance/budgets --max-time 10)
log "R5b budgets => $(echo $r | J "json.dumps(d.get('budgets',[]),ensure_ascii=False)[:250]" 2>/dev/null)"

log "=== R6: رضایت پیامک + زنجیرهٔ ثبت/ضدتکرار/لغو (E) ==="
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"smsConsent":true}' $B/api/settings/app >/dev/null
SMS='بانک ملت خرید 350000 ریال از کارت 1234***6789 موجودی 2500000 ریال'
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"text\":\"$SMS\",\"confirm\":false}" $B/api/sms/import --max-time 15)
IDX=$(echo "$r" | J "d.get('preview',[{}])[0].get('index',0)" 2>/dev/null)
ACC=$(curl -s -b $CJ $B/api/finance/accounts --max-time 10 | J "[a['id'] for a in d.get('accounts',[]) if a['name']=='حساب-ب'][0]" 2>/dev/null)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"text\":\"$SMS\",\"confirm\":true,\"selected\":[$IDX],\"accountId\":\"$ACC\"}" $B/api/sms/import --max-time 15)
log "R6a commit#1 => $(echo $r | J "json.dumps(d,ensure_ascii=False)[:180]" 2>/dev/null)"
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"text\":\"$SMS\",\"confirm\":true,\"selected\":[$IDX],\"accountId\":\"$ACC\"}" $B/api/sms/import --max-time 15)
log "R6b commit#2-dedup => $(echo $r | J "json.dumps(d,ensure_ascii=False)[:180]" 2>/dev/null)"
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"smsConsent":false}' $B/api/settings/app >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"text\":\"بانک صادرات واریز 100000 ریال\",\"confirm\":false}" $B/api/sms/import --max-time 15)
log "R6c after-revoke => $(echo $r | head -c 90) (باید مسدود باشد)"

log "=== R7: آب‌وهوا با کد HTTP (H) ==="
code=$(curl -s -b $CJ -o /tmp/f4-wx.json -w '%{http_code}' "$B/api/weather?city=تهران" --max-time 25)
log "R7 weather http=$code body=$(head -c 150 /tmp/f4-wx.json)"

log "=== R8: رفتار آفلاین (قطع اینترنت شبیه‌سازی: موتور local_rules + آمار مصرف) ==="
r=$(curl -s -b $CJ $B/api/settings/ai/usage --max-time 10)
log "R8 ai-usage => $(echo $r | J "json.dumps(d,ensure_ascii=False)[:160]" 2>/dev/null)"
log "F4-FOLLOWUP_DONE $(date -u '+%H:%M:%S')"
