#!/bin/bash
# F5-SERVER: start standalone prod server on 3001 + one-time secure OWNER setup
# Mission 13: no default credentials anywhere — owner password is generated,
# stored ONLY in artifacts/credentials/ (gitignored, excluded from public zips).
set -u
cd /home/z/my-project
B=http://127.0.0.1:3001
CREDS=artifacts/credentials/f5-owner-credentials.txt
mkdir -p artifacts/credentials && chmod 700 artifacts/credentials

pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "standalone/server.js" 2>/dev/null || true
sleep 1

# ── credentials (idempotent: keep from previous run of this script) ──
if [ ! -s "$CREDS" ]; then
  SETUP_TOKEN=$(openssl rand -hex 24)
  OWNER_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)
  USER_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 16)
  {
    echo "# RahyAr F5 sandbox credentials — generated $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo "# PRIVATE: never in git, never in public packages (artifacts/ is gitignored)"
    echo "RAHYAR_SETUP_TOKEN=$SETUP_TOKEN"
    echo "owner_username=owner"
    echo "owner_password=$OWNER_PASS"
    echo "user_username=user"
    echo "user_password=$USER_PASS"
  } > "$CREDS"
  chmod 600 "$CREDS"
fi
source <(grep -E '^(RAHYAR_SETUP_TOKEN|owner_username|owner_password|user_username|user_password)=' "$CREDS" | sed 's/^/export /')

# ── start server ──
set -a; source .env 2>/dev/null; set +a
NODE_ENV=production PORT=3001 RAHYAR_SETUP_TOKEN="$RAHYAR_SETUP_TOKEN" AI_ALLOW_PRIVATE_ENDPOINTS=1 \
  nohup node .next/standalone/server.js > /tmp/next-prod.log 2>&1 &
disown 2>/dev/null || true
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$B/login" 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "server-ready=$code"

# ── verify setup is fail-closed (Mission 13) ──
r1=$(curl -s -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"owner","password":"XxxPassw0rd!23"}' "$B/api/auth/setup" --max-time 10)
echo "setup-no-token => $(echo "$r1" | head -c 120)"
r2=$(curl -s -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"owner","password":"XxxPassw0rd!23","setupToken":"WRONG-TOKEN-000"}' "$B/api/auth/setup" --max-time 10)
echo "setup-wrong-token => $(echo "$r2" | head -c 120)"

# ── one-time OWNER setup with strong generated password ──
r3=$(curl -s -c /tmp/f5-owner.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"$owner_username\",\"displayName\":\"مالک\",\"password\":\"$owner_password\",\"setupToken\":\"$RAHYAR_SETUP_TOKEN\"}" \
  "$B/api/auth/setup" --max-time 15)
echo "setup-owner => $(echo "$r3" | head -c 160)"
# second setup attempt must be rejected
r4=$(curl -s -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"username":"x","password":"YyyPassw0rd!23","setupToken":"'"$RAHYAR_SETUP_TOKEN"'"}' "$B/api/auth/setup" --max-time 10)
echo "setup-again-rejected => $(echo "$r4" | head -c 100)"

# ── create ordinary USER account (owner-scoped) ──
r5=$(curl -s -b /tmp/f5-owner.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"$user_username\",\"password\":\"$user_password\",\"role\":\"USER\",\"displayName\":\"کاربر آزمون\"}" \
  "$B/api/users" --max-time 15)
echo "create-user => $(echo "$r5" | head -c 120)"
r6=$(curl -s -c /tmp/f5-user.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"$user_username\",\"password\":\"$user_password\"}" "$B/api/auth/login" --max-time 15)
echo "login-user => $(echo "$r6" | head -c 120)"
echo "OWNER_COOKIE=$(wc -c < /tmp/f5-owner.jar) bytes, USER_COOKIE=$(wc -c < /tmp/f5-user.jar) bytes"
echo "F5-SERVER-DONE"
