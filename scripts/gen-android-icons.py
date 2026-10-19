# آیکون لانچر رهیار — گرادیان نیلی + گوی هوش مصنوعی
from PIL import Image, ImageDraw, ImageFilter
import os

OUT = "/home/z/my-project/artifacts/android-build/res"
SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

def make_icon(size: int) -> Image.Image:
    S = 4  # supersample
    n = size * S
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # پس‌زمینه گرادیان مورب (نیلی تیره → بنفش)
    c1, c2 = (13, 18, 34), (63, 55, 201)
    grad = Image.new("RGBA", (n, n))
    gd = ImageDraw.Draw(grad)
    for i in range(n):
        t = (i + 0) / n
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        gd.line([(0, i), (n, i)], fill=(r, g, b, 255))

    # ماسک گوشه‌گرد (شعاع ~22%)
    mask = Image.new("L", (n, n), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=255)
    img.paste(grad, (0, 0), mask)

    # هاله گوی
    glow = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    gld = ImageDraw.Draw(glow)
    cx, cy, R = n // 2, int(n * 0.46), int(n * 0.21)
    gld.ellipse([cx - R * 1.7, cy - R * 1.7, cx + R * 1.7, cy + R * 1.7],
                fill=(99, 102, 241, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(n * 0.05))
    img.alpha_composite(glow)

    # گوی اصلی
    d.ellipse([cx - R, cy - R, cx + R, cy + R],
              fill=(139, 156, 255, 255))
    # هایلایت
    hl_r = int(R * 0.42)
    d.ellipse([cx - R * 0.45 - hl_r // 2, cy - R * 0.45 - hl_r // 2,
               cx - R * 0.45 + hl_r, cy - R * 0.45 + hl_r],
              fill=(226, 232, 255, 235))
    # حلقه بیرونی نازک
    ring = int(R * 1.38)
    d.ellipse([cx - ring, cy - ring, cx + ring, cy + ring],
              outline=(199, 210, 254, 200), width=max(1, n // 90))

    return img.resize((size, size), Image.LANCZOS)

for dpi, px in SIZES.items():
    p = os.path.join(OUT, f"mipmap-{dpi}")
    os.makedirs(p, exist_ok=True)
    make_icon(px).save(os.path.join(p, "ic_launcher.png"))
    print(f"ic_launcher.png -> mipmap-{dpi} ({px}px)")
print("ICONS_OK")
