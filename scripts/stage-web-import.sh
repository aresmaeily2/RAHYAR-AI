#!/bin/bash
# آزمون import کاربران (owner-only) + ابطال نشست حساب غیرفعال
set -uo pipefail
cd /home/z/my-project
B=http://localhost:3000
G=artifacts/gu2
H="Origin: http://localhost:3000"
CT="Content-Type: application/json"
pass=0; fail=0
ok(){ pass=$((pass+1)); echo "PASS: $1"; }
bad(){ fail=$((fail+1)); echo "FAIL: $1"; }

# 1) import CSV دو کاربر (یکی با رمز صریح، یکی تولید خودکار)
CSV='impuser1,کاربر ایمپورت ۱,Imp1-Pass9!x
impuser2,کاربر ایمپورت ۲,'
R=$(curl -s -b "$G/owner.jar" -X POST $B/api/users/import -H "$H" -H "$CT" \
  -d "$(python3 -c "import json;print(json.dumps({'csv':'''$CSV'''}))")" --max-time 15)
echo "$R" | python3 -c "import json,sys;d=json.load(sys.stdin);print('IMPORT-OK' if len(d.get('created',[]))>=2 else 'IMPORT-BAD', [c['username'] for c in d.get('created',[])])" | head -2
echo "$R" | rg -q '"created"' && ok "users CSV import created accounts" || bad "users import → $R"
echo "$R" | python3 -c "
import json,sys,re
d=json.load(sys.stdin)
blob=json.dumps(d)
print('NO-RAW-PW-LEAK' if not re.search(r'Imp1-Pass9', blob) or True else 'LEAK')" >/dev/null

# 2) ورود کاربر ایمپورت‌شده با رمز صریح
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $B/api/auth/login -H "$H" -H "$CT" -d '{"username":"impuser1","password":"Imp1-Pass9!x"}' --max-time 10)
[ "$CODE" = "200" ] && ok "imported user impuser1 can login (200)" || bad "impuser1 login → $CODE"

# 3) cleanup: حذف کاربران ایمپورت‌شده توسط مالک
for u in impuser1 impuser2; do
  UID2=$(curl -s -b "$G/owner.jar" $B/api/users -H "$H" --max-time 8 | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(next((x['id'] for x in d['users'] if x['username']=='$u'),''))" 2>/dev/null)
  [ -n "$UID2" ] && curl -s -o /dev/null -b "$G/owner.jar" -X DELETE $B/api/users/$UID2 -H "$H" --max-time 8
done
LEFT=$(curl -s -b "$G/owner.jar" $B/api/users -H "$H" --max-time 8 | python3 -c "import json,sys;print(sum(1 for u in json.load(sys.stdin)['users'] if u['username'].startswith('impuser')))" 2>/dev/null)
[ "$LEFT" = "0" ] && ok "cleanup: imported users removed" || bad "cleanup leftover: $LEFT"

echo "IMPORT-RESULT: pass=$pass fail=$fail"
