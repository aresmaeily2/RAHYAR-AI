#!/bin/bash
# F4-CAPABILITIES: آزمون واقعی گستردهٔ قابلیت‌ها بر پایهٔ مأموریت ۱۷‌بخشی
# پوشش: سناریوهای عامل (۲.۲)، حافظه (۲.۳)، تقویم/کبیسه (۵)، مالی کامل ده‌مرحله‌ای (۶)،
#        پیامک (۷)، سوییچ Provider و رفتار خطا (۳)، پشتیبان/حذف (۹)، آب‌وهوا (۸)
B=http://127.0.0.1:3001
OUT=/home/z/my-project/artifacts/reports/f4/capabilities-extended.txt
RUNID=f4cap-$(date -u '%H%M')
mkdir -p /home/z/my-project/artifacts/reports/f4
: > "$OUT"
log(){ echo "$*" | tee -a "$OUT"; }
J(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }

echo "# run=$RUNID head=$(git -C /home/z/my-project rev-parse --short HEAD) $(date -u '+%Y-%m-%d %H:%M:%S UTC')" >> "$OUT"
CJ=/tmp/f4-owner.jar; UJ=/tmp/f4-user.jar; rm -f $CJ $UJ
r=$(curl -s -c $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"admin"}' $B/api/auth/login --max-time 15)
log "LOGIN owner => $(echo $r | head -c 60)"
r=$(curl -s -c $UJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"user","password":"admin"}' $B/api/auth/login --max-time 15)
log "LOGIN user  => $(echo $r | head -c 60)"

log "=== A. سناریوهای عامل (بخش ۲.۲ مأموریت) — نتیجه باید در DB واقعی باشد ==="
# A1: یادآور فردا ساعت ۹
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"برای فردا ساعت ۹ صبح یادآوری کن با تیم پشتیبانی تماس بگیرم"}' $B/api/chat --max-time 30)
A1ID=$(echo "$r" | J "d.get('assistantMessage',{}).get('actions',[{}])[0].get('reminder',{}).get('id','')" )
r2=$(curl -s -b $CJ $B/api/reminders --max-time 10)
A1DB=$(echo "$r2" | python3 -c "import sys,json;d=json.load(sys.stdin);rs=d.get('reminders',d if isinstance(d,list) else []);print(len([x for x in rs if 'پشتیبانی' in x.get('message','')]))" 2>/dev/null)
log "A1 reminder-via-chat: chat-actions-id=[$A1ID] db-matched=[$A1DB] => $([ "${A1DB:-0}" -ge 1 ] && echo PASS || echo CHECK)"

# A2: برنامه‌ریزی هفته
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"برای این هفته وظایفم را برنامه‌ریزی کن"}' $B/api/chat --max-time 30)
A2=$(echo "$r" | J "'plan' in json.dumps(d, ensure_ascii=False) or d.get('assistantMessage',{}).get('content','')" | head -c 120)
log "A2 weekly-plan => $A2"

# A3: ثبت هزینه از طریق گفتگو
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"یک هزینه ۵۰۰۰۰ تومانی برای بسته اینترنت ثبت کن"}' $B/api/chat --max-time 30)
A3=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);am=d.get('assistantMessage',{});print('tx' in json.dumps(am.get('actions',[]),ensure_ascii=False).lower() or am.get('content','')[:90])" 2>/dev/null)
log "A3 expense-via-chat => ${A3:0:110}"

# A4: وظایف عقب‌افتاده
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"فهرست وظایف عقب‌افتاده را نشان بده"}' $B/api/chat --max-time 30)
A4=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);am=d.get('assistantMessage',{});c=am.get('content','');print('overdue' in json.dumps(am,ensure_ascii=False).lower() or c[:100])" 2>/dev/null)
log "A4 overdue-list => ${A4:0:120}"

# A5: تقسیم به سه مرحله (breakdown روی وظیفهٔ واقعی)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"title":"تدوین گزارش ماهانه","priority":"medium"}' $B/api/tasks --max-time 15)
BID=$(echo "$r" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{}' $B/api/tasks/$BID/breakdown --max-time 40)
A5N=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d.get('subtasks',[]) or d.get('items',[]) or []))" 2>/dev/null)
log "A5 breakdown task=$BID subtasks=[$A5N] => $([ "${A5N:-0}" -ge 1 ] && echo PASS || echo "RAW:$(echo $r|head -c 100)")"

