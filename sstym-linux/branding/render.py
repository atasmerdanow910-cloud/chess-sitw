#!/usr/bin/env python3
"""Render all Sstym Linux artwork from logo.svg.
Needs (Arch): librsvg python-pillow ttf-jetbrains-mono
Usage: python3 render.py  -> writes PNG files into ./out
"""
import os, subprocess, glob
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

def font(size, weight="ExtraBold"):
    for p in glob.glob(f"/usr/share/fonts/*/JetBrainsMono-{weight}.ttf"):
        return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)

def logo(size):
    path = os.path.join(OUT, f"logo-{size}.png")
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size),
                    os.path.join(HERE, "logo.svg"), "-o", path], check=True)
    return Image.open(path).convert("RGBA")

def gradient_bg(w, h, top=(10, 14, 26), bottom=(26, 10, 38)):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img.convert("RGBA")

def hex_grid(img, step, color=(124, 77, 255, 34)):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = img.size
    r = step / 2
    import math
    for row in range(int(h / (r * 1.5)) + 2):
        for col in range(int(w / (r * 1.732)) + 2):
            cx = col * r * 1.732 + (row % 2) * r * 0.866
            cy = row * r * 1.5
            pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
                   for a in range(-90, 270, 60)]
            d.polygon(pts, outline=color)
    img.alpha_composite(layer)
    return img

def glow(base, lg, pos, radius, color=(124, 77, 255)):
    g = Image.new("RGBA", base.size, (0, 0, 0, 0))
    mask = lg.split()[3]
    solid = Image.new("RGBA", lg.size, color + (255,))
    g.paste(solid, pos, mask)
    g = g.filter(ImageFilter.GaussianBlur(radius))
    base.alpha_composite(g)
    base.alpha_composite(g)
    base.alpha_composite(lg, pos)

def centered_text(img, text, y, size, fill, weight="ExtraBold", spacing=0):
    d = ImageDraw.Draw(img)
    f = font(size, weight)
    if spacing:
        widths = [d.textlength(ch, font=f) for ch in text]
        total = sum(widths) + spacing * (len(text) - 1)
        x = (img.width - total) / 2
        for ch, wch in zip(text, widths):
            d.text((x, y), ch, font=f, fill=fill)
            x += wch + spacing
    else:
        w = d.textlength(text, font=f)
        d.text(((img.width - w) / 2, y), text, font=f, fill=fill)

def wallpaper(w, h, name):
    img = hex_grid(gradient_bg(w, h), step=int(h / 9))
    s = int(h * 0.36)
    lg = logo(s)
    pos = ((w - s) // 2, int(h * 0.20))
    glow(img, lg, pos, radius=int(h * 0.03))
    centered_text(img, "SSTYM LINUX", int(h * 0.62), int(h * 0.075), (230, 236, 255), spacing=int(h * 0.012))
    centered_text(img, "hack  ·  learn  ·  build", int(h * 0.73), int(h * 0.028), (0, 229, 255), weight="Medium")
    img.convert("RGB").save(os.path.join(OUT, name))

def splash(w, h, name, logo_size, text_size):
    img = gradient_bg(w, h)
    lg = logo(logo_size)
    pos = ((w - logo_size) // 2, int(h * 0.06))
    glow(img, lg, pos, radius=8)
    centered_text(img, "SSTYM LINUX", pos[1] + logo_size + 10, text_size, (230, 236, 255), spacing=4)
    img.convert("RGB").save(os.path.join(OUT, name))

def wordmark_logo(size, name):
    """Logo with text under it on transparent background (Plymouth, Calamares)."""
    img = Image.new("RGBA", (size, int(size * 1.3)), (0, 0, 0, 0))
    lg = logo(size)
    img.alpha_composite(lg, (0, 0))
    centered_text(img, "SSTYM LINUX", int(size * 1.05), int(size * 0.12), (230, 236, 255, 255), spacing=int(size * 0.02))
    img.save(os.path.join(OUT, name))

for s in (16, 32, 48, 64, 128, 256, 512):
    logo(s)
wallpaper(1920, 1080, "wallpaper-1920x1080.png")
wallpaper(3840, 2160, "wallpaper-3840x2160.png")
splash(640, 480, "syslinux-splash.png", 150, 28)
wordmark_logo(220, "plymouth-logo.png")
wordmark_logo(128, "calamares-logo.png")
print("rendered into", OUT)
