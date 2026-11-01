# -*- coding: utf-8 -*-
"""نقشهٔ کامل حضور مقادیر C1..C10 در همهٔ فایل‌های tracked + فایل‌های محلی secret."""
import hashlib
import re
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
REGISTER = {
    "C1": "cec51518b9ac", "C2": "ee0880daa2ca", "C3": "f60ed56a9c82",
    "C4": "dd65b755befe", "C5": "8eb38003b10d", "C6": "e20de4c418c6",
    "C7": "46d0a91d1e48", "C8": "8aa62d3b0a15", "C9": "ff9d8259a6e5",
    "C10": "9774fdedae3b",
}
LEN = {"C1": 11, "C2": 15, "C3": 7, "C4": 10, "C5": 11, "C6": 12, "C7": 17, "C8": 21, "C9": 43, "C10": 12}

files = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True).stdout.splitlines()
extra = [".evidence-password", ".evidence-session-token"]
files += [f for f in extra if (ROOT / f).exists()]

hits = {c: [] for c in REGISTER}
fps = set(REGISTER.values())
for f in files:
    p = ROOT / f
    if not p.exists() or p.stat().st_size > 400_000:
        continue
    try:
        txt = p.read_text("utf-8", "ignore")
    except Exception:
        continue
    if not txt:
        continue
    found_fps = set()
    for m in re.findall(r"""["'`]([^"'\n]{3,80})["'`]""", txt):
        h = hashlib.sha256(m.encode()).hexdigest()[:12]
        if h in fps:
            found_fps.add(h)
    for m in re.findall(r"[A-Za-z0-9_+=/.\-@#$%!]{3,80}", txt):
        h = hashlib.sha256(m.encode()).hexdigest()[:12]
        if h in fps:
            found_fps.add(h)
    for h in found_fps:
        cid = next(c for c, v in REGISTER.items() if v == h)
        hits[cid].append(f)

print("نقشهٔ حضور (فایل‌های tracked + محلی):")
for cid in sorted(hits, key=lambda x: int(x[1:])):
    fl = hits[cid] or ["—"]
    print(f"  {cid:4} ({len(hits[cid])} فایل): " + ", ".join(fl[:6]) + (" …" if len(fl) > 6 else ""))
