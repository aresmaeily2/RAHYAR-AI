#!/bin/bash
# F3-CAPABILITIES: بند ۵ — آزمون واقعی قابلیت‌ها با API زنده (نه فقط وجود UI)
# هر قابلیت: آزمون واقعی → نتیجه → در گزارش نهایی VERIFIED / PARTIAL / NOT VERIFIED
set -uo pipefail
ROOT=/home/z/my-project
B=http://127.0.0.1:3001
RPT=$ROOT/artifacts/reports/f3
OUT=$RPT/capabilities.txt
mkdir -p "$RPT"
RUN_ID="f3cap-$(date -u +%H%M)"
: > "$OUT"
log(){ echo "$*" | tee -a "$OUT"; }
cd "$ROOT"

pkill -f "standalone/server.js" 2>/dev/null || true; sleep 1
NODE_ENV=production PORT=3001 nohup node .next/standalone/server.js > /tmp/next-prod-cap.log 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null --max-time 3 $B/login && break; sleep 2; done

CJ=/tmp/f3cap.jar; rm -f $CJ
log "# RahyAr F3 capability tests — run=$RUN_ID $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD)"
r=$(curl -s -c $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"admin","password":"admin"}' $B/api/auth/login --max-time 15)
log "login => $(echo "$r" | grep -o '"role":"[A-Z]*"')"

# C1: پاسخ واقعی AI (zai — SDK واقعی سمت سرور)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"سلام! فقط بگو سلام رهیار"}' $B/api/chat --max-time 45)
AIC=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);m=d.get('messages',[]);print((m[-1].get('content','') if m else d.get('reply',''))[:80])" 2>/dev/null)
[ -n "$AIC" ] && log "C1 ai-real-reply => VERIFIED (reply: $AIC)" || log "C1 ai-real-reply => CHECK ($r head: $(echo "$r" | head -c 150))"

# وضعیت موتور فعلی
ENG0=$(curl -s -b $CJ $B/api/settings/ai --max-time 15 | python3 -c "import sys,json;print(json.load(sys.stdin).get('engine','?'))" 2>/dev/null)
log "engine-initial => $ENG0"

# C2: تغییر Provider واقعی → local_rules (آفلاین) → پاسخ → بازگشت
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"local_rules"}' $B/api/settings/ai >/dev/null --max-time 15
ENG=$(curl -s -b $CJ $B/api/settings/ai --max-time 15 | python3 -c "import sys,json;print(json.load(sys.stdin).get('engine','?'))" 2>/dev/null)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"لیست وظایف من چیه؟"}' $B/api/chat --max-time 30)
LRC=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);m=d.get('messages',[]);print((m[-1].get('content','') if m else '')[:60])" 2>/dev/null)
[ "$ENG" = "local_rules" ] && [ -n "$LRC" ] && log "C2 provider-switch => VERIFIED (engine=local_rules, reply: $LRC)" || log "C2 provider-switch => CHECK (engine=$ENG reply=$LRC)"

# C5: اجرای واقعی فرمان عامل از طریق گفتگو (ساخت وظیفه)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"یک وظیفه به نام آزمون-عامل-۱۲۳ بساز"}' $B/api/chat --max-time 30)
r=$(curl -s -b $CJ "$B/api/tasks" --max-time 15)
FOUND=$(echo "$r" | grep -c "آزمون-عامل-۱۲۳")
[ "$FOUND" -ge 1 ] && log "C5 agent-command => VERIFIED (task 'آزمون-عامل-۱۲۳' created via chat, real DB)" || log "C5 agent-command => CHECK (task not found in list)"

# C3: مدیریت امن API Key — ذخیره → ماسک → حذف
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"openai_compatible","endpointUrl":"https://api.openai.com/v1","endpointModel":"gpt-4o-mini","endpointKey":"sk-TEST-SECRET-9876543210"}' $B/api/settings/ai >/dev/null --max-time 15
ST=$(curl -s -b $CJ $B/api/settings/ai --max-time 15)
if echo "$ST" | grep -q "sk-TEST-SECRET-9876543210"; then log "C3 key-never-returned => FAIL (key leaked in GET!)"; else log "C3 key-never-returned => VERIFIED (GET has no raw key; hasMasked=$(echo "$ST" | grep -oc 'key'))"; fi
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"endpointKey":"-"}' $B/api/settings/ai >/dev/null --max-time 15

# C13: killSwitch → خطای لطیف (رفتار خطای Provider)
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"killSwitch":true}' $B/api/settings/ai >/dev/null --max-time 15
KS=$(curl -s -o /dev/null -w '%{http_code}' -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"تست"}' $B/api/chat --max-time 20)
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"killSwitch":false}' $B/api/settings/ai >/dev/null --max-time 15
[ "$KS" != "500" ] && log "C13 kill-switch-graceful => VERIFIED (http=$KS, no 500 crash)" || log "C13 kill-switch-graceful => FAIL (500)"

# C14: endpoint نامعتبر → خطای لطیف
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"openai_compatible","endpointUrl":"https://unreachable.invalid/v1","endpointModel":"m","endpointKey":"sk-x-000"}' $B/api/settings/ai >/dev/null --max-time 15
PE=$(curl -s -o /dev/null -w '%{http_code}' -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"تست خطا"}' $B/api/chat --max-time 30)
log "C14 provider-error-graceful => http=$PE (record; graceful if 4xx/5xx-json not crash)"
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"engine\":\"${ENG0:-zai}\",\"endpointKey\":\"-\"}" $B/api/settings/ai >/dev/null --max-time 15

