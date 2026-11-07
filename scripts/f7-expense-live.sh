#!/usr/bin/env bash
# F7 — آزمون زندهٔ مسیر مالیِ فرمان صوتی/متنی (یافتهٔ F6: «هزینه ثبت کن» به Task می‌رفت)
# اثبات روی سرور واقعی :3001 با DB تازه: پیشنهاد → بدون نوشتن → تأیید → نوشتن واقعی
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
CO=/tmp/f6-owner.jar
CU=/tmp/f6-user.jar
J='-H Content-Type:application/json'
{
echo "===== F7-EXPENSE-LIVE $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="

OP=$(grep owner_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
UP=$(grep user_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
curl -s -c $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 >/dev/null
curl -s -c $CU -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"user\",\"password\":\"$UP\"}" $B/api/auth/login --max-time 15 >/dev/null
echo "login done"

echo "== [1] two accounts =="
A1=$(curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"بانک ملت","kind":"bank","openingAmount":1000000}' $B/api/finance/accounts --max-time 15)
A2=$(curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"نقدی","kind":"cash","openingAmount":500000}' $B/api/finance/accounts --max-time 15)
echo "$A1" | head -c 160; echo; echo "$A2" | head -c 160; echo
A1ID=$(echo "$A1" | python3 -c "import sys,json;print(json.load(sys.stdin)['account']['id'])")
A2ID=$(echo "$A2" | python3 -c "import sys,json;print(json.load(sys.stdin)['account']['id'])")
echo "A1=$A1ID A2=$A2ID"

echo "== [2] REGRESSION: «هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن» → پیشنهاد تأیید (نه Task، نه نوشتن) =="
sleep 7
R=$(sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن"}' $B/api/chat --max-time 30)
echo "$R" | python3 -c "
import sys,json
d=json.load(sys.stdin)
am=d.get('assistantMessage',{})
print('reply:', (am.get('content') or '')[:180])
acts=am.get('actions') or []
print('actions:', [a.get('type') for a in acts])"
TASKS=$(curl -s -b $CO $B/api/tasks --max-time 15)
echo "task-count=$(echo "$TASKS" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d if isinstance(d,list) else d.get('tasks',[])))") (expect 0)"
TXC=$(curl -s -b $CO $B/api/finance/transactions --max-time 15)
echo "tx-count=$(echo "$TXC" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d if isinstance(d,list) else d.get('transactions',[])))") (expect 0)"

echo "== [3] تأیید «بله» → نوشتن واقعی ۷۰۰۰۰۰ در حساب اول =="
sleep 7
R=$(sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"بله"}' $B/api/chat --max-time 30)
echo "$R" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('reply:', (d.get('assistantMessage',{}).get('content') or '')[:180])"
curl -s -b $CO $B/api/finance/transactions --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); t=d if isinstance(d,list) else d.get('transactions',[])
print('tx-count=',len(t),'expect 1')
for x in t: print(' tx:',x.get('type'),x.get('amount'),(x.get('note') or '')[:30])"

echo "== [4] چندحسابی: پیشنهاد جدید → تأیید بدون نام حساب → دوباره‌پرسی → تأیید با نام =="
sleep 7
R=$(sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"هزینه ۵۰ هزار تومانی بنزین ثبت کن"}' $B/api/chat --max-time 30)
echo "$R" | python3 -c "
import sys,json;d=json.load(sys.stdin);print('reply:',(d.get('assistantMessage',{}).get('content') or '')[:200])"
sleep 7
R=$(sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"بله"}' $B/api/chat --max-time 30)
echo "$R" | python3 -c "
import sys,json;d=json.load(sys.stdin);print('reply:',(d.get('assistantMessage',{}).get('content') or '')[:200])"
sleep 7
R=$(sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"بله، نقدی"}' $B/api/chat --max-time 30)
echo "$R" | python3 -c "
import sys,json;d=json.load(sys.stdin);print('reply:',(d.get('assistantMessage',{}).get('content') or '')[:200])"
curl -s -b $CO "$B/api/finance/accounts" --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); accs=d if isinstance(d,list) else d.get('accounts',[])
for a in accs: print(' account:',a.get('name'),'balance=',a.get('balance'))"

echo "== [5] انصراف → هیچ نوشتنی =="
sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"هزینه ۹۹۹ تومانی تست ثبت کن"}' $B/api/chat --max-time 30 > /dev/null
sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"انصراف"}' $B/api/chat --max-time 30 | python3 -c "
import sys,json;d=json.load(sys.stdin);print('reply:',(d.get('assistantMessage',{}).get('content') or '')[:120])"
curl -s -b $CO $B/api/finance/transactions --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); t=d if isinstance(d,list) else d.get('transactions',[])
print('tx-count=',len(t),'(expect 2 — no 999 write)')"

