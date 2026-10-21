#!/bin/bash
# سرور رهیار — اجرای پایدار مستقل از نشست Bash
cd /home/z/my-project
export NODE_ENV=production
while true; do
  if ! curl -s -m 3 http://localhost:3000/api/health > /dev/null 2>&1; then
    bun run start >> server.log 2>&1
  fi
  sleep 10
done
