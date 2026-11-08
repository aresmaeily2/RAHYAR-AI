#!/usr/bin/env bash
# V1 بخش ۲ — سناریوهای کامل Agent صوتی با حساب مالی واقعی و شناسه‌های DB
# (ادامهٔ f8-voice-scenarios.sh — این بار: تأیید → نوشتن واقعی با اثبات شناسه رکورد)
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
LOG=artifacts/logs/f8/voice-agent-p2-scenarios.log
CO=/tmp/f8-owner.jar
{
echo "===== V1-P2 VOICE-AGENT SCENARIOS (with finance account) $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
OP=$(grep owner_password artifacts/credentials/f8-credentials.txt | cut -d= -f2)
rm -f $CO
curl -s -c $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 >/dev/null
echo "login ok"

chat(){ curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"message\":\"$1\"}" $B/api/chat --max-time 45; }
show(){ python3 -c "
import sys,json
d=json.load(sys.stdin)
am=d.get('assistantMessage',{})
print(' reply:', (am.get('content') or '')[:220])
acts=am.get('actions') or []
for a in acts:
    tid=(a.get('task') or {}).get('id') or (a.get('reminder') or {}).get('id') if isinstance(a.get('reminder'),dict) else None
    print(' action:', a.get('type'), 'ok=', a.get('ok'), 'taskId=', tid or (a.get('task') or {}).get('id'), 'reminderId=', (a.get('reminder') or {}).get('id') if isinstance(a.get('reminder'),dict) else None)
"; }
balance(){ curl -s -b $CO $B/api/finance/accounts --max-time 15 | python3 -c "
import sys,json;d=json.load(sys.stdin);accs=d if isinstance(d,list) else d.get('accounts',[])
print(' accounts:', [(a.get('name'), a.get('balance')) for a in accs])"; }
txs(){ curl -s -b $CO "$B/api/finance/transactions?limit=5" --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); ts=d if isinstance(d,list) else d.get('transactions',[])
print(' last-txs:', [(t.get('id')[:14] if t.get('id') else None, t.get('amount'), (t.get('description') or '')[:24]) for t in ts[:5]])"; }

echo "== [P1] ساخت حساب مالی آزمایشی «نقدی» با موجودی ۲٬۰۰۰٬۰۰۰ =="
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"نقدی","kind":"cash","openingAmount":2000000}' $B/api/finance/accounts --max-time 15 | head -c 160; echo
balance

echo "== [P2] «امروز ۱۵۰ هزار تومان برای خرید هزینه کردم» → پیشنهاد، بدون نوشتن =="
R=$(chat "امروز ۱۵۰ هزار تومان برای خرید هزینه کردم"); echo "$R" | show
balance

echo "== [P3] «بله» → نوشتن واقعی ۱۵۰٬۰۰۰ + شناسه تراکنش =="
R=$(chat "بله"); echo "$R" | show
balance
txs

echo "== [P4] «یک هزینه ۹۹۹ تومانی آزمایشی ثبت کن» سپس «منصرف شدم، ثبت نکن» → هیچ نوشتنی =="
R=$(chat "یک هزینه ۹۹۹ تومانی آزمایشی ثبت کن"); echo "$R" | show
R=$(chat "این هزینه را ثبت نکن، منصرف شدم"); echo "$R" | show
balance
curl -s -b $CO "$B/api/finance/transactions?limit=20" --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); ts=d if isinstance(d,list) else d.get('transactions',[])
n999=[t for t in ts if abs(int(t.get('amount',0)))==999]
print(' 999-amount rows =',len(n999),'(expect 0)')"

echo "== [P5] فرمان مبهم → درخواست توضیح از کاربر =="
R=$(chat "یه چیز بهم یادآوری کن"); echo "$R" | show

echo "== [P6] پرسش تکمیلی درباره فرمان قبلی (زمینه مکالمه) =="
R=$(chat "فردا ساعت چند قرار دارم؟"); echo "$R" | show
R=$(chat "خب اون را ۱۰ کن"); echo "$R" | show

echo "== [P7] وضعیت یادآور ثبت‌شده (S1) از روی DB =="
curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
print(' reminders count=',len(rs))
for r in rs: print('  id=',r.get('id'),'| msg=',r.get('message'),'| at=',r.get('remindAt'))"

echo "== [P8] لغو عملیات در حین مکالمه («منصرف شدم» بعد از پیشنهاد) =="
R=$(chat "برای فردا ساعت ۲ یادآوری کن جلسه مهم"); echo "$R" | show
R=$(chat "نه منصرف شدم"); echo "$R" | show
curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
n2=[r for r in rs if 'جلسه' in (r.get('message') or '')]
print(' reminders-with-جلسه =',len(n2),'(expect 0 — canceled)')"

echo "===== V1-P2 SCENARIOS DONE $(date -u '+%H:%M:%S') ====="
} 2>&1 | tee "$LOG" | tail -60