echo "== [6] درآمد: «درآمد ۲ میلیون تومان ثبت کن» → تأیید → income ۲٬۰۰۰٬۰۰۰ =="
sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"درآمد ۲ میلیون تومان حقوق ثبت کن"}' $B/api/chat --max-time 30 > /dev/null
sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"تأیید"}' $B/api/chat --max-time 30 | python3 -c "
import sys,json;d=json.load(sys.stdin);print('reply:',(d.get('assistantMessage',{}).get('content') or '')[:160])"
curl -s -b $CO $B/api/finance/transactions --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); t=d if isinstance(d,list) else d.get('transactions',[])
inc=[x for x in t if x.get('type')=='income']
print('income-rows=',len(inc),'amount=',inc[0].get('amount') if inc else None)"

echo "== [7] رگرسیون ثبت کار: «یک کار جدید برای خرید نان بساز» → Task (نه مالی) =="
sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"یک کار جدید برای خرید نان بساز"}' $B/api/chat --max-time 30 | python3 -c "
import sys,json;d=json.load(sys.stdin);am=d.get('assistantMessage',{});print('reply:',(am.get('content') or '')[:120],'actions:',[a.get('type') for a in (am.get('actions') or [])])"
curl -s -b $CO $B/api/tasks --max-time 15 | python3 -c "
import sys,json;d=json.load(sys.stdin);t=d if isinstance(d,list) else d.get('tasks',[]);print('task-count=',len(t),(t[0].get('title') if t else ''))"

echo "== [8] کاربر عادی: جداسازی داده — هزینهٔ user جدا از owner است =="
R=$(sleep 7
curl -s -b $CU -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"هزینه ۱۰۰ تومان تست کاربر ثبت کن"}' $B/api/chat --max-time 30)
echo "$R" | python3 -c "
import sys,json;d=json.load(sys.stdin);print('user-reply:',(d.get('assistantMessage',{}).get('content') or '')[:120])"

echo "== [9] SSE stream route — همان چرخه روی مسیر stream =="
sleep 7
curl -s -N -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"هزینه ۳۰ هزار تومانی تاکسی ثبت کن"}' $B/api/chat/stream --max-time 30 | grep -o '"reply":"[^"]*"' | head -2
sleep 7
curl -s -N -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"بله"}' $B/api/chat/stream --max-time 30 | grep -o '"reply":"[^"]*"' | head -2

echo "== [10] تک‌حسابی (user): ساخت حساب → پیشنهاد → تأیید «بله» → نوشتن خودکار همان حساب =="
UPC=$(curl -s -b $CU -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"کیف پول","kind":"cash","openingAmount":200000}' $B/api/finance/accounts --max-time 15)
echo "$UPC" | head -c 120; echo
sleep 7
curl -s -b $CU -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"هزینه ۱۵۰ هزار تومان قبض برق ثبت کن"}' $B/api/chat --max-time 30 | python3 -c "
import sys,json;d=json.load(sys.stdin);print('proposal:',(d.get('assistantMessage',{}).get('content') or '')[:160])"
sleep 7
curl -s -b $CU -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"بله"}' $B/api/chat --max-time 30 | python3 -c "
import sys,json;d=json.load(sys.stdin);print('confirm:',(d.get('assistantMessage',{}).get('content') or '')[:160])"
curl -s -b $CU $B/api/finance/transactions --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); t=d if isinstance(d,list) else d.get('transactions',[])
print('user-tx-count=',len(t),'expect 1')
for x in t: print(' tx:',x.get('type'),x.get('amount'),(x.get('note') or '')[:30])"

echo "== [11] رگرسیون ویرگول فارسی: «بله، بانک ملت» → تأیید چندحسابی (فیکس U+060C) =="
sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"هزینه ۸۰ هزار تومانی رستوران ثبت کن"}' $B/api/chat --max-time 30 > /dev/null
sleep 7
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"بله، بانک ملت"}' $B/api/chat --max-time 30 | python3 -c "
import sys,json;d=json.load(sys.stdin);print('confirm:',(d.get('assistantMessage',{}).get('content') or '')[:160])"
curl -s -b $CO $B/api/finance/transactions --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); t=d if isinstance(d,list) else d.get('transactions',[])
print('owner-tx-count=',len(t),'(≥1)')
for x in t: print(' tx:',x.get('type'),x.get('amount'),(x.get('note') or '')[:30])"

echo "== [12] تطبیق عددی نهایی: ماندهٔ حساب‌ها = صورت‌جمع تراکنش‌ها =="
curl -s -b $CO "$B/api/finance/accounts" --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); accs=d if isinstance(d,list) else d.get('accounts',[])
tot=0
for a in accs: print(' account:',a.get('name'),'balance=',a.get('balance')); tot+=a.get('balance') or 0
print('net-balance=',tot)"
curl -s -b $CO $B/api/finance/transactions --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); t=d if isinstance(d,list) else d.get('transactions',[])
inc=sum(x.get('amount') for x in t if x.get('type')=='income')
exp=sum(x.get('amount') for x in t if x.get('type')=='expense')
print('sum-income=',inc,'sum-expense=',exp,'net=',inc-exp)"

echo "===== F7-EXPENSE-LIVE-DONE ====="
} 2>&1 | tee artifacts/logs/f7/expense-live.log | tail -60
