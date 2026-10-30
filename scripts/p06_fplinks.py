#!/usr/bin/env python3
"""P0-6: fingerprint links between evidence files and known credential fps.
Prints ONLY fingerprints/booleans — never values."""
import hashlib, subprocess

REPO = "/home/z/my-project"

def fp(blob_sha):
    r = subprocess.run(["git", "-C", REPO, "cat-file", "blob", blob_sha], capture_output=True)
    v = r.stdout.strip()
    return hashlib.sha256(v).hexdigest()[:12], len(v)

CHECKS = [
    ("16f4706e73f48494d5e3a0fdeab9e75259ab1e6d", "main:.evidence-password"),
    ("3b6bc8689e132af4e844931e401cab71dc9fd0ca", "main:.evidence-session-token"),
]
KNOWN = {
    "8aa62d3b0a15": "mint-evidence-session.mjs PASSWORD (21ch, fix-only)",
    "9e32f9eacaf1": "ambient/record scripts TOKEN (15ch, public)",
    "cec51518b9ac": "owner login password (11ch, public)",
    "46d0a91d1e48": "audit-screens.mjs PASS (17ch, local)",
    "cc804146931b": "LoginActivity pass (28ch, public)",
    "f60ed56a9c82": "keystore store-pass (7ch, public)",
    "dd65b755befe": "old keystore store-pass (10ch, public)",
    "ee0880daa2ca": "test-user-isolation owner pw (15ch, public)",
}
for sha, label in CHECKS:
    f, ln = fp(sha)
    matches = [k for k in KNOWN if k == f]
    print("%s (%s): fp=%s len=%d -> %s" % (label, sha[:8], f, ln,
          ("MATCH: " + KNOWN[matches[0]]) if matches else "no match to known fps"))
