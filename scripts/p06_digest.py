#!/usr/bin/env python3
"""Compact masked digest of a p06_scan JSON. Groups findings by value fingerprint.
Prints PUBLIC flag (blob reachable from origin refs) and LOCAL flag. No raw values."""
import json, sys, os

ORIGIN_PREFIXES = ("refs/remotes/origin/", "refs/tags/")
LOCAL_ONLY_TAGS = ("refs/original/",)

def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def main(path):
    d = load(path)
    print("== scan '%s' refs=%s excluded=%s ==" % (d["scan_name"], d["refs"], d["excluded"]))
    print("blobs_scanned=%d flagged_blobs=%d dup_fps=%d msg_findings=%d sus_paths=%d" % (
        d["blobs_scanned"], d["flagged_blobs"], len(d["duplicate_value_fingerprints"]),
        len(d["commit_message_findings"]), len(d["suspicious_paths"])))

    # group matches by (fp, detector)
    groups = {}
    for fb in d["findings"]:
        for mm in fb["matches"]:
            key = (mm["fp"], mm["detector"])
            g = groups.setdefault(key, {"detector": mm["detector"], "class": mm["class"],
                                        "fp": mm["fp"], "len": mm["len"], "occ": []})
            public = [r for r in fb["refs_containing"] if r.startswith(ORIGIN_PREFIXES)]
            g["occ"].append({"blob": fb["blob"][:12], "paths": fb["paths"],
                             "public": bool(public), "public_refs": public[:3],
                             "local_refs": len(fb["refs_containing"]),
                             "line": mm["line"]})

    print("\n-- grouped findings (by fp x detector) --")
    for (fp, det), g in sorted(groups.items(), key=lambda kv: (kv[1]["class"], kv[0])):
        any_pub = any(o["public"] for o in g["occ"])
        blobs = sorted(set(o["blob"] for o in g["occ"]))
        paths = sorted(set(p for o in g["occ"] for p in o["paths"]))
        print("[%s] %s fp=%s len=%d public=%s blobs=%d paths:" % (
            g["class"], det, fp, g["len"], "YES" if any_pub else "no", len(blobs)))
        for p in paths[:6]:
            print("    -", p)
        if any_pub:
            for o in g["occ"]:
                if o["public"]:
                    print("    PUBLIC-VIA:", ",".join(o["public_refs"]))
                    break

    print("\n-- suspicious paths --")
    for p in d["suspicious_paths"]:
        print("   *", p)

    print("\n-- commit-message findings --")
    for mf in d["commit_message_findings"]:
        for h in mf["hits"]:
            print("   %s %s %s fp=%s ctx=%s" % (mf["commit"][:12], mf["date"], h["detector"], h["fp"], h["context_masked"][:80]))

    print("\n-- duplicate value fingerprints --")
    for fp, occ in d["duplicate_value_fingerprints"].items():
        print("   fp=%s occurrences=%d" % (fp, len(occ)))
        for o in occ[:8]:
            print("      blob=%s det=%s path=%s" % (o["blob"][:12], o["detector"], o["path"]))

if __name__ == "__main__":
    main(sys.argv[1])
