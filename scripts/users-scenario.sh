#!/bin/bash
# سناریوی زندهٔ مأموریت چندکاربره — شواهد واقعی (مرحله ۹ مأموریت)
set -uo pipefail
B=http://localhost:3000
H="Origin: http://localhost:3000"
CT="Content-Type: application/json"
CJ=/home/z/my-project/artifacts/gu2
mkdir -p "$CJ"
pass=0; fail=0
ok()   { pass=$((pass+1)); echo "PASS: $1"; }
bad()  { fail=$((fail+1)); echo "FAIL: $1"; }

# 0) ورود مالک (رمز از فایل محلی نشست)
OWNERPW=$(cut -d= -f2 "$CJ/owner-credentials.txt")
CODE=$(curl -s -o "$CJ/owner-login.json" -w "%{http_code}" -c "$CJ/owner.jar" -X POST $B/api/auth/login -H "$H" -H "$CT" -d "{\"username\":\"owner\",\"password\":\"$OWNERPW\"}" --max-time 10)
[ "$CODE" = "200" ] && ok "owner login 200" || bad "owner login → $CODE"

# 1) ساخت ۲۰ کاربر مستقل (idempotent: 409 = از قبل موجود)
created=0
for i in $(seq -w 1 20); do
  R=$(curl -s -b "$CJ/owner.jar" -X POST $B/api/users -H "$H" -H "$CT" -d "{\"username\":\"user$i\",\"displayName\":\"کاربر $i\",\"generatePassword\":true}" --max-time 10)
  if echo "$R" | rg -q '"ok":true'; then created=$((created+1)); echo "$R" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['user']['username']+','+d['initialPassword'])" >> "$CJ/users-list.txt"; fi
done
TOTAL20=$(curl -s -b "$CJ/owner.jar" $B/api/users -H "$H" --max-time 8 | python3 -c "import json,sys;d=json.load(sys.stdin);print(sum(1 for u in d['users'] if u['username'].startswith('user') and u['role']=='USER'))")
[ "$TOTAL20" -ge 20 ] && ok "≥20 independent users exist ($TOTAL20, new this run: $created)" || bad "user count=$TOTAL20"

