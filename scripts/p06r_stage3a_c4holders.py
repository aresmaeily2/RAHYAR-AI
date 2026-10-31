#!/usr/bin/env python3
# ─── P0-6R Stage 3A — یافتن فایل‌های حامل خام C4 (فقط-خواندنی؛ چاپ فقط مسیر/خط) ──
import hashlib, re, subprocess

TARGET_FP = "dd65b755befe"  # C4 (ثبت رجیستر) — مقدار خام هرگز چاپ نمی‌شود

files = subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout.split()
hits = []
for f in files:
    try:
        txt = open(f, "rb").read().decode("utf-8", "replace")
    except Exception:
        continue
    for i, line in enumerate(txt.splitlines(), 1):
        for tok in re.findall(r"""['"]([^'"\n]{6,32})['"]""", line):
            if hashlib.sha256(tok.encode()).hexdigest()[:12] == TARGET_FP:
                hits.append((f, i))
for f, i in hits:
    print(f"HOLDER: {f}:{i}")
print(f"total_files_scanned={len(files)} holders={len(set(f for f,_ in hits))}")
