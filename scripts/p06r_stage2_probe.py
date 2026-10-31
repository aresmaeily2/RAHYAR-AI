#!/usr/bin/env python3
"""P0-6R Stage 2 — Deployment & Credential Ownership Inventory (masked, read-only).
No raw credential value is ever printed, logged, stored or written to the report.
fp = sha256(value)[:12]. Only fingerprints, counts, file names and public metadata.
No network operation. No credential is used against any service (local keytool
recovery test on the owner's own keystore is the only execution, per Stage-2 order
item C3: "روش بازیابی را بدون افشای رمز آزمایش کن")."""
import subprocess, hashlib, json, os, re, shutil, sqlite3, datetime, tempfile, random

REPO = "/home/z/my-project"
EV = os.path.join(REPO, "download/P0_6R_evidence")
os.makedirs(EV, exist_ok=True)
out = {"mission": "P0-6R Stage 2", "at_tehran": datetime.datetime.now().isoformat(timespec="seconds"),
       "masking": "fp=sha256(value)[:12]; no raw value printed/stored"}

FP = {"C1": "cec51518b9ac", "C2": "ee0880daa2ca", "C3": "f60ed56a9c82", "C4": "dd65b755befe",
      "C5": "8eb38003b10d", "C6": "e20de4c418c6", "C7": "46d0a91d1e48", "C8": "8aa62d3b0a15",
      "C9": "ff9d8259a6e5", "C10": "9774fdedae3b"}
REVP = {"C3->android": None}  # fingerprint of the conventional tooling value, filled below

def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True)

def gtext(*a):
    r = git(*a)
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else ""

def fp_of(b):
    if isinstance(b, str):
        b = b.encode()
    return hashlib.sha256(b).hexdigest()[:12]

def cands(text):
    for m in re.finditer(r"['\"]([^'\"\n]{4,160})['\"]", text):
        yield m.group(1)
    for tok in re.split(r"[\s\"'`,;:=(){}\[\]<>]+", text):
        if 4 <= len(tok) <= 160:
            yield tok

# fp of the well-known Android tooling conventional password (checked, never printed)
REVP["C3->android"] = fp_of("android")

# ── S1. refs fixation ────────────────────────────────────────────
refs = {n: git("rev-parse", n).stdout.decode().strip() for n in
        ("HEAD", "main", "fix/corrective-mission-360", "origin/main",
         "origin/feature/ambient-motion-polish")}
out["refs"] = refs
out["ahead_behind"] = {
    "main_vs_origin": git("rev-list", "--left-right", "--count", "main...origin/main").stdout.decode().split(),
    "fix_vs_origin": git("rev-list", "--left-right", "--count", "fix/corrective-mission-360...origin/main").stdout.decode().split(),
}
out["worktrees"] = git("worktree", "list", "--porcelain").stdout.decode().count("worktree ")
out["wt_porcelain"] = git("status", "--porcelain").stdout.decode().strip()
out["tags"] = git("tag", "-l").stdout.decode().split()
out["refs_original"] = [l for l in git("for-each-ref", "refs/original",
                        "--format=%(refname) %(objectname)").stdout.decode().splitlines()]

# drift of main since P0-6R Stage 1..3 report (d9eb7ea -> HEAD): commit names only
out["main_drift_commits"] = [l for l in git("log", "--format=%h %ad %s", "--date=iso",
                             "d9eb7eabef64ff66a7e7f2c61554f63ec3370a42..main").stdout.decode().splitlines()]
out["main_drift_files"] = git("diff", "--name-status",
                              "d9eb7eabef64ff66a7e7f2c61554f63ec3370a42..main").stdout.decode().splitlines()

# ── S2. worktree literal-presence map (tracked files only) ───────
tracked = [l for l in git("ls-files").stdout.decode().splitlines() if l.strip()]
presence = {k: [] for k in FP}
filefp = {}
for p in tracked:
    fp = os.path.join(REPO, p)
    if not os.path.isfile(fp) or os.path.getsize(fp) > 3_000_000:
        continue
    try:
        text = open(fp, "rb").read().decode("utf-8", "replace")
    except Exception:
        continue
    hit = set()
    for c in cands(text):
        h = fp_of(c)
        for k, v in FP.items():
            if h == v:
                hit.add(k)
    for k in hit:
        presence[k].append(p)
