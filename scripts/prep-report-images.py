#!/usr/bin/env python3
# ─── آماده‌سازی تصاویر شواهد برای گزارش (کوچک‌سازی بهینه برای PDF) ───
from PIL import Image
import os

SRC = 'download/audit-v2/compare'
DST = 'download/audit/report/img'
os.makedirs(DST, exist_ok=True)

# جفت‌های موبایل: شیت ۲۲۴۴×۲۲۹۴ → عرض ۱۱۰۰
mobile_pairs = ['cmp-03-today.png', 'cmp-06b-chat-answer.png', 'cmp-05-calendar.png',
                'cmp-01-login.png', 'cmp-08-finance.png', 'cmp-09-settings.png']
for f in mobile_pairs:
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    w = 1100
    h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    out = os.path.join(DST, f.replace('.png', '.jpg'))
    im.save(out, 'JPEG', quality=86)
    print(out, f'{os.path.getsize(out)//1024}KB', (w, h))

# دسکتاپ: ۷۶۴۰×۲۴۵۵ → عرض ۱۶۰۰
im = Image.open(os.path.join(SRC, 'cmp-10-desktop.png')).convert('RGB')
w = 1600
h = round(im.height * w / im.width)
im = im.resize((w, h), Image.LANCZOS)
out = os.path.join(DST, 'cmp-10-desktop.jpg')
im.save(out, 'JPEG', quality=86)
print(out, f'{os.path.getsize(out)//1024}KB', (w, h))
