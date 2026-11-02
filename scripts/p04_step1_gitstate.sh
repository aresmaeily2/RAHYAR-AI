#!/usr/bin/env bash
# P0-4 Step 1: establish and record the real local Git state (READ-ONLY, no remote ops)
set -u
source /home/z/my-project/scripts/p04_lib.sh

mkdir -p "$P04_EV"
p04_guard "step1-start"
p04_set_baseline

R="$P04_REPO"
E="$P04_EV"

{
echo "### P0-4 STEP1 — real git state, captured $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "NOTE: no git fetch / pull / push / remote update was executed. Remote-tracking refs are used as-is (last known state)."
echo
echo "== repo path =="
git -C "$R" rev-parse --show-toplevel
git -C "$R" rev-parse --absolute-git-dir
readlink -f "$R"
echo
echo "== HEAD / active branch =="
echo "branch: $(git -C "$R" branch --show-current)"
echo "HEAD:   $(git -C "$R" rev-parse HEAD)"
git -C "$R" rev-parse --abbrev-ref HEAD
echo
echo "== full SHAs =="
printf 'main : %s\n' "$(git -C "$R" rev-parse main)"
printf 'fix  : %s\n' "$(git -C "$R" rev-parse fix/corrective-mission-360)"
printf 'origin/main (remote-tracking, NOT fetched): %s\n' "$(git -C "$R" rev-parse origin/main)"
echo
echo "== all refs with upstream =="
git -C "$R" for-each-ref --format='%(refname)|%(objectname)|upstream=%(upstream)|track=%(upstream:track)' refs/heads refs/remotes
echo
echo "== remotes =="
git -C "$R" remote -v
echo
echo "== worktrees =="
git -C "$R" worktree list
echo
echo "== stashes =="
git -C "$R" stash list; echo "(empty if nothing above)"
echo
echo "== ahead/behind counts (left=ahead-of-first/right=ahead-of-second) =="
printf 'main  vs origin/main : '; git -C "$R" rev-list --left-right --count main...origin/main
printf 'fix   vs origin/main : '; git -C "$R" rev-list --left-right --count fix/corrective-mission-360...origin/main
printf 'fix   vs main        : '; git -C "$R" rev-list --left-right --count fix/corrective-mission-360...main
printf 'main  vs fix         : '; git -C "$R" rev-list --left-right --count main...fix
printf 'merge-base(main,fix) : '; git -C "$R" merge-base main fix/corrective-mission-360
echo
echo "== commit graph (all, last 30) =="
git -C "$R" log --graph --oneline --decorate -30 --all
echo
echo "== main commits not on origin/main (full) =="
git -C "$R" log origin/main..main --format='%H|%an|%ae|%aI|%s'
echo
echo "== fix commits not on origin/main (full) =="
git -C "$R" log origin/main..fix/corrective-mission-360 --format='%H|%an|%ae|%aI|%s'
echo
echo "== main-only commits vs fix =="
git -C "$R" log fix/corrective-mission-360..main --format='%H|%s'
echo
echo "== fix-only commits vs main =="
git -C "$R" log main..fix/corrective-mission-360 --format='%H|%s'
echo
echo "== working tree status =="
git -C "$R" status --porcelain=v1 -b
echo "(empty after header = clean)"
echo
echo "== object store =="
git -C "$R" count-objects -v
echo
echo "== git local config (values scanned; URLs shown) =="
git -C "$R" config --local --list | sed -E 's#(https?://)[^@/]*@#\1[REDACTED]@#'
} > "$E/01-git-state.txt" 2>&1

# HEAD re-check after the whole read-only pass
p04_guard "step1-end"
p04_expect_baseline
echo "STEP1 OK — evidence: $E/01-git-state.txt"
