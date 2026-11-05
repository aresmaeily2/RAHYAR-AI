#!/bin/bash
# F2-DEMO-CYCLE: روی هر بوتِ کامل، اسکریپت شواهد را اجرا کن؛ مرگ qemu توسط
# keepalive بازگشت می‌شود و این حلقه دوباره تلاش می‌کند. تصاویر/لاگ‌ها idempotent.
set -u
ROOT=/home/z/my-project
LOG=$ROOT/artifacts/logs/demo-cycle.log
log() { echo "[$(date -u +%F' '%T)] $*" >> "$LOG"; }

for ATTEMPT in $(seq 1 60); do
  log "=== demo attempt $ATTEMPT ==="
  bash "$ROOT/scripts/f2-device-demo.sh" >> "$ROOT/artifacts/logs/demo-run.log" 2>&1
  RC=$?
  log "attempt $ATTEMPT rc=$RC"
  if [ $RC -eq 0 ]; then
    log "DEMO_CYCLE_SUCCESS"
    break
  fi
  sleep 20
done