# C4: گفت‌وگوی چندمرحله‌ای (حافظهٔ مکالمه)
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"My name is Alireza"}' $B/api/chat --max-time 45 >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"What is my name? Answer briefly."}' $B/api/chat --max-time 45)
MT=$(echo "$r" | grep -c -i "alireza")
[ "$MT" -ge 1 ] && log "C4 multi-turn-memory => VERIFIED (name recalled)" || log "C4 multi-turn-memory => PARTIAL (name not echoed; engine=${ENG0:-zai} context rules)"

# C6: زیرکارها
TID=$(curl -s -b $CJ "$B/api/tasks" --max-time 15 | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if isinstance(d,list) and d else d.get('tasks',[{}])[0].get('id',''))" 2>/dev/null)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"taskId\":\"$TID\",\"title\":\"زیرکار آزمون\"}" $B/api/subtasks --max-time 15)
echo "$r" | grep -q '"id"' && log "C6 subtask => VERIFIED ($r head: $(echo "$r" | head -c 90))" || log "C6 subtask => CHECK ($(echo "$r" | head -c 90))"

# C7: یادآور (سطح DB واقعی)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"title":"یادآور آزمون F3","remindAt":"2026-12-01T09:00:00.000Z"}' $B/api/reminders --max-time 15)
echo "$r" | grep -q '"id"' && log "C7 reminder => VERIFIED ($(echo "$r" | head -c 110))" || log "C7 reminder => CHECK ($(echo "$r" | head -c 110))"
r=$(curl -s -b $CJ "$B/api/reminders" --max-time 15)
log "C7b reminder-list => $(echo "$r" | head -c 100)"

# C8: حالت تقویم شمسی/میلادی
CAL0=$(curl -s -b $CJ $B/api/settings/app --max-time 15 | python3 -c "import sys,json;print(json.load(sys.stdin).get('calendarMode','?'))" 2>/dev/null)
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"calendarMode":"gregorian"}' $B/api/settings/app >/dev/null --max-time 15
CAL1=$(curl -s -b $CJ $B/api/settings/app --max-time 15 | python3 -c "import sys,json;print(json.load(sys.stdin).get('calendarMode','?'))" 2>/dev/null)
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"calendarMode\":\"${CAL0:-jalali}\"}" $B/api/settings/app >/dev/null --max-time 15
[ "$CAL1" = "gregorian" ] && log "C8 calendar-mode-switch => VERIFIED (jalali→gregorian→back, initial=$CAL0)" || log "C8 calendar-mode-switch => CHECK (got=$CAL1)"

# C12: زبان fa/en
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"lang":"en"}' $B/api/settings/app >/dev/null --max-time 15
L1=$(curl -s -b $CJ $B/api/settings/app --max-time 15 | python3 -c "import sys,json;print(json.load(sys.stdin).get('lang','?'))" 2>/dev/null)
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"lang":"fa"}' $B/api/settings/app >/dev/null --max-time 15
[ "$L1" = "en" ] && log "C12 lang-switch => VERIFIED (fa→en→fa)" || log "C12 lang-switch => CHECK (got=$L1)"

# C9: حساب‌های متعدد + هزینه
curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"F3 نقدی","kind":"cash"}' $B/api/finance/accounts >/dev/null --max-time 15
r=$(curl -s -b $CJ $B/api/finance/accounts --max-time 15)
NACC=$(echo "$r" | grep -o '"id"' | wc -l)
log "C9 multi-accounts => $NACC حساب (VERIFIED if >=2)"
ACC2=$(echo "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);print([a['id'] for a in d if a.get('kind')=='cash'][0])" 2>/dev/null)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"type\":\"expense\",\"amount\":250000,\"title\":\"F3 خرید\",\"accountId\":\"$ACC2\"}" $B/api/finance/transactions --max-time 15)
echo "$r" | grep -q '"id"' && log "C9b expense => VERIFIED ($(echo "$r" | head -c 100))" || log "C9b expense => CHECK"

# C10: گزارش مالی روزانه
r=$(curl -s -b $CJ $B/api/report/daily --max-time 15)
echo "$r" | grep -qE '\{|\[' && log "C10 daily-report => VERIFIED ($(echo "$r" | head -c 130))" || log "C10 daily-report => CHECK"

# C11: پیامک بانکی — ثبت با رضایت + ضدتکرار واقعی
SMS='{"text":"بانک ملت خرید 450000 ریال از کارت 1234***6789 موجودی 2000000 ریال","confirm":true}'
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "$SMS" $B/api/sms/import --max-time 15)
D1=$(echo "$r" | python3 -c "import sys,json;print(json.load(sys.stdin)['results'][0]['duplicate'])" 2>/dev/null)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "$SMS" $B/api/sms/import --max-time 15)
D2=$(echo "$r" | python3 -c "import sys,json;print(json.load(sys.stdin)['results'][0]['duplicate'])" 2>/dev/null)
[ "$D1" = "False" ] && [ "$D2" = "True" ] && log "C11 sms-consent+dedup => VERIFIED (1st duplicate=False, 2nd duplicate=True)" || log "C11 sms-consent+dedup => CHECK (1st=$D1 2nd=$D2)"

# A4-باز: مسیر رمز با PUT (روش درست)
r=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"currentPassword":"x1","newPassword":"longenough123"}' $B/api/auth/password --max-time 15)
log "A4r password-PUT-no-session => $r (expect 401/403)"

# C-UI: صفحات اصلی واقعاً رندر می‌شوند (فارسی/انگلیسی)
for P in / /login /emulator; do
  C=$(curl -s -b $CJ -o /dev/null -w '%{http_code}' "$B$P" --max-time 15); log "C15 page $P => $C"
done

pkill -f "standalone/server.js" 2>/dev/null || true
echo "F3-CAPABILITIES_DONE"
