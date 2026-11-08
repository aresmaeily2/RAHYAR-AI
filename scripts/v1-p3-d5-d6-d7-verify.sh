#!/usr/bin/env bash
# V1-P3 — اثبات زندهٔ رفع D-5 (استقلال pendingها)، D-6 (نشت JSON خام)، D-7 (گارد صداقت)
# هر گام: درخواست → HTTP status → پاسخ Agent → DB قبل/بعد با شناسهٔ دقیق → Pass/Fail
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
LOG=artifacts/logs/f8/v1-p3-verify.log
EV=artifacts/logs/f8/v1-p3-evidence.log
CO=/tmp/f8-owner.jar
C2=/tmp/f8-user2.jar
OP=$(awk -F= '/^owner_password=/{print $2}' artifacts/credentials/f8-credentials.txt)
UP=$(awk -F= '/^user2_password=/{print $2}' artifacts/credentials/f8-credentials.txt)
: "${OP:?credentials missing}" "${UP:?credentials missing}"
mkdir -p artifacts/logs/f8
if [ -f "$EV" ]; then mv "$EV" "$EV.$(date -u '+%Y%m%d-%H%M%S').history"; fi

EV_LINE(){ echo "[$(date -u '+%H:%M:%S')] $*" >> "$EV"; }
LASTHTTP=/tmp/v1p3-last-http.txt
chat(){ # $1=jar $2=message → mode|reply؛ HTTP در $LASTHTTP
  local tmp; tmp=$(mktemp)
  local code try
  for try in 1 2 3; do
    code=$(curl -s -b "$1" -o "$tmp" -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
      -d "{\"message\":\"$2\"}" $B/api/chat --max-time 90)
    [ "$code" != "429" ] && break
    echo " (429 — waiting 32s, attempt $try)" >&2
    sleep 32
  done
  echo "$code" > "$LASTHTTP"
  local resp; resp=$(cat "$tmp"); rm -f "$tmp"
  python3 -c "
import json,sys
try:
  d=json.loads(sys.stdin.read())
  am=d.get('assistantMessage') or {}
  err=d.get('error')
  print('mode=%s%s | %s' % (d.get('mode'), (' ERR='+str(err)) if err else '', (am.get('content') or '').replace(chr(10),' ')[:280]))
except Exception as e:
  print('BAD-JSON', e)" <<< "$resp"
}
httpcode(){ cat "$LASTHTTP"; }
memcount(){ bun scripts/v1-p3-memory-setup.ts count 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin)['count'])"; }
memhas(){ bun scripts/v1-p3-memory-setup.ts list 2>/dev/null | python3 -c "
import sys,json
rows=json.load(sys.stdin)['rows']
print(len([r for r in rows if '$1' in r['fact']]))"; }
PASSFAIL(){ EV_LINE "verdict=$1  $2"; echo "  → $1: $2"; }
login(){ curl -s -c "$2" -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"$1\",\"password\":\"$3\"}" $B/api/auth/login --max-time 15; }

{
echo "===== V1-P3 D5/D6/D7 LIVE VERIFY $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
EV_LINE "===== RUN head=$(git rev-parse --short HEAD) ====="

RS=$(bun scripts/v1-p2-reset-test-state.ts 2>&1 | tail -1)
echo "== [S0] reset: $RS"; EV_LINE "S0 reset=$RS"
echo "== [S1] owner login http=$(login owner $CO $OP) / user2 login http=$(login testuser2 $C2 $UP)"; EV_LINE "S1 logins"
curl -s -b $CO -X DELETE $B/api/chat --max-time 15 >/dev/null; curl -s -b $C2 -X DELETE $B/api/chat --max-time 15 >/dev/null
echo "== [S2] history cleared (owner+user2)"; EV_LINE "S2 clear"

echo "== [T1] تأییدِ تازه کار می‌کند — لِین فراموشی قطعی =="
bun scripts/v1-p3-memory-setup.ts add "یادداشت-آزمون-V1P3 رنگ ماشین" >/tmp/v1p3-t1.json
MEM1=$(python3 -c "import json;print(json.load(open('/tmp/v1p3-t1.json'))['id'])")
B1=$(memcount); echo " memory before=$B1 id=$MEM1"; EV_LINE "T1 mem_before=$B1 id=$MEM1"
R=$(chat $CO "«یادداشت-آزمون-V1P3 رنگ ماشین» را فراموش کن")
echo " proposal http=$(httpcode) $R"; EV_LINE "T1a http=$(httpcode) reply=$R"
R=$(chat $CO "بله")
echo " confirm  http=$(httpcode) $R"; EV_LINE "T1b http=$(httpcode) reply=$R"
A1=$(memcount)
echo " memory after=$A1 (expect 0)"; EV_LINE "T1 mem_after=$A1"
[ "$A1" = "0" ] && PASSFAIL PASS "T1 fresh confirm consumed ONLY this pending — exact memory deleted" || PASSFAIL FAIL "T1 memory not deleted (count=$A1)"

echo "== [T2] تأییدِ روی پیشنهادِ کهنه — هرگز اجرا نمی‌شود (هستهٔ D-5) =="
bun scripts/v1-p3-memory-setup.ts add "یادداشت-کهنه-V1P3" >/tmp/v1p3-t2.json
MEM2=$(python3 -c "import json;print(json.load(open('/tmp/v1p3-t2.json'))['id'])")
B2=$(memhas "یادداشت-کهنه-V1P3"); echo " canary before=$B2 id=$MEM2"; EV_LINE "T2 canary_before=$B2 id=$MEM2"
R=$(chat $CO "«یادداشت-کهنه-V1P3» را فراموش کن")
echo " proposal  http=$(httpcode) $R"; EV_LINE "T2a http=$(httpcode) reply=$R"
R=$(chat $CO "فهرست کارهای من را بخوان")
echo " intervene http=$(httpcode) $R"; EV_LINE "T2b (intervening message) http=$(httpcode) reply=$R"
R=$(chat $CO "بله")
echo " stale-confirm http=$(httpcode) $R"; EV_LINE "T2c http=$(httpcode) reply=$R"
A2=$(memhas "یادداشت-کهنه-V1P3")
STALEREPLY=0; echo "$R" | rg -q "دیگر معتبر نیست|دوباره مطرح" && STALEREPLY=1
echo " canary after=$A2 (expect 1) stale_reply=$STALEREPLY (expect 1)"; EV_LINE "T2 canary_after=$A2 stale_reply=$STALEREPLY"
if [ "$A2" = "1" ] && [ "$STALEREPLY" = "1" ]; then
  PASSFAIL PASS "T2 stale confirm did NOT execute the old pending — honest discard, canary intact"
else
  PASSFAIL FAIL "T2 stale pending executed or dishonest reply (canary=$A2 staleReply=$STALEREPLY)"
fi

echo "== [T3] پس از پاکسازی، تأییدِ تازه دوباره کار می‌کند =="
R=$(chat $CO "\"یادداشت-کهنه-V1P3\" را فراموش کن"); echo " proposal http=$(httpcode) $R"; EV_LINE "T3a http=$(httpcode) reply=$R"
R=$(chat $CO "بله"); echo " confirm  http=$(httpcode) $R"; EV_LINE "T3b http=$(httpcode) reply=$R"
A3=$(memhas "یادداشت-کهنه-V1P3")
echo " canary after=$A3 (expect 0)"; EV_LINE "T3 canary_after=$A3"
[ "$A3" = "0" ] && PASSFAIL PASS "T3 fresh confirm after stale-clear works — same request re-proposed and executed" || PASSFAIL FAIL "T3 canary=$A3"

echo "== [T4] دو pending از دو نوع — جانشینی و لغو، بدون حذفِ دیگری =="
bun scripts/v1-p3-memory-setup.ts add "یادداشت-جانشین-V1P3" >/tmp/v1p3-t4.json
HTTP=$(curl -s -b $CO -o /tmp/v1p3-task.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"title":"کار-جانشین-V1P3","priority":2}' $B/api/tasks --max-time 15)
TASK1=$(python3 -c "import json;print(json.load(open('/tmp/v1p3-task.json')).get('task',{}).get('id') or json.load(open('/tmp/v1p3-task.json')).get('id',''))" 2>/dev/null)
echo " task created http=$HTTP id=$TASK1"; EV_LINE "T4 task http=$HTTP id=$TASK1"
R=$(chat $CO "«یادداشت-جانشین-V1P3» را فراموش کن"); echo " forget-pending http=$(httpcode) $R"; EV_LINE "T4a http=$(httpcode) reply=$R"
R=$(chat $CO "کار «کار-جانشین-V1P3» را حذف کن"); echo " delete-req    http=$(httpcode) $R"; EV_LINE "T4b http=$(httpcode) reply=$R"
R=$(chat $CO "انصراف"); echo " cancel        http=$(httpcode) $R"; EV_LINE "T4c http=$(httpcode) reply=$R"
TASKALIVE=$(curl -s -b $CO $B/api/tasks --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
ts=d if isinstance(d,list) else d.get('tasks',[])
print(len([t for t in ts if t.get('id')=='$TASK1' or t.get('title')=='کار-جانشین-V1P3']))")
MEM3=$(memhas "یادداشت-جانشین-V1P3")
echo " task alive=$TASKALIVE (expect 1) memory alive=$MEM3 (expect 1)"; EV_LINE "T4 task_alive=$TASKALIVE mem_alive=$MEM3"
HONESTC=0; echo "$R" | rg -q "هیچ تغییری اعمال نشد|لغو" && HONESTC=1
if [ "$TASKALIVE" = "1" ] && [ "$MEM3" = "1" ] && [ "$HONESTC" = "1" ]; then
  PASSFAIL PASS "T4 cancel touched only the latest pending — task AND memory both intact, honest reply"
else
  PASSFAIL FAIL "T4 side deletion or dishonest cancel (task=$TASKALIVE mem=$MEM3 honest=$HONESTC)"
fi
R=$(chat $CO "بله"); echo " confirm-after-cancel http=$(httpcode) $R"; EV_LINE "T4d http=$(httpcode) reply=$R"
TASKALIVE2=$(curl -s -b $CO $B/api/tasks --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
ts=d if isinstance(d,list) else d.get('tasks',[])
print(len([t for t in ts if t.get('id')=='$TASK1' or t.get('title')=='کار-جانشین-V1P3']))")
echo " task still alive=$TASKALIVE2 (expect 1 — no pending left to execute)"; EV_LINE "T4d task_alive=$TASKALIVE2"
[ "$TASKALIVE2" = "1" ] && PASSFAIL PASS "T4d bare confirm with no pending deleted nothing" || PASSFAIL FAIL "T4d task deleted without pending (task=$TASKALIVE2)"

echo "== [T5] دو کاربر — pending هر کاربر فقط همان کاربر =="
bun scripts/v1-p3-memory-setup.ts add "یادداشت-مالکیت-V1P3" >/tmp/v1p3-t5.json
MEM4=$(python3 -c "import json;print(json.load(open('/tmp/v1p3-t5.json'))['id'])")
R=$(chat $CO "«یادداشت-مالکیت-V1P3» را فراموش کن"); echo " owner proposal http=$(httpcode) $R"; EV_LINE "T5a http=$(httpcode) reply=$R"
R=$(chat $C2 "بله"); echo " user2 confirm  http=$(httpcode) $R"; EV_LINE "T5b (user2) http=$(httpcode) reply=$R"
O1=$(memhas "یادداشت-مالکیت-V1P3")
echo " owner memory after user2-confirm=$O1 (expect 1)"; EV_LINE "T5 owner_mem=$O1"
R=$(chat $CO "بله"); echo " owner confirm  http=$(httpcode) $R"; EV_LINE "T5c http=$(httpcode) reply=$R"
O2=$(memhas "یادداشت-مالکیت-V1P3")
echo " owner memory after owner-confirm=$O2 (expect 0)"; EV_LINE "T5 owner_mem_final=$O2"
if [ "$O1" = "1" ] && [ "$O2" = "0" ]; then
  PASSFAIL PASS "T5 user2 confirm could not touch owner pending; owner confirm executed own pending"
else
  PASSFAIL FAIL "T5 cross-user pending behavior wrong (after_user2=$O1 after_owner=$O2)"
fi

echo "== [T6] لغوِ تکراری بدون pending — صادقانه، بدون حذف =="
NB=$(curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "import sys,json;d=json.load(sys.stdin);rs=d if isinstance(d,list) else d.get('reminders',[]);print(len(rs))")
R=$(chat $CO "منصرف شدم"); echo " cancel#1 http=$(httpcode) $R"; EV_LINE "T6a http=$(httpcode) reply=$R"
R=$(chat $CO "منصرف شدم"); echo " cancel#2 http=$(httpcode) $R"; EV_LINE "T6b http=$(httpcode) reply=$R"
NA=$(curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "import sys,json;d=json.load(sys.stdin);rs=d if isinstance(d,list) else d.get('reminders',[]);print(len(rs))")
echo " reminders before=$NB after=$NA (must be equal)"; EV_LINE "T6 before=$NB after=$NA"
[ "$NB" = "$NA" ] && PASSFAIL PASS "T6 repeat cancel is idempotent and honest — nothing deleted" || PASSFAIL FAIL "T6 repeat cancel changed DB ($NB→$NA)"

echo "== [T7] D-6 read-time — پیام قدیمیِ آلوده به‌صورت امن نمایش داده می‌شود =="
POLLUTE_ID=$(bun scripts/v1-p3-pollute.ts add 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo " injected polluted id=$POLLUTE_ID"; EV_LINE "T7 injected=$POLLUTE_ID"
curl -s -b $CO $B/api/chat --max-time 15 > /tmp/v1p3-history.json
LEAK=$(python3 -c "
import json
d=json.load(open('/tmp/v1p3-history.json'))
msgs=d.get('messages',[])
bad=[m['id'] for m in msgs if m.get('role')=='assistant' and ('\"type\":' in (m.get('content') or '') or '\"taskId\"' in (m.get('content') or ''))]
print(len(bad))")
echo " assistant messages leaking raw payload=$LEAK (expect 0)"; EV_LINE "T7 leaks=$LEAK"
bun scripts/v1-p3-pollute.ts del "$POLLUTE_ID" >/dev/null
[ "$LEAK" = "0" ] && PASSFAIL PASS "T7 old polluted message is sanitized at display time — no raw JSON" || PASSFAIL FAIL "T7 raw payload leaked to GET history (leaks=$LEAK)"

echo "== [T8] D-7 live — ادعای تغییر باید پشتوانهٔ DB داشته باشد =="
TOM=$(python3 -c "from datetime import datetime,timedelta,timezone;tz=timezone(timedelta(hours=3,minutes=30));print((datetime.now(tz)+timedelta(days=1)).strftime('%Y-%m-%d'))")
CAN_AT=$(python3 -c "from datetime import datetime,timedelta,timezone;print(datetime.fromisoformat('${TOM}T10:00:00+03:30').astimezone(timezone.utc).isoformat())")
HTTP=$(curl -s -b $CO -o /tmp/v1p3-rem.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"message\":\"تماس با بانک\",\"remindAt\":\"$CAN_AT\"}" $B/api/reminders --max-time 15)
REM1=$(python3 -c "import json;d=json.load(open('/tmp/v1p3-rem.json'));r=d.get('reminder') or d;print(r.get('id',''))" 2>/dev/null)
BEFORE=$(python3 -c "import json;d=json.load(open('/tmp/v1p3-rem.json'));r=d.get('reminder') or d;print(r.get('remindAt',''))" 2>/dev/null)
echo " reminder created http=$HTTP id=$REM1 at=$BEFORE"; EV_LINE "T8 reminder http=$HTTP id=$REM1 at=$BEFORE"
R=$(chat $CO "یادآور «تماس با بانک» را به ساعت ۱۲ تغییر بده")
echo " update-request http=$(httpcode) $R"; EV_LINE "T8a http=$(httpcode) reply=$R"
AFTER=$(curl -s -b $CO $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
r=[x for x in rs if x.get('id')=='$REM1']
print(r[0].get('remindAt','') if r else 'GONE')")
NOTE=0; echo "$R" | rg -q "راستی‌آزمایی" && NOTE=1
CLAIM=0; echo "$R" | rg -q "تغییر (دادم|داده شد|کردم|کرد|شد)|اصلاح (کردم|کرد|شد)|جابه‌جا" && CLAIM=1
echo " DB after=$AFTER (before=$BEFORE) note=$NOTE claim=$CLAIM"; EV_LINE "T8 db_after=$AFTER note=$NOTE claim=$CLAIM"
if [ "$AFTER" != "$BEFORE" ] || [ "$AFTER" = "GONE" ]; then
  PASSFAIL PASS "T8 update claim backed by real DB change ($BEFORE → $AFTER)"
elif [ "$NOTE" = "1" ] || [ "$CLAIM" = "0" ]; then
  PASSFAIL PASS "T8 DB unchanged ($BEFORE) and reply is honest (note=$NOTE claim=$CLAIM)"
else
  PASSFAIL FAIL "T8 UNBACKED CHANGE CLAIM: DB unchanged ($BEFORE) but reply claims change with no honesty note"
fi

echo "== [T9] اسکن کل اجرا — هیچ نشت JSON خام در پاسخ‌ها =="
LEAKALL=$(rg -c '"type":"(add_|delete_|update_|plan_day|forget|remember)' "$EV" 2>/dev/null | head -1; true)
LEAKN=$(rg -n "reply=.*\{\"type\":|reply=.*\[\{\"type\":" "$EV" 2>/dev/null | wc -l)
echo " reply-fields containing raw action JSON=$LEAKN (expect 0)"; EV_LINE "T9 reply_json_leaks=$LEAKN"
[ "$LEAKN" = "0" ] && PASSFAIL PASS "T9 no raw action payload in any reply across the whole run" || PASSFAIL FAIL "T9 raw JSON leaked in $LEAKN replies"

echo "===== SUMMARY V1-P3: $(rg -c 'verdict=PASS' "$EV" || echo 0) PASS / $(rg -c 'verdict=FAIL' "$EV" || echo 0) FAIL ====="
EV_LINE "===== SUMMARY ====="
echo "===== V1-P3 DONE $(date -u '+%H:%M:%S') ====="
} 2>&1 | tee "$LOG" | tail -60
