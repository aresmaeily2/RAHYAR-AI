#!/usr/bin/env bash
# F8 Zero-Law — rebuild cleaned transferable history from baseline HEAD 5522d458.
# 1) clone (no-local) -> filter-repo (3 sensitive paths)
# 2) verify: refs/blobs/tree-parity/commit-count/commit-map
# 3) bundle + patches + commit-map + SHA256SUMS -> download/RahyAr-F8/transfer
# 4) INDEPENDENT TEST REPO: clone from the clean bundle and prove tree parity
set -uo pipefail
SRC=/home/z/my-project
CLEAN=/tmp/f8-clean
TESTREPO=/tmp/f8-testrepo
OUT=/home/z/my-project/download/RahyAr-F8/transfer
LOG=/home/z/my-project/artifacts/logs/f8/history-cleanup.log
mkdir -p "$OUT" "$(dirname "$LOG")"
KS=a807354b1a9c17fa4e22df5ebc265f8006cf6f89
PW=16f4706e73f48494d5e3a0fdeab9e75259ab1e6d
TOK=3b6bc8689e132af4e844931e401cab71dc9fd0ca

echo "===== F8 HISTORY CLEAN $(date -u '+%Y-%m-%d %H:%M:%S UTC') src-HEAD=$(git -C "$SRC" rev-parse HEAD) ====="

rm -rf "$CLEAN"
git clone --no-local --no-hardlinks "$SRC" "$CLEAN" >> "$LOG" 2>&1
cd "$CLEAN"
git remote remove origin || true
git filter-repo --force --invert-paths \
  --path android/rahyar-release.keystore \
  --path .evidence-password \
  --path .evidence-session-token >> "$LOG" 2>&1

echo "=== VERIFY 1: sensitive paths in any ref (must all be 0) ==="
BAD=0
for r in $(git for-each-ref --format='%(refname)' refs/heads refs/tags); do
  n=$(git rev-list "$r" -- android/rahyar-release.keystore .evidence-password .evidence-session-token | wc -l)
  echo "$r: $n"; [ "$n" != "0" ] && BAD=1
done
echo "=== VERIFY 2: sensitive blobs absent from object DB ==="
git cat-file --batch-all-objects --batch-check | grep -E "$KS|$PW|$TOK" && { echo "FAIL: blob present"; BAD=1; } || echo "OK: none of the 3 blobs present"
echo "=== VERIFY 3: tree parity vs original main (only 3 deletions allowed) ==="
git fetch "$SRC" main:orig-main >> "$LOG" 2>&1 || true
git diff orig-main main --name-status
echo "=== VERIFY 4: commit counts ==="
echo "orig main: $(git rev-list --count orig-main)  clean main: $(git rev-list --count main)"
echo "=== VERIFY 5: clean HEAD ==="
git rev-parse main
echo "=== VERIFY 6: commit-map size ==="
wc -l .git/filter-repo/commit-map 2>/dev/null || echo "no commit-map"
cp .git/filter-repo/commit-map "$OUT/commit-map.txt" 2>/dev/null || true

if [ "$BAD" = "0" ]; then
  echo "=== BUILD: bundle + patches from clean clone ==="
  git bundle create "$OUT/rahyar-clean-history.bundle" --all
  git format-patch orig-main..main -o "$OUT/patches" | wc -l > "$OUT/patch-count.txt"
  git bundle verify "$OUT/rahyar-clean-history.bundle"
  echo "=== SHA256SUMS-transfer ==="
  cd "$OUT" && sha256sum rahyar-clean-history.bundle commit-map.txt > SHA256SUMS-transfer.txt
  cat SHA256SUMS-transfer.txt

  echo "=== INDEPENDENT TEST REPO: re-clone from clean bundle ==="
  rm -rf "$TESTREPO"
  git clone "$OUT/rahyar-clean-history.bundle" "$TESTREPO" >> "$LOG" 2>&1
  cd "$TESTREPO"
  echo "testrepo HEAD: $(git rev-parse HEAD)"
  echo "testrepo tree: $(git rev-parse HEAD^{tree})"
  echo "orig main tree (minus sensitive): $(git -C "$CLEAN" rev-parse main^{tree})"
  if [ "$(git rev-parse HEAD^{tree})" = "$(git -C "$CLEAN" rev-parse main^{tree})" ]; then
    echo "TREE-PARITY-FROM-BUNDLE: OK"
  else
    echo "TREE-PARITY-FROM-BUNDLE: MISMATCH"; exit 1
  fi
  n=$(git rev-list HEAD -- android/rahyar-release.keystore .evidence-password .evidence-session-token | wc -l)
  echo "testrepo sensitive-path commits (expect 0): $n"
  echo "=== SOURCE-MANIFEST (clean HEAD) ==="
  git ls-tree -r --name-only main | wc -l
else
  echo "BAD=1 — NOT producing transfer bundle"
fi
echo "===== F8 HISTORY CLEAN DONE ====="
