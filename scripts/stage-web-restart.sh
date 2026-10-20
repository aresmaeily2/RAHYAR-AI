#!/bin/bash
# آزمون بازیابی سرویس: restart پروداکشن → سلامت + ماندگاری داده + خروج
set -uo pipefail
cd /home/z/my-project
B=http://localhost:3000
G=artifacts/gu2
H="Origin: http://localhost:3000"
CT="Content-Type: application/json"
pass=0; fail=0
ok(){ pass=$((pass+1)); echo "PASS: $1"; }
bad(){ fail=$((fail+1)); echo "FAIL: $1"; }

# لاگین تازهٔ مالک (کوکی معتبر برای شمارش)
OWNER_PW=$(cut -d= -f2 "$G/owner-credentials.txt")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$G/owner.jar" -X POST $B/api/auth/login -H "$H" -H "$CT" -d "{\"username\":\"owner\",\"password\":\"$OWNER_PW\"}" --max-time 10)
[ "$CODE" = "200" ] && ok "owner login 200" || bad "owner login → $CODE"

# شمارش کاربران پیش از restart
U_BEFORE=$(curl -s -b "$G/owner.jar" $B/api/users -H "$H" --max-time 8 | python3 -c "import json,sys;print(len(json.load(sys.stdin)['users']))")

# restart سرور پروداکشن (همان env شامل توکن setup)
pkill -f "standalone/server.js" || true
sleep 2
SETUP_TOKEN=$(cat "$G/setup-token.txt")
NODE_ENV=production RAHYAR_SETUP_TOKEN="$SETUP_TOKEN" nohup bun .next/standalone/server.js > server.log 2>&1 &
for i in $(seq 1 25); do
  sleep 1
  CODE=$(curl -s -o /dev/null -w "%{http_code}" $B/api/health --max-time 4 || true)
  [ "$CODE" = "200" ] && break
done
[ "$CODE" = "200" ] && ok "server healthy after restart (health=200)" || bad "server unhealthy after restart ($CODE)"

# نشست مالک بعد از restart هنوز معتبر؟ (کوکی/نشست DB)
U_AFTER=$(curl -s -b "$G/owner.jar" $B/api/users -H "$H" --max-time 8 | python3 -c "import json,sys;print(len(json.load(sys.stdin)['users']))" 2>/dev/null || echo ERR)
[ "$U_BEFORE" = "$U_AFTER" ] && [ "$U_AFTER" != "ERR" ] && ok "data persisted across restart ($U_AFTER users)" || bad "data mismatch after restart: before=$U_BEFORE after=$U_AFTER"

# لاگین تازه بعد از restart
OWNER_PW=$(cut -d= -f2 "$G/owner-credentials.txt")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$G/owner.jar" -X POST $B/api/auth/login -H "$H" -H "$CT" -d "{\"username\":\"owner\",\"password\":\"$OWNER_PW\"}" --max-time 10)
[ "$CODE" = "200" ] && ok "owner login after restart 200" || bad "owner login after restart → $CODE"

# خروج: POST /api/auth/logout → نشست باطل
CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$G/owner.jar" -c "$G/owner.jar" -X POST $B/api/auth/logout -H "$H" --max-time 8)
[ "$CODE" = "200" ] || [ "$CODE" = "204" ] && ok "logout endpoint 2xx ($CODE)" || bad "logout → $CODE"
AFTER=$(curl -s -o /dev/null -w "%{http_code}" -b "$G/owner.jar" $B/api/users -H "$H" --max-time 8)
[ "$AFTER" = "401" ] && ok "session invalidated after logout (401)" || bad "session still valid after logout ($AFTER)"

# لاگین دوباره برای ادامهٔ کار (بازسازی owner.jar)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$G/owner.jar" -X POST $B/api/auth/login -H "$H" -H "$CT" -d "{\"username\":\"owner\",\"password\":\"$OWNER_PW\"}" --max-time 10)
[ "$CODE" = "200" ] && ok "re-login after logout 200" || bad "re-login → $CODE"

echo "RESTART-RESULT: pass=$pass fail=$fail"
