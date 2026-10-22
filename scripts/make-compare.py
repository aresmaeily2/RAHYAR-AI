#!/usr/bin/env python3
# ساخت تصاویر مقایسهٔ قبل/بعد — جفت‌های کنار‌هم با برچسب (شرایط یکسان: 393×851@2x)
from PIL import Image, ImageDraw, ImageFont
import os

AFTER = '/home/z/my-project/download/final-v21/web'
BEFORE = '/home/z/my-project/download/final-v21/before-v200'
OUT = '/home/z/my-project/download/final-v21/compare'
os.makedirs(OUT, exist_ok=True)

FA_FONT = '/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf'
# فارسی: فونت موجود — DejaVu برای لاتین
try:
    from PIL import ImageFont
    font = ImageFont.truetype(FA_FONT, 30)
except Exception:
    font = ImageFont.load_default()

PAIRS = [
    ('01-login.png', 'login'),
    ('02-today.png', 'today'),
    ('03-tasks.png', 'tasks'),
    ('05-chat.png', 'chat'),
    ('06-finance.png', 'finance'),
]

def label_strip(w, text_left, text_right):
    strip = Image.new('RGB', (w, 64), (24, 28, 38))
    d = ImageDraw.Draw(strip)
    d.text((12, 16), text_left, fill=(255, 255, 255), font=font)
    d.text((w // 2 + 12, 16), text_right, fill=(255, 255, 255), font=font)
    return strip

for fname, name in PAIRS:
    bp = os.path.join(BEFORE, fname)
    ap = os.path.join(AFTER, fname)
    if not (os.path.exists(bp) and os.path.exists(ap)):
        print('skip', name)
        continue
    b, a = Image.open(bp).convert('RGB'), Image.open(ap).convert('RGB')
    h = max(b.height, a.height)
    gap = 12
    W = b.width + a.width + gap * 3
    canvas = Image.new('RGB', (W, h + 64 + 12), (24, 28, 38))
    # قبل راست نمی‌گذاریم — RTL: «قبل» سمت راست طبیعی است؛ ولی برای خوانایی
    # بین‌المللی: چپ=قبل (v2.0.0)، راست=بعد (v2.1.0) با برچسب صریح
    canvas.paste(b, (gap, 64 + 6))
    canvas.paste(a, (b.width + gap * 2, 64 + 6))
    strip = label_strip(W, 'BEFORE — v2.0.0', 'AFTER — v2.1.0')
    canvas.paste(strip, (0, 0))
    canvas.save(os.path.join(OUT, f'compare-{name}.png'), optimize=True)
    print('compare-' + name + '.png', canvas.size)
print('COMPARE DONE')
