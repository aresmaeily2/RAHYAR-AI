#!/bin/bash
# راه‌اندازی امن مالک روی سرور پروداکشن — توکن out-of-band + اعتبارنامه فقط محلی
set -euo pipefail
cd /home/z/my-project
G=artifacts/gu2
mkdir -p "$G"; chmod 700 "$G" 2>/dev/null || true

# 1) توکن راه‌اندازی تازه (اگر نبود)
if [ ! -f "$G/setup-token.txt" ]; then
  openssl rand -hex 24 > "$G/setup-token.txt"
  chmod 600 "$G/setup-token.txt"
fi
SETUP_TOKEN=$(cat "$G/setup-token.txt")

# 2) رمز قوی مالک (اگر نبود) — مطابق سیاست رمز
if [ ! -f "$G/owner-credentials.txt" ]; then
  PW="Rh$(openssl rand -hex 6 | tr 'a-f' 'A-F')#9z"
  printf 'owner-password=%s\n' "$PW" > "$G/owner-credentials.txt"
  chmod 600 "$G/owner-credentials.txt"
fi
OWNER_PW=$(sed -n 's/^owner-password=//p' "$G/owner-credentials.txt")

# 3) ری‌استارت پروداکشن با توکن در env
pkill -f "standalone/server.js" 2>/dev/null || true
sleep 2
NODE_ENV=production RAHYAR_SETUP_TOKEN="$SETUP_TOKEN" nohup bun .next/standalone/server.js > server.log 2>&1 &
for i in $(seq 1 20); do
  sleep 1
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health --max-time 4 || true)
  [ "$CODE" = "200" ] && break
done
echo "health=$CODE"

# 4) setup مالک (ادعای اتمیک با نقش OWNER)
CODE=$(curl -s -o "$G/setup-resp.json" -w "%{http_code}" -X POST http://localhost:3000/api/auth/setup \
  -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d "{\"username\":\"owner\",\"displayName\":\"مالک\",\"password\":\"$OWNER_PW\",\"setupToken\":\"$SETUP_TOKEN\"}" --max-time 15)
echo "setup-http=$CODE"

# 5) تأیید نقش OWNER از طریق لاگین
curl -s -c "$G/owner.jar" -X POST http://localhost:3000/api/auth/login \
  -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d "{\"username\":\"owner\",\"password\":\"$OWNER_PW\"}" -o "$G/owner-login.json" --max-time 10
ROLE=$(curl -s -b "$G/owner.jar" http://localhost:3000/api/auth/session --max-time 8 | rg -o '"role":"[A-Z]+"' | head -1)
echo "owner-role=$ROLE"
echo "SETUP-DONE"
