#!/usr/bin/env python3
"""ترمیم توست‌های ت() — بستن پرانتز ت() که در مهاجرت باز مانده."""
import re
from pathlib import Path

ROOT = Path('/home/z/my-project')
pat = re.compile(r"(\btoast(?:\.success|\.error|\.info|\.warning)?\(\s*)t\('([^']*)'(?P<after>[,)`])")

for p in (ROOT / 'src/components/ara').glob('*.tsx'):
    s = p.read_text(encoding='utf-8')
    out = []
    pos = 0
    count = 0
    for mm in pat.finditer(s):
        after = mm.group('after')
        if after == ')':
            repl = f"{mm.group(1)}t('{mm.group(2)}'))"
        elif after == ',':
            repl = f"{mm.group(1)}t('{mm.group(2)}'),"
        else:
            # بعدش backtick یا چیز دیگر — بدون تغییر
            repl = mm.group(0)
        out.append(s[pos:mm.start()])
        out.append(repl)
        pos = mm.end()
        count += 1
    out.append(s[pos:])
    ns = ''.join(out)
    if ns != s:
        p.write_text(ns, encoding='utf-8')
        print(f'fixed {count} toasts in {p.name}')