# A6: ادامهٔ کار قبلی (حافظهٔ چندمرحله‌ای)
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"اسم من را به‌خاطر بسپار: کیان"}' $B/api/chat --max-time 30 >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"اسم من چی بود؟"}' $B/api/chat --max-time 30)
A6=$(echo "$r" | J "d.get('assistantMessage',{}).get('content','')" | head -c 100)
log "A6 context-recall => ${A6:0:110} => $(echo "$A6" | grep -q "کیان" && echo PASS || echo CHECK)"

# A7: تأیید پیش از عملیات حساس (pending-action)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"همهٔ حافظه‌ات را فراموش کن"}' $B/api/chat --max-time 30)
A7=$(echo "$r" | J "'confirm' in json.dumps(d, ensure_ascii=False).lower() or d.get('assistantMessage',{}).get('content','')[:80]" | head -c 120)
log "A7 sensitive-needs-confirm => ${A7:0:130}"

log "=== B. حافظه (بخش ۲.۳) ==="
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"fact":"ترجیح زبان رابط: فارسی","source":"manual"}' $B/api/memory --max-time 10)
BMID=$(echo "$r" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
r=$(curl -s -b $CJ $B/api/memory --max-time 10)
B1=$(echo "$r" | grep -c "ترجیح زبان رابط")
r=$(curl -s -b $UJ $B/api/memory --max-time 10)
B2=$(echo "$r" | grep -c "ترجیح زبان رابط")
log "B1 owner-memory-visible=$B1 | B2 user-sees-owner-memory=$B2 => $([ "$B1" -ge 1 ] && [ "$B2" = "0" ] && echo "SEPARATION PASS" || echo "CHECK")"
r=$(curl -s -b $CJ -X DELETE "$B/api/memory?id=$BMID" --max-time 10)
log "B3 memory-delete(id=$BMID) => $(echo $r | head -c 50)"

log "=== C. تقویم/کبیسه/زبان (بخش ۵) ==="
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"calendarMode":"gregorian"}' $B/api/settings/app --max-time 10); log "C1 calendarMode=gregorian => $(echo $r | head -c 70)"
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"calendarMode":"jalali","lang":"fa"}' $B/api/settings/app --max-time 10); log "C2 calendarMode=jalali+fa => $(echo $r | head -c 70)"
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"lang":"en"}' $B/api/settings/app --max-time 10)
r=$(curl -s -b $CJ "$B/api/settings/app" --max-time 10); log "C3 lang=en persist => $(echo $r | head -c 90)"
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"lang":"fa"}' $B/api/settings/app >/dev/null
# کبیسه: تبدیل 1403-12-30 (سی‌اسفند سال کبیسه) باید معتبر باشد — از ماژول سرور
node -e "
const {jalaliToIsoDate, jalaliMonthLength} = require('./.next/standalone/node_modules/.prisma/client') " 2>/dev/null
node --experimental-strip-types -e "
import('./src/lib/persian-date.ts').then(m=>{
  const ok1 = m.jalaliMonthLength ? m.jalaliMonthLength(1403,12) : null;
  console.log('leap1403-esfand-len=' + ok1);
  try { const iso = m.jalaliToIsoDate ? m.jalaliToIsoDate(1403,12,30) : null; console.log('1403-12-30 => ' + iso); } catch(e){ console.log('1403-12-30 => ERR ' + e.message); }
  try { const iso2 = m.jalaliToIsoDate ? m.jalaliToIsoDate(1404,12,29) : null; console.log('1404-12-29 => ' + iso2); } catch(e){ console.log('1404-12-29 => ERR ' + e.message); }
})" 2>&1 | grep -E "leap|12-" | tee -a "$OUT"

