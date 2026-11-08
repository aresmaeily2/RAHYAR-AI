#!/usr/bin/env bash
# V1 بخش ۲ — اثبات زندهٔ رفع نقص‌های P6 (زمینهٔ یادآور) و P8 (لغو پس از ثبت فوری)
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
LOG=artifacts/logs/f8/voice-agent-fix-verify.log
CO=/tmp/f8-owner.jar
{
echo "===== V1-P2 FIX-VERIFY $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
OP=$(grep owner_password artifacts/credentials/f8-credentials.txt | cut -d= -f2)
rm -f $CO
curl -s -c $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 >/dev/null
echo "login ok"
chat(){ curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"message\":\"$1\"}" $B/api/chat --max-time 60; }
show(){ python3 -c "
import sys,json
d=json.load(sys.stdin)
am=d.get('assistantMessage',{})
print(' mode:', d.get('mode'), '| reply:', (am.get('content') or '')[:260])
"; }

echo "== [F0] پاک‌کردن تاریخچهٔ گمراه‌کننده (شروع مکالمهٔ تازه) =="
curl -s -b $CO -X DELETE $B/api/chat --max-time 15 | head -c 80; echo

echo "== [F1] اثبات رفع P6: پرسش برنامه فردا وقتی ۲ یادآور ثبت‌شده موجود است =="
curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
print(' DB reminders before:', [(r.get('message'), r.get('remindAt')) for r in rs])"
R=$(chat "فردا ساعت چند قرار دارم؟"); echo "$R" | show
echo " PASS-CRITERIA: reply must mention دکتر (09:00) or جلسه (14:00)"

echo "== [F2] اثبات رفع P8: ثبت فوری یادآور → «منصرف شدم» → حذف واقعی =="
B4=$(curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
print(len(rs))")
R=$(chat "برای فردا ساعت ۲ یادآوری کن جلسه مهم"); echo "$R" | show
A5=$(curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
print(len(rs)); import sys as s; print(' '.join(r.get('id','') for r in rs if 'جلسه' in (r.get('message') or '')), file=s.stderr)" 2>/tmp/v1-f2-id.txt)
echo " reminders: before=$B4 after-add=$A5 (added-id=$(cat /tmp/v1-f2-id.txt))"
R=$(chat "نه منصرف شدم"); echo "$R" | show
A6=$(curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
n=[r for r in rs if 'جلسه' in (r.get('message') or '')]
print(len(rs), 'rows-with-جلسه=', len(n))")
echo " reminders after-cancel: $A6 (expect same as before=$B4 and rows-with-جلسه=0)"
echo " PASS-CRITERIA: reply announces actual deletion AND rows-with-جلسه=0"

echo "== [F3] لغوِ بدون ثبتِ قبلی → پاسخ صادقانه (بدون دروغ و بدون حذف بی‌جهت) =="
R=$(chat "نه منصرف شدم"); echo "$R" | show
echo " (expect: no deletion of دکتر reminder; sane reply)"
curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
print(' reminders now:', [(r.get('message')[:20]) for r in rs])"

echo "===== V1-P2 FIX-VERIFY DONE $(date -u '+%H:%M:%S') ====="
} 2>&1 | tee "$LOG" | tail -40
