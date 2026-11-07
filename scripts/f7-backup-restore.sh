#!/usr/bin/env bash
# F7 — Backup/Restore واقعی روی DB زندهٔ F7 (+ تست فایل خراب = شکست صادقانه)
set -uo pipefail
cd /home/z/my-project
LIVE=/tmp/f7-main.db
SNAP=/tmp/f7-snap.db
REST=/tmp/f7-restore.db
{
echo "===== F7-BACKUP-RESTORE $(date -u '+%Y-%m-%d %H:%M:%S UTC') ====="

echo "== [1] backup تراکنشی (VACUUM INTO) =="
rm -f "$SNAP"
python3 - "$LIVE" "$SNAP" <<'EOF'
import sqlite3, sys
src = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
dst = sqlite3.connect(sys.argv[2])
src.execute("VACUUM INTO ?", (sys.argv[2],))
src.close(); dst.close()
print("VACUUM-INTO ok")
EOF
echo "snapshot size=$(wc -c < $SNAP)"

echo "== [2] مقایسهٔ تعداد ردیف همهٔ جدول‌ها =="
python3 - "$LIVE" "$SNAP" <<'EOF'
import sqlite3, sys
a = sqlite3.connect(sys.argv[1]); b = sqlite3.connect(sys.argv[2])
tables = [r[0] for r in a.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'")]
allok = True
for t in sorted(tables):
    n1 = a.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    n2 = b.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    ok = n1 == n2
    allok = allok and ok
    print(f"  {t}: live={n1} backup={n2} {'MATCH' if ok else 'MISMATCH'}")
print("ROWCOUNTS-ALL-MATCH =", allok)
EOF

echo "== [3] یکپارچگی + نشانگر داده =="
python3 - "$SNAP" <<'EOF'
import sqlite3, sys
b = sqlite3.connect(sys.argv[2] if len(sys.argv) > 2 else sys.argv[1])
EOF
python3 - "$SNAP" <<'EOF'
import sqlite3, sys
b = sqlite3.connect(sys.argv[1])
print("  integrity:", b.execute("PRAGMA integrity_check").fetchone()[0])
print("  owner users:", b.execute("SELECT count(*) FROM User WHERE username='owner'").fetchone()[0])
print("  tx rows:", b.execute("SELECT count(*) FROM FinanceTransaction").fetchone()[0])
print("  last chat chars:", b.execute("SELECT substr(content,-40) FROM ChatMessage ORDER BY rowid DESC LIMIT 1").fetchone())
EOF

echo "== [4] restore در محیط جدا (:3102) =="
cp "$SNAP" "$REST"
pkill -9 -f "f7-restore" 2>/dev/null; pkill -9 -f "PORT=3102" 2>/dev/null; sleep 1
set -a; source .env 2>/dev/null; set +a
DATABASE_URL="file:$REST" NODE_ENV=production PORT=3102 RAHYAR_SETUP_TOKEN=f7-noop \
  setsid nohup node .next/standalone/server.js > /tmp/f7-t3102.log 2>&1 < /dev/null &
c=000; for i in $(seq 1 25); do c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:3102/login 2>/dev/null); [ "$c" = "200" ] && break; sleep 2; done
echo "restore-server=$c"
OP=$(grep owner_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
r=$(curl -s -w '|%{http_code}' -c /tmp/f7-rest.jar -X POST -H 'Content-Type: application/json' -H "Origin: http://127.0.0.1:3102" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" http://127.0.0.1:3102/api/auth/login --max-time 15)
echo "restore-login => ${r##*|} (expect 200 — hash و داده سالم)"
curl -s -b /tmp/f7-rest.jar http://127.0.0.1:3102/api/finance/accounts --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); accs=d if isinstance(d,list) else d.get('accounts',[])
print('restored balances:', [(a.get('name'), a.get('balance')) for a in accs])"

echo "== [5] فایل بکاپ خراب → شکست صادقانه (بدون بازیابی ناامن) =="
head -c 2048 "$SNAP" > /tmp/f7-corrupt.db
python3 - <<'EOF'
import sqlite3
try:
    d = sqlite3.connect('/tmp/f7-corrupt.db')
    print("  corrupt integrity:", d.execute("PRAGMA integrity_check").fetchone()[0])
except Exception as e:
    print("  corrupt file fails honestly:", type(e).__name__)
EOF
echo "===== F7-BACKUP-RESTORE-DONE ====="
} 2>&1 | tee artifacts/logs/f7/backup-restore.log
pkill -9 -f "PORT=3102" 2>/dev/null || true
