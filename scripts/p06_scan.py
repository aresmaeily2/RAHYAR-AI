#!/usr/bin/env python3
"""
P0-6 blob-level secret scanner.  NEVER prints or stores raw secret values.
For every candidate match it stores only:
  - detector name, line number
  - sha256 fingerprint (12 hex) of the matched value
  - value length
  - value class (LITERAL / PLACEHOLDER / ENV_REF / WEAK_NUMERIC)
  - masked context line (value replaced by <R:fp:len>)

Usage:
  python3 scripts/p06_scan.py --name public  --refs origin/main,origin/feature/ambient-motion-polish,v1.0.0-rc1,v1.1.0,v1.2.0
  python3 scripts/p06_scan.py --name fixxfer --refs fix/corrective-mission-360 --exclude origin/main,origin/feature/ambient-motion-polish,v1.0.0-rc1,v1.1.0,v1.2.0
"""
import argparse, hashlib, json, math, os, re, subprocess, sys
from datetime import datetime, timezone

REPO = "/home/z/my-project"
OUT_DIR = os.path.join(REPO, "download", "P0_6_evidence")

# ---------------------------------------------------------------- git helpers
def git(*args, inp=None):
    r = subprocess.run(["git", "-C", REPO] + list(args),
                       input=inp, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError("git %s failed: %s" % (" ".join(args), r.stderr.decode(errors="replace")[:300]))
    return r.stdout

def git_text(*args):
    return git(*args).decode(errors="replace")

# ---------------------------------------------------------------- detectors
# (name, compiled regex, capture-group-index or None)
DETECTORS = [
    ("PEM_PRIVATE_KEY",  re.compile(rb"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----"), None),
    ("PEM_ENCRYPTED_KEY",re.compile(rb"-----BEGIN ENCRYPTED PRIVATE KEY-----"), None),
    ("JWT",              re.compile(rb"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}"), None),
    ("AWS_ACCESS_KEY",   re.compile(rb"AKIA[0-9A-Z]{16}"), None),
    ("GITHUB_TOKEN",     re.compile(rb"gh[pousr]_[A-Za-z0-9]{16,}"), None),
    ("SLACK_TOKEN",      re.compile(rb"xox[baprs]-[A-Za-z0-9-]{8,}"), None),
    ("GOOGLE_API_KEY",   re.compile(rb"AIza[0-9A-Za-z_\-]{30,}"), None),
    ("STRIPE_KEY",       re.compile(rb"(sk|rk)_(live|test)_[0-9a-zA-Z]{16,}"), None),
    ("URL_EMBEDDED_CREDS", re.compile(rb"[a-zA-Z][a-zA-Z0-9+.\-]{1,20}://[^/\s:@]{1,64}:([^/\s:@]{3,128})@"), 1),
    ("GENERIC_ASSIGN",   re.compile(rb"(?i)\b(pass(word|wd)?|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|secret[_-]?key|auth[_-]?token|client[_-]?secret|session[_-]?token|bearer)\b\s*[:=]\s*[\"']?([^\s\"'<>`]{4,})[\"']?", ), 3),
    ("ENV_STYLE_VAR",    re.compile(rb"(?m)^([A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|ACCESS_KEY|PRIVATE_KEY)[A-Z0-9_]*)\s*=\s*(\S+)\s*$", ), 2),
    ("HIGH_ENTROPY_HEX", re.compile(rb"\b[a-f0-9]{40,}\b"), None),
]

ENV_REF_RE   = re.compile(rb"^(\$\{[A-Za-z_][A-Za-z0-9_]*\}|\$[A-Za-z_][A-Za-z0-9_]*|process\.env\.[A-Za-z_][A-Za-z0-9_]*|os\.environ(\.get)?\(|env\.[A-Za-z_][A-Za-z0-9_]*)")
PLACEHOLDER_RE = re.compile(
    rb"^(your[-_].*|xxx+|<[^>]+>|\{\{.*\}\}|\[\[.*\]\]|changeme|change[-_]me|placeholder|"
    rb"example[-_].*|dummy[-_].*|redacted\*?|\*{3,}|\.{3,}|none|null|true|false|n/?a|"
    rb"test[-_]?value|sample[-_].*|fixme|todo|insert[-_].*|replace[-_].*|<password>|<token>)$", re.IGNORECASE)
WEAK_NUMERIC_RE = re.compile(rb"^[0-9]{4,8}$|^(password|admin|123456|12345678|qwerty|letmein|dev|dev123|test123)$", re.IGNORECASE)

MASK_TOKEN_RE = re.compile(rb"[A-Za-z0-9+/_\-=]{16,}")   # long tokens inside context lines

def classify(value: bytes) -> str:
    v = value.strip()
    if ENV_REF_RE.match(v):
        return "ENV_REF"
    if PLACEHOLDER_RE.match(v):
        return "PLACEHOLDER"
    if WEAK_NUMERIC_RE.match(v):
        return "WEAK_LITERAL"
    return "LITERAL"

def fingerprint(value: bytes) -> str:
    return hashlib.sha256(value.strip()).hexdigest()[:12]

def mask_context(line: bytes, spans) -> str:
    """Replace every matched span and any long token with a redaction marker."""
    out = line
    # replace from the end to keep span offsets valid
    for (s, e, val) in sorted(spans, key=lambda t: -t[0]):
        marker = ("<R:" + fingerprint(val) + ":len=" + str(len(val.strip())) + ">").encode()
        out = out[:s] + marker + out[e:]
    def _mask_long(m):
        tok = m.group(0)
        return b"<MASK:len=" + str(len(tok)).encode() + b">"
    out = MASK_TOKEN_RE.sub(_mask_long, out)
    return out.decode(errors="replace").strip()[:220]

# ---------------------------------------------------------------- scanning
def list_refs():
    refs = {}
    for line in git_text("for-each-ref", "--format=%(refname) %(objectname)").splitlines():
        parts = line.split()
        if len(parts) == 2:
            refs[parts[0]] = parts[1]
    return refs

def blob_path_map(refs, exclude=()):
    cmd = ["rev-list", "--objects"] + list(refs)
    if exclude:
        cmd += ["--not"] + list(exclude)
    out = git_text(*cmd)
    m = {}
    for line in out.splitlines():
        parts = line.split(" ", 1)
        if len(parts) == 2 and re.fullmatch(r"[0-9a-f]{40}", parts[0]):
            m.setdefault(parts[0], set()).add(parts[1])
    return m

def object_types(shas):
    types = {}
    batch = 2000
    lst = list(shas)
    for i in range(0, len(lst), batch):
        chunk = lst[i:i+batch]
        out = git("cat-file", "--batch-check", inp=("\n".join(chunk) + "\n").encode()).decode()
        for line in out.splitlines():
            p = line.split()
            if len(p) >= 2:
                types[p[0]] = p[1]
    return types

def scan_blob(sha, paths):
    raw = git("cat-file", "blob", sha)
    size = len(raw)
    binary = b"\x00" in raw[:8192]
    matches = []
    seen_fp = set()
    for name, rx, gidx in DETECTORS:
        for m in rx.finditer(raw):
            if gidx is not None:
                val = m.group(gidx) or b""
                # line span: expand to containing line
                ls = raw.rfind(b"\n", 0, m.start(gidx)) + 1
                le = raw.find(b"\n", m.end(gidx))
                if le == -1: le = len(raw)
            else:
                val = m.group(0)
                ls = raw.rfind(b"\n", 0, m.start()) + 1
                le = raw.find(b"\n", m.end())
                if le == -1: le = len(raw)
            line = raw[ls:le]
            lineno = raw.count(b"\n", 0, ls) + 1
            fp = fingerprint(val)
            cls = classify(val)
            key = (name, fp)
            if key in seen_fp:
                continue
            seen_fp.add(key)
            matches.append({
                "detector": name,
                "line": lineno,
                "class": cls,
                "fp": fp,
                "len": len(val.strip()),
                "context_masked": mask_context(line, [(max(0, ls and raw.rfind(val, ls, le) or line.find(val)), 0, val)]) if False else mask_context(line, [(line.find(val), line.find(val) + len(val), val)] if line.find(val) != -1 else []),
            })
    if not matches:
        return None
    return {"blob": sha, "paths": sorted(paths), "size": size, "binary": binary, "matches": matches}

def scan_messages(refs, exclude=()):
    cmd = ["log", "--format=%H%x00%ad%x00%s%x00%b", "--date=short"] + list(refs)
    if exclude:
        cmd += ["--not"] + list(exclude)
    out = git(*cmd).decode(errors="replace")
    findings = []
    for rec in out.split("\n"):
        if not rec.strip():
            continue
        parts = rec.split("\x00", 3)
        if len(parts) < 4:
            continue
        sha, date, subj, body = parts
        text = (subj + "\n" + body).encode(errors="replace")
        hits = []
        for name, rx, gidx in DETECTORS:
            for m in rx.finditer(text):
                val = (m.group(gidx) or m.group(0)) if gidx is not None else m.group(0)
                cls = classify(val)
                if cls in ("ENV_REF",):
                    continue
                hits.append({"detector": name, "class": cls, "fp": fingerprint(val),
                             "len": len(val.strip()),
                             "context_masked": mask_context(text[:400], [(m.start(gidx) if gidx is not None else m.start(),
                                                                          m.end(gidx) if gidx is not None else m.end(), val)])})
        if hits:
            findings.append({"commit": sha, "date": date, "subject_masked": mask_context(subj.encode(), []), "hits": hits})
    return findings

def introduced_by(sha, limit=8):
    try:
        out = git_text("log", "--all", "--find-object=" + sha, "--format=%H|%ad|%s", "--date=short")
        recs = []
        for line in out.splitlines()[:limit]:
            p = line.split("|", 2)
            if len(p) == 3:
                recs.append({"commit": p[0], "date": p[1], "subject": mask_context(p[2].encode(), [])})
        return recs
    except Exception:
        return []

SUSPICIOUS_PATH_RE = re.compile(
    r"(?i)(\.env($|\.)|\.pem$|\.key$|\.jks$|\.keystore$|\.p12$|\.pfx$|id_rsa|\.kdbx|"
    r"keystore|password|passwd|credential|secret|token|\.evidence-|session-token|auth\.json|\.npmrc|\.netrc)")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--refs", required=True)
    ap.add_argument("--exclude", default="",
                    help="refs excluded by BLOB-LEVEL subtraction (correct semantics)")
    args = ap.parse_args()

    refs = [r.strip() for r in args.refs.split(",") if r.strip()]
    excl = [r.strip() for r in args.exclude.split(",") if r.strip()]

    all_refs = list_refs()
    print("refs in repo: %d" % len(all_refs), file=sys.stderr)

    # base object list WITHOUT --not (commit-level --not does NOT remove shared blobs)
    bpm = blob_path_map(refs, ())
    types_all = object_types(bpm.keys())

    if excl:
        excl_blobs = set()
        eobjs = blob_path_map(excl, ())
        etypes = object_types(eobjs.keys())
        for s, t in etypes.items():
            if t == "blob":
                excl_blobs.add(s)
        before = len(bpm)
        bpm = {s: p for s, p in bpm.items() if s not in excl_blobs}
        print("blob-level subtraction: %d excluded blobs, objects %d -> %d" % (
            len(excl_blobs), before, len(bpm)), file=sys.stderr)

    types = types_all
    blobs = {s: p for s, p in bpm.items() if types.get(s) == "blob"}
    print("scanning %d blobs (from %d objects)" % (len(blobs), len(bpm)), file=sys.stderr)

    # per-ref blob sets for containment answers
    containment_refs = sorted(all_refs.keys())
    ref_sets = {}
    for r in containment_refs:
        try:
            out = git_text("rev-list", r, "--objects")
            ref_sets[r] = set(l.split(" ", 1)[0] for l in out.splitlines() if l)
        except Exception:
            ref_sets[r] = set()
    print("containment sets built for %d refs" % len(ref_sets), file=sys.stderr)

    findings = []
    fp_index = {}   # value fingerprint -> list of (blob, detector)
    for i, (sha, paths) in enumerate(sorted(blobs.items())):
        res = scan_blob(sha, paths)
        if res:
            res["refs_containing"] = [r for r in containment_refs if sha in ref_sets[r]]
            res["introduced_by"] = introduced_by(sha)
            findings.append(res)
            for mm in res["matches"]:
                fp_index.setdefault(mm["fp"], []).append({"blob": sha, "detector": mm["detector"], "path": sorted(paths)[0] if paths else ""})
        if i % 300 == 0:
            print("  ..%d/%d scanned, %d flagged" % (i, len(blobs), len(findings)), file=sys.stderr)

    # duplicates by value fingerprint
    duplicates = {fp: occ for fp, occ in fp_index.items() if len(occ) > 1}

    # suspicious path names among scanned objects (regardless of content)
    sus_paths = sorted(set(pp for pset in blobs.values() for pp in pset if SUSPICIOUS_PATH_RE.search(pp)))

    msg_findings = scan_messages(refs, excl)

    result = {
        "scan_name": args.name,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "refs": refs,
        "excluded": excl,
        "blobs_scanned": len(blobs),
        "flagged_blobs": len(findings),
        "findings": findings,
        "duplicate_value_fingerprints": duplicates,
        "suspicious_paths": sus_paths,
        "commit_message_findings": msg_findings,
        "note": "No raw secret values are stored. fp=sha256(value)[:12]; contexts masked.",
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, "scan_%s.json" % args.name)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print("wrote %s" % out_path, file=sys.stderr)

    # stdout summary (masked only)
    print("== scan %s: %d blobs, %d flagged, %d dup-fps, %d msg-findings, %d suspicious paths ==" % (
        args.name, len(blobs), len(findings), len(duplicates), len(msg_findings), len(sus_paths)))
    for f_ in findings:
        for p in f_["paths"][:2]:
            print("  BLOB %s size=%d bin=%s refs=%s path=%s" % (
                f_["blob"][:12], f_["size"], f_["binary"], ",".join(f_["refs_containing"][:4]), p))
        for mm in f_["matches"]:
            print("     - %s class=%s fp=%s len=%d line=%d ctx=%s" % (
                mm["detector"], mm["class"], mm["fp"], mm["len"], mm["line"], mm["context_masked"][:110]))

if __name__ == "__main__":
    main()
