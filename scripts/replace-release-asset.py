#!/usr/bin/env python3
# جایگزینی یک asset روی Release v1.2.0 (حذف + آپلود) + تأیید دانلود
import json, urllib.request, hashlib, sys

REPO = "aresmaeily2/HAMYAR-AI"
TOKEN = open("/home/z/my-project/upload/HAMYAR TOKEN.txt").read().strip()
NAME = sys.argv[1] if len(sys.argv) > 1 else "INSTALL_GUIDE_FA.md"
LOCAL = f"/home/z/my-project/release-delivery/v1.2.0/{NAME}"

def req(url, method="GET", data=None, ctype=None, accept="application/vnd.github+json"):
    r = urllib.request.Request(url, method=method)
    r.add_header("Authorization", f"Bearer {TOKEN}")
    r.add_header("User-Agent", "rahyar-delivery")
    r.add_header("Accept", accept)
    b = None
    if data is not None:
        b = data if isinstance(data, bytes) else json.dumps(data).encode()
        r.add_header("Content-Type", ctype or "application/octet-stream")
    return urllib.request.urlopen(r, b, timeout=180)

rel = json.load(req(f"https://api.github.com/repos/{REPO}/releases/tags/v1.2.0"))
rid = rel["id"]
aid = next(a["id"] for a in rel["assets"] if a["name"] == NAME)
req(f"https://api.github.com/repos/{REPO}/releases/assets/{aid}", method="DELETE").read()
print("old asset deleted")
data = open(LOCAL, "rb").read()
req(f"https://uploads.github.com/repos/{REPO}/releases/{rid}/assets?name={NAME}", "POST", data, "text/markdown").read()
print(f"re-uploaded: {len(data)} B")

# تأیید: دانلود از Release تازه و مقایسه هش
rel2 = json.load(req(f"https://api.github.com/repos/{REPO}/releases/{rid}"))
aid2 = next(a["id"] for a in rel2["assets"] if a["name"] == NAME)
dl = req(f"https://api.github.com/repos/{REPO}/releases/assets/{aid2}", accept="application/octet-stream").read()
lh, dh = hashlib.sha256(data).hexdigest(), hashlib.sha256(dl).hexdigest()
print("PASS" if (lh == dh and len(dl) == len(data)) else "FAIL", NAME, len(dl), "B", dh[:16] + "…")
sys.exit(0 if lh == dh else 2)
