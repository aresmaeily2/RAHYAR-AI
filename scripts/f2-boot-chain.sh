#!/bin/bash
# حلقهٔ قهرمان بوت — ۵ دور watchdog؛ cache qcow2 بین دورها حفظ می‌شود
for i in 1 2 3 4 5; do
  echo "=== CHAIN ROUND $i $(date -u +%H:%M:%S) ==="
  bash /home/z/my-project/scripts/f2-emu-boot.sh && { echo "CHAIN_SUCCESS"; break; }
  sleep 5
done
echo "=== CHAIN END ==="