out["worktree_presence"] = presence

# ── S3. ref-level verification of the 10 targets (reuse p06r_verify matrix) ──
TARGETS = [
    ("C1", "origin/main", "scripts/preview-setup.ts"),
    ("C1", "origin/feature/ambient-motion-polish", "scripts/preview-setup.ts"),
    ("C1", "origin/main", "scripts/capture-agent-v23.cjs"),
    ("C2", "origin/main", "scripts/test-user-isolation.ts"),
    ("C3", "origin/main", "scripts/build-android-rebuild.sh"),
    ("C3", "origin/main", "scripts/build-android-apk-v11.sh"),
    ("C4", "origin/main", "scripts/build-android-apk.sh"),
    ("C5", "origin/main", "scripts/live-v2-tests.cjs"),
    ("C6", "origin/main", "scripts/live-v2-tests.cjs"),
    ("C10", "origin/main", "scripts/live-final-audit.ts"),
    ("C7", "main", "scripts/audit-screens.mjs"),
    ("C7", "fix/corrective-mission-360", "scripts/audit-screens.mjs"),
    ("C8", "fix/corrective-mission-360", "scripts/mint-evidence-session.mjs"),
]
ver = []
for cid, ref, path in TARGETS:
    blob = git("show", f"{ref}:{path}")
    ok, method = False, "blob-missing"
    if blob.returncode == 0:
        method = "no-match"
        for c in cands(blob.stdout.decode("utf-8", "replace")):
            if fp_of(c) == FP[cid]:
                ok, method = True, "literal-found"
                break
    ver.append({"id": cid, "ref": ref, "path": path, "fp_match": ok, "method": method})
# value files on main
for cid, path in (("C8", ".evidence-password"), ("C9", ".evidence-session-token")):
    blob = git("show", f"main:{path}")
    ok, method = False, "blob-missing"
    if blob.returncode == 0:
        raw = blob.stdout
        method = "no-match"
        for cand in (raw, raw.rstrip(b"\r\n"), raw.strip()):
            if fp_of(cand) == FP[cid]:
                ok, method = True, "whole-file"
                break
    ver.append({"id": cid, "ref": "main", "path": path, "fp_match": ok, "method": method})
out["fp_verification"] = ver

# ── S4. masked purpose / config extraction for consumer scripts ──
SUSPICIOUS = re.compile(r"pass|secret|token|credential|رمز|hash", re.I)
def audit_text(text):
    """Return masked structural facts about a script."""
    d = {"var_assignments": [], "urls": [], "process_env_refs": len(re.findall(r"process\.env", text)),
         "suspicious_lines": [], "comment_head": []}
    for m in re.finditer(r"(?m)^\s*(?:export\s+)?(?:const|let|var|readonly|[A-Z_]+=)\s*([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*['\"]([^'\"\n]+)['\"]", text):
        name, val = m.group(1), m.group(2)
        d["var_assignments"].append({"name": name, "len": len(val), "fp": fp_of(val)})
    for m in re.finditer(r"https?://[^\s'\"<>]+", text):
        u = m.group(0)
        mm = re.match(r"(https?://[^/]+)", u)
        d["urls"].append(mm.group(1) if mm else u.split("/")[0])
    d["urls"] = sorted(set(d["urls"]))
    for i, ln in enumerate(text.splitlines(), 1):
        if SUSPICIOUS.search(ln):
            d["suspicious_lines"].append(i)
        if len(d["comment_head"]) < 6 and ln.strip().startswith(("//", "#", "/*", "*")):
            stripped = ln.strip()
            if not any(fp_of(c) in FP.values() for c in cands(stripped)) and not SUSPICIOUS.search(stripped.replace("//", " ").replace("#", " ")):
                d["comment_head"].append(stripped[:110])
    return d

