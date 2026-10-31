#!/usr/bin/env python3
"""P0-6R masked re-verification (read-only). Prints and stores ONLY masked results.
No raw credential value is ever printed, logged or stored. fp = sha256(value)[:12]."""
import subprocess, hashlib, json, os, re, sqlite3, datetime

REPO = "/home/z/my-project"
EV = "/home/z/my-project/download/P0_6R_evidence"
os.makedirs(EV, exist_ok=True)
out = {"mission": "P0-6R", "at_tehran": datetime.datetime.now().isoformat(timespec="seconds"),
       "masking": "fp=sha256(value)[:12]; no raw value stored"}

def git(*args):
    return subprocess.run(["git", "-C", REPO] + list(args), capture_output=True)

# ── 1) refs fixation ─────────────────────────────────────────────
refs = {}
for name in ("HEAD", "main", "fix/corrective-mission-360", "origin/main",
             "origin/feature/ambient-motion-polish"):
    refs[name] = git("rev-parse", name).stdout.decode().strip()
out["refs"] = refs
out["ahead_behind"] = {
    "main_vs_origin": git("rev-list", "--left-right", "--count", "main...origin/main").stdout.decode().split(),
    "fix_vs_origin": git("rev-list", "--left-right", "--count", "fix/corrective-mission-360...origin/main").stdout.decode().split(),
}
out["worktrees"] = git("worktree", "list", "--porcelain").stdout.decode().count("worktree ")
out["wt_clean"] = git("status", "--porcelain").stdout.decode().strip() == ""

# ── 2) fingerprint verification of C1..C10 (masked) ──────────────
FP = {
    "C1": "cec51518b9ac", "C2": "ee0880daa2ca", "C3": "f60ed56a9c82",
    "C4": "dd65b755befe", "C5": "8eb38003b10d", "C6": "e20de4c418c6",
    "C7": "46d0a91d1e48", "C8": "8aa62d3b0a15", "C9": "ff9d8259a6e5",
    "C10": "9774fdedae3b",
}
TARGETS = [
    ("C1", "origin/main", "scripts/preview-setup.ts"),
    ("C1", "origin/feature/ambient-motion-polish", "scripts/preview-setup.ts"),
    ("C2", "origin/main", "scripts/test-user-isolation.ts"),
    ("C3", "origin/main", "scripts/build-android-rebuild.sh"),
    ("C4", "origin/main", "scripts/build-android-apk.sh"),
    ("C5", "origin/main", "scripts/live-v2-tests.cjs"),
    ("C6", "origin/main", "scripts/live-v2-tests.cjs"),
    ("C10", "origin/main", "scripts/live-final-audit.ts"),
    ("C7", "fix/corrective-mission-360", "scripts/audit-screens.mjs"),
    ("C8", "fix/corrective-mission-360", "scripts/mint-evidence-session.mjs"),
]

