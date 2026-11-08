#!/usr/bin/env bash
# V1 — اثبات زندهٔ بخش ۴ مأموریت: متن فرمان صوتی → Agent واقعی → DB واقعی
# (متنی معادل خروجی STT است؛ STT روی دستگاه = BLOCKED صادقانه — این اسکریپت فقط
#  «بعد از متن» چرخه را اثبات می‌کند: Agent → ابزار → DB → پاسخ)
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
LOG=artifacts/logs/f8/voice-agent-scenarios.log
CO=/tmp/f8-owner.jar
{
echo "===== V1 VOICE-AGENT SCENARIOS $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
OP=$(grep owner_password artifacts/credentials/f8-credentials.txt | cut -d= -f2)
rm -f $CO
curl -s -c $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 >/dev/null
echo "login ok"

chat(){ curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"message\":\"$1\"}" $B/api/chat --max-time 45; }
show(){ python3 -c "
import sys,json
d=json.load(sys.stdin)
am=d.get('assistantMessage',{})
print(' reply:', (am.get('content') or '')[:200])
acts=am.get('actions') or []
print(' actions:', [(a.get('type'), a.get('ok'), (a.get('task') or {}).get('title',''), (a.get('reminder') or {}).get('message','') if isinstance(a.get('reminder'),dict) else a.get('reminder')) for a in acts])
"; }

echo "== [S1] «برای فردا ساعت ۹ یادآوری کن با دکتر تماس بگیرم» =="
R=$(chat "برای فردا ساعت ۹ یادآوری کن با دکتر تماس بگیرم"); echo "$R" | show
echo "-- reminders after S1:"
curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
print(' count=',len(rs))
for r in rs[:3]: print('  reminder:', r.get('message'), '| at=', r.get('remindAt') or r.get('at'))"

echo "== [S2] «امروز ۱۵۰ هزار تومان برای خرید هزینه کردم» → پیشنهاد (بدون نوشتن) =="
B0=$(curl -s -b $CO $B/api/finance/accounts --max-time 15 | python3 -c "
import sys,json;d=json.load(sys.stdin);accs=d if isinstance(d,list) else d.get('accounts',[]);print(sum(a.get('balance',0) for a in accs))")
R=$(chat "امروز ۱۵۰ هزار تومان برای خرید هزینه کردم"); echo "$R" | show
B1=$(curl -s -b $CO $B/api/finance/accounts --max-time 15 | python3 -c "
import sys,json;d=json.load(sys.stdin);accs=d if isinstance(d,list) else d.get('accounts',[]);print(sum(a.get('balance',0) for a in accs))")
echo " balance-before=$B0 after-proposal=$B1 (must be equal — no write before confirm)"

echo "== [S3] تأیید «بله» → نوشتن واقعی ۱۵۰٬۰۰۰ =="
R=$(chat "بله"); echo "$R" | show
B2=$(curl -s -b $CO $B/api/finance/accounts --max-time 15 | python3 -c "
import sys,json;d=json.load(sys.stdin);accs=d if isinstance(d,list) else d.get('accounts',[]);print(sum(a.get('balance',0) for a in accs))")
echo " balance-after-confirm=$B2 (must be $B1-150000)"

echo "== [S4] «این هزینه را ثبت نکن، منصرف شدم» → هیچ نوشتنی =="
R=$(chat "یک هزینه ۹۹۹ تومانی آزمایشی ثبت کن"); echo "$R" | show
R=$(chat "این هزینه را ثبت نکن، منصرف شدم"); echo "$R" | show
B3=$(curl -s -b $CO $B/api/finance/accounts --max-time 15 | python3 -c "
import sys,json;d=json.load(sys.stdin);accs=d if isinstance(d,list) else d.get('accounts',[]);print(sum(a.get('balance',0) for a in accs))")
echo " balance=$B3 (no 999 write anywhere)"
curl -s -b $CO $B/api/finance/transactions --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); txs=d if isinstance(d,list) else d.get('transactions',[])
n999=[t for t in txs if int(t.get('amount',0))==999]
print(' 999-amount rows =',len(n999),'(expect 0)')"

echo "== [S5] «فهرست کارهای فردای من را بخوان» =="
R=$(chat "فهرست کارهای فردای من را بخوان"); echo "$R" | show

echo "== [S6] «برنامه‌ام را برای فردا مرتب کن» =="
R=$(chat "برنامه‌ام را برای فردا مرتب کن"); echo "$R" | show

echo "== [S7] تنظیمات صوتی: زبان + سرعت (اعتبارسنجی) =="
curl -s -b $CO -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"voiceRate":1.5,"voiceLang":"en"}' $B/api/settings/app --max-time 15 | python3 -c "import sys,json;d=json.load(sys.stdin);print(' after-PUT: rate=',d.get('voiceRate'),'lang=',repr(d.get('voiceLang')))"
curl -s -b $CO -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"voiceRate":9.9}' $B/api/settings/app --max-time 15 -o /tmp/v1-rate.json -w ' invalid-rate http=%{http_code}\n'; head -c 120 /tmp/v1-rate.json; echo
curl -s -b $CO -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"voiceRate":1,"voiceLang":""}' $B/api/settings/app --max-time 15 | python3 -c "import sys,json;d=json.load(sys.stdin);print(' reset: rate=',d.get('voiceRate'),'lang=',repr(d.get('voiceLang')))"
echo "===== V1 VOICE-AGENT SCENARIOS DONE ====="
} 2>&1 | tee "$LOG" | tail -45
