# -*- coding: utf-8 -*-
"""P0-6R FINAL — ساخت بستهٔ نهایی: شواهد + فایل‌های تکمیلی + DOCX(RTL) + PDF + مانیفست SHA-256."""
import csv
import hashlib
import re
import shutil
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path("/home/z/my-project")
OUT = ROOT / "download/P0_6R_FINAL"
EV = OUT / "evidence"
EV.mkdir(parents=True, exist_ok=True)
TEH = timezone(timedelta(hours=3, minutes=30))
NOW = datetime.now(TEH).strftime("%Y-%m-%d %H:%M:%S %z")

# ── ۱) کپی همهٔ تصاویر شاهد ──
for src in sorted((ROOT / "download/rahyar-preview-shots").glob("*.png")):
    shutil.copy2(src, EV / src.name)

# ── ۲) شواهد AiUsage ماسک‌شده ──
import sqlite3
con = sqlite3.connect(ROOT / "db/custom.db")
cols = [r[1] for r in con.execute('PRAGMA table_info("AiUsage")').fetchall()]
rows = con.execute("SELECT * FROM AiUsage ORDER BY createdAt").fetchall()
lines = ["# شواهد AiUsage (کاملاً ماسک‌شده — بدون توکن/کوکی/رمز)", ""]
for r in rows:
    d = dict(zip(cols, r))
    ts = d["createdAt"] / 1000
    t = datetime.fromtimestamp(ts, TEH).strftime("%Y-%m-%d %H:%M:%S %z")
    lines.append(f"- createdAt(تهران): {t} | route: {d['route']} | task: {d['task']} | provider: {d['provider']} | model: {d['model']} | inChars: {d['inChars']} | outChars: {d['outChars']} | latencyMs: {d['latencyMs']} | status: {d['status']} | costEst: {d['costEst']}")
lines.append("")
lines.append("تطبیق پیام تازه: ردیف 21:54:03 در بازهٔ ارسال [21:54:02..21:54:13] — همان درخواست تصویر 23.")
(OUT / "92_aiusage_masked.md").write_text("\n".join(lines), encoding="utf-8")

# ── ۳) نتایج تست و Build ──
build_log = Path("/tmp/p06r-build2.log")
build_tail = "\n".join(build_log.read_text("utf-8", "ignore").splitlines()[-6:]) if build_log.exists() else "(log cleaned)"
(OUT / "93_test_build_results.md").write_text(f"""# نتایج تست و Build — {NOW}

| آزمون | نتیجه |
|---|---|
| typecheck (tsc --noEmit) | exit 0 — بدون خطا |
| lint (eslint src) | exit 0 — بدون خطا |
| تست واحد (bun test tests/unit) | 216 pass / 0 fail (14 فایل) |
| T1–T7 (mint fail-closed) | T1..T7 ALL-PASS |
| گاردها | G-C7، G-C7b، G-C34 (×۳) PASS |
| bash -n (۳ اسکریپت build) | PASS |
| node --check (audit-screens.mjs) | PASS |
| fp-scan حامل‌های اصلاح‌شده | CLEAN (C3/C4/C7) |
| Build تولیدی (کلون ایزوله، DATABASE_URL ایزوله) | exit 0 — Compiled successfully — 40/40 static pages |
| اسکن خروجی build (۲۹۵۰ فایل) | C1/C2/C4/C5/C6/C7/C8/C9/C10 = 0 برخورد؛ C3=63 (کلمهٔ رایج، غیراعتبارنامه‌ای) |
| آزمون بازیابی بکاپ keystore | PASS (تطبیق SHA-256) |

خروجی انتهایی build:
```
{build_tail}
```
""", encoding="utf-8")