AUDIT_FILES = [
    ("main", "scripts/preview-setup.ts"), ("main", "scripts/live-v2-tests.cjs"),
    ("main", "scripts/live-final-audit.ts"), ("main", "scripts/test-user-isolation.ts"),
    ("main", "scripts/audit-screens.mjs"), ("main", "scripts/mint-audit-session.ts"),
    ("main", "scripts/mint-live-session.ts"), ("main", "scripts/session-capture.sh"),
    ("main", "scripts/cleanup-audit-session.ts"), ("main", "scripts/build-android-rebuild.sh"),
    ("main", "scripts/build-android-apk-v11.sh"), ("main", "scripts/verify-apk-vs-ed9ec2d.sh"),
    ("main", "scripts/publish-public-release-repo.sh"), ("main", "scripts/stage-gh-release.sh"),
    ("main", "android/app/build.gradle"), ("main", "android/README.md"),
    ("main", "docs/DEPLOYMENT.md"), ("main", "Caddyfile"), ("main", "RAHYAR_RELEASE.md"),
    ("fix/corrective-mission-360", "scripts/mint-evidence-session.mjs"),
    ("fix/corrective-mission-360", "scripts/audit-screens.mjs"),
]
out["script_audit"] = {}
for ref, path in AUDIT_FILES:
    text = gtext("show", f"{ref}:{path}")
    out["script_audit"][f"{ref}:{path}"] = audit_text(text) if text else None

# ── S5. C3 keystore: file, recovery test, blob history, tags ─────
ks_path = os.path.join(REPO, "android/rahyar-release.keystore")
ks = {"present": os.path.exists(ks_path)}
if ks["present"]:
    ks["size"] = os.path.getsize(ks_path)
    ks["sha256"] = hashlib.sha256(open(ks_path, "rb").read()).hexdigest()
    ks["sha256_match_recorded"] = ks["sha256"] == "d4b7169a21f8f113f7cf8104c0b5dd32a9d06f9aaa87dc263d1fc5b905b21898"
out["keystore"] = ks

# extract C3 store-pass value (never printed) from the two build scripts on main
sp_vals = {}
for path in ("scripts/build-android-rebuild.sh", "scripts/build-android-apk-v11.sh"):
    text = gtext("show", f"main:{path}")
    for c in set(cands(text)):
        if fp_of(c) == FP["C3"]:
            sp_vals[path] = c
out["c3_storepass_found_in"] = {p: (v is not None) for p, v in sp_vals.items()}
out["c3_is_conventional_android"] = REVP["C3->android"] == FP["C3"]

keytool_result = {"executed": False}
if ks["present"] and sp_vals:
    sp = next(iter(sp_vals.values()))
    tmpdir = tempfile.mkdtemp(prefix="ksprobe_")
    tmpks = os.path.join(tmpdir, "probe.ks")
    shutil.copy2(ks_path, tmpks)
    env = dict(os.environ, KSPROBE_SP=sp)
    # env expansion happens in the shell; the value never appears on argv
    r = subprocess.run(
        ["bash", "-c", 'keytool -list -v -keystore "$0" -storepass "$KSPROBE_SP"', tmpks],
        capture_output=True, env=env, timeout=60)
    keytool_result["executed"] = True
    keytool_result["returncode"] = r.returncode
    o = r.stdout.decode("utf-8", "replace")
    e = r.stderr.decode("utf-8", "replace")
    blob = o if r.returncode == 0 else e
    mtype = re.search(r"Keystore type:\s*(\S+)", blob)
    keytool_result["keystore_type"] = mtype.group(1) if mtype else None
    prov = re.search(r"Provider[^\n]*", blob)
    keytool_result["provider_line"] = prov.group(0)[:60] if prov else None
    keytool_result["entries"] = re.findall(r"Alias name:\s*(\S+)", blob)
    keytool_result["cert_sha256"] = re.findall(r"SHA256:\s*([A-F0-9:]{20,})", blob)
    vdates = re.findall(r"Valid from:[^\n]*", blob)
    keytool_result["validity"] = [v[:100] for v in vdates]
    keytool_result["entry_count_line"] = (re.search(r"contains (\d+) entr", blob) or [None, None]) and (re.search(r"contains (\d+) entr", blob).group(1) if re.search(r"contains (\d+) entr", blob) else None)
    # key-pass recovery probe: importkeystore to a temp destination using the SAME
    # value as dest store/key pass (no new secret is created); success proves the
    # source key bags decrypt with the tested candidate (keypass == storepass here).
    dest = os.path.join(tmpdir, "dest.p12")
    r2 = subprocess.run(
        ["bash", "-c",
         'keytool -importkeystore -noprompt -srckeystore "$0" -srcstorepass "$KSPROBE_SP" '
         '-destkeystore "$1" -deststorepass "$KSPROBE_SP" -destkeypass "$KSPROBE_SP" -deststoretype PKCS12',
         tmpks, dest],
        capture_output=True, env=env, timeout=60)
    keytool_result["keypass_recovery_returncode"] = r2.returncode
    keytool_result["keypass_recovery_ok"] = r2.returncode == 0
    # secure-delete temp artifacts (overwrite then unlink)
    for f in (tmpks, dest):
        if os.path.exists(f):
            sz = os.path.getsize(f)
            with open(f, "wb") as fh:
                fh.write(os.urandom(sz))
            os.unlink(f)
    shutil.rmtree(tmpdir, ignore_errors=True)
