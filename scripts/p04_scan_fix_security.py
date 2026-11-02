#!/usr/bin/env python3
"""
P0-4 Step 2 — full-reachable-history security audit of fix/corrective-mission-360.
LOCAL ONLY. No secret VALUES are ever written to output; only metadata (path, blob sha,
commit, pattern name, size). Evidence: 02-security-scan-fix.json / -summary.txt
"""
import subprocess, json, re, sys, os

REPO = "/home/z/my-project"
EV = "/home/z/my-project/download/RAHYAR_P0_PRE_PUSH_EVIDENCE"
FIX = "fix/corrective-mission-360"
MAIN = "main"
MAX_CONTENT_SCAN = 5 * 1024 * 1024  # skip content-regex for blobs > 5MB

KNOWN_SENSITIVE = {
    "a807354b1a9c17fa4e22df5ebc265f8006cf6f89": "android/rahyar-release.keystore (release signing keystore)",
    "16f4706e73f48494d5e3a0fdeab9e75259ab1e6d": ".evidence-password (evidence session credential)",
    "3b6bc8689e132af4e844931e401cab71dc9fd0ca": ".evidence-session-token (evidence session token)",
}

FILENAME_PATTERNS = [
    (r'(?i)(\.jks$|\.keystore$|keystore|\.pem$|\.p12$|\.pfx$|id_rsa|id_ed25519|id_dsa)', "keystore/private-key-filename"),
    (r'(?i)\.evidence', "evidence-session-artifact"),
    (r'(?i)(^|/)\.env', "env-file"),
    (r'(?i)(password|passwd)', "password-named-path"),
    (r'(?i)(token|credential|secret)', "credential-named-path"),
    (r'(?i)(\.sqlite$|\.db$|\.sqlite3$)', "database-file"),
]

