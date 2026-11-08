#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""R3 — اسکن کامل تاریخچه (A3-سبک): همهٔ blobهای reachable از tip شاخهٔ انتشار.
بررسی‌ها:
  ۱) fp رجیستر C1..C10 (اثرانگشت رسمی R2) روی توکن‌های متن هر blob — C3 سخت‌گیر نیست (کلمهٔ رایج)
  ۲) نام‌فایل‌های ممنوعه (keystore / .evidence-* / vault/ / .env / RUN.md)
  ۳) سرنخ PEM در متن blobs متنی (برای بازبینی دستی — false positive ممکن است)
خروجی فقط شمارش/fp/مسیر است — هیچ مقداری چاپ نمی‌شود.
استفاده: python3 scripts/tests/r3_full_history_scan.py <rev>"""
import hashlib
import re
import subprocess
import sys

FP = {'C1': 'cec51518b9ac', 'C2': 'ee0880daa2ca', 'C3': 'f60ed56a9c82',
      'C4': 'dd65b755befe', 'C5': '8eb38003b10d', 'C6': 'e20de4c418c6',
      'C7': '46d0a91d1e48', 'C8': '8aa62d3b0a15', 'C9': 'ff9d8259a6e5',
      'C10': '9774fdedae3b'}
HARD = {k: v for k, v in FP.items() if k != 'C3'}
FORBIDDEN_PATH_RE = re.compile(r'(\.evidence-|keystore|vault/|\.env$|RUN\.md$)', re.I)
PEM_MARKERS = ('BEGIN RSA PRIVATE KEY', 'BEGIN PRIVATE KEY', 'BEGIN OPENSSH PRIVATE KEY')

def main(rev):
    out = subprocess.run(['git', 'rev-list', '--objects', rev],
                         capture_output=True, text=True).stdout.splitlines()
    seen = set()
    forbidden = {}
    fp_hits = {}
    pem_hits = []
    nblobs = 0
    for line in out:
        if ' ' not in line:
            continue
        sha, path = line.split(' ', 1)
        if sha in seen:
            continue
        seen.add(sha)
        if FORBIDDEN_PATH_RE.search(path):
            forbidden[path] = sha
        raw = subprocess.run(['git', 'cat-file', 'blob', sha], capture_output=True).stdout
        nblobs += 1
        try:
            txt = raw.decode('utf-8')
        except Exception:
            continue  # binary blob — نام‌فایل آن بالا بررسی شد
        if any(m in txt for m in PEM_MARKERS):
            pem_hits.append(path)
        for tok in re.findall(r'[A-Za-z0-9_+=/.\-@#$%!]{3,80}', txt):
            h = hashlib.sha256(tok.encode()).hexdigest()[:12]
            for k, v in HARD.items():
                if h == v:
                    fp_hits.setdefault(k, []).append(path)
            if h == FP['C3']:
                fp_hits.setdefault('C3', []).append(path)
    print(f"REV={rev}")
    print(f"BLOBS_SCANNED={nblobs}")
    print(f"FORBIDDEN_PATH_HITS={len(forbidden)}")
    for p in sorted(forbidden)[:20]:
        print(f"  PATH {p} blob={forbidden[p][:12]}")
    hard_total = sum(len(v) for k, v in fp_hits.items() if k != 'C3')
    print(f"HARD_REGISTER_FP_HITS={hard_total}")
    for k in sorted(fp_hits):
        tag = ' (soft — common word)' if k == 'C3' else ''
        print(f"  {k}: {len(fp_hits[k])} blobs{tag} e.g. {fp_hits[k][:3]}")
    print(f"PEM_MARKER_BLOBS={len(pem_hits)} (manual review list)")
    for p in pem_hits[:15]:
        print(f"  PEM {p}")
    ok = len(forbidden) == 0 and hard_total == 0
    print("SCAN_VERDICT=" + ("CLEAN" if ok else "REVIEW-REQUIRED"))
    sys.exit(0 if ok else 2)

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'HEAD')
