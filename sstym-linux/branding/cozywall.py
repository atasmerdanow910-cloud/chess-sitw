#!/usr/bin/env python3
"""Sstym Cozy wallpaper: a painterly landscape — evening sky with sunlit
clouds, hazy mountain ranges and a grassy hill with tiny flowers.
Usage: python3 cozywall.py OUT.png [WIDTH HEIGHT]
Needs: numpy, scipy, pillow
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

out = sys.argv[1]
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (2560, 1440)
rng = np.random.default_rng(42)

def noise(h, w, scale, seed):
    """Smooth organic noise: blurred white noise at a given feature scale (px)."""
    k = max(1, int(scale // 4))
    g = np.random.default_rng(seed)
    small = g.standard_normal((h // k + 4, w // k + 4)).astype(np.float32)
    small = ndimage.gaussian_filter(small, 1.2)
    big = ndimage.zoom(small, k, order=1)[:h, :w]
    big = ndimage.gaussian_filter(big, scale / 6)
    return big / (big.std() + 1e-6)

def fbm(h, w, scales=(512, 256, 128, 64, 32, 16), persistence=0.55, seed=0):
    acc = np.zeros((h, w), np.float32)
    amp = 1.0
    for i, sc in enumerate(scales):
        acc += amp * noise(h, w, sc * w / 2560, seed + i * 17)
        amp *= persistence
    return (acc - acc.min()) / (acc.max() - acc.min() + 1e-6)

def fbm1(w, seed=0, scales=(700, 300, 120, 50, 20)):
    return fbm(48, w, tuple(s for s in scales), 0.5, seed)[24]

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
v = yy / H
img = np.zeros((H, W, 3), np.float32)

# ── sky: deep blue → soft cyan → warm horizon ──
top = np.array([0.20, 0.33, 0.55]); mid = np.array([0.55, 0.70, 0.82]); hor = np.array([0.98, 0.84, 0.66])
t1 = np.clip(v / 0.45, 0, 1)[..., None]
t2 = np.clip((v - 0.45) / 0.25, 0, 1)[..., None]
sky = top * (1 - t1) + mid * t1
sky = sky * (1 - t2) + hor * t2
# sun glow (low, right of centre)
sx, sy = W * 0.62, H * 0.58
dsun = np.sqrt(((xx - sx) / W) ** 2 + ((yy - sy) / H) ** 2)
sky += np.array([1.0, 0.85, 0.6]) * (np.exp(-dsun * 7) * 0.45)[..., None]
img[:] = sky

# ── clouds: cumulus with self-shadowing, lit by the low sun ──
base = fbm(H, W, (520, 260, 120, 56, 26, 12), 0.6, seed=3)
groups = fbm(H, W, (1400, 700), 0.6, seed=9)              # splits the cloud field into separate clouds
band = np.exp(-((v - 0.27) / 0.20) ** 2)
nz = 0.65 * base + 0.35 * groups
thr = np.percentile(nz[band > 0.5], 64)              # ~1/3 of the cloud band is cloud
dens = np.clip((nz - thr) / 0.07, 0, 1) * np.clip(band * 1.4, 0, 1)
dens = ndimage.gaussian_filter(dens, 1.5)
# self-shadow: density found towards the sun darkens the cloud (sun is lower-right)
toward_sun = ndimage.shift(dens, (-H * 0.012, -W * 0.010), order=1, mode="nearest")
occl = np.clip(ndimage.gaussian_filter(toward_sun, 10), 0, 1) * 0.55
bright = np.array([1.00, 0.95, 0.86]); grey = np.array([0.52, 0.56, 0.68]); warm = np.array([1.0, 0.78, 0.55])
cc = bright * (1 - occl[..., None]) + grey * occl[..., None]
cc = cc * (0.93 + 0.10 * fbm(H, W, (60, 24, 10), 0.6, 77))[..., None]
# silver lining: thin edges glow warm
edge = np.clip(dens * (1 - dens) * 4, 0, 1)
cc = cc + warm * (edge * 0.35)[..., None]
alpha = np.clip(dens * 1.6, 0, 0.96)[..., None]
img = img * (1 - alpha) + cc * alpha

# ── mountain ranges with atmospheric haze ──
def range_mask(base_y, amp, seed, rough=7):
    prof = fbm1(W, seed)
    ridge = H * base_y - prof * H * amp
    return (yy >= ridge[None, :]).astype(np.float32), ridge

for base_y, amp, seed, col, haze in [(0.66, 0.16, 11, (0.42, 0.52, 0.66), 0.55),
                                     (0.71, 0.12, 12, (0.30, 0.42, 0.52), 0.35)]:
    m, _ = range_mask(base_y, amp, seed)
    m = ndimage.gaussian_filter(m, 1.2)
    tex = fbm(H, W, (160, 60, 24), 0.5, seed + 100)[..., None]
    c = np.array(col) * (0.85 + 0.25 * tex)
    c = c * (1 - haze) + np.array([0.86, 0.80, 0.74]) * haze
    img = img * (1 - m[..., None]) + c * m[..., None]

# ── foreground hill with grass ──
prof = fbm1(W, 21, (900, 400))
hill = H * (0.74 + 0.10 * (xx[0] / W - 0.35) ** 2 * 4) - prof * H * 0.05
hm = (yy >= hill[None, :]).astype(np.float32)
hm = ndimage.gaussian_filter(hm, 1.0)
g = fbm(H, W, (220, 90, 40, 16), 0.6, 31)[..., None]
# grass blades: noise stretched vertically
blades = ndimage.gaussian_filter(np.random.default_rng(5).standard_normal((H, W)).astype(np.float32), (5, 0.7))
blades = (blades / (blades.std() + 1e-6))[..., None]
depth = np.clip((yy - hill[None, :]) / (H * 0.25), 0, 1)[..., None]
grass_far = np.array([0.46, 0.62, 0.34]); grass_near = np.array([0.20, 0.36, 0.16])
gc = grass_far * (1 - depth) + grass_near * depth
gc = gc * (0.72 + 0.42 * g + 0.10 * blades)
# warm rim light along the hill crest
rim = np.exp(-np.clip(yy - hill[None, :], 0, None) / (H * 0.012))[..., None]
gc = gc + np.array([0.55, 0.42, 0.20]) * rim * 0.35
img = img * (1 - hm[..., None]) + gc * hm[..., None]

# tiny flowers in the near grass
n_fl = int(W * H / 2600)
fx = rng.integers(0, W, n_fl); fy = rng.integers(0, H, n_fl)
keep = (fy > hill[fx] + H * 0.04)
for x, y in zip(fx[keep], fy[keep]):
    r = 1 + int(2 * (y - hill[x]) / (H * 0.3))
    col = rng.choice([[1, 1, 0.95], [1, 0.95, 0.75], [0.95, 0.85, 1.0]])
    img[max(0, y - r):y + r, max(0, x - r):x + r] = col

img = np.clip(img, 0, 1) ** (1 / 1.05)
im = Image.fromarray((img * 255).astype(np.uint8), "RGB")
im = im.filter(ImageFilter.GaussianBlur(0.8)).filter(ImageFilter.UnsharpMask(2, 40, 2))
im.save(out)
print("wrote", out, W, H)

# optional quote in the sky (like a poster)
if len(sys.argv) > 4:
    from PIL import ImageDraw, ImageFont
    import glob
    im = Image.open(out).convert("RGBA")
    d = ImageDraw.Draw(im)
    fonts = glob.glob("/usr/share/fonts/noto/NotoSerif-Italic.ttf") + glob.glob("/usr/share/fonts/**/DejaVuSerif-Italic.ttf", recursive=True) \
        + glob.glob("/usr/share/fonts/**/*Serif*Italic*.ttf", recursive=True)
    f = ImageFont.truetype(fonts[0], int(H * 0.030)) if fonts else ImageFont.load_default()
    text = sys.argv[4]
    x, y = int(W * 0.12), int(H * 0.66)
    d.text((x + 2, y + 2), text, font=f, fill=(40, 30, 20, 110))
    d.text((x, y), text, font=f, fill=(255, 238, 210, 235))
    im.convert("RGB").save(out)
    print("quote added with", fonts[0] if fonts else "default font")
