#!/usr/bin/env bash
# F6 Agent 4: finance battery — 9 scenarios + reconciliation + concurrency + exports + backup/restore
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
CO=/tmp/f6-owner.jar
{
echo "===== F6-FINANCE $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
OP=$(grep owner_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
UP=$(grep user_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
rm -f $CO /tmp/f6-user.jar
curl -s -c $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 >/dev/null
curl -s -c /tmp/f6-user.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"user\",\"password\":\"$UP\"}" $B/api/auth/login --max-time 15 >/dev/null
echo "login-owner=$? login-user=$?"

echo "== [1] ai-test storm proper (fresh session) =="
codes=""; for i in $(seq 1 8); do cc=$(curl -s -o /dev/null -w '%{http_code}' -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"local_rules"}' $B/api/settings/ai/test --max-time 15); codes="$codes $cc"; sleep 1; done
echo "ai-test-storm =>$codes (expect 200s then 429)"

echo "== [2] accounts =="
A=$(curl -s -b $CO $B/api/finance/accounts --max-time 15)
echo "$A" | python3 -c "
import sys,json
d=json.load(sys.stdin); accs=d if isinstance(d,list) else d.get('accounts',[])
for a in accs: print(' account:',a.get('id'),a.get('name'),'kind=',a.get('kind'),'opening=',a.get('openingAmount'),'balance=',a.get('balance'))" 2>/dev/null
AID=$(echo "$A" | python3 -c "import sys,json;d=json.load(sys.stdin);accs=d if isinstance(d,list) else d.get('accounts',[]);c=[a for a in accs if a.get('name')=='F6-Cash'];print(c[0]['id'] if c else '')" 2>/dev/null)
if [ -z "$AID" ]; then
  R=$(curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"F6-Cash","kind":"cash","openingAmount":1000000}' $B/api/finance/accounts --max-time 15)
  AID=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get('account') or d).get('id',''))" 2>/dev/null)
  R2=$(curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"name":"F6-Bank","kind":"bank","openingAmount":2000000}' $B/api/finance/accounts --max-time 15)
  BID=$(echo "$R2" | python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get('account') or d).get('id',''))" 2>/dev/null)
  echo "created F6-Cash=$AID F6-Bank=$BID"
else
  echo "F6-Cash exists=$AID (from previous run)"
  BID=$(echo "$A" | python3 -c "import sys,json;d=json.load(sys.stdin);accs=d if isinstance(d,list) else d.get('accounts',[]);b=[a for a in accs if a.get('name')=='F6-Bank'];print(b[0]['id'] if b else '')" 2>/dev/null)
fi
echo "AID=$AID BID=$BID"

tx(){ curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "$1" $B/api/finance/transactions --max-time 15; }
echo "== [3] income/expense/transfer =="
echo "income  +500000 => $(tx "{\"type\":\"income\",\"amount\":500000,\"accountId\":\"$AID\",\"category\":\"salary\",\"externalRef\":\"f6-inc-1\"}" | head -c 90)"
echo "expense -300000 => $(tx "{\"type\":\"expense\",\"amount\":300000,\"accountId\":\"$AID\",\"category\":\"food\",\"externalRef\":\"f6-exp-1\"}" | head -c 90)"
echo "transfer 400000 => $(tx "{\"type\":\"transfer\",\"amount\":400000,\"accountId\":\"$AID\",\"toAccountId\":\"$BID\",\"externalRef\":\"f6-tr-1\"}" | head -c 90)"

echo "== [4] duplicate externalRef rejected? =="
D1=$(tx "{\"type\":\"expense\",\"amount\":111111,\"accountId\":\"$AID\",\"category\":\"food\",\"externalRef\":\"f6-dup-x\"}")
D2=$(tx "{\"type\":\"expense\",\"amount\":111111,\"accountId\":\"$AID\",\"category\":\"food\",\"externalRef\":\"f6-dup-x\"}")
echo "first: $(echo $D1 | head -c 70)"
echo "second: $(echo $D2 | head -c 120) (expect duplicate-rejected or dedup)"

echo "== [5] budget =="
echo "budget PUT => $(curl -s -b $CO -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"category":"food","monthlyLimit":250000}' $B/api/finance/budgets --max-time 15 | head -c 100)"
echo "budget GET => $(curl -s -b $CO $B/api/finance/budgets --max-time 15 | head -c 200)"