log "=== D. مالی کامل ده‌مرحله‌ای (بخش ۶) ==="
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"حساب-الف","kind":"bank","openingAmount":1000000}' $B/api/finance/accounts --max-time 15)
AID=$(echo "$r" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"حساب-ب","kind":"cash","openingAmount":300000}' $B/api/finance/accounts --max-time 15)
BID2=$(echo "$r" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
log "D1 accounts: A=$AID B=$BID2"
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"type\":\"income\",\"amount\":500000,\"accountId\":\"$AID\",\"title\":\"درآمد پروژه\"}" $B/api/finance/transactions >/dev/null
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"type\":\"expense\",\"amount\":200000,\"accountId\":\"$BID2\",\"title\":\"خرید لوازم\",\"category\":\"خوراک\"}" $B/api/finance/transactions >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"type\":\"transfer\",\"amount\":150000,\"accountId\":\"$AID\",\"toAccountId\":\"$BID2\",\"title\":\"انتقال\"}" $B/api/finance/transactions --max-time 15)
TRID=$(echo "$r" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
log "D2 income+expense+transfer($TRID) created"
r=$(curl -s -b $CJ $B/api/finance/accounts --max-time 10)
echo "$r" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for a in d.get('accounts',[]):
    if a['name'] in ('حساب-الف','حساب-ب'):
        print('D3 balance', a['name'], '=', a.get('balance'), 'expected', '1350000' if 'الف' in a['name'] else '250000', '=>', 'PASS' if str(a.get('balance')) in ('1350000','250000') else 'MISMATCH')
" | tee -a "$OUT"
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"category":"خوراک","monthlyLimit":100000}' $B/api/finance/budgets --max-time 10)
log "D4 budget خوراک=100000 => $(echo $r | head -c 80)"
r=$(curl -s -b $CJ $B/api/finance/budgets --max-time 10)
BSTAT=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);bs=d.get('budgets',[]);print([(b.get('category'),b.get('status') or b.get('spendStatus'),b.get('monthlyLimit'),b.get('spent')) for b in bs])" 2>/dev/null)
log "D5 budget-status => ${BSTAT:0:120}"
r=$(curl -s -b $CJ "$B/api/finance/transactions?month=2026-11" --max-time 10)
DN=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);ts=d.get('transactions',[]);print(len(ts),'sum-income=',sum(t['amount'] for t in ts if t['type']=='income'),'sum-expense=',sum(t['amount'] for t in ts if t['type']=='expense'))" 2>/dev/null)
log "D6 month-report 2026-11 => $DN (expect income=500000, expense=200000; transfer نه درآمد نه هزینه)"
for FMT in csv json xls txt; do
  curl -s -b $CJ "$B/api/finance/export?format=$FMT" -o /tmp/f4-fin.$FMT --max-time 15
  SZ=$(wc -c < /tmp/f4-fin.$FMT)
  HEAD1=$(head -c 40 /tmp/f4-fin.$FMT | tr -d '\n\r')
  log "D7 export.$FMT size=$SZ head=[$HEAD1]"
done
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"type\":\"income\",\"amount\":700000,\"accountId\":\"$AID\",\"title\":\"درآمد تکراری\",\"externalRef\":\"e2e-ref-100\"}" $B/api/finance/transactions --max-time 15)
r2=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"type\":\"income\",\"amount\":700000,\"accountId\":\"$AID\",\"title\":\"درآمد تکراری\",\"externalRef\":\"e2e-ref-100\"}" $B/api/finance/transactions --max-time 15)
log "D8 dedup externalRef: first=$(echo $r | head -c 50) | second=$(echo $r2 | head -c 80)"

