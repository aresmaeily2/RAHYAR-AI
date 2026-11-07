#!/usr/bin/env bash
# F7 Agent 1 — history cleanup: strip 3 sensitive paths from transferable history.
# Runs on a CLONE in /tmp only; the working repo is never rewritten in place.
set -euo pipefail
SRC=/home/z/my-project
CLEAN=/tmp/f7-clean
OUT=/home/z/my-project/download/RahyAr-F7/transfer
LOG=/home/z/my-project/artifacts/logs/f7/history-cleanup.log
mkdir -p "$OUT" "$(dirname "$LOG")"
KS=a807354b1a9c17fa4e22df5ebc265f8006cf6f89
PW=16f4706e73f48494d5e3a0fdeab9e75259ab1e6d
TOK=3b6bc8689e132af4e844931e401cab71dc9fd0ca

rm -rf "$CLEAN"
git clone --no-local --no-hardlinks "$SRC" "$CLEAN" >> "$LOG" 2>&1
cd "$CLEAN"
git remote remove origin || true
git filter-repo --force --invert-paths \
  --path android/rahyar-release.keystore \
  --path .evidence-password \
  --path .evidence-session-token >> "$LOG" 2>&1

echo "=== VERIFY 1: sensitive paths in any ref (must be 0) ==="
for r in $(git for-each-ref --format='%(refname)' refs/heads refs/tags); do
  n=$(git rev-list "$r" -- android/rahyar-release.keystore .evidence-password .evidence-session-token | wc -l)
  echo "$r: $n"
done
echo "=== VERIFY 2: sensitive blobs absent from object DB (must print NOTHING) ==="
git cat-file --batch-all-objects --batch-check | grep -E "$KS|$PW|$TOK" || echo "OK: none of the 3 blobs present"
echo "=== VERIFY 3: tree parity vs original main (only 3 deletions allowed) ==="
git fetch "$SRC" main:orig-main >> "$LOG" 2>&1 || true
git diff orig-main main --stat | tail -8
echo "=== VERIFY 4: commit counts ==="
echo "orig main: $(git rev-list --count orig-main)  clean main: $(git rev-list --count main)"
echo "=== VERIFY 5: HEAD sha clean ==="
git rev-parse main
echo "=== VERIFY 6: commit-map size ==="
wc -l .git/filter-repo/commit-map 2>/dev/null || echo "no commit-map (filter-repo wrote ref-map?)"
ls .git/filter-repo/ 2>/dev/null
echo "=== VERIFY 7: same first-parent lineage length for last 100 ==="
git log --oneline main | wc -l
