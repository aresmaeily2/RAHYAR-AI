#!/usr/bin/env bash
# P0-4 lib: HEAD guard helpers (local-only, read-only)
P04_REPO=/home/z/my-project
P04_EV=/home/z/my-project/download/RAHYAR_P0_PRE_PUSH_EVIDENCE
P04_GUARD_LOG="$P04_EV/00-head-guard.log"

p04_branch() { git -C "$P04_REPO" branch --show-current; }
p04_sha()    { git -C "$P04_REPO" rev-parse HEAD 2>/dev/null || echo DETACHED; }

p04_guard() {
  local tag="$1" ts br hd dirty
  ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
  br=$(git -C "$P04_REPO" branch --show-current)
  hd=$(git -C "$P04_REPO" rev-parse HEAD 2>/dev/null || echo DETACHED)
  dirty=$(git -C "$P04_REPO" status --porcelain=v1 2>/dev/null | wc -l | tr -d ' ')
  local line="[$ts] $tag branch=${br:-DETACHED} head=$hd dirty_entries=$dirty"
  echo "$line" | tee -a "$P04_GUARD_LOG"
}

p04_set_baseline() {
  local br hd
  br=$(p04_branch); hd=$(p04_sha)
  printf '%s\n%s\n' "$br" "$hd" > "$P04_EV/BASELINE_HEAD.txt"
  echo "BASELINE branch=$br head=$hd" | tee -a "$P04_GUARD_LOG"
}

p04_expect_baseline() {
  local want_br want_hd got_br got_hd
  want_br=$(sed -n '1p' "$P04_EV/BASELINE_HEAD.txt")
  want_hd=$(sed -n '2p' "$P04_EV/BASELINE_HEAD.txt")
  got_br=$(p04_branch); got_hd=$(p04_sha)
  if [ "$got_br" != "$want_br" ] || [ "$got_hd" != "$want_hd" ]; then
    echo "P0-4 ABORT: unexpected HEAD/branch change! expected branch=$want_br head=$want_hd ; got branch=$got_br head=$got_hd" | tee -a "$P04_GUARD_LOG"
    exit 42
  fi
}
