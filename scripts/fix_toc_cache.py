#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Remove the docx-js cached first TOC entry (hyperlink without page number)
that duplicates the first static placeholder entry inside the TOC field.
Keeps: field begin/instrText/separate/end + all placeholder paragraphs.
Usage: python3 fix_toc_cache.py <file.docx>
"""
import re
import shutil
import sys
import zipfile
import tempfile
import os

def main(path):
    tmpdir = tempfile.mkdtemp()
    try:
        with zipfile.ZipFile(path) as z:
            z.extractall(tmpdir)
        doc_path = os.path.join(tmpdir, "word", "document.xml")
        xml = open(doc_path, encoding="utf-8").read()

        # Remove the hyperlink that immediately follows the TOC field's separate
        # fldChar (the cached first entry rendered without a page number).
        pattern = re.compile(
            r'(fldCharType="separate"/></w:r>)(<w:hyperlink[^>]*>.*?</w:hyperlink>)',
            re.DOTALL,
        )
        new_xml, n = pattern.subn(r"\1", xml, count=1)
        if n == 0:
            print("No cached TOC hyperlink found — nothing to fix.")
            return 0
        open(doc_path, "w", encoding="utf-8").write(new_xml)

        # Repack preserving order
        newzip = path + ".tmp"
        with zipfile.ZipFile(newzip, "w", zipfile.ZIP_DEFLATED) as z:
            for root, _, files in os.walk(tmpdir):
                for f in files:
                    full = os.path.join(root, f)
                    rel = os.path.relpath(full, tmpdir)
                    z.write(full, rel)
        shutil.move(newzip, path)
        print(f"Removed {n} cached TOC entry — fixed: {path}")
        return 0
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
