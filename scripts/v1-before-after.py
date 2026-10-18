#!/usr/bin/env python3
"""مونتاژ Before/After نسخه ۱٫۰ — قبل: نسخه قبلی امروز | بعد: نسخه ۱٫۰ با مالی/تنظیمات/دوزبانه"""
from PIL import Image, ImageDraw, ImageFont

W, GAP, HEADER = 720, 24, 64
BG = (14, 35, 39)
FG = (242, 247, 246)
ACC = (13, 148, 136)

before = Image.open('/home/z/my-project/tool-results/v7-01-today-light.png').convert('RGB')
after = Image.open('/home/z/my-project/download/rahyar-v1-screens/01-today-fa-light.png').convert('RGB')

def fit(img, w):
    r = w / img.width
    return img.resize((w, int(img.height * r)), Image.LANCZOS)

before = fit(before, W)
after = fit(after, W)
H = HEADER + max(before.height, after.height) + 20
canvas = Image.new('RGB', (W * 2 + GAP * 3, H), BG)
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf', 26)
except Exception:
    font = ImageFont.load_default()

canvas.paste(before, (GAP, HEADER))
canvas.paste(after, (W + GAP * 2, HEADER))
draw.text((GAP + 8, 18), 'BEFORE — نسخه قبلی', fill=FG, font=font)
draw.text((W + GAP * 2 + 8, 18), 'AFTER — نسخه ۱٫۰ رهیار', fill=ACC, font=font)
canvas.save('/home/z/my-project/download/rahyar-v1-before-after.png', optimize=True)
print('montage saved', canvas.size)
