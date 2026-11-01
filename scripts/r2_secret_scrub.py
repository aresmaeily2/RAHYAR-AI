# -*- coding: utf-8 -*-
"""R2 secret scrub — حذف مقادیر رجیستر (C1/C2/C5/C10 + C4-as-scan-data) از
حامل‌های tracked، بدون خواندن/چاپ هیچ مقداری. جایگزینی فقط با نشانگر REDACTED_*.
مبنای تشخیص: SHA-256[:12] توکن‌ها (همان روش رسمی scripts/p06r-exposure-map.py).
پس از اجرا: python3 scripts/p06r-exposure-map.py باید برای این آیتم‌ها ۰ فایل بدهد
(به‌جز موارد context غیر-اعتبارنامه‌ای C3 که خارج از دامنهٔ این اسکریپت است)."""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FP = {
    'C1': 'cec51518b9ac',
    'C2': 'ee0880daa2ca',
    'C4': 'dd65b755befe',
    'C5': '8eb38003b10d',
    'C10': '9774fdedae3b',
}

# حامل‌های رسمی از گزارش forensics (Task 3-b) + ورودی اضافی از argv
FILES = [
    'scripts/preview-setup.ts',
    'scripts/test-user-isolation.ts',
    'scripts/live-v2-tests.cjs',
    'scripts/capture-v2.cjs',
    'scripts/capture-v2-extra.cjs',
    'scripts/capture-agent-v23.cjs',
    'scripts/live-final-audit.ts',
    'scripts/p06_doc_safety_scan.py',
    'scripts/p06r_doc_safety_scan.py',
]
FILES += [a for a in sys.argv[1:] if a not in FILES]

QUOTED = re.compile(r"""["'`]([^"'\n]{3,80})["'`]""")
BARE = re.compile(r'[A-Za-z0-9_+=/.\-@#$%!]{3,80}')

total = 0
changed_files = []
for rel in FILES:
    p = ROOT / rel
    if not p.exists():
        print(f'skip (missing): {rel}')
        continue
    txt = p.read_text('utf-8', 'ignore')
    orig = txt
    offenders: dict[str, str] = {}
    for m in QUOTED.finditer(txt):
        tok = m.group(1)
        h = hashlib.sha256(tok.encode()).hexdigest()[:12]
        if h in FP.values():
            offenders[tok] = next(cid for cid, fp in FP.items() if fp == h)
    for m in BARE.finditer(txt):
        tok = m.group(0)
        if tok in offenders:
            continue
        h = hashlib.sha256(tok.encode()).hexdigest()[:12]
        if h in FP.values():
            offenders[tok] = next(cid for cid, fp in FP.items() if fp == h)
    for tok, cid in offenders.items():
        txt = txt.replace(tok, f'REDACTED_{cid}')
    if txt != orig:
        p.write_text(txt, 'utf-8')
        total += len(offenders)
        changed_files.append(rel)
        print(f'scrubbed {len(offenders)} value(s): {rel}')
    else:
        print(f'clean: {rel}')

# preview-setup.ts: مقدار → خواندن از env با fail-closed (الگوی mint-evidence-session)
ps = ROOT / 'scripts/preview-setup.ts'
if ps.exists():
    t = ps.read_text('utf-8')
    m = re.search(r'const\s+(\w+)\s*=\s*[\'"]REDACTED_C1[\'"]', t)
    if m:
        name = m.group(1)
        t = t.replace(
            m.group(0),
            f"const {name} = process.env.RAHYAR_PREVIEW_OWNER_PASSWORD ?? ''",
            1,
        )
        guard = (
            f"if (!{name}) {{\n"
            f"  console.error('preview-setup: RAHYAR_PREVIEW_OWNER_PASSWORD missing (fail-closed, R2)')\n"
            f"  process.exit(2)\n"
            f"}}\n"
        )
        # درج گارد درست پس از تعریف
        lines = t.split('\n')
        for i, ln in enumerate(lines):
            if f"process.env.RAHYAR_PREVIEW_OWNER_PASSWORD ?? ''" in ln:
                lines.insert(i + 1, guard.rstrip('\n'))
                break
        ps.write_text('\n'.join(lines), 'utf-8')
        print('preview-setup.ts converted to env-based fail-closed password')

print(f'DONE — total values redacted: {total}; files changed: {len(changed_files)}')
