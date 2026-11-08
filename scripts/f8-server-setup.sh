#!/usr/bin/env bash
# F8 orchestrator: build (if needed) + fresh DB + server :3001 + owner/user credentials
set -uo pipefail
cd /home/z/my-project
LOG=artifacts/logs/f8
mkdir -p "$LOG" artifacts/credentials artifacts/gu2
B=http://127.0.0.1:3001

if [ ! -f .next/standalone/server.js ]; then
  echo "== [1] production build =="
  bun run build > "$LOG/build.log" 2>&1
  BUILD_RC=$?
  echo "build_rc=$BUILD_RC"
  [ $BUILD_RC -ne 0 ] && { tail -30 "$LOG/build.log"; exit 1; }
else
  echo "== [1] build skipped (standalone exists) =="
fi

echo "== [2] fresh DB =="
rm -f /tmp/f8-main.db /tmp/f8-main.db-journal /tmp/f8-main.db-wal /tmp/f8-main.db-shm
DATABASE_URL="file:/tmp/f8-main.db" bunx prisma db push --skip-generate 2>&1 | tail -1

echo "== [3] start server :3001 =="
pkill -9 -f "standalone/server.js" 2>/dev/null || true
for pid in $(ss -ltnp 2>/dev/null | grep -E ':3001' | grep -oP 'pid=\K[0-9]+' | sort -u); do kill -9 "$pid" 2>/dev/null; done
sleep 1
set -a; source .env 2>/dev/null; set +a
DATABASE_URL="file:/tmp/f8-main.db" NODE_ENV=production PORT=3001 RAHYAR_SETUP_TOKEN=f8-noop AI_ALLOW_PRIVATE_ENDPOINTS=1 \
  setsid nohup node .next/standalone/server.js > /tmp/f8-next.log 2>&1 < /dev/null &
code=000; for i in $(seq 1 40); do code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 $B/login 2>/dev/null); [ "$code" = "200" ] && break; sleep 2; done
echo "server-ready=$code"
[ "$code" != "200" ] && { echo "SERVER FAILED"; tail -20 /tmp/f8-next.log; exit 1; }

echo "== [4] owner setup (fresh, strong random password) =="
OP=$(openssl rand -base64 18 | tr -d '/+=' | head -c 22)
UP=$(openssl rand -base64 18 | tr -d '/+=' | head -c 22)
r=$(curl -s -w '|%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"owner\",\"password\":\"$OP\",\"setupToken\":\"f8-noop\"}" $B/api/auth/setup --max-time 15)
echo "owner-setup => ${r##*|}"

echo "== [5] user creation (OWNER role via API) =="
curl -s -c /tmp/f8-owner.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 > /dev/null
UR=$(curl -s -b /tmp/f8-owner.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"user\",\"role\":\"USER\"}" $B/api/users --max-time 15)
echo "$UR" | head -c 200; echo
UP2=$(echo "$UR" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('initialPassword') or d.get('password') or d.get('oneTime') or '')" 2>/dev/null)
if [ -z "$UP2" ]; then echo "WARN: one-time password not found"; UP2="$OP"; fi

cat > artifacts/credentials/f8-credentials.txt <<EOF
# F8 fresh-instance credentials (generated $(date -u +%FT%TZ)) — server :3001, DB /tmp/f8-main.db
owner_username=owner
owner_password=$OP
user_username=user
user_password=$UP2
EOF
cat > artifacts/gu2/owner-credentials.txt <<EOF
owner-username=owner
owner-password=$OP
EOF
chmod 600 artifacts/credentials/f8-credentials.txt artifacts/gu2/owner-credentials.txt
echo "credentials files written (local-only, gitignored path)"
echo "ORCHESTRATOR-DONE"
