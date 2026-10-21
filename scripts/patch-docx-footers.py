#!/usr/bin/env python3
"""Patch docx footers per toc.md WPS rules:
- map each section's pgNumType fmt -> its footerReference -> footer XML
- bare PAGE instrText -> 'PAGE \\* ROMAN \\* MERGEFORMAT' (upperRoman) / 'PAGE \\* arabic \\* MERGEFORMAT' (decimal)
- strip empty <w:pgNumType/> (docx-js artifact that confuses WPS)
"""
import sys, re, zipfile, shutil, os, tempfile

path = sys.argv[1]
tmp = tempfile.mkdtemp()

with zipfile.ZipFile(path) as z:
    z.extractall(tmp)

doc_path = os.path.join(tmp, "word", "document.xml")
with open(doc_path, encoding="utf-8") as f:
    doc = f.read()

# 1) strip empty pgNumType
doc, n_strip = re.subn(r"<w:pgNumType/>", "", doc)
with open(doc_path, "w", encoding="utf-8") as f:
    f.write(doc)

# 2) map rels
rels_path = os.path.join(tmp, "word", "_rels", "document.xml.rels")
with open(rels_path, encoding="utf-8") as f:
    rels = f.read()
rid_to_target = dict(re.findall(r'<Relationship Id="([^"]+)"[^>]*Target="([^"]+)"', rels))

# 3) per sectPr: fmt + footerReference
patched = []
for sect in re.findall(r"<w:sectPr[^>]*>.*?</w:sectPr>", doc, flags=re.S):
    m_fmt = re.search(r'<w:pgNumType[^>]*w:fmt="([^"]+)"', sect)
    if not m_fmt:
        continue
    fmt = m_fmt.group(1)
    for rid in re.findall(r'<w:footerReference[^>]*r:id="([^"]+)"', sect):
        target = rid_to_target.get(rid)
        if not target:
            continue
        fpath = os.path.join(tmp, "word", os.path.basename(target))
        if not os.path.exists(fpath):
            continue
        with open(fpath, encoding="utf-8") as f:
            fx = f.read()
        switch = "ROMAN" if "oman" in fmt or "ROMAN" in fmt else ("arabic" if fmt == "decimal" else None)
        if not switch:
            continue
        fx2, n = re.subn(
            r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
            r"\g<1> PAGE \\* " + switch + r" \\* MERGEFORMAT \g<2>",
            fx,
        )
        if n:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(fx2)
            patched.append((os.path.basename(target), fmt, switch, n))

# 4) rezip
out = path + ".tmp"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(tmp):
        for name in files:
            full = os.path.join(root, name)
            z.write(full, os.path.relpath(full, tmp))
shutil.move(out, path)
shutil.rmtree(tmp)
print("stripped_empty_pgNumType:", n_strip)
print("patched_footers:", patched)
