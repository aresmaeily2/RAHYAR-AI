#!/usr/bin/env bash
# F5-AUDIT4: deep search for the 116-row RTM
cd /home/z/my-project
{
echo "===== 1. DISK-WIDE TRACEABILITY SEARCH ====="
find / -maxdepth 6 -iname '*TRACEABILITY*' -not -path '*/node_modules/*' -not -path '/proc/*' -not -path '/sys/*' -not -path '/.git/*' 2>/dev/null | head -10

echo "===== 2. COMPLETE_SOURCE grep ====="
grep -c 'REQUIREMENTS_TRACEABILITY' download/RahyAr-Android/RahyAr_COMPLETE_SOURCE.txt 2>/dev/null
grep -n 'REQUIREMENTS_TRACEABILITY' download/RahyAr-Android/RahyAr_COMPLETE_SOURCE.txt 2>/dev/null | head -3

echo "===== 3. FULL EVIDENCE ZIP LISTING (md files) ====="
unzip -l download/RahyAr-Android/RahyAr-F2-Test-Evidence.zip > /tmp/evz-full.txt 2>/dev/null
wc -l /tmp/evz-full.txt
grep -iE '\.md$|REQUIRE|TRACE' /tmp/evz-full.txt | head -20

echo "===== 4. SHA256SUMS.txt ====="
cat download/RahyAr-Android/SHA256SUMS.txt

echo "===== 5. EXTRACT f4/ evidence for inspection ====="
mkdir -p /tmp/f4ev && cd /tmp/f4ev && unzip -o -q /home/z/my-project/download/RahyAr-Android/RahyAr-F2-Test-Evidence.zip 'f4/*' 'f3/*' 2>/dev/null; ls -la f4/ 2>/dev/null
echo "--- f4/ subdirs ---"
find f4 -type f | head -40

echo "===== 6. SOURCE ZIP FULL MD LIST ====="
unzip -l /home/z/my-project/download/RahyAr-Android/RahyAr_Full_Source.zip | grep -iE '\.md' | grep -vE 'node_modules' | head -40
} 2>&1 | tee /tmp/f5-audit4.log
echo "SAVED: /tmp/f5-audit4.log"
