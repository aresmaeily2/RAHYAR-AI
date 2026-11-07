#!/bin/bash
# F5-PROVIDERS2: rate-limit-friendly provider matrix + targeted retests
set -u
cd /home/z/my-project
B=http://127.0.0.1:3001
OUT=artifacts/reports/f5/providers2.txt
mkdir -p artifacts/reports/f5
: > "$OUT"
log(){ echo "$*" | tee -a "$OUT"; }
J(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }
CJ=/tmp/f5-owner.jar
log "# run=f5prov2 head=$(git rev-parse --short HEAD) $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# آزمون هر Provider نام‌دار با کلید آزمایشی واقعی روی سیم‌وایر واقعی (بدون rate-limit)
test_provider(){ # id model label
  curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"engine\":\"$1\",\"key\":\"sk-F5-dummy-0123456789\",\"model\":\"$2\"}" $B/api/settings/ai >/dev/null
  sleep 1
  r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"engine\":\"$1\"}" $B/api/settings/ai/test --max-time 45)
  log "$3($1) => $(echo "$r" | head -c 300)"
  sleep 8
}

log "=== named providers — REAL adapter->wire tests (dummy key, honest errors) ==="
test_provider deepseek deepseek-chat DeepSeek          # expects real 401 -> 'کلید API نامعتبر است'
test_provider openrouter openrouter/auto OpenRouter    # expects real 401
test_provider gemini gemini-1.5-flash Gemini           # expects real 403
test_provider openai gpt-4o-mini OpenAI                # egress-proxied (403) — documented BLOCKED
test_provider claude claude-3-5-haiku-latest Claude    # egress-proxied — documented BLOCKED
test_provider ollama llama3.1 Ollama                   # no local engine — honest connect failure
test_provider lmstudio local-model LMStudio            # no local engine — honest connect failure

log "=== hosted + custom endpoint ==="
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"zai"}' $B/api/settings/ai/test --max-time 45)
log "ZAI-hosted => $(echo "$r" | head -c 250)"
sleep 8
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"local_rules"}' $B/api/settings/ai/test --max-time 20)
log "LOCAL-RULES => $(echo "$r" | head -c 250)"
# openai_compatible با endpoint واقعی reachable اما کلید نامعتبر (https://api.deepseek.com/v1)
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"openai_compatible","endpointUrl":"https://api.deepseek.com/v1","endpointKey":"sk-F5-dummy-0123456789","endpointModel":"deepseek-chat"}' $B/api/settings/ai >/dev/null
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"openai_compatible"}' $B/api/settings/ai/test --max-time 45)
log "OPENAI-COMPAT-DEEPSEEK-WIRE => $(echo "$r" | head -c 250)"
# بازگردانی به zai برای باتری بعدی
curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"engine":"zai"}' $B/api/settings/ai >/dev/null

log "=== targeted retests ==="
# F1-local: یادآور از گفتگو با موتور محلی (نتیجه باید در DB واقعی باشد)
r=$(curl -s -b $CJ -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d '{"message":"برای فردا ساعت ۹ صبح یادآوری کن با تیم پشتیبانی تماس بگیرم"}' $B/api/chat --max-time 30)
ACTIONS=$(echo "$r" | J "json.dumps(d.get('assistantMessage',{}).get('actions',[]),ensure_ascii=False)[:200]")
log "F1-local reminder-via-chat => $ACTIONS"
# بودجه با دسته معتبر food
AID=$(curl -s -b $CJ $B/api/finance/accounts --max-time 10 | python3 -c "import sys,json;d=json.load(sys.stdin);print([a['id'] for a in d['accounts'] if a['name']=='حساب-الف'][0])" 2>/dev/null)
r=$(curl -s -b $CJ -X PUT -H 'Content-Type: application/json' -H "Origin: $B" -d '{"category":"food","monthlyLimit":100000}' $B/api/finance/budgets --max-time 15 -w ' http=%{http_code}')
log "D3b budget-food => $(echo "$r" | head -c 200)"
r=$(curl -s -b $CJ $B/api/finance/budgets --max-time 10)
log "D3c budgets-list => $(echo "$r" | head -c 200)"
# Weather انگلیسی (بعد از fix geocode دو زبانه)
r=$(curl -s -o /tmp/f5w3.json -w '%{http_code}' -b $CJ "$B/api/weather?city=Tehran" --max-time 25)
log "H3 weather-city=Tehran http=$r => $(head -c 160 /tmp/f5w3.json)"
r=$(curl -s -o /tmp/f5w4.json -w '%{http_code}' -b $CJ "$B/api/weather?city=London" --max-time 25)
log "H4 weather-city=London http=$r => $(head -c 160 /tmp/f5w4.json)"
# نشت کلید در خروجی داده (بعد از fix)
r=$(curl -s -b $CJ $B/api/data/export --max-time 15)
LEAK=$(echo "$r" | grep -c "sk-TEST-SECRET-abc12345\|sk-F5-dummy" || true)
log "G5b data-export-no-key-leak leak=$LEAK (expect 0)"
log "F5-PROVIDERS2-DONE"
