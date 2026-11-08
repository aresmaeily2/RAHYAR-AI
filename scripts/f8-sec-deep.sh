#!/usr/bin/env bash
# F6 Agent 4: OWNER-setup fresh-DB battery + rate-limit-after-restart + real backup/restore + isolation
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
T2=http://127.0.0.1:3101
T3=http://127.0.0.1:3102
{
echo "===== F6-SEC-DEEP $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="

echo "== [0] fresh empty DB =="
rm -f /tmp/f8-fresh.db /tmp/f8-fresh.db-journal
DATABASE_URL="file:/tmp/f8-fresh.db" bunx prisma db push --skip-generate 2>&1 | tail -1
STOKEN=$(openssl rand -hex 24)
NEWPASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)

echo "== [1] fresh-instance setup battery on :3101 =="
pkill -9 -f "PORT=3101" 2>/dev/null; pkill -9 -f "f6-fresh" 2>/dev/null
set -a; source .env 2>/dev/null; set +a; export DATABASE_URL="${F8_DB:-file:/tmp/f8-main.db}"
DATABASE_URL="file:/tmp/f8-fresh.db" NODE_ENV=production PORT=3101 RAHYAR_SETUP_TOKEN="$STOKEN" nohup node .next/standalone/server.js > /tmp/f8-t3101.log 2>&1 &
disown 2>/dev/null || true
for i in $(seq 1 25); do c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 $T2/login 2>/dev/null); [ "$c" = "200" ] && break; sleep 2; done; echo "t3101-ready=$c"

r=$(curl -s -w '|%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $T2" -d '{"username":"owner","password":"Str0ngPass!x9"}' $T2/api/auth/setup --max-time 10); echo "S1 no-token => ${r##*|} (expect 4xx) $(echo "${r%|*}" | head -c 80)"
r=$(curl -s -w '|%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $T2" -d '{"username":"owner","password":"Str0ngPass!x9","setupToken":"WRONG"}' $T2/api/auth/setup --max-time 10); echo "S2 wrong-token => ${r##*|} (expect 4xx)"
for p in admin admin123 password 123456 owner/owner; do :; done
r=$(curl -s -w '|%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $T2" -d '{"username":"admin","password":"admin123"}' $T2/api/auth/login --max-time 10); echo "S3 default-cred admin/admin123 => ${r##*|} (expect 401)"
r=$(curl -s -w '|%{http_code}' -c /tmp/f8-fresh-owner.jar -X POST -H 'Content-Type: application/json' -H "Origin: $T2" -d "{\"username\":\"owner\",\"password\":\"$NEWPASS\",\"setupToken\":\"$STOKEN\"}" $T2/api/auth/setup --max-time 10); echo "S4 valid-token setup => ${r##*|} (expect 200) $(echo "${r%|*}" | head -c 60)"
grep -i 'set-cookie' /tmp/f8-s1.h 2>/dev/null
curl -s -D /tmp/f8-s1.h -o /dev/null -X POST -H 'Content-Type: application/json' -H "Origin: $T2" -d "{\"username\":\"owner\",\"password\":\"$NEWPASS\"}" $T2/api/auth/login --max-time 10
echo "S5 cookie flags => $(grep -i 'set-cookie' /tmp/f8-s1.h | head -1 | grep -oE 'HttpOnly|SameSite=[A-Za-z]+|Secure' | tr '\n' ' ')"
r=$(curl -s -w '|%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $T2" -d "{\"username\":\"second\",\"password\":\"An0therPass!22\",\"setupToken\":\"$STOKEN\"}" $T2/api/auth/setup --max-time 10); echo "S6 second-use token => ${r##*|} (expect 4xx)"
r=$(curl -s -w '|%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $T2" -d "{\"username\":\"owner\",\"password\":\"Hacked123!x\",\"setupToken\":\"$STOKEN\"}" $T2/api/auth/setup --max-time 10); echo "S7 owner-overwrite attempt => ${r##*|} (expect 4xx)"
r=$(curl -s -w '|%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $T2" -d "{\"username\":\"owner\",\"password\":\"$NEWPASS\"}" $T2/api/auth/login --max-time 10); echo "S8 old-password login still works => ${r##*|} (expect 200)"
echo "S9 password hash format => $(DATABASE_URL=file:/tmp/f8-fresh.db bun -e 'const{Database}=require("bun:sqlite");const d=new Database("/tmp/f8-fresh.db");const h=d.query("SELECT passwordHash as h FROM User WHERE username=?").get("owner");console.log(h&&h.h?h.h.slice(0,22)+"...len="+h.h.length:"NO-HASH")' 2>&1)"
echo "S10 password in server log => $(grep -c "$NEWPASS" /tmp/f8-t3101.log || echo 0) (expect 0)"
echo "S11 plaintext in DB => $(DATABASE_URL=file:/tmp/f8-fresh.db bun -e 'const{Database}=require("bun:sqlite");const d=new Database("/tmp/f8-fresh.db");const n=d.query("SELECT count(*) as n FROM User WHERE password LIKE ?").get("%$NEWPASS%");console.log(n?n.n:"?")' 2>&1) (expect 0)"

echo "== [2] rate limit after restart (main :3001) =="
pkill -9 -f "standalone/server.js" 2>/dev/null || true; sleep 1
set -a; source .env 2>/dev/null; set +a; export DATABASE_URL="${F8_DB:-file:/tmp/f8-main.db}"
NODE_ENV=production PORT=3001 RAHYAR_SETUP_TOKEN=f6-noop AI_ALLOW_PRIVATE_ENDPOINTS=1 nohup node .next/standalone/server.js > /tmp/f8-next.log 2>&1 &
disown 2>/dev/null || true
for i in $(seq 1 25); do c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 $B/login 2>/dev/null); [ "$c" = "200" ] && break; sleep 2; done; echo "main-ready=$c"
codes=""; for i in $(seq 1 12); do cc=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"owner","password":"WrongPass!999"}' $B/api/auth/login --max-time 10); codes="$codes $cc"; done
echo "login-storm(12 wrong) =>$codes (expect 401s then 429)"
codes=""; for i in $(seq 1 10); do cc=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"local_rules"}' $B/api/settings/ai/test --max-time 15); codes="$codes $cc"; done
echo "ai-test-storm(10) =>$codes (expect 200/429 mix)"
echo "===== F6-SEC-DEEP part1 DONE ====="
} > /tmp/f8-sec1.log 2>&1
cat /tmp/f8-sec1.log
