#!/bin/bash
# F2-SEC-MATRIX: ماتریس امنیتی زندهٔ مسیرهای شبیه‌ساز (اجرای مجدد با شواهد امروز)
# ۹ آزمون: ۴۰۱ بدون نشست / ۳۰۷ صفحه / ۴۰۳ غیرمالک / ۴۰۳ Origin متقاطع / ۴۲۹ نرخ / ۲۰۰ مالک
set -uo pipefail
B=http://127.0.0.1:3000
OUT=/home/z/my-project/artifacts/reports/emu-security-tests.txt
: > "$OUT"
log(){ echo "$*" | tee -a "$OUT"; }

log "F2-EMU-SECURITY-MATRIX — live rerun $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
log "endpoint base: $B  (daemon: next standalone, auth via session cookie)"

# ۱) بدون نشست — API تصویر
c=$(curl -s -o /dev/null -w "%{http_code}" $B/api/android/screen --max-time 20)
log "T1 no-session GET /api/android/screen => $c (expect 401)"

# ۲) بدون نشست — API لمس
c=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{"action":"tap","x":100,"y":200}' $B/api/android/tap --max-time 20)
log "T2 no-session POST /api/android/tap => $c (expect 401)"

# ۳) بدون نشست — صفحهٔ پنل (باید به /login هدایت شود)
c=$(curl -s -o /dev/null -w "%{http_code}" $B/emulator --max-time 20)
log "T3 no-session GET /emulator => $c (expect 307 redirect to /login)"

# ۴+۵) ورود مالک و کاربر عادی
CO=/tmp/owner.jar; CU=/tmp/user.jar; rm -f $CO $CU
o=$(curl -s -c $CO -X POST -H 'Content-Type: application/json' -H 'Origin: http://127.0.0.1:3000' -d '{"username":"admin","password":"v07wpBRjFr4RAp0C"}' $B/api/auth/login --max-time 20)
u=$(curl -s -c $CU -X POST -H 'Content-Type: application/json' -H 'Origin: http://127.0.0.1:3000' -d '{"username":"user","password":"usertest1"}' $B/api/auth/login --max-time 20)
log "T4 owner login (admin) => ${o:0:60}"
log "T5 nonowner login (user) => ${u:0:60}"

# ۶) کاربر غیرمالک — API تصویر (۴۰۳: فقط OWNER)
c=$(curl -s -b $CU -o /dev/null -w "%{http_code}" $B/api/android/screen --max-time 20)
log "T6 nonowner GET /api/android/screen => $c (expect 403)"

# ۷) کاربر غیرمالک — صفحهٔ پنل
c=$(curl -s -b $CU -o /dev/null -w "%{http_code}" $B/emulator --max-time 20)
log "T7 nonowner GET /emulator => $c (200=page shell with 403-forbid message rendered, panel code not rendered)"

# ۸) مالک — Origin متقاطع برای لمس (۴۰۳ CSRF)
c=$(curl -s -b $CO -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -H 'Origin: https://evil.example.com' -d '{"action":"tap","x":5,"y":5}' $B/api/android/tap --max-time 20)
log "T8 owner cross-origin POST /api/android/tap => $c (expect 403)"

# ۹) مالک — تصویر (۲۰۰ یا ۵۰۳ صادقانه وقتی شبیه‌ساز در بوت است)
c=$(curl -s -b $CO -o /tmp/owner-screen.bin -w "%{http_code}" $B/api/android/screen --max-time 30)
sz=$(stat -c%s /tmp/owner-screen.bin 2>/dev/null || echo 0)
head1=$(head -c 4 /tmp/owner-screen.bin 2>/dev/null)
log "T9 owner GET /api/android/screen => $c size=$sz magic=${head1@Q} (expect 200 PNG or 503-json when emulator down)"

# ۱۰) محدودیت نرخ — ۱۰ درخواست سریع مالک
codes=""
for i in $(seq 1 10); do c=$(curl -s -b $CO -o /dev/null -w "%{http_code}" $B/api/android/status --max-time 15); codes="$codes $c"; done
log "T10 owner 10x rapid GET /api/android/status =>$codes (expect 200s then 429)"

# ۱۱) صفحهٔ پنل با نشست مالک
c=$(curl -s -b $CO -o /dev/null -w "%{http_code}" $B/emulator --max-time 20)
log "T11 owner GET /emulator => $c (expect 200)"
log "MATRIX_DONE"
