#!/usr/bin/env bash
# F5-AUDIT: full environment + git state audit (single self-contained run)
OUT=/tmp/f5-audit.log
{
echo "===== 0. TIME / MEM ====="
date -u '+%Y-%m-%dT%H:%M:%SZ'
head -3 /proc/meminfo
nproc
df -h /home/z/my-project | tail -1

echo "===== 1. GIT BASIC ====="
cd /home/z/my-project
git rev-parse HEAD 2>&1
git status --porcelain 2>&1 | wc -l
git status -sb 2>&1 | head -5
echo "--- stash ---"
git stash list 2>&1 | head -5
echo "--- branch -avv ---"
git branch -avv 2>&1 | head -20
echo "--- remote -v ---"
git remote -v 2>&1

echo "===== 2. COMMIT EXISTENCE CHECK ====="
for c in e534155 3d39a19 9aac0cb 95a73e7 28b64bb 85dc8a2; do
  t=$(git cat-file -t "$c" 2>/dev/null)
  if [ -n "$t" ]; then
    echo "COMMIT $c : EXISTS ($t) : $(git log -1 --format='%H %ad %s' --date=iso "$c" 2>/dev/null | head -c 200)"
  else
    echo "COMMIT $c : NOT FOUND"
  fi
done

echo "===== 3. RECENT LOG (all branches) ====="
git log --all --oneline --decorate 2>&1 | head -40

echo "===== 4. UNCOMMITTED DIFF SUMMARY ====="
git diff --stat 2>&1 | tail -15
git diff --cached --stat 2>&1 | tail -5
echo "--- untracked (top 40) ---"
git status --porcelain 2>&1 | head -40

echo "===== 5. REMOTE REACHABILITY ====="
if git remote get-url origin >/dev/null 2>&1; then
  u=$(git remote get-url origin)
  echo "origin=$u"
  GIT_TERMINAL_PROMPT=0 timeout 20 git ls-remote origin 2>&1 | head -10 || echo "LS-REMOTE FAILED"
else
  echo "NO ORIGIN REMOTE"
fi

echo "===== 6. EGRESS TEST ====="
for url in https://api.github.com https://open-meteo.com https://api.openai.com; do
  code=$(timeout 15 curl -s -o /dev/null -w '%{http_code}' --max-time 12 "$url" 2>/dev/null)
  echo "EGRESS $url -> HTTP $code"
done

echo "===== 7. RTM / AUDIT FILES ====="
ls -la docs/audit/ 2>/dev/null || echo "no docs/audit dir"
for f in docs/audit/REQUIREMENTS_TRACEABILITY*.md docs/audit/*F4*; do
  [ -f "$f" ] && echo "FOUND: $f ($(wc -l < "$f") lines)"
done

echo "===== 8. DOWNLOAD DIR ====="
ls download/ 2>/dev/null | head -30

echo "===== 9. DB / RUNTIME ====="
ls -la prisma/*.db* db/ data/ 2>/dev/null | head -15
echo "===== 10. KEYSTORE ====="
ls -la android/keystore* android/*.jks android/*.keystore keystore.properties 2>/dev/null || echo "no keystore files in expected paths"
} 2>&1 | tee "$OUT"
echo "SAVED: $OUT ($(wc -l < "$OUT") lines)"
