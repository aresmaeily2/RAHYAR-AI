# -*- coding: utf-8 -*-
"""فیکسر مرحلهٔ ۲ — apksigner pass:VALUE و کامنت مستندساز."""
import hashlib
import re
from pathlib import Path

ROOT = Path("/home/z/my-project")
FP_C3 = "f60ed56a9c82"
FP_C4 = "dd65b755befe"


def is_t(s, fp):
    return hashlib.sha256(s.encode()).hexdigest()[:12] == fp


# ۱) apksigner: --ks-pass pass:VAL و --key-pass pass:VAL
for f, fp, env_store, env_key in [
    ("scripts/build-android-apk.sh", FP_C4, "RAHYAR_KS_STOREPASS", "RAHYAR_KS_KEYPASS"),
    ("scripts/build-android-rebuild.sh", FP_C3, "RAHYAR_KS_STOREPASS", "RAHYAR_KS_KEYPASS"),
    ("scripts/build-android-apk-v11.sh", FP_C3, "RAHYAR_KS_STOREPASS", "RAHYAR_KS_KEYPASS"),
]:
    p = ROOT / f
    txt = p.read_text("utf-8", "ignore")
    n = 0

    def repl(m):
        global n
        val = m.group(3)
        fp_now = FP_C4 if "apk.sh" in f else FP_C3
        if is_t(val, fp_now):
            n += 1
            env = env_store if "ks-pass" in m.group(1) else env_key
            return f"{m.group(1)}pass:${{{env}?{env}-required}}"
        return m.group(0)

    txt2 = re.sub(r"""((?:--ks-pass|--key-pass)\s+)(pass:)([A-Za-z0-9_+=/.\-@#$%!]{3,60})""", repl, txt)
    if n:
        p.write_text(txt2, "utf-8")
    print(f"{f}: apksigner sites fixed = {n}")

# ۲) کامنت rebuild.sh خط ۶ — مقدار در متن توضیح
p = ROOT / "scripts/build-android-rebuild.sh"
txt = p.read_text("utf-8", "ignore")
lines = txt.splitlines()
n = 0
for i, line in enumerate(lines):
    toks = re.findall(r"[A-Za-z0-9_+=/.\-@#$%!]{3,80}", line)
    if any(is_t(t, FP_C3) for t in toks):
        lines[i] = re.sub(
            r"[A-Za-z0-9_+=/.\-@#$%!]{3,80}",
            lambda m: "[REDACTED — pass via RAHYAR_KS_STOREPASS]" if is_t(m.group(0), FP_C3) else m.group(0),
            line,
        )
        n += 1
if n:
    p.write_text("\n".join(lines) + "\n", "utf-8")
print(f"comments neutralized = {n}")
