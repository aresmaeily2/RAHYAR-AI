#!/usr/bin/env bash
# F7 orchestrator: fresh DB + production build + server :3001 + owner/user credentials
# با DB تازه — هیچ اعتبارنامهٔ چرخه‌های قبل استفاده نمی‌شود (آن‌ها در سندباکس موجود نیستند)
set -uo pipefail
cd /home/z/my-project
LOG=artifacts/logs/f7
mkdir -p "$LOG" artifacts/credentials artifacts/gu2
B=http://127.0.0.1:3001

echo "== [1] production build (from current HEAD code) =="
bun run build > "$LOG/build.log" 2>&1
BUILD_RC=$?
echo "build_rc=$BUILD_RC"
[ $BUILD_RC -ne 0 ] && { tail -30 "$LOG/build.log"; exit 1; }

echo "== [2] fresh DB =="
rm -f /tmp/f7-main.db /tmp/f7-main.db-journal /tmp/f7-main.db-wal /tmp/f7-main.db-shm
DATABASE_URL="file:/tmp/f7-main.db" bunx prisma db push --skip-generate 2>&1 | tail -1

echo "== [3] start server :3001 =="
pkill -9 -f "standalone/server.js" 2>/dev/null || true; sleep 1
set -a; source .env 2>/dev/null; set +a
DATABASE_URL="file:/tmp/f7-main.db" NODE_ENV=production PORT=3001 RAHYAR_SETUP_TOKEN=f7-noop AI_ALLOW_PRIVATE_ENDPOINTS=1 \
  nohup node .next/standalone/server.js > /tmp/f7-next.log 2>&1 &
disown 2>/dev/null || true
code=000; for i in $(seq 1 30); do code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 $B/login 2>/dev/null); [ "$code" = "200" ] && break; sleep 2; done
echo "server-ready=$code"

echo "== [4] owner setup (fresh, strong random password) =="
OP=$(openssl rand -base64 18 | tr -d '/+=' | head -c 22)
UP=$(openssl rand -base64 18 | tr -d '/+=' | head -c 22)
r=$(curl -s -w '|%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"owner\",\"password\":\"$OP\",\"setupToken\":\"f7-noop\"}" $B/api/auth/setup --max-time 15)
echo "owner-setup => ${r##*|}"

echo "== [5] user creation (OWNER role via API — one-time password captured) =="
curl -s -c /tmp/f7-owner.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 > /dev/null
UR=$(curl -s -b /tmp/f7-owner.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"user\",\"role\":\"USER\"}" $B/api/users --max-time 15)
echo "$UR" | head -c 200; echo
UP2=$(echo "$UR" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('initialPassword') or d.get('password') or d.get('oneTime') or '')" 2>/dev/null)
if [ -z "$UP2" ]; then echo "WARN: one-time password not found in response — f6 user-login batteries will note it"; UP2="$UP"; fi

cat > artifacts/credentials/f5-owner-credentials.txt <<EOF
# F7 fresh-instance credentials (generated $(date -u +%FT%TZ)) — server :3001, DB /tmp/f7-main.db
owner_username=owner
owner_password=$OP
user_username=user
user_password=$UP2
EOF
cat > artifacts/gu2/owner-credentials.txt <<EOF
owner-username=owner
owner-password=$OP
EOF
chmod 600 artifacts/credentials/f5-owner-credentials.txt artifacts/gu2/owner-credentials.txt
echo "credentials files written (local-only, gitignored path)"
ls -la artifacts/credentials/ | tail -2
echo "ORCHESTRATOR-DONE"
