# -*- coding: utf-8 -*-
"""اسکن خروجی build برای مقادیر حساس شناخته‌شده — فقط شمارش، بدون چاپ مقدار."""
import hashlib
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
BUILD = Path("/tmp/rahyar-build-clone/.next")

def get_value(spec):
    kind, arg = spec
    if kind == "file":
        return (ROOT / arg).read_text("utf-8", "ignore").strip()
    if kind == "git":
        return subprocess.run(["git", "show", arg], cwd=ROOT, capture_output=True).stdout.decode("utf-8", "ignore")
    return None

SOURCES = {
    "C1": ("file", "scripts/agent-real-evidence.cjs"),
    "C2": ("file", "scripts/test-user-isolation.ts"),
    "C3": ("git", "cc1d8c4^:scripts/build-android-rebuild.sh"),
    "C4": ("git", "cc1d8c4^:scripts/build-android-apk.sh"),
    "C5": ("file", "scripts/live-v2-tests.cjs"),
    "C6": ("file", "scripts/live-v2-tests.cjs"),
    "C7": ("git", "cc1d8c4^:scripts/audit-screens.mjs"),
    "C8": ("file", ".evidence-password"),
    "C9": ("file", ".evidence-session-token"),
    "C10": ("file", "scripts/live-final-audit.ts"),
}

REG_FP = {
    "C1": "cec51518b9ac", "C2": "ee0880daa2ca", "C3": "f60ed56a9c82",
    "C4": "dd65b755befe", "C5": "8eb38003b10d", "C6": "e20de4c418c6",
    "C7": "46d0a91d1e48", "C8": "8aa62d3b0a15", "C9": "ff9d8259a6e5", "C10": "9774fdedae3b",
}

# استخراج نامزد دقیق هر C با تطبیق fp از متن منبع
import re
values = {}
for cid, spec in SOURCES.items():
    txt = get_value(spec) or ""
    found = None
    for m in re.findall(r"[A-Za-z0-9_+=/.\-@#$%!]{3,80}", txt):
        if hashlib.sha256(m.encode()).hexdigest()[:12] == REG_FP[cid]:
            found = m
            break
    values[cid] = found

print("کشف مقدار از منابع (برای اسکن داخلی):", {k: ("found" if v else "NOT-FOUND") for k, v in values.items()})

# اسکن درخت build
files_scanned = 0
hits = {k: 0 for k in values if values[k]}
for p in BUILD.rglob("*"):
    if p.is_file() and p.stat().st_size < 5_000_000:
        files_scanned += 1
        try:
            data = p.read_bytes()
        except Exception:
            continue
        for cid, v in values.items():
            if v and v.encode() in data:
                hits[cid] += 1

print(f"فایل‌های اسکن‌شده: {files_scanned}")
print("نتایج (تعداد فایل حاوی مقدار):")
for cid in sorted(hits):
    print(f"  {cid}: {hits[cid]}")
print("VERDICT:", "CLEAN-BUILD" if all(v == 0 for v in hits.values()) else "HITS-FOUND")
