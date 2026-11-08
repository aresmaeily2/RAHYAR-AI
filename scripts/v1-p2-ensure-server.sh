#!/usr/bin/env bash
# V1-P2 — اطمینان از سرانسختی سرور production روی :3001 (در همان فراخوان اجرا شود؛
# sandbox پروسه‌های پس‌زمینهٔ بین فراخوان‌ها را می‌کشد — محدودیت محیط، ثبت‌شده در گزارش)
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
DB="${V1_DB:-file:/home/z/my-project/db/custom.db}"
# پاک‌سازی پروسه‌های قبلی روی پورت
for pid in $(ss -ltnp 2>/dev/null | rg ':3001' | rg -oP 'pid=\K[0-9]+' | sort -u); do kill -9 "$pid" 2>/dev/null; done
pkill -9 -f "standalone/server.js" 2>/dev/null
sleep 1
mkdir -p /tmp/v1-run
set -a; source .env 2>/dev/null; set +a
# سقف سهمیهٔ AI برای باتری آزمون (پیکربندی هارنس آزمون — ثبت در گزارش؛ در استقرار واقعی پیش‌فرض ۶۰/۹۰۰ اعمال می‌شود)
DATABASE_URL="$DB" NODE_ENV=production PORT=3001 RAHYAR_SETUP_TOKEN=v1-p2-noop AI_ALLOW_PRIVATE_ENDPOINTS=1 \
  AI_USER_DAILY_LIMIT="${AI_USER_DAILY_LIMIT:-600}" AI_SYSTEM_DAILY_LIMIT="${AI_SYSTEM_DAILY_LIMIT:-3000}" \
  setsid nohup node .next/standalone/server.js > /tmp/v1-run/server.log 2>&1 < /dev/null &
c=000
for i in $(seq 1 30); do
  c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 $B/login 2>/dev/null)
  [ "$c" = "200" ] && break
  sleep 2
done
echo "server-ready=$c"
[ "$c" = "200" ] || { echo "SERVER FAILED TO START:"; tail -20 /tmp/v1-run/server.log; exit 1; }
