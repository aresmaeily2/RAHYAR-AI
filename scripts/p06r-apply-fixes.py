# -*- coding: utf-8 -*-
"""فیکسر مبتنی بر اثر انگشت — حذف مقادیر hardcoded C3/C4/C7 از اسکریپت‌ها.
هیچ مقدار خامی خوانده/چاپ/کپی نمی‌شود؛ فقط جایگزینی درجا با الگوی env fail-closed.
"""
import hashlib
import re
from pathlib import Path

ROOT = Path("/home/z/my-project")
FP_C3 = "f60ed56a9c82"   # store-pass رایج (اسکریپت‌های build/rebuild/v11)
FP_C4 = "dd65b755befe"   # store-pass keystore قدیمی (apk.sh)
FP_C7 = "46d0a91d1e48"   # رمز owner دورهٔ ۳۶۰ (audit-screens.mjs)

ENV_STORE = '${RAHYAR_KS_STOREPASS:?RAHYAR_KS_STOREPASS is required (fail-closed)}'
ENV_KEY = '${RAHYAR_KS_KEYPASS:?RAHYAR_KS_KEYPASS is required (fail-closed)}'


def is_target(s: str, fp12: str) -> bool:
    return hashlib.sha256(s.encode()).hexdigest()[:12] == fp12


def fix_flag_literals(path: Path, fps: dict, flag_names=("storepass", "keypass")) -> int:
    """جایگزین مقدار بعد از فلگ‌ها فقط وقتی fp منطبق باشد."""
    txt = path.read_text("utf-8", "ignore")
    n = 0

    def repl(m):
        nonlocal n
        val = m.group(2)
        for role, fp in fps.items():
            if is_target(val, fp):
                n += 1
                repl_val = ENV_STORE if role == "C3-STORE" or "storepass" in m.group(1) else ENV_KEY
                return f"{m.group(1)}{repl_val}"
        return m.group(0)

    pat = re.compile(
        r"((?:-{1,2}(?:" + "|".join(flag_names) + r"))\s*(?:=|\s)\s*[\"']?)([A-Za-z0-9_+=/.\-@#$%!]{3,60})",
    )
    txt2 = pat.sub(repl, txt)
    if n:
        path.write_text(txt2, "utf-8")
    return n


def fix_bare_quoted(path: Path, fp: str, replacement: str) -> int:
    txt = path.read_text("utf-8", "ignore")
    n = 0

    def repl(m):
        nonlocal n
        if is_target(m.group(2), fp):
            n += 1
            return f"{m.group(1)}{replacement}{m.group(3)}"
        return m.group(0)

    txt2 = re.sub(r"""(const\s+PASS\s*=\s*["'])([^"'\n]+)(["'])""", repl, txt)
    if n:
        path.write_text(txt2, "utf-8")
    return n


total = 0
for f, roles in [
    ("scripts/build-android-apk.sh", {"C4": FP_C4, "C3": FP_C3}),
    ("scripts/build-android-rebuild.sh", {"C3-STORE": FP_C3}),
    ("scripts/build-android-apk-v11.sh", {"C3-STORE": FP_C3}),
]:
    p = ROOT / f
    if p.exists():
        # نقش‌ها را به کلید store/key نگاشت می‌کنیم: این اسکریپت‌ها فقط storepass دارند
        fps = {}
        for role, fp in roles.items():
            fps["C3-STORE" if role != "C4" else "C4"] = fp
        n = fix_flag_literals(p, fps, flag_names=("storepass", "keypass"))
        total += n
        print(f"{f}: {n} جایگزینی فلگ")

p = ROOT / "scripts/audit-screens.mjs"
if p.exists():
    n = fix_bare_quoted(p, FP_C7, "process.env.RAHYAR_EVIDENCE_PASSWORD")
    # setupToken hardcoded → env اختیاری
    txt = p.read_text("utf-8", "ignore")
    if "local-dev-setup-token" in txt:
        txt = txt.replace("'local-dev-setup-token-0123456789abcdef'", "(process.env.RAHYAR_SETUP_TOKEN ?? '')")
        p.write_text(txt, "utf-8")
        n += 1
    total += n
    print(f"scripts/audit-screens.mjs: {n} جایگزینی")

print("TOTAL:", total)
