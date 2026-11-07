#!/usr/bin/env bash
# F5-RECOVER: scan git object DB for lost F4 files by content SHA-256
cd /home/z/my-project
{
T_RTM=a81915d3bf92241ee0095358af495da92e5627f95af7038b3cca067569736759
T_TXT=fdb45d4cb01f964391039e5b7a14a96131a7f26c2fc734babfd5ed1b531440db
T_MD=060620e50039ab4ba572f2cd2a12ff883b1d09619dbb59ab526301a8badc6040
T_LNK=ddb97e06e974a4ddb4d455fd140c4748a22214d28be736c4c76a1a47b7bb11d4

echo "===== 1. enumerate all blobs (reachable + unreachable) ====="
git fsck --unreachable 2>/dev/null | awk '/blob/{print $3}' > /tmp/blobs_unreach.txt
git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype) %(objectsize)' 2>/dev/null | awk '$2=="blob"{print $1}' > /tmp/blobs_all.txt
wc -l /tmp/blobs_unreach.txt /tmp/blobs_all.txt

echo "===== 2. scan blob contents for target sha256 ====="
> /tmp/recovered.txt
n=0
for b in $(cat /tmp/blobs_all.txt); do
  n=$((n+1))
  h=$(git cat-file -p "$b" 2>/dev/null | head -c 5000000 | sha256sum | cut -d' ' -f1)
  case "$h" in
    "$T_RTM") echo "RTM-FOUND blob=$b" >> /tmp/recovered.txt; git cat-file -p "$b" > /tmp/REQUIREMENTS_TRACEABILITY_recovered.md ;;
    "$T_TXT") echo "F4TXT-FOUND blob=$b" >> /tmp/recovered.txt; git cat-file -p "$b" > /tmp/RahyAr-F4-MISSION-REPORT_recovered.txt ;;
    "$T_MD")  echo "F4MD-FOUND blob=$b" >> /tmp/recovered.txt; git cat-file -p "$b" > /tmp/RahyAr-F4-FINAL-REPORT_recovered.md ;;
    "$T_LNK") echo "LINKS-FOUND blob=$b" >> /tmp/recovered.txt; git cat-file -p "$b" > /tmp/LINKS-F4_recovered.txt ;;
  esac
done
echo "scanned $n blobs"
cat /tmp/recovered.txt 2>/dev/null || true
ls -la /tmp/*recovered* 2>/dev/null || echo "NO RECOVERED FILES"

echo "===== 3. also grep unreachable blobs for RTM header text (in case sha mismatch due to size cap) ====="
for b in $(cat /tmp/blobs_unreach.txt); do
  if git cat-file -p "$b" 2>/dev/null | head -30 | grep -qi 'traceability\|الزام'; then
    echo "CANDIDATE blob=$b first-line: $(git cat-file -p "$b" | head -2 | tr '\n' ' ' | head -c 150)"
  fi
done | head -20
} 2>&1 | tee /tmp/f5-recover.log
echo "SAVED: /tmp/f5-recover.log"