# 2) کاربر عادی اجازه مدیریت ندارد (IDOR/BAC guard) — idempotent رمز فعلی
U1PW=$(rg "^user01," "$CJ/users-list.txt" | cut -d, -f2 | tail -1)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$CJ/u1.jar" -X POST $B/api/auth/login -H "$H" -H "$CT" -d "{\"username\":\"user01\",\"password\":\"$U1PW\"}" --max-time 10)
if [ "$CODE" != "200" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$CJ/u1.jar" -X POST $B/api/auth/login -H "$H" -H "$CT" -d '{"username":"user01","password":"User1-NewPass9!"}' --max-time 10)
fi
[ "$CODE" = "200" ] && ok "user01 login 200" || bad "user01 login → $CODE"
MC=$(curl -s -b "$CJ/u1.jar" $B/api/auth/session -H "$H" --max-time 8 | rg -o '"mustChangePassword":(true|false)' | head -1)
[ -n "$MC" ] && ok "session exposes mustChangePassword flag ($MC)" || bad "mustChangePassword flag missing"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$CJ/u1.jar" $B/api/users -H "$H" --max-time 8)
[ "$CODE" = "403" ] && ok "USER blocked from /api/users (403)" || bad "user01 /api/users → $CODE (want 403)"

# 3) تغییر اجباری رمز در اولین ورود (فقط اگر هنوز موقت است)
MCF=$(curl -s -b "$CJ/u1.jar" $B/api/auth/session -H "$H" --max-time 8 | rg -o '"mustChangePassword":(true|false)' | head -1)
if echo "$MCF" | rg -q 'true'; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$CJ/u1.jar" -c "$CJ/u1.jar" -X PUT $B/api/auth/password -H "$H" -H "$CT" -d "{\"currentPassword\":\"$U1PW\",\"newPassword\":\"User1-NewPass9!\"}" --max-time 10)
  [ "$CODE" = "200" ] && ok "forced password change 200" || bad "password change → $CODE"
else
  ok "forced change already done (idempotent re-run)"
fi
MC2=$(curl -s -b "$CJ/u1.jar" $B/api/auth/session -H "$H" --max-time 8 | rg -o '"mustChangePassword":false' | head -1)
[ -n "$MC2" ] && ok "mustChangePassword cleared after change" || bad "flag not cleared"

# 4) رمز موقت دیگر کار نمی‌کند (نشست‌های دیگر هم باطل شده‌اند)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $B/api/auth/login -H "$H" -H "$CT" -d "{\"username\":\"user01\",\"password\":\"$U1PW\"}" --max-time 10)
[ "$CODE" = "401" ] && ok "old temp password rejected (401)" || bad "old temp pw → $CODE"

# 5) غیرفعال‌سازی user02 توسط مالک → ورود 403 (idempotent)
U2ID=$(curl -s -b "$CJ/owner.jar" $B/api/users -H "$H" --max-time 8 | python3 -c "import json,sys;d=json.load(sys.stdin);print([u['id'] for u in d['users'] if u['username']=='user02'][0])")
DIS=$(curl -s -b "$CJ/owner.jar" $B/api/users -H "$H" --max-time 8 | python3 -c "import json,sys;d=json.load(sys.stdin);print([u['disabled'] for u in d['users'] if u['username']=='user02'][0])")
if [ "$DIS" != "True" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$CJ/owner.jar" -X PATCH $B/api/users/$U2ID -H "$H" -H "$CT" -d '{"disabled":true}' --max-time 10)
  [ "$CODE" = "200" ] && ok "owner disabled user02" || bad "disable → $CODE"
else
  ok "user02 already disabled (idempotent re-run)"
fi
U2PW=$(rg "^user02," "$CJ/users-list.txt" | cut -d, -f2 | tail -1)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $B/api/auth/login -H "$H" -H "$CT" -d "{\"username\":\"user02\",\"password\":\"$U2PW\"}" --max-time 10)
[ "$CODE" = "403" ] && ok "disabled user login rejected (403)" || bad "disabled login → $CODE"

# 6) جداسازی داده: کاربر01 فقط کار خودش را می‌بیند
T=$(curl -s -b "$CJ/u1.jar" -X POST $B/api/tasks -H "$H" -H "$CT" -d '{"title":"SECRET-FROM-USER01","priority":2}' --max-time 10)
U1TASK=$(echo "$T" | rg -o '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
[ -n "$U1TASK" ] && ok "user01 created private task" || bad "task create failed"
COUNT=$(curl -s -b "$CJ/owner.jar" $B/api/tasks -H "$H" --max-time 8 | rg -o "SECRET-FROM-USER01" | wc -l)
[ "$COUNT" = "0" ] && ok "owner CANNOT see user01's task (isolation)" || bad "isolation broken: owner sees $COUNT"

# 7) خروجی CSV: بدون ستون/مقدار رمز (هش یا اولیه)
curl -s -b "$CJ/owner.jar" $B/api/users/export -H "$H" --max-time 8 -o "$CJ/users-export.csv"
PH=0
if rg -qi 'passwordHash' "$CJ/users-export.csv"; then PH=1; fi
PWL=0
if [ -f "$CJ/users-list.txt" ]; then
  cut -d, -f2 "$CJ/users-list.txt" | while read -r p; do [ -n "$p" ] && rg -qF "$p" "$CJ/users-export.csv" && echo LEAK; done | rg -q LEAK && PWL=1 || PWL=0
fi
ROWS=$(wc -l < "$CJ/users-export.csv")
[ "$PH" = "0" ] && [ "$PWL" = "0" ] && ok "CSV export has NO password hashes or initial passwords" || bad "CSV leak check: ph=$PH pwleak=$PWL"
echo "  (CSV rows: $ROWS = accounts + header; includes mustChangePassword status column only)"

# 8) ممیزی ثبت شده؟ (۲۰ ساخت + ۱ غیرفعال‌سازی = ≥21)
AUD=$(bun -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.userAudit.count().then(c=>{console.log(c);return p.\$disconnect()})" 2>/dev/null)
[ "${AUD:-0}" -ge 21 ] && ok "UserAudit rows ≥21 ($AUD)" || bad "audit rows=$AUD"

echo "=============================="
echo "SCENARIO RESULT: pass=$pass fail=$fail"
exit $fail
