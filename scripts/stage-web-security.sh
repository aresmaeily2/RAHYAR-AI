#!/bin/bash
# آزمون امنیتی زنده روی پروداکشن :3000 — شواهد واقعی (هدرها/نرخ/SSRF/کوکی/دسترسی)
set -uo pipefail
B=http://localhost:3000
G=/home/z/my-project/artifacts/gu2
H="Origin: http://localhost:3000"
CT="Content-Type: application/json"
pass=0; fail=0
ok(){ pass=$((pass+1)); echo "PASS: $1"; }
bad(){ fail=$((fail+1)); echo "FAIL: $1"; }

# 1) هدرهای امنیتی صفحهٔ ورود
HDR=$(curl -s -D - -o /dev/null $B/login --max-time 8)
for h in "x-frame-options" "x-content-type-options" "referrer-policy" "strict-transport-security" "cross-origin-opener-policy" "cross-origin-resource-policy" "permissions-policy" "content-security-policy"; do
  echo "$HDR" | tr -d '\r' | rg -qi "^$h:" && ok "header present: $h" || bad "header missing: $h"
done
CSP=$(echo "$HDR" | tr -d '\r' | rg -i "^content-security-policy:" | head -1)
echo "$CSP" | rg -q "nonce-" && ok "CSP has nonce (strict-dynamic compatible)" || bad "CSP nonce missing"

# 2) کوکی نشست: HttpOnly + SameSite (فقط لاگین موفق Set-Cookie دارد)
OWNERPW=$(cut -d= -f2 "$G/owner-credentials.txt")
SC=$(curl -s -D - -o /dev/null -X POST $B/api/auth/login -H "$H" -H "$CT" -d "{\"username\":\"owner\",\"password\":\"$OWNERPW\"}" --max-time 8 | tr -d '\r' | rg -i "^set-cookie:" | head -1)
echo "$SC" | rg -qi "httponly" && ok "session cookie HttpOnly" || bad "cookie HttpOnly missing"
echo "$SC" | rg -qi "samesite=lax" && ok "session cookie SameSite=Lax" || bad "cookie SameSite != Lax"

# 3) مسیرهای حساس بدون نشست → 401/403
for ep in /api/users /api/settings /api/export; do
  C=$(curl -s -o /dev/null -w "%{http_code}" $B$ep -H "$H" --max-time 8)
  case "$C" in 401|403|307|404) ok "unauth $ep → $C";; *) bad "unauth $ep → $C";; esac
done

# 4) SSRF: تست endpoint خصوصی AI باید owner-only باشد (کاربر عادی/ناشناس بلاک)
P1=$(curl -s -o /dev/null -w "%{http_code}" -X POST $B/api/settings/ai/test -H "$H" -H "$CT" -d '{"endpointUrl":"http://127.0.0.1:6379/v1"}' --max-time 8)
case "$P1" in 401|403) ok "AI private-endpoint test unauth → $P1 (owner-only)";; *) bad "AI test unauth → $P1";; esac
PB=$(curl -s -b "$G/u1.jar" -X POST $B/api/settings/ai/test -H "$H" -H "$CT" -d '{"endpointUrl":"http://127.0.0.1:6379/v1"}' --max-time 10)
echo "$PB" | rg -q "فقط برای مالک مجاز" && ok "AI private endpoint as USER → rejected by owner-only SSRF guard" || bad "AI private endpoint as USER → $PB"

# 5b) کوکی پرچم‌ها
echo "$SC" | rg -qi "secure" && ok "session cookie Secure" || bad "cookie Secure missing"

# 6) محدودیت نرخ ورود (۵×بدلی پشت هم از یک کلاینت → 429 در نقطه‌ای از مسیر)
R429=0
for i in $(seq 1 12); do
  C=$(curl -s -o /dev/null -w "%{http_code}" -X POST $B/api/auth/login -H "$H" -H "$CT" -d '{"username":"owner","password":"wrong-pass-'$i'"}' --max-time 8)
  [ "$C" = "429" ] && R429=1 && break
done
[ "$R429" = "1" ] && ok "login rate limit engaged (429 observed)" || bad "no 429 after 12 bad logins"

echo "SEC-RESULT: pass=$pass fail=$fail"
