#!/usr/bin/env python3
# ─── P0-6R Stage 3A — اسکن ایمنی سند (هیچ مقدار خام در خروجی‌ها) ──
# مقادیر خام هرگز چاپ نمی‌شوند؛ فقط یافته/نیافتن گزارش می‌شود.
import re, subprocess, zipfile, sys, hashlib

BASE = "/home/z/my-project/download/P0_6R/"
docx = BASE + "RAHYAR_P0_6R_STAGE3A_REMEDIATION_RECOVERY_PLAN.docx"
pdf = BASE + "RAHYAR_P0_6R_STAGE3A_REMEDIATION_RECOVERY_PLAN.pdf"
diff = BASE + "P0_5_mint_script_patch_design.diff"

# مقادیر خامِ مرجع از مخزن می‌خوانیم و در همین process نگه می‌داریم (چاپ نمی‌شود)
c7 = re.search(rb"const PASS = '([^']*)'", open("/home/z/my-project/scripts/audit-screens.mjs", "rb").read()).group(1)
c8 = re.search(rb"const PASSWORD = '([^']*)'", subprocess.run(
    ["git", "-C", "/home/z/my-project", "show", "fix/corrective-mission-360:scripts/mint-evidence-session.mjs"],
    capture_output=True, check=True).stdout).group(1)

def docx_text(p):
    with zipfile.ZipFile(p) as z:
        xml = z.read("word/document.xml").decode("utf-8", "replace")
    return re.sub(r"<[^>]+>", "", xml)

def pdf_text(p):
    r = subprocess.run(["pdftotext", p, "-"], capture_output=True)
    return r.stdout.decode("utf-8", "replace")

targets = {"DOCX": docx_text(docx), "PDF": pdf_text(pdf), "DIFF": open(diff, "rb").read().decode("utf-8", "replace")}
bad = 0
for name, txt in targets.items():
    for label, raw in (("C7", c7.decode()), ("C8", c8.decode())):
        hit = raw in txt or raw.replace("!", "") in txt
        print(f"{name}: raw {label} present = {hit}")
        bad += 1 if hit else 0

fps = ["46d0a91d1e48", "8aa62d3b0a15", "ff9d8259a6e5", "cec51518b9ac", "dd65b755befe", "f60ed56a9c82"]
d = targets["DOCX"]
print("DOCX fp coverage:", {f: (f in d) for f in fps})
print("placeholders check:", any(m in d for m in ["TODO", "XXX", "【", "undefined", "NaN", "نگهداری‌شده-خام"]))
print("RESULT:", "CLEAN" if bad == 0 else "FAIL")
sys.exit(0 if bad == 0 else 1)
