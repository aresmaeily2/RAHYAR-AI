#!/bin/bash
# F4-SERVER: شروع سرور standalone به همان روش اثبات‌شدهٔ postcheck3
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "standalone/server.js" 2>/dev/null || true
sleep 1
cd /home/z/my-project
NODE_ENV=production PORT=3001 nohup node .next/standalone/server.js > /tmp/next-prod.log 2>&1 &
disown 2>/dev/null || true
for i in $(seq 1 20); do
  curl -s -o /dev/null --max-time 3 http://127.0.0.1:3001/login && break
  sleep 2
done
echo "ready=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3001/login) pid=$(ss -ltnp 2>/dev/null | grep 3001 | grep -oP 'pid=\K[0-9]+' | head -1)"
