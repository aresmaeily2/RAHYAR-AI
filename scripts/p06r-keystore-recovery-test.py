# -*- coding: utf-8 -*-
"""آزمون کنترل‌شدهٔ بازیابی keystore — فقط با نامزدهای داخل مخزن، بدون چاپ هیچ مقداری."""
import hashlib
import re
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
KS = ROOT / "android/rahyar-release.keystore"
FILES = [
    "scripts/build-android-rebuild.sh",
    "scripts/build-android-apk-v11.sh",
    "scripts/build-android-apk.sh",
]
REG = {"C3": ("f60ed56a9c82", 7), "C4": ("dd65b755befe", 10)}

cands = {}
for f in FILES:
    txt = (ROOT / f).read_text("utf-8", "ignore")
    for m in re.findall(r"""["'`]([^"'\n]{3,60})["'`]""", txt):
        cands.setdefault(m, set()).add(f)
    for m in re.findall(r"""(?:-storepass|-keypass|-storepwd|-keypwd)\s+[\"']?([^\s"']{3,60})""", txt):
        cands.setdefault(m, set()).add(f + ":flag")

fp_to_role = {}
for v, srcs in cands.items():
    fp = hashlib.sha256(v.encode()).hexdigest()[:12]
    for role, (rfp, _) in REG.items():
        if fp == rfp:
            fp_to_role.setdefault(role, []).append((v, tuple(sorted(srcs))))

print("نامزدهای شناسایی‌شده با نقش رجیستر:")
for role, items in fp_to_role.items():
    for v, srcs in items:
        print(f"  {role}: len={len(v)} from={srcs} → fp MATCH")

tried = 0
opened = None
seen = set()
for v in cands:
    if v in seen or len(v) < 3 or len(v) > 60:
        continue
    seen.add(v)
    tried += 1
    r = subprocess.run(
        ["keytool", "-list", "-keystore", str(KS), "-storepass", v, "-storetype", "PKCS12"],
        capture_output=True, text=True,
    )
    if r.returncode == 0:
        opened = v
        aliases = [l.split(",")[0].split(": ")[-1].strip() for l in (r.stdout + r.stderr).splitlines() if "PrivateKeyEntry" in l or "TrustedCertificateEntry" in l]
        print(f"  → موفق با نامزدی به طول {len(v)} (fp={hashlib.sha256(v.encode()).hexdigest()[:12]}) از {sorted(cands[v])}")
        print(f"    نوع: {[l.strip() for l in (r.stdout+r.stderr).splitlines() if 'Keystore type' in l or 'contains' in l][:2]}")
        print(f"    ورودی‌ها: {aliases[:4]}")
        break

if not opened:
    print(f"هیچ‌یک از {tried} نامزد داخل مخزن keystore را باز نکرد → بازیابی با مصالح مخزن ممکن نیست")