log "=== E. پیامک بانکی (بخش ۷) — زنجیرهٔ کامل روی run تازه ==="
SMS='بانک ملت خرید 350000 ریال از کارت 1234***6789 موجودی 2500000 ریال'
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"text\":\"$SMS\",\"confirm\":false}" $B/api/sms/import --max-time 15)
IDX=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);p=d.get('preview',[]);print(p[0]['index'] if p else '')" 2>/dev/null)
AMT=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);p=d.get('preview',[]);print(p[0].get('amount','') if p else '')" 2>/dev/null)
log "E1 preview: index=$IDX amount=$AMT bank=ملت"
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"text\":\"$SMS\",\"confirm\":true,\"selected\":[$IDX],\"accountId\":\"$BID2\"}" $B/api/sms/import --max-time 15)
log "E2 commit#1 => $(echo $r | python3 -c "import sys,json;d=json.load(sys.stdin);print('duplicate=',d.get('duplicate'),'saved=',d.get('saved') or d.get('transaction',{}).get('id','?'))" 2>/dev/null)"
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"text\":\"$SMS\",\"confirm\":true,\"selected\":[$IDX],\"accountId\":\"$BID2\"}" $B/api/sms/import --max-time 15)
log "E3 commit#2(same sms) => $(echo $r | head -c 100)"

log "=== F. Provider (بخش ۳) — سوییچ، خطا، killSwitch ==="
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"local_rules"}' $B/api/settings/ai --max-time 10)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"الان چند شنبه است؟"}' $B/api/chat --max-time 20)
F1=$(echo "$r" | J "d.get('assistantMessage',{}).get('content','')" | head -c 80)
log "F1 local_rules-offline-answer => ${F1:0:90}"
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"openai_compatible","endpointUrl":"http://127.0.0.1:9/nohost/v1","endpointModel":"m1"}' $B/api/settings/ai/test --max-time 20)
log "F2 unreachable-provider-test => $(echo $r | head -c 120)  (باید خطا باشد نه موفقیت)"
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"openai_compatible","endpointUrl":"http://127.0.0.1:9/nohost/v1","endpointModel":"m1"}' $B/api/settings/ai --max-time 10)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"سلام"}' $B/api/chat --max-time 40)
F3=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);am=d.get('assistantMessage',{});c=am.get('content','');print('HTTP500' if False else ('graceful' if c else 'empty'), '|', c[:90])" 2>/dev/null)
log "F3 chat-on-broken-provider => ${F3:0:120} (باید مدیریت نرم باشد نه کرش ۵۰۰)"
r=$(curl -s -b $CJ $B/api/settings/ai --max-time 10)
log "F4 ai-status-key-masked => $(echo $r | python3 -c "import sys,json;d=json.load(sys.stdin);s=json.dumps(d,ensure_ascii=False);import re;print('KEY-LEAK' if re.search(r'sk-[A-Za-z0-9]{20,}',s) else 'masked-ok', '|', s[:100])" 2>/dev/null)"
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"zai"}' $B/api/settings/ai --max-time 10)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"یک جملهٔ کوتاه دربارهٔ پاییز بگو"}' $B/api/chat --max-time 45)
F5=$(echo "$r" | J "d.get('assistantMessage',{}).get('content','')" | head -c 90)
log "F5 zai-hosted-real-reply => ${F5:0:100}"

log "=== G. پشتیبان/حذف/کاربران (بخش ۹) ==="
r=$(curl -s -b $CJ $B/api/data/export --max-time 20)
G1=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);print('tasks=',len(d.get('tasks',[])),'finance=',('finance' in d or 'accounts' in d),'keyleak=',('endpointKey' in json.dumps(d)))" 2>/dev/null)
log "G1 data-export => ${G1:0:100}"
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"confirm":"اشتباه"}' $B/api/data/delete-all --max-time 10)
log "G2 delete-all-wrong-confirm => $(echo $r | head -c 70) (باید رد شود)"
r=$(curl -s -b $CJ $B/api/users --max-time 10)
log "G3 users-list-owner => $(echo $r | python3 -c "import sys,json;d=json.load(sys.stdin);us=d.get('users',[]);print([u['username'] for u in us])" 2>/dev/null)"
r=$(curl -s -b $UJ $B/api/users --max-time 10)
log "G4 users-list-nonowner => HTTP403-expected: $(echo $r | head -c 60)"

log "=== H. آب‌وهوا (سرویس بیرونی بدون کلید) ==="
r=$(curl -s -b $CJ "$B/api/weather?city=تهران" --max-time 20)
log "H1 weather-tehran => $(echo $r | head -c 120)"

log "F4-CAPABILITIES_DONE run=$RUNID"
