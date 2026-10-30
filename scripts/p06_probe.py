#!/usr/bin/env python3
"""
P0-6 probe: enriched MASKED analysis of scan findings + masked file views.
Never prints a raw secret value.

Modes:
  --fps fp1,fp2,...            : enrich every match with these fingerprints (all scan JSONs)
  --view ref:path [--max n]    : print file with all detector values masked + env-read annotations
"""
import argparse, hashlib, json, math, os, re, subprocess, sys

REPO = "/home/z/my-project"
EV = os.path.join(REPO, "download", "P0_6_evidence")
SCANS = ["scan_public.json", "scan_fixxfer.json", "scan_mainonly.json"]

DETECTORS = [
    ("PEM_PRIVATE_KEY",  re.compile(rb"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----"), None),
    ("JWT",              re.compile(rb"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}"), None),
    ("AWS_ACCESS_KEY",   re.compile(rb"AKIA[0-9A-Z]{16}"), None),
    ("GITHUB_TOKEN",     re.compile(rb"gh[pousr]_[A-Za-z0-9]{16,}"), None),
    ("URL_EMBEDDED_CREDS", re.compile(rb"[a-zA-Z][a-zA-Z0-9+.\-]{1,20}://[^/\s:@]{1,64}:([^/\s:@]{3,128})@"), 1),
    ("GENERIC_ASSIGN",   re.compile(rb"(?i)\b(pass(word|wd)?|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|secret[_-]?key|auth[_-]?token|client[_-]?secret|session[_-]?token|bearer)\b\s*[:=]\s*[\"']?([^\s\"'<>`]{4,})[\"']?"), 3),
    ("ENV_STYLE_VAR",    re.compile(rb"(?m)^([A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|ACCESS_KEY|PRIVATE_KEY)[A-Z0-9_]*)\s*=\s*(\S+)\s*$"), 2),
    ("HIGH_ENTROPY_HEX", re.compile(rb"\b[a-f0-9]{40,}\b"), None),
]

def git(*args):
    r = subprocess.run(["git", "-C", REPO] + list(args), capture_output=True)
    if r.returncode != 0:
        raise RuntimeError("git %s: %s" % (" ".join(args), r.stderr.decode(errors="replace")[:200]))
    return r.stdout

def classseq(v: bytes) -> str:
    def cls(c):
        if 65 <= c <= 90: return "A"
        if 97 <= c <= 122: return "a"
        if 48 <= c <= 57: return "0"
        return "?"
    s = "".join(cls(c) for c in v.strip())
    out, prev, n = [], None, 0
    for ch in s:
        if ch == prev:
            n += 1
        else:
            if prev is not None:
                out.append(prev + (str(n) if n > 1 else ""))
            prev, n = ch, 1
    out.append(prev + (str(n) if n > 1 else ""))
    seq = "".join(out)
    persian = False
    try:
        t = v.strip().decode("utf-8")
        persian = any("\u0600" <= ch <= "\u06FF" for ch in t)
    except Exception:
        pass
    return "seq=%s persian=%s" % (seq[:80], persian)

def shape(v: bytes) -> str:
    v = v.strip()
    n = len(v)
    if n == 0:
        return "empty"
    low = v.lower()
    flags = []
    if b"(" in v or b")" in v: flags.append("has-paren")
    if b")" in v and (b".toString" in v or b"randomB" in low or b"uuid" in low or b"join" in low): flags.append("code-call")
    if b"randomb" in low or b"tostring" in low or b"uuid" in low or b"base64url" in low: flags.append("code-token")
    if b"your" in low or b"token>" in low or b"replace" in low or b"xxxx" in low: flags.append("placeholder-ish")
    lower = sum(1 for c in v if 97 <= c <= 122)
    upper = sum(1 for c in v if 65 <= c <= 90)
    dig = sum(1 for c in v if 48 <= c <= 57)
    spec = n - lower - upper - dig
    distinct = len(set(v))
    freq = {}
    for c in v:
        freq[c] = freq.get(c, 0) + 1
    ent = -sum((f / n) * math.log2(f / n) for f in freq.values())
    allsame = "SAME-CHAR" if distinct == 1 else ""
    kind = []
    if lower == n: kind.append("all-lower")
    if upper == n: kind.append("all-upper")
    if dig == n: kind.append("all-digit")
    if spec == 0 and lower + upper + dig == n: kind.append("alnum")
    if b"*" in v or b"\xc2" in v: kind.append("has-star/utf")
    return ("len=%d low=%d up=%d dig=%d spec=%d distinct=%d entropy=%.2f %s %s %s"
            % (n, lower, upper, dig, spec, distinct, ent, ",".join(kind), " ".join(kind), allsame)).strip()

