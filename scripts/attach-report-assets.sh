#!/bin/bash
# پیوست گزارش‌های متنی تحویل به Release v1.1.0
set -euo pipefail
cd /home/z/my-project
python3 - << "PYEOF"
import json, os, urllib.request
token = "".join(open("upload/HAMYAR TOKEN.txt", "rb").read().decode().split())
API = "https://api.github.com/repos/aresmaeily2/HAMYAR-AI"
H = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "User-Agent": "release-assets"}
def req(path, data=None, headers=None):
    r = urllib.request.Request(API + path, data=data, headers=headers or H)
    with urllib.request.urlopen(r, timeout=120) as resp:
        return json.loads(resp.read())
rel = [x for x in req("/releases") if x["tag_name"] == "v1.1.0"][0]
existing = {a["name"] for a in rel["assets"]}
for p in ["release-delivery/reports/ANDROID_APK_REPORT.md", "release-delivery/reports/DELIVERY_INDEX.md", "release-delivery/checksums/SHA256SUMS.txt"]:
    name = os.path.basename(p)
    if name in existing:
        print("skip:", name); continue
    body = open(p, "rb").read()
    up_url = rel["upload_url"].split("{")[0] + f"?name={name}"
    r = urllib.request.Request(up_url, data=body, headers={"Authorization": f"Bearer {token}", "Content-Type": "text/plain; charset=utf-8", "Content-Length": str(len(body)), "User-Agent": "release-assets"})
    with urllib.request.urlopen(r, timeout=120) as resp:
        up = json.loads(resp.read())
    print("uploaded:", up["name"], up["size"], up["state"])
print("final assets:", [(a["name"], a["size"]) for a in req(f"/releases/{rel[id]}")["assets"]])
PYEOF