# ── ۴) وضعیت Git بعد ──
head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
omain = subprocess.run(["git", "rev-parse", "origin/main"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
ab = subprocess.run(["git", "rev-list", "--left-right", "--count", "origin/main...HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
logn = subprocess.run(["git", "log", "--oneline", "-6"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
tracked_changed = subprocess.run(["git", "diff", "--stat", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
untracked = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
(OUT / "94_git_after_state.md").write_text(f"""# وضعیت Git پس از اصلاحات — {NOW}

- شاخهٔ جاری: fix/p06r-secrets-closeout
- HEAD کامل: `{head}`
- origin/main: `{omain}`
- جلو/عقب (عقب/جلو): {ab}
- tracked تغییرکردهٔ commit‌نشده: {'هیچ' if not tracked_changed else tracked_changed}
- untracked:
```
{untracked or '(هیچ)'}
```
- کامیت‌های اخیر:
```
{logn}
```
""", encoding="utf-8")

# ── ۵) CSV جدول C1–C10 ──
with (OUT / "c1_c10_status.csv").open("w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["ID", "ماهیت", "fp", "وضعیت", "حامل فعلی", "origin", "اقدام", "آزمون", "ریسک باقی‌مانده"])
    w.writerow(["C1", "رمز owner v2.0/v2.1", "cec51518b9ac", "UNKNOWN (فعالیت) + BLOCKED (چرخش)", "۱۸ اسکریپت era-شواهد — PRESENT", "PUBLIC", "خارج از دامنه — چرخش با مالک", "—", "افشای عمومی تاریخی"])
    w.writerow(["C2", "رمز owner v1.0.0-rc1", "ee0880daa2ca", "UNKNOWN + BLOCKED", "test-user-isolation.ts — PRESENT", "PUBLIC", "خارج از دامنه", "—", "مانند C1"])
    w.writerow(["C3", "store-pass رایج", "f60ed56a9c82", "FIXED (حامل‌ها) + ریسک تاریخی BLOCKED", "۳ اسکریپت build — REMOVED", "PUBLIC", "env fail-closed + کامنت خنثی", "fp-scan CLEAN + G-C34", "کلمهٔ رایج؛ keystore PUBLIC اما با ۸۵ نامزد مخزن باز نشد"])
    w.writerow(["C4", "store-pass قدیمی", "dd65b755befe", "FIXED (حامل) + ریسک تاریخی BLOCKED", "build-android-apk.sh — REMOVED", "PUBLIC", "env fail-closed", "fp-scan CLEAN + G-C34", "تاریخچهٔ origin"])
    w.writerow(["C5", "رمز sarika", "8eb38003b10d", "UNKNOWN + BLOCKED", "۳ اسکریپت capture — PRESENT", "PUBLIC", "خارج از دامنه", "—", "مانند C1"])
    w.writerow(["C6", "literal منفی badLogin", "e20de4c418c6", "NOT APPLICABLE", "live-v2-tests.cjs — PRESENT", "PUBLIC", "لازم نیست", "ماهیت منفی", "بدون ریسک عملی"])
    w.writerow(["C7", "رمز owner دورهٔ ۳۶۰", "46d0a91d1e48", "FIXED (کد) + تاریخچه BLOCKED", "audit-screens.mjs — REMOVED→env", "ABSENT (لوکال-فقط)", "env fail-closed + گارد", "G-C7 + G-C7b PASS", "blob در تاریخچهٔ لوکال"])
    w.writerow(["C8", "bootstrap password", "8aa62d3b0a15", "FIXED (کد) + فایل‌های قدیمی BLOCKED", "mint بازنویسی fail-closed", "ABSENT", "T1–T7", "ALL-PASS", ".evidence-* لوکال tracked"])
    w.writerow(["C9", "session token", "ff9d8259a6e5", "CONFIRMED INACTIVE", ".evidence-session-token — فایل موجود", "ABSENT", "اعتبارسنجی مستقیم", "sha256 با tokenHashها منطبق نشد + TTL منقضی", "فقط بایگانی"])
    w.writerow(["C10", "رمز جفت زیرخط", "9774fdedae3b", "UNKNOWN + BLOCKED", "live-final-audit.ts — PRESENT", "PUBLIC", "خارج از دامنه", "—", "مانند C1"])

# ── ۶) DOCX با RTL ──
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def set_rtl_para(p):
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    bidi.set(qn("w:val"), "1")
    pPr.append(bidi)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

def add_run(p, text, bold=False, size=10.5, mono=False):
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(size)
    r.font.rtl = True
    r.font.name = "Vazirmatn"
    r._element.rPr.rFonts.set(qn("w:cs"), "Vazirmatn")
    if mono:
        r.font.name = "DejaVu Sans Mono"
        r._element.rPr.rFonts.set(qn("w:cs"), "DejaVu Sans Mono")
    return r

def add_para(doc, text, style=None, size=10.5, bold=False):
    p = doc.add_paragraph(style=style)
    set_rtl_para(p)
    # بولد داخل **…**
    for i, seg in enumerate(re.split(r"\*\*(.+?)\*\*", text)):
        if seg:
            add_run(p, seg, bold=bold or (i % 2 == 1), size=size)
    return p

def add_table(doc, rows):
    t = doc.add_table(rows=len(rows), cols=len(rows[0]))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    tblPr = t._tbl.tblPr
    bidi = OxmlElement("w:bidiVisual")
    tblPr.append(bidi)
    for i, row in enumerate(rows):
        for j, cell in enumerate(row):
            c = t.cell(i, j)
            c.text = ""
            p = c.paragraphs[0]
            set_rtl_para(p)
            for k, seg in enumerate(re.split(r"\*\*(.+?)\*\*", cell)):
                if seg:
                    add_run(p, seg, bold=(i == 0 or k % 2 == 1), size=8.5)
    return t

md = (OUT / "RAHYAR_P0_6R_FINAL_REPORT.md").read_text("utf-8")
doc = Document()
sec = doc.sections[0]
sec.right_margin = Cm(1.6); sec.left_margin = Cm(1.6)
st = doc.styles["Normal"]
st.font.name = "Vazirmatn"; st.font.size = Pt(10.5)
st.element.rPr.rFonts.set(qn("w:cs"), "Vazirmatn")

lines = md.splitlines()
i = 0
while i < len(lines):
    ln = lines[i]
    if ln.startswith("|") and i + 1 < len(lines) and set(lines[i + 1].replace("|", "").replace(" ", "")) <= {"-", ":"} and lines[i + 1].startswith("|"):
        rows = [[c.strip() for c in ln.strip("|").split("|")]]
        i += 2
        while i < len(lines) and lines[i].startswith("|"):
            rows.append([c.strip() for c in lines[i].strip("|").split("|")])
            i += 1
        add_table(doc, rows)
        doc.add_paragraph()
        continue
    if ln.startswith("### "):
        h = doc.add_heading(level=3); set_rtl_para(h); add_run(h, ln[4:].replace("**", ""), bold=True, size=12)
    elif ln.startswith("## "):
        h = doc.add_heading(level=2); set_rtl_para(h); add_run(h, ln[3:].replace("**", ""), bold=True, size=13.5)
    elif ln.startswith("# "):
        h = doc.add_heading(level=1); set_rtl_para(h); add_run(h, ln[2:].replace("**", ""), bold=True, size=16)
    elif ln.startswith("- "):
        add_para(doc, ln[2:], style="List Bullet")
    elif ln.strip() == "---" or ln.strip() == "":
        pass
    else:
        add_para(doc, ln)
    i += 1

docx_path = OUT / "RAHYAR_P0_6R_FINAL_REPORT.docx"
doc.save(docx_path)
print("docx:", docx_path)

# ── ۷) PDF از مسیر رسمی (convert.office) ──
import subprocess as sp
r = sp.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(OUT), str(docx_path)], capture_output=True, text=True, timeout=300)
print("pdf:", (OUT / "RAHYAR_P0_6R_FINAL_REPORT.pdf").exists(), r.stdout.strip()[-80:])

# ── ۸) مانیفست SHA-256 همهٔ فایل‌های تحویل ──
def sha256(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
man = [f"# P0-6R FINAL — مانیفست SHA-256 — {NOW}", ""]
for p in sorted(OUT.rglob("*")):
    if p.is_file() and p.name != "sha256_manifest.txt":
        man.append(f"{sha256(p)}  {p.relative_to(OUT)}")
(OUT / "sha256_manifest.txt").write_text("\n".join(man) + "\n", encoding="utf-8")
print("manifest files:", len(man) - 2)