out["keytool_recovery_test"] = keytool_result

ks_hist = git("log", "--all", "--format=%h %d %s", "--", "android/rahyar-release.keystore").stdout.decode().splitlines()
out["keystore_blob_history_all"] = ks_hist[:12]
out["keystore_in_tag_trees"] = {}
for t in out["tags"]:
    ls = git("ls-tree", "-r", "--name-only", t + "^{tree}", "--", "android/rahyar-release.keystore").stdout.decode().strip()
    out["keystore_in_tag_trees"][t] = bool(ls)
out["keystore_tracked_on"] = {ref: bool(git("ls-tree", "-r", "--name-only", ref, "--",
    "android/rahyar-release.keystore").stdout.decode().strip())
    for ref in ("main", "fix/corrective-mission-360", "origin/main", "origin/feature/ambient-motion-polish")}

# ── S6. C8 / P0-5 posture on fix ─────────────────────────────────
mint = gtext("show", "fix/corrective-mission-360:scripts/mint-evidence-session.mjs")
out["c8_mint_fix"] = {
    "present": bool(mint), "lines": mint.count("\n") + 1 if mint else 0,
    "has_const_password_literal": bool(re.search(r"const\s+PASSWORD\s*=\s*['\"]", mint)),
    "mentions_EVIDENCE_SESSION_SECRET": "EVIDENCE_SESSION_SECRET" in mint,
    "process_env_refs": mint.count("process.env"),
    "has_env_fallback_pattern": bool(re.search(r"process\.env\.[A-Z_]+\s*\|\||process\.env\.[A-Z_]+\s*\?\?", mint)),
    "var_assignments": [{"name": m.group(1), "len": len(m.group(2)), "fp": fp_of(m.group(2))}
                        for m in re.finditer(r"(?m)^\s*(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*['\"]([^'\"\n]+)['\"]", mint)],
    "fp_C8_literal_present": any(fp_of(c) == FP["C8"] for c in cands(mint)),
}
out["c8_evidence_password_main"] = {
    "tracked": bool(git("ls-tree", "main", "--", ".evidence-password").stdout.decode().strip()),
    "fp_match": any(v["id"] == "C8" and v["path"] == ".evidence-password" and v["fp_match"] for v in ver),
}
# consumers of the mint script across refs
out["c8_mint_consumers"] = {ref: [l for l in gtext("grep", "-l", "-I", "mint-evidence-session", ref).splitlines()]
                            for ref in ("main", "fix/corrective-mission-360")}
# security tests mentioning EVIDENCE_SESSION_SECRET on fix
out["c8_secret_tests_on_fix"] = gtext("grep", "-l", "-I", "EVIDENCE_SESSION_SECRET",
                                      "fix/corrective-mission-360").splitlines()
