#!/usr/bin/env python3
"""ترمیم بسته‌بندی‌های چندخطی t() — متن‌های JSX چندخطی را به رشته یک‌خطی می‌چسباند."""
import re
from pathlib import Path

ROOT = Path('/home/z/my-project')
files = list((ROOT / 'src/components/ara').glob('*.tsx'))
pat = re.compile(r"\{t\('\s*\n(?P<val>[^']*?)\s*'\)\}", re.M)

for p in files:
    s = p.read_text(encoding='utf-8')
    def sub(mm: re.Match) -> str:
        val = ' '.join(mm.group('val').split())
        return "{t('" + val + "')}"
    ns = pat.sub(sub, s)
    if ns != s:
        p.write_text(ns, encoding='utf-8')
        print('fixed:', p.name)
