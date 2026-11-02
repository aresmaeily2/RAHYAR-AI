#!/bin/bash
# Seed real demo data via the app's own APIs (owner session) — evidence-grade
BASE=http://localhost:3000
CJ=/tmp/owner-cookies.txt
O="Origin: $BASE"
CT="Content-Type: application/json"
PW=$(cat /home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt)
# fresh login (session may have TTL)
curl -s -X POST $BASE/api/auth/login -H "$CT" -d "{\"username\":\"owner\",\"password\":\"$PW\"}" -c $CJ -o /dev/null

echo "== tasks =="
curl -s -b $CJ -H "$O" -H "$CT" -X POST $BASE/api/tasks -d '{"title":"تماس با تیم پشتیبانی بانک","priority":1,"dueTime":"10:30","starred":true,"tag":"کار"}' | head -c 120; echo
curl -s -b $CJ -H "$O" -H "$CT" -X POST $BASE/api/tasks -d '{"title":"خرید هدیه تولد سارا","priority":2,"dueTime":"18:00","tag":"شخصی"}' | head -c 120; echo
curl -s -b $CJ -H "$O" -H "$CT" -X POST $BASE/api/tasks -d '{"title":"تمرین روزانه زبان انگلیسی","priority":3,"repeat":"daily","tag":"عادت"}' | head -c 120; echo

echo "== finance account =="
curl -s -b $CJ -H "$O" -H "$CT" -X POST $BASE/api/finance/accounts -d '{"name":"کیف پول نقدی","kind":"cash","openingAmount":1500000}' > /tmp/acc.json; cat /tmp/acc.json | head -c 200; echo
ACC=$(python3 -c "import json;print(json.load(open('/tmp/acc.json')).get('account',{}).get('id',''))")
echo "accountId=$ACC"
echo "== transactions =="
curl -s -b $CJ -H "$O" -H "$CT" -X POST $BASE/api/finance/transactions -d "{\"type\":\"income\",\"amount\":2500000,\"accountId\":\"$ACC\",\"category\":\"حقوق\",\"note\":\"حقوق مهرماه\"}" | head -c 150; echo
curl -s -b $CJ -H "$O" -H "$CT" -X POST $BASE/api/finance/transactions -d "{\"type\":\"expense\",\"amount\":185000,\"accountId\":\"$ACC\",\"category\":\"کافه\",\"note\":\"قهوه با تیم\"}" | head -c 150; echo
curl -s -b $CJ -H "$O" -H "$CT" -X POST $BASE/api/finance/transactions -d "{\"type\":\"expense\",\"amount\":920000,\"accountId\":\"$ACC\",\"category\":\"خواروبار\",\"note\":\"خرید هفتگی\"}" | head -c 150; echo
echo "== verify =="
curl -s -b $CJ "$BASE/api/tasks" | python3 -c "import json,sys; d=json.load(sys.stdin); ts=d.get('tasks',d if isinstance(d,list) else []); print('tasks:', len(ts))"
curl -s -b $CJ "$BASE/api/finance/transactions" | python3 -c "import json,sys; d=json.load(sys.stdin); tx=d.get('transactions',[]); print('transactions:', len(tx), '| total types:', set(t.get('type') for t in tx))"
