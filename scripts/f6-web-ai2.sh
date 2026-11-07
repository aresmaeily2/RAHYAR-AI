#!/usr/bin/env bash
# F6 Agent 3 round 2: proper key canary + remaining 5 providers + fa weather + cache proof
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
{
echo "===== F6-WEB-AI-R2 $(date -u '+%Y-%m-%d %H:%M:%S UTC') ====="
CO=/tmp/f6-owner.jar
echo "== [1] key canary via PUT =="
RC=$(curl -s -o /tmp/f6-canary-resp.json -w '%{http_code}' -b $CO -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"openai","key":"sk-F6-CANARY-7710"}' $B/api/settings/ai --max-time 15)
echo "canary-store http=$RC body=$(head -c 100 /tmp/f6-canary-resp.json)"
echo "-- masked in GET (must NOT contain CANARY, mask should end 7710):"
curl -s -b $CO $B/api/settings/ai --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin); provs=d if isinstance(d,list) else d.get('providers',[])
o=[p for p in provs if p.get('id')=='openai'][0]
print('openai hasKey=',o.get('hasKey'),'mask=',o.get('keyMasked'))
s=json.dumps(d,ensure_ascii=False)
print('CANARY-in-GET=', 'F6-CANARY' in s)"
echo "-- export leak:"
curl -s -b $CO $B/api/data/export --max-time 20 | grep -c "F6-CANARY" || echo 0
echo "-- test-route error message leak:"
curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"openai"}' $B/api/settings/ai/test --max-time 40 | grep -c "F6-CANARY" || echo 0
echo "-- server log leak:"
grep -c "F6-CANARY" /tmp/f6-next.log 2>/dev/null || echo 0
echo "-- direct DB row (setting exists under ai_key:*, value must hold canary but export filters it):"
DB=$(ls db/*.db | head -1)
command -v sqlite3 >/dev/null && sqlite3 "$DB" "SELECT key, replace(value,'F6-CANARY','F6-C***') FROM Setting WHERE value LIKE '%CANARY%' OR key LIKE '%openai%' LIMIT 5;" 2>/dev/null || echo "sqlite3 n/a"

echo "== [2] remaining providers (15s spacing) =="
for e in deepseek openrouter ollama lmstudio openai_compatible; do
  R=$(curl -s -b $CO -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"engine\":\"$e\"}" $B/api/settings/ai/test --max-time 45)
  echo "PROVIDER $e => $(echo "$R" | head -c 230)"
  sleep 15
done

echo "== [3] weather fa + cache proof =="
for i in 1 2; do
  T0=$(date +%s%N)
  R=$(curl -s -w '\nHTTP=%{http_code}' -b $CO --get --data-urlencode "city=تهران" "$B/api/weather" --max-time 30)
  T1=$(date +%s%N)
  echo "WEATHER-fa run$i ($(( (T1-T0)/1000000 ))ms) => $(echo "$R" | tr '\n' ' ' | head -c 200)"
done
echo "== [4] weather lastUpdated exposure check =="
curl -s -b $CO "$B/api/weather?city=Tehran" --max-time 30 | python3 -c "import sys,json; d=json.load(sys.stdin); print('response-keys=',list(d.keys())); print('has-updatedAt=', 'updatedAt' in json.dumps(d))" 2>/dev/null || true
echo "===== F6-WEB-AI-R2-DONE ====="
} > /tmp/f6-ai2.log 2>&1
cat /tmp/f6-ai2.log
