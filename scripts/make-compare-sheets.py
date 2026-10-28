#!/usr/bin/env python3
# ─── ساخت شیت‌های مقایسهٔ کنار‌هم قبل/بعد (یک محیط، یک ویوپورت) ───
from PIL import Image, ImageDraw, ImageFont
import os

A = 'download/audit-v2/screens-web'         # بعد = HEAD محلی d3dd564
B = 'download/audit-v2/screens-web-before'  # قبل = origin/main 28b64bb
OUT = 'download/audit-v2/compare'
os.makedirs(OUT, exist_ok=True)

FONT_PATHS = [
    '/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]
font = None
for p in FONT_PATHS:
    if os.path.exists(p):
        font = ImageFont.truetype(p, 34)
        break

pairs = [
    ('01-login.png', 'ورود'),
    ('03-today.png', 'امروز'),
    ('04-tasks.png', 'کارها'),
    ('05-calendar.png', 'تقویم'),
    ('06b-chat-answer.png', 'دستیار (پاسخ)'),
    ('08-finance.png', 'مالی'),
    ('09-settings.png', 'تنظیمات'),
    ('10-desktop.png', 'دسکتاپ ۱۴۴۰px'),
]

GAP, PAD, LABEL_H = 24, 28, 64
for fname, label in pairs:
    ia = Image.open(os.path.join(A, fname)).convert('RGB')
    ib = Image.open(os.path.join(B, fname)).convert('RGB')
    h = max(ia.height, ib.height)
    W = PAD + ib.width + GAP + ia.width + PAD
    H = LABEL_H + h + PAD
    sheet = Image.new('RGB', (W, H), '#0F172A')
    d = ImageDraw.Draw(sheet)
    # برچسب‌ها: راست = «قبل» (راست‌چین RTL)، چپ = «بعد»
    d.text((PAD + ib.width - 10, 14), 'قبل — origin/main (28b64bb) منتشرشده', fill='#FCA5A5', font=font, anchor='ra')
    d.text((W - PAD - ia.width + ia.width + 10 - ia.width, 14), '', font=font)
    d.text((W - PAD - 10, 14), 'بعد — HEAD محلی (d3dd564) پوش‌نشده', fill='#86EFAC', font=font, anchor='ra')
    sheet.paste(ib, (PAD, LABEL_H))
    sheet.paste(ia, (PAD + ib.width + GAP, LABEL_H))
    d.line([(PAD + ib.width + GAP // 2, LABEL_H), (PAD + ib.width + GAP // 2, H - PAD)], fill='#334155', width=2)
    out = os.path.join(OUT, f'cmp-{fname}')
    sheet.save(out)
    print('saved', out, sheet.size)
