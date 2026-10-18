#!/usr/bin/env python3
# تبدیل تصاویر خام طبیعت به WebP ریز برای لایه ۵ (بلور ۷۰px+ → ۱۴۴px کافی است)
from PIL import Image
from pathlib import Path

RAW = Path('/home/z/my-project/artifacts/ambient/raw')
OUT = Path('/home/z/my-project/public/ambient')
OUT.mkdir(parents=True, exist_ok=True)

W = 144  # عرض نهایی — پس از blur(70px+) کاملاً نرم می‌شود
total = 0
for src in sorted(RAW.glob('*.png')):
    im = Image.open(src).convert('RGB')
    h = round(W * im.height / im.width)
    im = im.resize((W, h), Image.LANCZOS)
    dst = OUT / (src.stem + '.webp')
    im.save(dst, 'WEBP', quality=52, method=6)
    size = dst.stat().st_size
    total += size
    print(f'{dst.name:14s} {size:6,} bytes  ({W}x{h})')
print(f'{"TOTAL":14s} {total:6,} bytes')