def fp_of(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()[:12]

def candidates(text: str):
    # quoted literals + plain tokens; never printed, only hashed
    for m in re.finditer(r"['\"]([^'\"\n]{4,120})['\"]", text):
        yield m.group(1)
    for tok in re.split(r"[\s\"'`,;:=(){}\[\]<>]+", text):
        if 4 <= len(tok) <= 120:
            yield tok

ver = []
for cid, ref, path in TARGETS:
    r = git("show", f"{ref}:{path}")
    ok, method = False, ""
    if r.returncode == 0:
        text = r.stdout.decode("utf-8", "replace")
        # quoted literals first
        for c in re.findall(r"['\"]([^'\"\n]{4,120})['\"]", text):
            if fp_of(c.encode()) == FP[cid]:
                ok, method = True, "quoted-literal"
                break
        if not ok:
            for c in candidates(text):
                if fp_of(c.encode()) == FP[cid]:
                    ok, method = True, "token"
                    break
    else:
        method = "blob-missing"
    ver.append({"id": cid, "ref": ref, "path": path, "fp_match": ok, "method": method})

# value files (whole-file content)
for cid, path in (("C8", ".evidence-password"), ("C9", ".evidence-session-token")):
    r = git("show", f"HEAD:{path}")
    ok = False
    if r.returncode == 0:
        raw = r.stdout
        for cand in (raw, raw.rstrip(b"\r\n"), raw.strip()):
            if fp_of(cand) == FP[cid]:
                ok = True
                break
    ver.append({"id": cid, "ref": "HEAD(main)", "path": path, "fp_match": ok,
                "method": "whole-file" if r.returncode == 0 else "blob-missing"})
out["fp_verification"] = ver

# ── 3) mint script posture on fix (P0-5 applied?) ────────────────
r = git("show", "fix/corrective-mission-360:scripts/mint-evidence-session.mjs")
mint = r.stdout.decode("utf-8", "replace") if r.returncode == 0 else ""
out["mint_fix"] = {
    "present": r.returncode == 0,
    "has_const_password_literal": bool(re.search(r"const\s+PASSWORD\s*=\s*['\"]", mint)),
    "mentions_EVIDENCE_SESSION_SECRET": "EVIDENCE_SESSION_SECRET" in mint,
    "process_env_refs": mint.count("process.env"),
    "lines": mint.count("\n") + 1 if mint else 0,
}
r2 = git("show", "HEAD:.env.example")
envex = r2.stdout.decode("utf-8", "replace") if r2.returncode == 0 else ""
out["env_example_mentions_EVIDENCE_SESSION_SECRET"] = "EVIDENCE_SESSION_SECRET" in envex

# ── 4) sensitive files: tracked where? ───────────────────────────
def tracked(ref, path):
    return git("ls-tree", "-r", "--name-only", ref, "--", path).stdout.decode().strip() != ""
sens = {}
for p in ("android/rahyar-release.keystore", ".evidence-password", ".evidence-session-token"):
    sens[p] = {
        "on_main": tracked("main", p),
        "on_fix": tracked("fix/corrective-mission-360", p),
        "on_origin_main": tracked("origin/main", p),
        "on_origin_feature": tracked("origin/feature/ambient-motion-polish", p),
    }
ks = os.path.join(REPO, "android/rahyar-release.keystore")
if os.path.exists(ks):
    h = hashlib.sha256(open(ks, "rb").read()).hexdigest()
    sens["android/rahyar-release.keystore"]["worktree_sha256"] = h
    sens["android/rahyar-release.keystore"]["sha256_match_recorded"] = (
        h == "d4b7169a21f8f113f7cf8104c0b5dd32a9d06f9aaa87dc263d1fc5b905b21898")
out["sensitive_files"] = sens
out["gitignore_download_ignored"] = "download" in open(os.path.join(REPO, ".gitignore")).read()
out["keystore_vault_exists"] = os.path.exists("/home/z/keystore-vault")

# ── 5) report lib integrity (main vs fix blob equality) ──────────
out["report_lib"] = {
    "blob_main": git("rev-parse", "HEAD:scripts/corrective-report-lib.js").stdout.decode().strip(),
    "blob_fix": git("rev-parse", "fix/corrective-mission-360:scripts/corrective-report-lib.js").stdout.decode().strip(),
}
out["report_lib"]["identical_main_vs_fix"] = (
    out["report_lib"]["blob_main"] == out["report_lib"]["blob_fix"])
import hashlib as _h
libp = os.path.join(REPO, "scripts/corrective-report-lib.js")
out["report_lib"]["worktree_sha256"] = _h.sha256(open(libp, "rb").read()).hexdigest()

# ── 6) read-only DB census (counts only) ─────────────────────────
DB = os.path.join(REPO, "db/custom.db")
census = {"db_present": os.path.exists(DB)}
if census["db_present"]:
    try:
        con = sqlite3.connect("file:%s?mode=ro" % DB, uri=True)
        cur = con.cursor()
        tables = [r[0] for r in cur.execute("select name from sqlite_master where type='table'").fetchall()]
        census["tables"] = tables
        if "User" in tables:
            census["users"] = cur.execute("select count(*) from User").fetchone()[0]
            census["owner_rows"] = cur.execute("select count(*) from User where role='owner'").fetchone()[0]
        if "Session" in tables:
            census["sessions"] = cur.execute("select count(*) from Session").fetchone()[0]
            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            census["unexpired_sessions"] = cur.execute(
                "select count(*) from Session where expiresAt > ?", (now,)).fetchone()[0]
        con.close()
    except Exception as e:
        census["error"] = str(e)[:100]
out["db_census"] = census

# ── 7) fix .gitignore hardening (counts only) ────────────────────
rg = git("show", "fix/corrective-mission-360:.gitignore").stdout.decode("utf-8", "replace")
out["fix_gitignore_keystore_patterns"] = len(re.findall(r"(?im)^\s*\S*(keystore|jks|p12)", rg))

with open(os.path.join(EV, "p06r_verify.json"), "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

# ── masked console summary ───────────────────────────────────────
print("== P0-6R masked re-verification ==")
print("HEAD:", refs["HEAD"][:12], "| main:", refs["main"][:12], "| fix:", refs["fix/corrective-mission-360"][:12], "| origin/main:", refs["origin/main"][:12])
print("wt_clean:", out["wt_clean"], "| worktrees:", out["worktrees"])
fails = [v for v in ver if not v["fp_match"]]
print("fp checks:", len(ver), "matched:", len(ver) - len(fails), "failed:", len(fails))
for v in fails:
    print("  FP-MISMATCH:", v["id"], v["ref"], v["path"], v.get("method"))
print("mint_fix:", out["mint_fix"])
print("sensitive files tracked-on:", {p: (d["on_main"], d["on_fix"], d["on_origin_main"]) for p, d in sens.items()})
print("keystore sha256 match:", sens["android/rahyar-release.keystore"].get("sha256_match_recorded"))
print("report_lib identical main/fix:", out["report_lib"]["identical_main_vs_fix"], "| sha256:", out["report_lib"]["worktree_sha256"][:16])
print("db_census:", census)
print("env_example SECRET key:", out["env_example_mentions_EVIDENCE_SESSION_SECRET"],
      "| fix gitignore keystore patterns:", out["fix_gitignore_keystore_patterns"],
      "| vault exists:", out["keystore_vault_exists"],
      "| download ignored:", out["gitignore_download_ignored"])