CONTENT_PATTERNS = [
    ("private-key-block", re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----')),
    ("jks-binary-magic", None),  # handled via binary magic check on every blob
    ("aws-access-key-id", re.compile(r'\bAKIA[0-9A-Z]{16}\b')),
    ("google-api-key", re.compile(r'\bAIza[0-9A-Za-z_\-]{35}\b')),
    ("slack-token", re.compile(r'\bxox[baprs]-[0-9A-Za-z\-]{10,}')),
    ("github-token", re.compile(r'\bgh[pousr]_[0-9A-Za-z]{36,}\b')),
    ("bearer-literal", re.compile(r'(?i)authorization["\']?\s*[:=]\s*["\']?bearer\s+[A-Za-z0-9._\-]{16,}')),
    ("password-literal", re.compile(r'(?i)\b(password|passwd|pwd)\b\s*[=:]\s*["\'][^"\']{6,}["\']')),
    ("api-key-literal", re.compile(r'(?i)api[_-]?key\s*[=:]\s*["\'][^"\']{12,}["\']')),
    ("secret-literal", re.compile(r'(?i)\bsecret\b\s*[=:]\s*["\'][^"\']{10,}["\']')),
    ("token-literal", re.compile(r'(?i)\btoken\b\s*[=:]\s*["\'][^"\']{16,}["\']')),
    ("db-conn-with-creds", re.compile(r'(?i)\b(mysql|postgres|postgresql|mongodb(\+srv)?|redis)://[^\s:@/"]+:[^\s@/"]+@')),
]

def git(*args, binary=False, input_bytes=None):
    r = subprocess.run(["git", "-C", REPO, *args], capture_output=True, input=input_bytes)
    if r.returncode != 0:
        raise RuntimeError("git " + " ".join(args) + " -> " + r.stderr.decode("utf-8", "replace")[:300])
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")

def reachable_objects(ref):
    objs = {}
    for line in git("rev-list", "--objects", ref).splitlines():
        parts = line.split(" ", 1)
        objs[parts[0]] = parts[1] if len(parts) > 1 else ""
    return objs

def batch_types(shas):
    types = {}
    B = 1500
    for i in range(0, len(shas), B):
        chunk = shas[i:i + B]
        out = subprocess.run(["git", "-C", REPO, "cat-file",
                              "--batch-check=%(objecttype) %(objectsize) %(objectname)"],
                             input=("\n".join(chunk) + "\n").encode(), capture_output=True).stdout.decode()
        for line in out.splitlines():
            p = line.split()
            if len(p) == 3 and p[0] in ("blob", "tree", "commit"):
                types[p[2]] = (p[0], int(p[1]))
    return types

def blob_contents(shas):
    """yield (sha, bytes) via cat-file --batch"""
    B = 800
    for i in range(0, len(shas), B):
        chunk = shas[i:i + B]
        proc = subprocess.run(["git", "-C", REPO, "cat-file", "--batch"],
                              input=("\n".join(chunk) + "\n").encode(), capture_output=True)
        buf = proc.stdout
        pos = 0
        while pos < len(buf):
            nl = buf.find(b"\n", pos)
            if nl < 0:
                break
            header = buf[pos:nl].decode("utf-8", "replace").split()
            if len(header) >= 3 and header[1] == "blob":
                sha, size = header[0], int(header[2])
                data = buf[nl + 1: nl + 1 + size]
                yield sha, data
                pos = nl + 1 + size + 1  # trailing newline after content
            else:
                pos = nl + 1

def commits_introducing(ref, sha):
    out = git("log", ref, "--find-object=" + sha, "--format=%H|%aI|%s")
    return [l for l in out.splitlines() if l.strip()]

def main():
    report = {"generated_utc": None, "fix_ref": FIX, "main_ref": MAIN, "findings": [], "notes": []}

    fix_objs = reachable_objects(FIX)
    main_objs = reachable_objects(MAIN)
    types = batch_types(list(fix_objs.keys()))
    blobs = {s: types[s][1] for s, t in types.items() if t[0] == "blob"}

    # path map for blobs (rev-list gives one path per object; collect all paths via trees too)
    blob_paths = {}
    for sha, path in fix_objs.items():
        if sha in blobs and path:
            blob_paths.setdefault(sha, set()).add(path)

    # ---- verify known sensitive blobs unreachable from fix ----
    known_results = []
    for sha, desc in KNOWN_SENSITIVE.items():
        in_fix = sha in fix_objs
        in_main = sha in main_objs
        known_results.append({"blob": sha, "description": desc,
                              "reachable_from_fix": in_fix, "reachable_from_main": in_main})
    report["known_sensitive_blobs"] = known_results

    # ---- main-only blobs (context; expected to include the sensitive 3) ----
    main_only_blobs = sorted(set(main_objs) - set(fix_objs))
    report["counts"] = {
        "fix_reachable_objects": len(fix_objs),
        "fix_reachable_blobs": len(blobs),
        "main_reachable_blobs": len({s for s in main_objs if s in set(main_objs)}),
        "blobs_in_main_not_in_fix": len(main_only_blobs),
    }

    findings = []
    def add(kind, blob, size, paths, detail, commits):
        findings.append({"type": kind, "blob": blob, "size": size,
                         "paths": sorted(paths), "detail": detail,
                         "introducing_commits": commits})

    # ---- filename-based suspects across ALL paths reachable in fix history ----
    # (paths from rev-list cover all named blobs/trees reachable now = full history paths)
    all_paths = set(p for p in fix_objs.values() if p)
    fn_hits = {}
    for p in all_paths:
        for pat, kind in FILENAME_PATTERNS:
            if re.search(pat, p):
                fn_hits.setdefault(p, set()).add(kind)
    for p, kinds in sorted(fn_hits.items()):
        # find blobs at this path & commits
        try:
            log = git("log", FIX, "--format=%H|%aI|%s", "--", p).splitlines()
        except RuntimeError:
            log = []
        # blob shas that ever lived at this path (approx: blobs whose rev-list path == p)
        shas_at_path = [s for s, ps in blob_paths.items() if p in ps]
        for k in kinds:
            add("filename:" + k, shas_at_path[0] if shas_at_path else None, None, [p],
                "path matches filename pattern", log[:6])

    # ---- content-based scan of every blob reachable from fix ----
    scanned = 0
    skipped_large = 0
    for sha, data in blob_contents([s for s in blobs]):
        size = len(data)
        if size > MAX_CONTENT_SCAN:
            skipped_large += 1
            # still check magic on big binaries
            if data[:4] in (b"\xfe\xed\xfe\xed", b"\xce\xce\xce\xce"):
                paths = blob_paths.get(sha, {"<unknown>"})
                add("content:jks-binary-magic", sha, size, paths,
                    "large binary with JKS magic", commits_introducing(FIX, sha)[:6])
            continue
        scanned += 1
        hits = set()
        if data[:4] in (b"\xfe\xed\xfe\xed", b"\xce\xce\xce\xce"):
            hits.add("jks-binary-magic")
        try:
            text = data.decode("utf-8")
            is_text = True
        except UnicodeDecodeError:
            is_text = False
        if is_text:
            for name, rx in CONTENT_PATTERNS:
                if rx is None:
                    continue
                if rx.search(text):
                    hits.add(name)
        if hits:
            paths = blob_paths.get(sha, {"<unknown>"})
            for h in hits:
                add("content:" + h, sha, size, paths,
                    "pattern matched in blob content (value NOT recorded)",
                    commits_introducing(FIX, sha)[:6])

    report["content_scan"] = {"blobs_scanned": scanned, "blobs_skipped_large": skipped_large}
    report["findings"] = findings

    # dedupe
    seen, dedup = set(), []
    for f in findings:
        key = (f["type"], f["blob"], tuple(f["paths"]))
        if key not in seen:
            seen.add(key); dedup.append(f)
    report["findings"] = dedup

    import datetime
    report["generated_utc"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    os.makedirs(EV, exist_ok=True)
    with open(EV + "/02-security-scan-fix.json", "w") as fh:
        json.dump(report, fh, indent=1, ensure_ascii=False)

    # human summary (metadata only)
    with open(EV + "/02-security-scan-fix-summary.txt", "w") as fh:
        fh.write("P0-4 STEP2 — security scan of %s (full reachable history)\n" % FIX)
        fh.write("generated: %s\n\n" % report["generated_utc"])
        fh.write("counts: %s\n\n" % json.dumps(report["counts"]))
        fh.write("known sensitive blobs (from main) reachability check:\n")
        for k in known_results:
            fh.write("  blob=%s fix=%s main=%s  (%s)\n" % (k["blob"][:12], k["reachable_from_fix"], k["reachable_from_main"], k["description"]))
        fh.write("\nfindings (%d, deduped):\n" % len(dedup))
        for f in dedup:
            fh.write("- type=%s blob=%s size=%s paths=%s detail=%s\n" %
                     (f["type"], (f["blob"] or "-")[:12], f["size"], f["paths"], f["detail"]))
            for c in f["introducing_commits"][:3]:
                fh.write("    commit: %s\n" % c)
        fh.write("\nNOTE: no secret values are recorded anywhere in this evidence.\n")

    print("scan complete: findings=%d blobs_scanned=%d skipped_large=%d" %
          (len(dedup), scanned, skipped_large))
    for f in dedup:
        print("  -", f["type"], (f["blob"] or "-")[:12], ",".join(sorted(f["paths"]))[:120])

if __name__ == "__main__":
    main()