out["c8_mint_commits_on_fix"] = git("log", "--format=%h %ad %s", "--date=short",
    "fix/corrective-mission-360", "--", "scripts/mint-evidence-session.mjs").stdout.decode().splitlines()
envfix = gtext("show", "fix/corrective-mission-360:.env.example")
out["c8_env_example_fix_mentions_secret"] = "EVIDENCE_SESSION_SECRET" in envfix

# ── S7. C7 audit-screens.mjs ─────────────────────────────────────
b_main = git("rev-parse", "main:scripts/audit-screens.mjs").stdout.decode().strip()
b_fix = git("rev-parse", "fix/corrective-mission-360:scripts/audit-screens.mjs").stdout.decode().strip()
out["c7"] = {
    "blob_main": b_main, "blob_fix": b_fix, "identical_main_fix": b_main == b_fix,
    "tracked_on": {ref: bool(git("ls-tree", "-r", "--name-only", ref, "--", "scripts/audit-screens.mjs").stdout.decode().strip())
                   for ref in ("main", "fix/corrective-mission-360", "origin/main", "origin/feature/ambient-motion-polish")},
    "literal_fp_match_main": any(v["id"] == "C7" and v["ref"] == "main" and v["fp_match"] for v in ver),
    "literal_fp_match_fix": any(v["id"] == "C7" and v["ref"] == "fix/corrective-mission-360" and v["fp_match"] for v in ver),
    "consumers": {ref: [l for l in gtext("grep", "-l", "-I", "audit-screens", ref).splitlines()]
                  for ref in ("main", "fix/corrective-mission-360")},
}

# ── S8. C9 .evidence-session-token ───────────────────────────────
out["c9"] = {
    "tracked_on": {ref: bool(git("ls-tree", "-r", "--name-only", ref, "--", ".evidence-session-token").stdout.decode().strip())
                   for ref in ("main", "fix/corrective-mission-360", "origin/main", "origin/feature/ambient-motion-polish")},
    "fp_match": any(v["id"] == "C9" and v["fp_match"] for v in ver),
    "committed_at": git("log", "-1", "--format=%h %ad %s", "--date=iso", "main", "--",
                        ".evidence-session-token").stdout.decode().strip(),
    "referencing_files": {ref: [l for l in gtext("grep", "-l", "-I", r"\.evidence-session-token", ref).splitlines()]
                          for ref in ("main", "fix/corrective-mission-360", "origin/main")},
    "worktree_file_present": os.path.exists(os.path.join(REPO, ".evidence-session-token")),
}

# ── S9. DB census on a /tmp copy (originals untouched) ───────────
census = {"db_present": os.path.exists(os.path.join(REPO, "db/custom.db"))}
if census["db_present"]:
    tmpd = tempfile.mkdtemp(prefix="dbcensus_")
    for f in ("custom.db", "custom.db-wal", "custom.db-shm"):
        src = os.path.join(REPO, "db", f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(tmpd, f))
    try:
        con = sqlite3.connect(os.path.join(tmpd, "custom.db"))
        cur = con.cursor()
        tables = [r[0] for r in cur.execute("select name from sqlite_master where type='table'").fetchall()]
        census["tables"] = tables
        if "User" in tables:
            census["users_total"] = cur.execute("select count(*) from User").fetchone()[0]
            census["users_role_owner"] = cur.execute("select count(*) from User where role='owner'").fetchone()[0]
            cols = [r[1] for r in cur.execute("pragma table_info(User)").fetchall()]
            census["user_columns"] = cols
            if "username" in cols:
                census["users_named_sarika"] = cur.execute("select count(*) from User where username='sarika'").fetchone()[0]
                census["users_username_len16"] = cur.execute("select count(*) from User where length(username)=16").fetchone()[0]
                census["users_username_len_lt20"] = cur.execute("select count(*) from User where length(username)<20").fetchone()[0]
        if "Session" in tables:
            census["sessions_total"] = cur.execute("select count(*) from Session").fetchone()[0]
            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            census["sessions_unexpired"] = cur.execute("select count(*) from Session where expiresAt > ?", (now,)).fetchone()[0]
        con.close()
    except Exception as e:
        census["error"] = str(e)[:120]
    shutil.rmtree(tmpd, ignore_errors=True)
