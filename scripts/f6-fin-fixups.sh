#!/usr/bin/env bash
# F6 Agent 4 fixups: recon query, concurrency files, backup/restore real cycle, S11 redo
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
CO=/tmp/f6-owner.jar
{
echo "===== F6-FIN-FIXUPS $(date -u '+%Y-%m-%d %H:%M:%S UTC') ====="
echo "== [1] tables in DB =="
bun -e 'const{Database}=require("bun:sqlite");const d=new Database("db/custom.db",{readonly:true});console.log(d.query("SELECT name FROM sqlite_master WHERE type=?").all("table").map(x=>x.name).join(","))' 2>&1
echo "== [2] concurrency response files =="
for i in 1 2 3; do echo "conc-$i: $(head -c 110 /tmp/f6-conc-$i.json)"; done
echo "== [3] DB counts for dedup refs =="
bun -e '
const{Database}=require("bun:sqlite");const d=new Database("db/custom.db",{readonly:true});
for(const r of ["f6-conc-1","f6-dup-x"]){
  try{const n=d.query("SELECT count(*) as n FROM \"Transaction\" WHERE externalRef=?").get(r);console.log(r,"count=",n?n.n:"?")}catch(e){console.log(r,"ERR",e.message.slice(0,80))}
}' 2>&1
echo "== [4] proper reconciliation (independent math from DB) =="
bun -e '
const{Database}=require("bun:sqlite");const d=new Database("db/custom.db",{readonly:true});
const accs=d.query("SELECT id,name,openingAmount FROM \"Account\" WHERE name LIKE ?").all("F6-%");
for(const a of accs){
  const agg=d.query("SELECT type,SUM(amount) s FROM \"Transaction\" WHERE accountId=? GROUP BY type").all(a.id);
  const tin=d.query("SELECT SUM(amount) s FROM \"Transaction\" WHERE toAccountId=? AND type=?").get(a.id,"transfer");
  let bal=Number(a.openingAmount||0);
  for(const g of agg){ if(g.type==="income")bal+=Number(g.s); if(g.type==="expense")bal+=Number(g.s); if(g.type==="transfer")bal-=Number(g.s); }
  bal+=Number(tin&&tin.s?tin.s:0);
  console.log(`RECON-DB ${a.name} => ${bal}`);
}' 2>&1
echo "== [5] S11 redo: no plaintext password in fresh DB =="
bun -e '
const{Database}=require("bun:sqlite");const d=new Database("/tmp/f6-fresh.db",{readonly:true});
const u=d.query("SELECT username,passwordHash FROM \"User\" WHERE username=?").get("owner");
if(!u){console.log("user-not-found");process.exit(0)}
console.log("hash-prefix=",u.passwordHash.slice(0,8),"len=",u.passwordHash.length,"contains-plaintext=",u.passwordHash.includes("Pass"));
const n=d.query("SELECT count(*) n FROM \"User\" WHERE passwordHash LIKE ?").get("%tr0ng%");console.log("rows-with-plaintext-fragment=",n.n)' 2>&1
echo "== [6] PDF sanity =="
head -c 200 /tmp/f6-exports/fin.pdf | strings | head -3
command -v pdftotext >/dev/null && (pdftotext /tmp/f6-exports/fin.pdf - 2>/dev/null | head -5) || echo "pdftotext n/a — magic+size only"

echo "== [7] REAL backup + row-count compare =="
bash scripts/backup-db.sh /tmp 2>&1 | tail -1
BK=$(ls -t /tmp/ara-*.db | head -1)
echo "backup-file=$BK size=$(wc -c < $BK)"
for T in User Task Transaction Account Setting; do
  L=$(bun -e "const{Database}=require('bun:sqlite');console.log(new Database('db/custom.db',{readonly:true}).query('SELECT count(*) n FROM \"$T\"').get().n)" 2>/dev/null)
  K=$(bun -e "const{Database}=require('bun:sqlite');console.log(new Database('$BK',{readonly:true}).query('SELECT count(*) n FROM \"$T\"').get().n)" 2>/dev/null)
  echo "table $T: live=$L backup=$K $([ "$L" = "$K" ] && echo MATCH || echo MISMATCH)"
done
echo "== [8] REAL restore test: serve backup on :3102, login + marker =="
cp "$BK" /tmp/f6-restore.db
set -a; source .env 2>/dev/null; set +a
DATABASE_URL="file:/tmp/f6-restore.db" NODE_ENV=production PORT=3102 RAHYAR_SETUP_TOKEN=f6-noop nohup node .next/standalone/server.js > /tmp/f6-t3102.log 2>&1 &
disown 2>/dev/null || true
for i in $(seq 1 25); do c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:3102/login 2>/dev/null); [ "$c" = "200" ] && break; sleep 2; done
OP=$(grep owner_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
r=$(curl -s -w '|%{http_code}' -c /tmp/f6-rest.jar -X POST -H 'Content-Type: application/json' -H "Origin: http://127.0.0.1:3102" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" http://127.0.0.1:3102/api/auth/login --max-time 15)
echo "restore-login => ${r##*|} (expect 200 — hash+data intact)"
BALS=$(curl -s -b /tmp/f6-rest.jar http://127.0.0.1:3102/api/finance/accounts --max-time 15)
echo "restored F6-Cash balance => $(echo "$BALS" | python3 -c "import sys,json;d=json.load(sys.stdin);accs=d if isinstance(d,list) else d.get('accounts',[]);print([a.get('balance') for a in accs if a.get('name')=='F6-Cash'])") (expect [688889])"
pkill -f "PORT=3102" 2>/dev/null; pkill -f "f6-restore" 2>/dev/null
echo "===== F6-FIN-FIXUPS-DONE ====="
} > /tmp/f6-finfix.log 2>&1
cat /tmp/f6-finfix.log
