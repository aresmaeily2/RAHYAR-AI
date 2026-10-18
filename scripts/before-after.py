# Before/After مونتاژ — نسخه قبلی vs RC ۱٫۰ (از اسکرین‌شات‌های واقعی)
from PIL import Image, ImageDraw, ImageFont

pairs = [
    ('/tmp/before/shots/01-today.png', 'artifacts/rc-1.0/fa-01-today.png', 'Today / امروز'),
    ('/tmp/before/shots/03-calendar.png', 'artifacts/rc-1.0/fa-03-calendar.png', 'Calendar / تقویم'),
    ('/tmp/before/shots/04-chat.png', 'artifacts/rc-1.0/fa-04-assistant.png', 'Assistant / دستیار'),
]

W = 720  # each panel width
LABEL_H = 64
panels = []
for before_p, after_p, label in pairs:
    b = Image.open(before_p).convert('RGB')
    a = Image.open(after_p).convert('RGB')
    bh = int(b.height * W / b.width)
    ah = int(a.height * W / a.width)
    H = max(bh, ah)
    panels.append((b.resize((W, bh)), a.resize((W, ah)), label, H))

total_h = sum(p[3] + LABEL_H for p in panels) + 16
canvas = Image.new('RGB', (W * 2 + 24, total_h + 16), '#0f172a')
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
except Exception:
    font = ImageFont.load_default()

y = 8
draw.text((W // 2 - 130, y), 'BEFORE', fill='#94a3b8', font=font)
draw.text((W + 24 + W // 2 - 110, y), 'AFTER — RC 1.0', fill='#34d399', font=font)
y += LABEL_H - 24
for b, a, label, H in panels:
    canvas.paste(b, (8, y))
    canvas.paste(a, (W + 16, y))
    y += H + 6
canvas.save('artifacts/rc-1.0/before-after-rc.png', optimize=True)
print('saved artifacts/rc-1.0/before-after-rc.png', canvas.size)