def mask_line(line: bytes) -> str:
    out = line
    spans = []
    for name, rx, gi in DETECTORS:
        for m in rx.finditer(out):
            s, e = (m.start(gi), m.end(gi)) if gi is not None else (m.start(), m.end())
            val = out[s:e]
            if not val:
                continue
            fp = hashlib.sha256(val.strip()).hexdigest()[:12]
            spans.append((s, e, fp, len(val.strip())))
    for (s, e, fp, ln) in sorted(set(spans), key=lambda t: -t[0]):
        out = out[:s] + ("<R:%s:len=%d>" % (fp, ln)).encode() + out[e:]
    long_tok = re.compile(rb"[A-Za-z0-9+/_\-=]{24,}")
    out = long_tok.sub(lambda m: b"<MASK:len=" + str(len(m.group(0))).encode() + b">", out)
    return out.decode(errors="replace").rstrip()[:200]

def env_annotations(raw: bytes) -> list:
    ann = []
    for i, line in enumerate(raw.split(b"\n"), 1):
        if re.search(rb"process\.env|os\.environ|getenv|readFileSync|ENV\[|\.env\b", line):
            ann.append("  env/read L%d: %s" % (i, mask_line(line)[:160]))
    return ann[:20]

def run_fps(fps):
    occ = {}
    for sname in SCANS:
        p = os.path.join(EV, sname)
        if not os.path.exists(p):
            continue
        d = json.load(open(p, encoding="utf-8"))
        for fb in d["findings"]:
            for mm in fb["matches"]:
                if mm["fp"] in fps:
                    occ.setdefault(mm["fp"], []).append((sname, fb, mm))
    for fp in sorted(fps):
        rows = occ.get(fp, [])
        if not rows:
            print("fp=%s : (not present in scans)" % fp)
            continue
        sname, fb, mm = rows[0]
        raw = git("cat-file", "blob", fb["blob"])
        lines = raw.split(b"\n")
        val = None
        if mm["line"] - 1 < len(lines):
            line = lines[mm["line"] - 1]
            for name, rx, gi in DETECTORS:
                for m in rx.finditer(line):
                    v = (m.group(gi) or m.group(0)) if gi is not None else m.group(0)
                    if hashlib.sha256(v.strip()).hexdigest()[:12] == fp:
                        val = v
                        break
                if val: break
        sh = shape(val) if val else "(value not re-extracted)"
        print("fp=%s class=%-12s det=%-18s occurrences=%d" % (fp, mm["class"], mm["detector"], len(rows)))
        print("   shape: %s" % sh)
        if val:
            print("   %s" % classseq(val))
        seen = set()
        for (sn, f2, m2) in rows:
            key = (tuple(f2["paths"][:2]), f2["blob"][:8])
            if key in seen: continue
            seen.add(key)
            pub = [r for r in f2["refs_containing"] if r.startswith("refs/remotes/origin/") or r.startswith("refs/tags/")]
            print("   [%s] blob=%s path=%s line=%d public_refs=%d local_refs=%d" % (
                sn, f2["blob"][:8], f2["paths"][0] if f2["paths"] else "?", m2["line"], len(pub), len(f2["refs_containing"])))
            for iv in f2.get("introduced_by", [])[:2]:
                print("      introduced_by: %s %s %s" % (iv["commit"][:10], iv["date"], iv["subject"][:70]))
        print("   ctx: %s" % mm["context_masked"][:170])
        print()

def run_view(refpath, maxlines):
    ref, path = refpath.split(":", 1)
    raw = git("show", "%s:%s" % (ref, path))
    lines = raw.split(b"\n")
    print("== %s:%s  (%d bytes, %d lines) ==" % (ref, path, len(raw), len(lines)))
    for ann in env_annotations(raw):
        print(ann)
    print("--")
    for i, line in enumerate(lines[:maxlines], 1):
        print("%4d| %s" % (i, mask_line(line)))
    if len(lines) > maxlines:
        print("... (%d more lines)" % (len(lines) - maxlines))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fps", default="")
    ap.add_argument("--view", default="")
    ap.add_argument("--max", type=int, default=260)
    ap.add_argument("--line", default="", help="ref:path:lineno -> punctuation skeleton of that line")
    args = ap.parse_args()
    if args.fps:
        run_fps(set(x.strip() for x in args.fps.split(",") if x.strip()))
    if args.view:
        run_view(args.view, args.max)
    if args.line:
        ref, path, ln = args.line.rsplit(":", 2)
        raw = git("show", "%s:%s" % (ref, path))
        line = raw.split(b"\n")[int(ln) - 1]
        skel = re.sub(rb"[A-Za-z0-9]{2,}", lambda m: b"<w%d>" % len(m.group(0)), line)
        print("== skeleton %s:%s L%s ==" % (ref, path, ln))
        print(skel.decode(errors="replace")[:300])