echo "== [6] daily report =="
RD=$(curl -s -b $CO $B/api/report/daily --max-time 20)
echo "daily-report => $(echo "$RD" | head -c 250)"

echo "== [7] exports (5 formats) =="
mkdir -p /tmp/f6-exports
for f in csv xls json txt pdf; do
  curl -s -b $CO "$B/api/finance/export?format=$f" -o /tmp/f6-exports/fin.$f --max-time 30
  M=$(head -c 5 /tmp/f6-exports/fin.$f | od -An -c | tr -d ' \n' | head -c 10)
  echo "export $f => $(wc -c < /tmp/f6-exports/fin.$f) bytes magic='$(head -c 4 /tmp/f6-exports/fin.$f | tr -d '\0')'"
done
echo "csv-header: $(head -2 /tmp/f6-exports/fin.csv | tr '\n' ' | ' | head -c 150)"
python3 -c "import json;d=json.load(open('/tmp/f6-exports/fin.json'));print('json-parses: tx-count=',len(d.get('transactions',d if isinstance(d,list) else [])) if isinstance(d,dict) else len(d))" 2>/dev/null || echo "json-parse-FAIL"
echo "txt-sample: $(head -3 /tmp/f6-exports/fin.txt | tr '\n' ' | ' | head -c 130)"

echo "== [8] independent balance reconciliation (DB math) =="
bun -e '
const{Database}=require("bun:sqlite");
const d=new Database(process.env.DB||"db/custom.db",{readonly:true});
const acc=d.query("SELECT id,name,openingAmount FROM Account WHERE name LIKE ?").all("F6-%");
for(const a of acc){
  const io=d.query("SELECT type,SUM(amount) s FROM Transaction WHERE accountId=? GROUP BY type").all(a.id);
  let bal=Number(a.openingAmount||0);
  const inc=io.find(x=>x.type==="income"), exp=io.find(x=>x.type==="expense");
  bal+=(inc?Number(inc.s):0)-(exp?Number(exp.s):0);
  const trout=d.query("SELECT SUM(amount) s FROM Transaction WHERE accountId=? AND type=?").get(a.id,"transfer");
  const trin=d.query("SELECT SUM(amount) s FROM Transaction WHERE toAccountId=? AND type=?").get(a.id,"transfer");
  bal-=(trout&&trout.s?Number(trout.s):0); bal+=(trin&&trin.s?Number(trin.s):0);
  console.log(`RECON ${a.name}: computed=${bal}`);
}' 2>&1
echo "-- API balances:"
curl -s -b $CO $B/api/finance/accounts --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); accs=d if isinstance(d,list) else d.get('accounts',[])
for a in accs:
  if a.get('name','').startswith('F6-'): print(f\"API   {a.get('name')}: api-balance={a.get('balance')}\")"

echo "== [9] concurrency: 5 parallel same externalRef =="
for i in 1 2 3 4 5; do tx "{\"type\":\"expense\",\"amount\":7000,\"accountId\":\"$AID\",\"category\":\"food\",\"externalRef\":\"f6-conc-1\"}" > /tmp/f6-conc-$i.json & done
wait
OKN=$(grep -l '"ok":true' /tmp/f6-conc-*.json 2>/dev/null | wc -l)
DUPN=$(grep -l -iE 'duplicate|تکراری' /tmp/f6-conc-*.json 2>/dev/null | wc -l)
echo "concurrent5: ok=$OKN dup-rejected=$DUPN of 5 (expect ok=1, dup-rejected=4)"
echo "DB count for ref: $(bun -e 'const{Database}=require("bun:sqlite");const d=new Database("db/custom.db",{readonly:true});console.log(d.query("SELECT count(*) n FROM Transaction WHERE externalRef=?").get("f6-conc-1").n)' 2>&1) (expect 1)"

echo "== [10] user isolation on finance =="
curl -s -b /tmp/f6-user.jar $B/api/finance/accounts --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); accs=d if isinstance(d,list) else d.get('accounts',[])
own=[a for a in accs if a.get('name','').startswith('F6-')]
print('user sees F6- accounts:',len(own),'(expect 0 — owner-scoped data)')" 2>/dev/null
echo "===== F6-FINANCE-DONE ====="
} > /tmp/f6-fin.log 2>&1
cat /tmp/f6-fin.log