out["db_census"] = census

# ── S10. report-lib integrity + gitignore posture ────────────────
out["report_lib"] = {
    "blob_main": git("rev-parse", "main:scripts/corrective-report-lib.js").stdout.decode().strip(),
    "blob_fix": git("rev-parse", "fix/corrective-mission-360:scripts/corrective-report-lib.js").stdout.decode().strip(),
}
out["report_lib"]["identical_main_vs_fix"] = out["report_lib"]["blob_main"] == out["report_lib"]["blob_fix"]
rg_main = gtext("show", "main:.gitignore")
out["gitignore_main"] = {"mentions_download": "download" in rg_main,
                         "mentions_evidence_files": [pat for pat in (".evidence-password", ".evidence-session-token") if pat in rg_main]}
rg_fix = gtext("show", "fix/corrective-mission-360:.gitignore")
out["gitignore_fix_keystore_patterns"] = len(re.findall(r"(?im)^\s*\S*(keystore|jks|p12)", rg_fix))
out["vault_exists"] = os.path.exists("/home/z/keystore-vault")

with open(os.path.join(EV, "p06r_stage2_probe.json"), "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

# ── masked console summary ───────────────────────────────────────
print("== P0-6R Stage 2 masked probe ==")
print("HEAD:", refs["HEAD"][:12], "| main:", refs["main"][:12],
      "| fix:", refs["fix/corrective-mission-360"][:12], "| origin/main:", refs["origin/main"][:12])
print("main_drift:", out["main_drift_commits"])
print("wt_clean:", out["wt_porcelain"] == "")
print("fp checks:", len(ver), "matched:", sum(1 for v in ver if v["fp_match"]))
for v in ver:
    if not v["fp_match"]:
        print("  FP-MISMATCH:", v["id"], v["ref"], v["path"], v["method"])
print("worktree_presence:", {k: len(v) for k, v in presence.items()})
for k, v in presence.items():
    if v:
        print("   ", k, "->", v)
print("c3 conventional-android:", out["c3_is_conventional_android"],
      "| storepass in scripts:", out["c3_storepass_found_in"])
print("keytool recovery:", {k: keytool_result.get(k) for k in
      ("executed", "returncode", "keystore_type", "entries", "entry_count_line",
       "keypass_recovery_ok", "sha256_match_recorded")})
if keytool_result.get("validity"):
    print("  validity:", keytool_result["validity"])
print("c8 mint:", {k: out["c8_mint_fix"][k] for k in
      ("has_const_password_literal", "mentions_EVIDENCE_SESSION_SECRET",
       "process_env_refs", "has_env_fallback_pattern", "fp_C8_literal_present")})
print("c8 mint var fp:", [(v["name"], v["fp"], v["len"]) for v in out["c8_mint_fix"]["var_assignments"]])
print("c8 secret-tests on fix:", out["c8_secret_tests_on_fix"],
      "| env.example fix:", out["c8_env_example_fix_mentions_secret"])
print("c7:", {k: out["c7"][k] for k in ("identical_main_fix", "literal_fp_match_main", "literal_fp_match_fix")})
print("c7 consumers:", out["c7"]["consumers"])
print("c9:", {k: out["c9"][k] for k in ("fp_match", "committed_at", "worktree_file_present")})
print("c9 tracked_on:", out["c9"]["tracked_on"], "| refs:", out["c9"]["referencing_files"])
print("db_census:", {k: v for k, v in census.items() if k != "tables"})
print("keystore tracked_on:", out["keystore_tracked_on"], "| in tag trees:", out["keystore_in_tag_trees"])
print("vault exists:", out["vault_exists"], "| report_lib identical:", out["report_lib"]["identical_main_vs_fix"])
