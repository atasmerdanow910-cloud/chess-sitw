#!/usr/bin/env python3
"""Sstym "Glacier" wallpaper: deep-blue night sky, aurora light curtains and
glowing floating particles (original artwork, generated)."""
import sys
import numpy as np
from PIL import Image, ImageFilter

W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (2560, 1600)
out = sys.argv[3] if len(sys.argv) > 3 else "sstym-glacier.png"
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
u, v = xx / W, yy / H


def rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255


# base: vertical gradient, darker at the edges
top, mid, bot = rgb("#041029"), rgb("#0b2f6b"), rgb("#05173a")
t = v[..., None]
img = np.where(t < 0.55, top + (mid - top) * (t / 0.55), mid + (bot - mid) * ((t - 0.55) / 0.45))


def glow(cx, cy, rx, ry, col, a):
    d = ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2
    return np.exp(-d)[..., None] * rgb(col) * a


img += glow(0.62, 0.34, 0.42, 0.38, "#3d8bff", 0.55)     # main light
img += glow(0.66, 0.30, 0.16, 0.16, "#bfe3ff", 0.35)     # hot centre
img += glow(0.10, 0.85, 0.35, 0.30, "#00c6ff", 0.22)     # cyan corner
img += glow(0.95, 0.95, 0.30, 0.25, "#6a5cff", 0.18)     # violet corner

# aurora curtains: wavy ribbons with vertical striations
aur = np.zeros((H, W), np.float32)
stri = np.repeat(rng.random((1, W // 4 + 1)).astype(np.float32), 4, axis=1)[:, :W]
stri = np.array(Image.fromarray((stri * 255).astype(np.uint8)).resize((W, 1), Image.BILINEAR), np.float32) / 255
for k, (amp, freq, ph, base, width, a) in enumerate([
        (0.05, 1.3, 0.3, 0.33, 0.09, 0.50), (0.035, 2.1, 1.7, 0.24, 0.05, 0.28)]):
    centre = base + amp * np.sin(2 * np.pi * (u * freq + ph)) + 0.03 * np.sin(2 * np.pi * (u * 5.3 + ph * 2))
    dy = v - centre
    # sharp lower edge, long soft tail upwards (like real aurora)
    band = np.where(dy > 0, np.exp(-(dy / (width * 0.25)) ** 2), np.exp(-(dy / (width * 2.2)) ** 2) * (0.35 + 0.65 * stri))
    aur += band * a * (0.55 + 0.45 * stri) * np.clip(1.15 - np.abs(u - 0.6) * 1.2, 0, 1)
aur = np.array(Image.fromarray(np.clip(aur * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)),
               np.float32) / 255
img += aur[..., None] * (rgb("#4fd8ff") * 0.6 + rgb("#7c9dff") * 0.4) * 0.9

img = np.clip(img, 0, 1)
canvas = Image.fromarray((img * 255).astype(np.uint8)).convert("RGBA")

# big soft bokeh discs
bok = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bp = np.zeros((H, W, 4), np.float32)
for _ in range(26):
    cx, cy = rng.uniform(0, W), rng.uniform(0, H)
    r = rng.uniform(H * 0.015, H * 0.06)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    m = np.clip((r - d) / 2.5, 0, 1) * (0.55 + 0.45 * np.clip(d / r, 0, 1))
    col = rgb(rng.choice(["#9fd2ff", "#6fb6ff", "#b9c8ff", "#7fe7ff"]))
    a = rng.uniform(0.04, 0.10)
    bp[..., :3] = np.where(m[..., None] > 0, col, bp[..., :3])
    bp[..., 3] = np.maximum(bp[..., 3], m * a)
bok = Image.fromarray((np.clip(bp, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))
canvas.alpha_composite(bok)

# glowing particles (dense around the light, sparse elsewhere)
pl = np.zeros((H, W), np.float32)
n = 700
px = np.concatenate([rng.normal(0.62, 0.22, n // 2), rng.uniform(0, 1, n // 2)]) * W
py = np.concatenate([rng.normal(0.40, 0.25, n // 2), rng.uniform(0, 1, n // 2)]) * H
sz = rng.power(0.25, n) * 1.0
for x, y, s in zip(px, py, sz):
    xi, yi = int(x), int(y)
    if 0 <= xi < W and 0 <= yi < H:
        pl[yi, xi] = max(pl[yi, xi], 0.35 + 0.65 * s)
core = Image.fromarray((pl * 255).astype(np.uint8))
core2 = core.filter(ImageFilter.MaxFilter(3))
halo = core2.filter(ImageFilter.GaussianBlur(6))
halo2 = core.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(14))
arr = (np.asarray(core2.filter(ImageFilter.GaussianBlur(1)), np.float32) * 1.4 +
       np.asarray(halo, np.float32) * 2.2 + np.asarray(halo2, np.float32) * 1.6) / 255
arr = np.clip(arr, 0, 1)
pcol = np.dstack([np.full_like(arr, 0.86), np.full_like(arr, 0.94), np.ones_like(arr), arr])
canvas.alpha_composite(Image.fromarray((pcol * 255).astype(np.uint8)))

# vignette
vig = np.clip(1 - 0.55 * (((u - 0.55) / 0.85) ** 2 + ((v - 0.45) / 0.75) ** 2), 0.35, 1)
final = np.asarray(canvas.convert("RGB"), np.float32) * vig[..., None]
Image.fromarray(np.clip(final, 0, 255).astype(np.uint8)).save(out, optimize=True)
print("wrote", out)
