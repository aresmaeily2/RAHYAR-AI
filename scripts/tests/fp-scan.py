# -*- coding: utf-8 -*-
"""اسکن اثر انگشت — بررسی اینکه فایل شامل مقداری با fp داده‌شده هست یا نه. خروجی: CLEAN/HIT فقط."""
import hashlib
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
targets = set(sys.argv[2:])
try:
    txt = path.read_text("utf-8", "ignore")
except Exception:
    txt = ""
hits = set()
for m in re.findall(r"[A-Za-z0-9_+=/.\-@#$%!]{3,80}", txt):
    h = hashlib.sha256(m.encode()).hexdigest()[:12]
    if h in targets:
        hits.add(h)
print("CLEAN" if not hits else f"HIT:{len(hits)}")
