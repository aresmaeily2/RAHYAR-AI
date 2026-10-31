#!/usr/bin/env python3
# ─── P0-6R Stage 3A — راستی‌آزمایی اثرانگشت‌ها (فقط-خواندنی؛ چاپ فقط fp) ──
# هیچ مقدار خامی چاپ نمی‌شود؛ فقط ۱۲ نویسهٔ نخست SHA-256 هر مقدار.
import hashlib, re, subprocess, sys

def fp(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()[:12]

out = {}

# C7 — PASS literal در audit-screens.mjs (روی HEAD/main)
src = open("scripts/audit-screens.mjs", "rb").read().decode("utf-8", "replace")
m = re.search(r"const PASS = '([^']*)'", src)
out["C7 (PASS در audit-screens.mjs @ main)"] = fp(m.group(1).encode()) if m else "NOT-FOUND"
m2 = re.search(r"const USER = '([^']*)'", src)
out["C7 username (برای کلاس‌بندی؛ fp)"] = fp(m2.group(1).encode()) if m2 else "NOT-FOUND"
# setupToken literal در همان اسکریپت
m3 = re.search(r"setupToken: '([^']*)'", src)
out["C7b setupToken literal (fp)"] = fp(m3.group(1).encode()) if m3 else "NOT-FOUND"

# C8 — literal داخل اسکریپت mint روی شاخهٔ fix
mint = subprocess.run(
    ["git", "show", "fix/corrective-mission-360:scripts/mint-evidence-session.mjs"],
    capture_output=True, check=True).stdout.decode("utf-8", "replace")
m4 = re.search(r"const PASSWORD = '([^']*)'", mint)
out["C8 (PASSWORD در mint-evidence-session.mjs @ fix)"] = fp(m4.group(1).encode()) if m4 else "NOT-FOUND"

# C8 بازوی دوم — فایل .evidence-password روی main (tracked)
out["C8 arm2 (.evidence-password @ worktree)"] = fp(open(".evidence-password", "rb").read().strip())
# C9 — فایل توکن
out["C9 (.evidence-session-token @ worktree)"] = fp(open(".evidence-session-token", "rb").read().strip())

# C3 — SHA-256 فایل کی‌استور
out["C3 file sha256 (full)"] = hashlib.sha256(open("android/rahyar-release.keystore", "rb").read()).hexdigest()

# نام متغیر env توکن setup در کد اپ (بدون مقدار)
auth = open("src/lib/auth.ts", "rb").read().decode("utf-8", "replace")
for name in re.findall(r"process\.env\.([A-Z0-9_]+)", auth):
    out.setdefault("env var names in src/lib/auth.ts", []).append(name)

for k, v in out.items():
    print(f"{k}: {v}")
