#!/usr/bin/env bash
# F6 Agent 3: provider matrix (10 engines) + key masking + weather battery + chat intent probe
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
OUT=artifacts/reports/f6
mkdir -p "$OUT"
{
echo "===== F6-WEB-AI $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
echo "== provider registry ids (from source) =="
grep -oE "^\s+(id|engine): '[a-z_0-9]+'" src/lib/ai/providers/presets.ts 2>/dev/null | grep -oE "'[a-z_0-9]+'" | sort -u | tr '\n' ' '; echo
grep -n "PROVIDER_PRESETS" src/lib/ai/providers/presets.ts | head -2
pkill -9 -f next-server 2>/dev/null || true; pkill -9 -f "standalone/server.js" 2>/dev/null || true; sleep 1
set -a; source .env 2>/dev/null; set +a
NODE_ENV=production PORT=3001 RAHYAR_SETUP_TOKEN=f6-noop AI_ALLOW_PRIVATE_ENDPOINTS=1 nohup node .next/standalone/server.js > /tmp/f6-next.log 2>&1 &
disown 2>/dev/null || true
for i in $(seq 1 25); do code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 $B/login 2>/dev/null); [ "$code" = "200" ] && break; sleep 2; done
echo "server-ready=$code"

CO=/tmp/f6-owner.jar; CU=/tmp/f6-user.jar; rm -f $CO $CU
OP=$(grep owner_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
UP=$(grep user_password artifacts/credentials/f5-owner-credentials.txt | cut -d= -f2)
curl -s -c $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15 >/dev/null
curl -s -c $CU -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"user\",\"password\":\"$UP\"}" $B/api/auth/login --max-time 15 >/dev/null
echo "logins done"

echo "== [1] settings/ai list + masking =="
R=$(curl -s -b $CO $B/api/settings/ai --max-time 15)
echo "$R" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin); provs=d if isinstance(d,list) else d.get('providers',d)
  print('providers-count=',len(provs) if isinstance(provs,list) else 'n/a')
  print(json.dumps(provs,ensure_ascii=False)[:600])
except Exception as e: print('parse-fail',e, sys.stdin.read()[:100])"

echo "== [2] store fresh dummy key then hunt for leak =="
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"openai","apiKey":"sk-F6-DUMMY-LEAKCANARY-991"}' $B/api/settings/ai --max-time 15 | head -c 120; echo
LEAK=0
for u in "$B/api/settings/ai" "$B/api/data/export"; do
  N=$(curl -s -b $CO "$u" --max-time 20 | grep -c "F6-DUMMY-LEAKCANARY" || true)
  echo "leak-probe $u => $N (expect 0)"
  LEAK=$((LEAK+N))
done
N=$(grep -c "F6-DUMMY-LEAKCANARY" /tmp/f6-next.log 2>/dev/null || true); echo "leak-probe server-log => $N (expect 0)"; LEAK=$((LEAK+N))
echo "TOTAL-KEY-LEAK=$LEAK (expect 0)"

echo "== [3] 10-provider wire matrix (honest results) =="
for e in local_rules zai openai claude gemini deepseek openrouter ollama lmstudio openai_compatible; do
  R=$(curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"engine\":\"$e\"}" $B/api/settings/ai/test --max-time 40)
  echo "PROVIDER $e => $(echo "$R" | head -c 220)"
  sleep 2
done

echo "== [4] weather battery =="
for c in "تهران" "Tehran" "London" "Invalidcity123xyz"; do
  R=$(curl -s -b $CO "$B/api/weather?city=$c" --max-time 30)
  echo "WEATHER [$c] => $(echo "$R" | head -c 200)"
done

echo "== [5] chat expense-intent probe (full actions) =="
R=$(curl -s -b $CU -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"یک هزینه ۳۰ هزار تومانی تاکسی ثبت کن"}' $B/api/chat --max-time 40)
echo "$R" | python3 -c "
import sys,json
d=json.load(sys.stdin); a=d.get('assistantMessage',{}).get('actions',[])
print('actions-count=',len(a))
for x in a: print(' action:', x.get('type'), 'ok=', x.get('ok'), str(x)[:130])"
echo "===== F6-WEB-AI-DONE ====="
} > /tmp/f6-web-ai.log 2>&1
tail -60 /tmp/f6-web-ai.log
