#!/usr/bin/env bash
# F7 Agent 1 — baseline reality audit (part 1): Git six-check + sensitive history scan
# RULE: never prints secret values — only hashes/lengths/classification.
set -u
cd /home/z/my-project
OUT=artifacts/logs/f7
mkdir -p "$OUT"
L="$OUT/f7-baseline-git.log"
{
echo "=== F7 BASELINE GIT AUDIT $(date -u +%FT%TZ) ==="
echo "--- 1. status ---"
git status --porcelain=v1 | head -30
git status | head -5
echo "--- 2. HEAD / rev-parse ---"
git rev-parse HEAD
git rev-parse --abbrev-ref HEAD
echo "--- 3. log --oneline -12 ---"
git log --oneline --decorate -12
echo "--- 4. branches -avv ---"
git branch -avv
echo "--- 5. remotes ---"
git remote -v
echo "--- 6. origin/main ---"
git rev-parse origin/main 2>/dev/null || echo NO_ORIGIN_MAIN
echo "--- 7. ahead/behind (left=origin/main-only, right=local-only) ---"
git rev-list --left-right --count origin/main...HEAD 2>/dev/null
echo "--- 8. merge-base with origin/main ---"
git merge-base HEAD origin/main 2>/dev/null
echo "--- 9. is origin/main ancestor of HEAD (ff-only possible)? ---"
git merge-base --is-ancestor origin/main HEAD && echo "YES fast-forward possible" || echo "NO diverged"
echo "--- 10. remote dispute: ls-remote both candidate repos (no push) ---"
git ls-remote https://github.com/aresmaeily2/HAMYAR-AI.git HEAD 2>&1 | head -3
git ls-remote https://github.com/aresmaeily2/RAHYAR-AI.git HEAD 2>&1 | head -3
echo "--- 11. workspace F6 package inventory (loss check) ---"
ls download/ 2>/dev/null
for d in download/RahyAr-F5 download/RahyAr-F6 artifacts/reports; do
  if [ -d "$d" ]; then echo "EXISTS: $d ($(ls "$d" | wc -l) entries)"; else echo "MISSING: $d"; fi
done
echo "--- 12. tools ---"
which java keytool node bun zip unzip curl python3 2>/dev/null
java -version 2>&1 | head -1
echo "ANDROID_HOME=${ANDROID_HOME:-unset} /dev/kvm:$(ls /dev/kvm 2>/dev/null || echo ABSENT)"
echo "--- 13. mem/disk ---"
free -m | head -2
df -h / | tail -1
} > "$L" 2>&1
echo "wrote $L"

# ---- sensitive history scan (no values printed) ----
S="$OUT/f7-sensitive-history.log"
{
echo "=== F7 SENSITIVE HISTORY SCAN $(date -u +%FT%TZ) ==="
for f in .evidence-password .evidence-session-token android/rahyar-release.keystore .env; do
  echo "--- FILE: $f ---"
  echo "in working tree: $(test -e "$f" && echo YES || echo NO)"
  echo "tracked in HEAD: $(git ls-files --error-unmatch "$f" >/dev/null 2>&1 && echo YES || echo NO)"
  echo "commits reachable from HEAD touching file: $(git rev-list HEAD -- "$f" | wc -l)"
  git rev-list HEAD -- "$f" | head -5 | sed 's/^/  HEAD-history: /'
  echo "commits in origin/main (PUBLIC) touching file: $(git rev-list origin/main -- "$f" 2>/dev/null | wc -l)"
  git rev-list origin/main -- "$f" 2>/dev/null | head -5 | sed 's/^/  PUBLIC-history: /'
  first=$(git rev-list HEAD -- "$f" | tail -1)
  if [ -n "$first" ]; then
    if git cat-file -e "$first:$f" 2>/dev/null; then
      blob=$(git cat-file -e "$first:$f" 2>/dev/null && echo yes || echo no)
      size=$(git cat-file -s "$first:$f" 2>/dev/null)
      echo "first-commit $first blob-size=$size bytes"
      if [ "$f" = "android/rahyar-release.keystore" ]; then
        echo "  keystore blob present in history: $blob (extraction deferred to dedicated step)"
      else
        # classify without printing: length, charset class, placeholder match, sha256 prefix
        git show "$first:$f" | head -c 4096 | python3 -c '
import sys,hashlib,re
d=sys.stdin.buffer.read().strip()
t=d.decode("utf-8","replace")
lines=[l for l in t.splitlines() if l.strip() and not l.strip().startswith("#")]
print("  non-comment lines:",len(lines))
for i,l in enumerate(lines[:4]):
    s=l.strip()
    cls="mixed-alnum" if re.fullmatch(r"[A-Za-z0-9_\-\.=+/_]+",s) else "other"
    ph="PLACEHOLDER-LIKE" if re.search(r"(?i)test|example|sample|changeme|placeholder|dummy|pass123|evidence",s) else "NOT-OBVIOUSLY-PLACEHOLDER"
    ent=len(set(s))
    print(f"  line{i+1}: len={len(s)} class={cls} distinct-chars={ent} {ph} sha256={hashlib.sha256(s.encode()).hexdigest()[:12]}")
'
      fi
    fi
  fi
done
echo "--- all secret-like filenames ever in history (full graph) ---"
git log --all --diff-filter=A --name-only --format= | sort -u | grep -iE 'keystore|evidence-password|evidence-session|secret|token|password|\.pem$|\.jks$|credential' || echo NONE
} > "$S" 2>&1
echo "wrote $S"
cat "$S"
