#!/usr/bin/env bash
# F7 helper — ensure a server on :3001 with the given DB (and optional fresh setup)
# usage: f7-ensure-server.sh [--fresh-db] [--setup]
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
pkill -9 -f next-server 2>/dev/null
pkill -9 -f "standalone/server.js" 2>/dev/null
# کشتن قطعی بر اساس PID پورت (pkill -f در برخی فرایندهای setsid کار نمی‌کند)
for pid in $(ss -ltnp 2>/dev/null | grep -E ':3001|:3101|:3102' | grep -oP 'pid=\K[0-9]+' | sort -u); do kill -9 "$pid" 2>/dev/null; done
sleep 1
if [ "${1:-}" = "--fresh-db" ]; then
  rm -f /tmp/f7-main.db /tmp/f7-main.db-journal /tmp/f7-main.db-wal /tmp/f7-main.db-shm
  DATABASE_URL="file:/tmp/f7-main.db" bunx prisma db push --skip-generate 2>&1 | tail -1
fi
mkdir -p /tmp/f7-run
set -a; source .env 2>/dev/null; set +a
DATABASE_URL="${F7_DB:-file:/tmp/f7-main.db}" NODE_ENV=production PORT=3001 RAHYAR_SETUP_TOKEN=f7-noop AI_ALLOW_PRIVATE_ENDPOINTS=1 \
  setsid nohup node .next/standalone/server.js > /tmp/f7-next.log 2>&1 < /dev/null &
c=000; for i in $(seq 1 30); do c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 $B/login 2>/dev/null); [ "$c" = "200" ] && break; sleep 2; done
echo "server-ready=$c"
if [ "${2:-}" = "--setup" ]; then
  bash scripts/f7-seed-users.sh
fi
