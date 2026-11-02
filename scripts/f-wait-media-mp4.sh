#!/bin/bash
# منتظر پایان ضبط media → اجرای transcode mp4
LOG=/home/z/my-project/artifacts/media-run.log
for i in $(seq 1 200); do
  if grep -q "^DONE:" "$LOG" 2>/dev/null; then
    echo "media done — launching mp4 transcode"
    python3 /home/z/my-project/scripts/f-mp4-launch.py
    exit 0
  fi
  sleep 6
done
echo "TIMEOUT waiting for media"
exit 1
