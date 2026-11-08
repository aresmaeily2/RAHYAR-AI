#!/usr/bin/env python3
# F8 Mission 1 — evidence-existence audit for every RTM row.
# Extracts file-path / log-name pointers from evidence+verify columns and checks disk.
# Output: artifacts/logs/f8/evidence_audit.json  (per-row pointer existence)
import json, re, os, glob

rows = json.load(open("artifacts/logs/f8/rtm_parsed.json", encoding="utf-8"))["rows"]

PAT = re.compile(
    r"([A-Za-z0-9_\-./]+(?:\.(?:md|txt|log|json|csv|sh|py|mjs|ts|java|zip|apk|jpg|png|bundle|db|xml|gradle|properties|keystore))+"
    r"|[A-Za-z0-9_\-]+\.log)"
)
ROOTS = ["/home/z/my-project", "/home/z/my-project/artifacts/logs/f7", "/home/z/my-project/artifacts/logs/f8"]

def exists(p):
    p = p.rstrip(".,;:)")
    if p.startswith("/"): cand = [p]
    else: cand = [os.path.join(r, p) for r in ROOTS]
    for c in cand:
        if os.path.exists(c): return c
    # wildcard (e.g. scripts/f5-audit*.sh)
    if "*" in p or "?" in p:
        for r in ROOTS:
            g = glob.glob(os.path.join(r, p))
            if g: return g[0]
    return None

out = []
for r in rows:
    text = r["evidence"] + " " + r["verify_f7"]
    ptrs = [m.group(1) for m in PAT.finditer(text)]
    seen, res = set(), []
    for p in ptrs:
        if p in seen or len(p) < 5: continue
        seen.add(p)
        loc = exists(p)
        res.append({"pointer": p, "exists": bool(loc), "at": loc})
    out.append({"id": r["id"], "line": r["line"], "status_f7": r["status_f7"],
                "pointers": res,
                "exists_count": sum(1 for x in res if x["exists"]),
                "total": len(res)})

json.dump(out, open("artifacts/logs/f8/evidence_audit.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
tot = sum(x["total"] for x in out); ex = sum(x["exists_count"] for x in out)
print(f"rows={len(out)} pointers={tot} exists={ex} missing={tot-ex}")
# distribution of rows with zero existing pointers
zero = [x["id"] for x in out if x["total"] and x["exists_count"] == 0]
print(f"rows-with-all-pointers-missing={len(zero)}")
print("sample:", zero[:15])
