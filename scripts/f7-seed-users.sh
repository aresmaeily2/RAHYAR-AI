#!/usr/bin/env bash
# F7 helper — owner setup + user creation on the running :3001 server (fresh DB assumed)
# اعتبارنامه‌ها در artifacts/credentials/f5-owner-credentials.txt (فرمت سازگار با اسکریپت‌های F6)
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
OP=$(openssl rand -base64 18 | tr -d '/+=' | head -c 22)
UP=$(openssl rand -base64 18 | tr -d '/+=' | head -c 16)
r=$(curl -s -w '|%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"owner\",\"password\":\"$OP\",\"setupToken\":\"f7-noop\"}" $B/api/auth/setup --max-time 15)
echo "owner-setup => ${r##*|}"
curl -s -c /tmp/f6-owner.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 > /dev/null
UR=$(curl -s -b /tmp/f6-owner.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"user\",\"password\":\"$UP\"}" $B/api/users --max-time 15)
echo "user-create => $(echo "$UR" | head -c 80)"
curl -s -c /tmp/f6-user.jar -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"username\":\"user\",\"password\":\"$UP\"}" $B/api/auth/login --max-time 15 > /dev/null
mkdir -p artifacts/credentials artifacts/gu2
cat > artifacts/credentials/f5-owner-credentials.txt <<EOF
# F7 fresh-instance credentials (generated $(date -u +%FT%TZ)) — server :3001, DB ${F7_DB:-file:/tmp/f7-main.db}
owner_username=owner
owner_password=$OP
user_username=user
user_password=$UP
EOF
cat > artifacts/gu2/owner-credentials.txt <<EOF
owner-username=owner
owner-password=$OP
EOF
chmod 600 artifacts/credentials/f5-owner-credentials.txt artifacts/gu2/owner-credentials.txt
echo "seed done"
