#!/usr/bin/env python3
"""
P0-4 Step 2b — classify security scan hits WITHOUT recording secret values.
For each content hit: extract the matched line, MASK the value (length + charset class only),
classify dev-placeholder vs needs-review, and check whether the blob is already reachable
from origin/main (already public) or new on fix.
Output: 02b-security-classification.json/.txt
"""
import subprocess, json, re, os

REPO = "/home/z/my-project"
EV = "/home/z/my-project/download/RAHYAR_P0_PRE_PUSH_EVIDENCE"

def git(*args, binary=False, input_bytes=None):
    r = subprocess.run(["git", "-C", REPO, *args], capture_output=True, input=input_bytes)
    if r.returncode != 0:
        raise RuntimeError("git " + " ".join(args) + " -> " + r.stderr.decode()[:300])
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")

def reachable(ref):
    s = set()
    for line in git("rev-list", "--objects", ref).splitlines():
        s.add(line.split(" ", 1)[0])
    return s

PATTERNS = {
    "password-literal": re.compile(r'(?i)\b(password|passwd|pwd)\b\s*[=:]\s*["\']([^"\']{6,})["\']'),
}

DEV_HINTS = ("dev", "evidence", "demo", "test", "changeme", "placeholder", "example", "xxx", "todo", "sample", "123", "local")

def classify_value(v):
    lv = v.lower()
    hints = [h for h in DEV_HINTS if h in lv]
    entropyish = len(set(v)) >= 12 and not hints
    if hints and not entropyish:
        return "dev-placeholder-likely", hints
    if entropyish:
        return "high-entropy-NEEDS-REVIEW", []
    return "ambiguous-NEEDS-REVIEW", hints

def mask(v):
    return "len=%d charset=%s prefix=%s%s" % (len(v), "".join(sorted(set(re.sub(r'[A-Za-z]', 'a', v))))[:20] if False else ("alnum+sym" if re.search(r'[^A-Za-z0-9]', v) else "alnum"), v[:2], "***")

def main():
    report = json.load(open(EV + "/02-security-scan-fix.json"))
    origin_reach = reachable("origin/main")
    fix_reach = reachable("fix/corrective-mission-360")

    out = []
    for f in report["findings"]:
        t = f["type"]
        rec = {"type": t, "blob": f["blob"], "paths": f["paths"], "commits": f["introducing_commits"][:3]}
        rec["blob_on_origin_main"] = f["blob"] in origin_reach if f["blob"] else None
        rec["blob_on_fix"] = f["blob"] in fix_reach if f["blob"] else None
        if t.startswith("content:password-literal") and f["blob"]:
            data = git("cat-file", "blob", f["blob"], binary=True)
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError:
                text = data.decode("utf-8", "replace")
            vals = []
            for m in PATTERNS["password-literal"].finditer(text):
                v = m.group(2)
                cls, hints = classify_value(v)
                vals.append({"masked": mask(v), "class": cls, "dev_hints": hints,
                             "line_no": text[:m.start()].count("\n") + 1})
            rec["matches"] = vals
        out.append(rec)

    with open(EV + "/02b-security-classification.json", "w") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
    with open(EV + "/02b-security-classification.txt", "w") as fh:
        fh.write("P0-4 STEP2b — classification of scan hits (values masked, never recorded)\n\n")
        for r in out:
            fh.write("type=%s blob=%s paths=%s\n  blob_on_origin_main(already public)=%s\n" %
                     (r["type"], (r["blob"] or "-")[:12], r["paths"], r["blob_on_origin_main"]))
            for m in r.get("matches", []):
                fh.write("  match line=%s %s class=%s hints=%s\n" %
                         (m["line_no"], m["masked"], m["class"], m["dev_hints"]))
    print("classified %d findings" % len(out))
    for r in out:
        if r.get("matches"):
            for m in r["matches"]:
                print("  %-12s %-28s %s %s" % (r["type"].replace("content:", ""), r["paths"][0] if r["paths"] else "?", m["masked"], m["class"]))
        else:
            print("  %-12s %-28s public_on_origin=%s" % (r["type"].replace("filename:", "fn:"), r["paths"][0] if r["paths"] else "?", r["blob_on_origin_main"]))

if __name__ == "__main__":
    main()
