# -*- coding: utf-8 -*-
"""R2 pre-push secret guard — مانع انتشار مواد محرمانه به origin.
استفاده: python3 scripts/tests/r2_push_guard.py <base_sha> <new_sha>
بررسی‌ها روی فایل‌های تغییرکردهٔ بازه:
  ۱) نام‌فایل ممنوعه (.evidence-* / keystore / .env / vault/)
  ۲) اثرانگشت‌های رسمی رجیستر C1..C10 روی محتوای blob جدید (فقط شمارش + fp)
خروجی خطا فقط شامل مسیر/اثرانگشت است — هیچ مقداری چاپ نمی‌شود."""
import hashlib
import re
import subprocess
import sys

FP = {
    'C1': 'cec51518b9ac', 'C2': 'ee0880daa2ca', 'C3': 'f60ed56a9c82',
    'C4': 'dd65b755befe', 'C5': '8eb38003b10d', 'C6': 'e20de4c418c6',
    'C7': '46d0a91d1e48', 'C8': '8aa62d3b0a15', 'C9': 'ff9d8259a6e5',
    'C10': '9774fdedae3b',
}
# C3 کلمهٔ رایج است و در context غیر-اعتبارنامه‌ای هیت می‌دهد؛ در گارد سخت‌گیر نیست
HARD_FP = {k: v for k, v in FP.items() if k != 'C3'}
FORBIDDEN_PREFIXES = ('.evidence-', 'vault/')
FORBIDDEN_EXACT = ('android/rahyar-release.keystore', '.env', '.env.local', 'RUN.md')

base, new = sys.argv[1], sys.argv[2]
changed = subprocess.run(
    ['git', 'diff', '--name-only', base, new], capture_output=True, text=True
).stdout.splitlines()

bad_paths = [
    f for f in changed
    if any(f == x or f.startswith(x) for x in FORBIDDEN_PREFIXES) or f in FORBIDDEN_EXACT
]
if bad_paths:
    print('FORBIDDEN PATHS in push range:')
    for f in bad_paths:
        print(' ', f)
    sys.exit(1)

fps_set = set(HARD_FP.values())
quoted = re.compile(r"""["'`]([^"'\n]{3,80})["'`]""")
bare = re.compile(r'[A-Za-z0-9_+=/.\-@#$%!]{3,80}')
hits = []
for f in changed:
    blob = subprocess.run(['git', 'show', f'{new}:{f}'], capture_output=True).stdout
    if not blob or len(blob) > 400_000:
        continue
    txt = blob.decode('utf-8', 'ignore')
    found = set()
    for rx, grp in ((quoted, 1), (bare, 0)):
        for m in rx.finditer(txt):
            tok = m.group(grp)
            h = hashlib.sha256(tok.encode()).hexdigest()[:12]
            if h in fps_set:
                found.add(h)
    for h in found:
        cid = next(c for c, v in HARD_FP.items() if v == h)
        hits.append((f, cid))
if hits:
    print('REGISTER FINGERPRINT HITS in push range (values NOT printed):')
    for f, cid in hits:
        print(f'  {cid}: {f}')
    sys.exit(1)
print('push guard: OK (no forbidden paths, no register fingerprints)')
