#!/bin/bash
# F5-SEC-MATRIX: 11-test live security matrix against port 3001 with F5 credentials
set -u
cd /home/z/my-project
B=http://127.0.0.1:3001
OUT=artifacts/reports/f5/sec-matrix.txt
mkdir -p artifacts/reports/f5
: > "$OUT"
log(){ echo "$*" | tee -a "$OUT"; }
log "F5-SECURITY-MATRIX — $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD)"

OP=$(grep owner_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
UP=$(grep user_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)

c=$(curl -s -o /dev/null -w "%{http_code}" $B/api/android/screen --max-time 20)
log "T1 no-session GET /api/android/screen => $c (expect 401)"
c=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{"action":"tap","x":1,"y":1}' $B/api/android/tap --max-time 20)
log "T2 no-session POST /api/android/tap => $c (expect 401)"
c=$(curl -s -o /dev/null -w "%{http_code}" $B/emulator --max-time 20)
log "T3 no-session GET /emulator => $c (expect 307)"
CO=/tmp/f5s-owner.jar; CU=/tmp/f5s-user.jar; rm -f $CO $CU
o=$(curl -s -c $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 20)
u=$(curl -s -c $CU -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"user\",\"password\":\"$UP\"}" $B/api/auth/login --max-time 20)
log "T4 owner login => $(echo $o | head -c 60)"
log "T5 nonowner login => $(echo $u | head -c 60)"
c=$(curl -s -b $CU -o /dev/null -w "%{http_code}" $B/api/android/screen --max-time 20)
log "T6 nonowner GET /api/android/screen => $c (expect 403)"
c=$(curl -s -b $CU -o /dev/null -w "%{http_code}" $B/emulator --max-time 20)
log "T7 nonowner GET /emulator => $c (200 = shell with 403 message)"
c=$(curl -s -b $CO -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -H 'Origin: https://evil.example.com' -d '{"action":"tap","x":5,"y":5}' $B/api/android/tap --max-time 20)
log "T8 owner cross-origin POST /api/android/tap => $c (expect 403 CSRF)"
c=$(curl -s -b $CO -o /tmp/f5s-screen.bin -w "%{http_code}" $B/api/android/screen --max-time 30)
log "T9 owner GET /api/android/screen => $c size=$(wc -c < /tmp/f5s-screen.bin) (200 PNG or 503 honest when emulator down)"
codes=""; for i in $(seq 1 10); do codes="$codes $(curl -s -b $CO -o /dev/null -w '%{http_code}' $B/api/android/status --max-time 10)"; done
log "T10 owner 10x rapid /api/android/status =>$codes (200s then 429)"
c=$(curl -s -b $CO -o /dev/null -w "%{http_code}" $B/emulator --max-time 20)
log "T11 owner GET /emulator => $c (expect 200)"
log "F5-SEC-MATRIX-DONE"
