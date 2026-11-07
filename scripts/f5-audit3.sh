#!/usr/bin/env bash
# F5-AUDIT3: locate RTM + F4 deliverables in history / zips / artifacts
cd /home/z/my-project
{
echo "===== 1. TRACKED FILES MATCHING TRACE/F4/RTM ====="
git ls-tree -r HEAD --name-only | grep -iE 'trace|rtm|F4' | head -20

echo "===== 2. GIT HISTORY FOR TRACEABILITY PATHS ====="
git log --all --format='%h %s' --name-only -- '*TRACEABILITY*' 2>/dev/null | head -20

echo "===== 3. EVIDENCE ZIP CONTENTS (trace/f4/rtm) ====="
unzip -l download/RahyAr-Android/RahyAr-F2-Test-Evidence.zip 2>/dev/null | grep -iE 'trace|f4|rtm|report' | head -25

echo "===== 4. ARTIFACTS TREE (2 levels) ====="
find artifacts -maxdepth 2 -type d 2>/dev/null | sort | head -20
ls artifacts/delivery-build/ 2>/dev/null | head -30

echo "===== 5. ANY F4 FILES ON DISK ====="
find . -maxdepth 4 -iname '*F4*' -not -path './node_modules/*' -not -path './.git/*' 2>/dev/null | head -20

echo "===== 6. SOURCE ZIP F4/RTM CHECK ====="
unzip -l download/RahyAr-Android/RahyAr_Full_Source.zip 2>/dev/null | grep -iE 'trace|F4-' | head -10

echo "===== 7. F4 REPORTS COMMITTED IN 25150af / 9aac0cb ====="
git show --name-only --format='%h %s' 25150af 2>/dev/null | head -40
} 2>&1 | tee /tmp/f5-audit3.log
echo "SAVED: /tmp/f5-audit3.log"
