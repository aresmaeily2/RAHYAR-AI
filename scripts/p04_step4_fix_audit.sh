#!/usr/bin/env bash
# P0-4 Step 4 — audit fix history/content against main. LOCAL ONLY, read-only.
set -u
source /home/z/my-project/scripts/p04_lib.sh
p04_guard "step4-start"
p04_expect_baseline

R="$P04_REPO"; E="$P04_EV"; OUT="$E/04-fix-vs-main-audit.txt"
MAIN=main; FIX=fix/corrective-mission-360; BASE=origin/main

{
echo "### P0-4 STEP4 — fix vs main audit, $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo
echo "== A. patch-id equivalence across main...fix (commits WITHOUT patch-equivalent counterpart) =="
git -C "$R" log --left-right --cherry-pick --format='%m %h %s' "$MAIN...$FIX"
echo "(expect: only < = main-only sensitive commits d3dd564/87834e5 ; only > = 6 fix corrective commits)"
echo
echo "== B. pairwise commit mapping + patch-id + blob-hash verification =="
} > "$OUT"

# pair fix commits to main commits by identical subject (exact string match)
git -C "$R" log --reverse --format='%H%x09%s' "$BASE..$FIX" | while IFS=$'\t' read -r fsha fsub; do
  msha=$(git -C "$R" log --format='%H%x09%s' "$BASE..$MAIN" | awk -F'\t' -v s="$fsub" '$2==s {print $1; exit}')
  if [ -z "$msha" ]; then
    {
      echo "fix-commit $fsha  subject=$fsub"
      echo "  -> NO counterpart on main (fix-only commit)"
    } >> "$OUT"
    continue
  fi
  pid_m=$(git -C "$R" show "$msha" | git -C "$R" patch-id --stable | awk '{print $1}')
  pid_f=$(git -C "$R" show "$fsha" | git -C "$R" patch-id --stable | awk '{print $1}')
  if [ "$pid_m" = "$pid_f" ]; then pidres="PATCH-ID-EQUAL ($pid_m)"; else pidres="PATCH-ID-DIFFER (main=$pid_m fix=$pid_f)"; fi
  # blob comparison for every file changed by the commit
  blobs_same=yes; blobdiff=""
  for f in $(git -C "$R" diff-tree -r --name-only "$msha"); do
    bm=$(git -C "$R" rev-parse -q --verify "$msha:$f" 2>/dev/null || echo ABSENT)
    bf=$(git -C "$R" rev-parse -q --verify "$fsha:$f" 2>/dev/null || echo ABSENT)
    if [ "$bm" != "$bf" ]; then blobs_same=no; blobdiff="$blobdiff $f"; fi
  done
  {
    echo "pair main=$msha fix=$fsha"
    echo "  subject=$fsub"
    echo "  $pidres"
    echo "  changed-file blob hashes identical: $blobs_same${blobdiff:+ (differ:$blobdiff)}"
  } >> "$OUT"
done

{
echo
echo "== C. sensitive commits must NOT be ancestors of fix =="
for c in d3dd5641708e2c90640a29dbefc9cb1f131dd2c3 87834e561c802843cdc9fe9710996efccea3a6c9; do
  if git -C "$R" merge-base --is-ancestor "$c" "$FIX"; then
    echo "$c IS-ANCESTOR-OF-FIX  -> VIOLATION"
  else
    echo "$c not-ancestor-of-fix  -> OK ($(git -C "$R" log -1 --format='%s' $c))"
  fi
done
echo
echo "== D. full three-dot diff stat (merge-base..fix vs main) =="
git -C "$R" diff --stat "$MAIN...$FIX" | tail -5
echo
echo "== D2. full name-status diff main...fix (every difference must be explained) =="
git -C "$R" diff --name-status "$MAIN...$FIX"
echo
echo "== D3. which fix commit last touched each differing path =="
} >> "$OUT"

for f in $(git -C "$R" diff --name-only "$MAIN...$FIX"); do
  last=$(git -C "$R" log "$FIX" --format='%h|%s' -1 -- "$f" 2>/dev/null)
  onmain=$(git -C "$R" ls-tree -r --name-only "$MAIN" | rg -x -F "$f" >/dev/null 2>&1 && echo in-main-tree || echo NOT-in-main-tree)
  onfix=$(git -C "$R" ls-tree -r --name-only "$FIX" | rg -x -F "$f" >/dev/null 2>&1 && echo in-fix-tree || echo NOT-in-fix-tree)
  echo "path=$f [$onmain | $onfix] last_fix_commit=${last%%|*} subject=${last#*|}" >> "$OUT"
done

{
echo
echo "== D4. two-dot diff main..fix (true branch-vs-branch tree difference) =="
git -C "$R" diff --name-status "$MAIN..$FIX"
echo
echo "== D5. per-path attribution of the two-dot difference =="
} >> "$OUT"

for f in $(git -C "$R" diff --name-only "$MAIN..$FIX"); do
  presm=$(git -C "$R" ls-tree -r --name-only "$MAIN" | rg -x -F "$f" >/dev/null 2>&1 && echo in-main || echo NOT-in-main)
  presf=$(git -C "$R" ls-tree -r --name-only "$FIX" | rg -x -F "$f" >/dev/null 2>&1 && echo in-fix || echo NOT-in-fix)
  lm=$(git -C "$R" log "$MAIN" --format='%h' -1 -- "$f" 2>/dev/null)
  lf=$(git -C "$R" log "$FIX" --format='%h' -1 -- "$f" 2>/dev/null)
  echo "path=$f [$presm/$presf] last_main_commit=$lm last_fix_commit=$lf" >> "$OUT"
done

{
echo
echo "== D6. why 6148d86<->46f8802 patch-id differs (context investigation) =="
echo "--- status of 46f8802 relative to ITS parent (on fix):"
git -C "$R" diff-tree -r --name-status 46f8802^ 46f8802
echo "--- status of 6148d86 relative to ITS parent (on main):"
git -C "$R" diff-tree -r --name-status 6148d86^ 6148d86
echo "--- blob of scripts/corrective-report-lib.js at 37714bf (pre-existing on fix):"
git -C "$R" rev-parse 37714bf:scripts/corrective-report-lib.js 2>/dev/null || echo ABSENT-at-37714bf
echo "--- blob at 46f8802 (after cherry-pick):"
git -C "$R" rev-parse 46f8802:scripts/corrective-report-lib.js
echo "--- blob at 6148d86 (on main):"
git -C "$R" rev-parse 6148d86:scripts/corrective-report-lib.js
echo "--- blob at main HEAD:"
git -C "$R" rev-parse main:scripts/corrective-report-lib.js
echo
echo "== E. fix-only corrective commits (the 6) =="
git -C "$R" log --format='%h %ad %s' --date=short "$FIX" ^"$MAIN" --no-merges | head -20
echo
echo "== F. counts summary =="
echo "main ahead of origin/main: $(git -C "$R" rev-list --count "$BASE..$MAIN")"
echo "fix ahead of origin/main : $(git -C "$R" rev-list --count "$BASE..$FIX")"
echo "fix-only vs main         : $(git -C "$R" rev-list --count "$MAIN..$FIX")"
echo "main-only vs fix         : $(git -C "$R" rev-list --count "$FIX..$MAIN")"
} >> "$OUT"

p04_guard "step4-end"
p04_expect_baseline
echo "STEP4 OK — $OUT"
