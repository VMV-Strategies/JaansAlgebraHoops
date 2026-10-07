"""Draws the app icons (original artwork). Run:  python3 tools/make_icons.py
Only needed if you want to change the icon. Requires Pillow (pip install pillow)."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')
BG, BALL, LINE, CREAM = (12, 13, 16), (255, 122, 26), (27, 12, 1), (244, 240, 232)

def font(size):
    for path in ['/usr/share/fonts/truetype/dejavu/DejaVuSerif-BoldItalic.ttf', '/System/Library/Fonts/Supplemental/Times New Roman Bold Italic.ttf']:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def draw(size, pad_ratio, rounded=False):
    S = size * 4                               # draw big, then shrink for smooth edges
    img = Image.new('RGBA', (S, S), BG + (255,))
    d = ImageDraw.Draw(img)
    # warm glow in the top-right corner
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(40):
        r = S * (0.95 - i * 0.02)
        gd.ellipse([S * 0.95 - r, -S * 0.1 - r * 0.2, S * 0.95 + r, -S * 0.1 + r * 1.2], fill=(255, 122, 26, 3))
    img = Image.alpha_composite(img, glow); d = ImageDraw.Draw(img)

    pad = S * pad_ratio
    cx, cy, r = S / 2, S / 2 - S * 0.03, (S - 2 * pad) / 2 * 0.86
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BALL)
    w = max(4, int(S * 0.022))
    d.line([cx - r, cy, cx + r, cy], fill=LINE, width=w)
    d.line([cx, cy - r, cx, cy + r], fill=LINE, width=w)
    # curved seams, clipped to the ball
    seams = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(seams)
    off = r * 1.25
    sd.ellipse([cx - off - r, cy - r, cx - off + r, cy + r], outline=LINE, width=w)
    sd.ellipse([cx + off - r, cy - r, cx + off + r, cy + r], outline=LINE, width=w)
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    img.paste(seams, (0, 0), Image.composite(seams.split()[3], Image.new('L', (S, S), 0), mask))
    d = ImageDraw.Draw(img)
    # the "x y" badge: this ball does algebra
    f = font(int(S * 0.2))
    label = 'x+y'
    box = d.textbbox((0, 0), label, font=f)
    tw, th = box[2] - box[0], box[3] - box[1]
    bx, by = cx - tw / 2, cy + r * 0.52
    padx, pady = S * 0.045, S * 0.028
    d.rounded_rectangle([bx - padx, by - pady, bx + tw + padx, by + th + pady * 1.9], radius=S * 0.05, fill=BG, outline=CREAM, width=max(3, int(S * 0.008)))
    d.text((bx - box[0], by - box[1] + pady * 0.3), label, font=f, fill=CREAM)
    img = img.resize((size, size), Image.LANCZOS)
    return img.convert('RGB')

os.makedirs(OUT, exist_ok=True)
draw(192, 0.10).save(os.path.join(OUT, 'icon-192.png'))
draw(512, 0.10).save(os.path.join(OUT, 'icon-512.png'))
draw(512, 0.20).save(os.path.join(OUT, 'icon-maskable-512.png'))
draw(180, 0.10).save(os.path.join(OUT, 'apple-touch-icon.png'))
draw(32, 0.02).save(os.path.join(OUT, 'favicon-32.png'))
print('icons written to', os.path.abspath(OUT))
