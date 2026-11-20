#!/usr/bin/env python3
"""Sstym Dark wallpaper: a glossy black 3D tube snaking across the screen in an
"S" shape, shaded with a soft key light, specular highlight and contact shadow.
Usage: python3 darkwall.py OUT.png [WIDTH HEIGHT]
Needs: numpy, scipy, pillow
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

out = sys.argv[1]
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (2560, 1440)
S = 1.0  # supersample factor handled by working at final size
R = H * 0.085            # tube radius

# ── centerline: a serpentine "S" (three horizontal runs joined by U-turns) ──
def arc(cx, cy, r, a0, a1, n=220):
    t = np.linspace(a0, a1, n)
    return np.stack([cx + r * np.cos(t), cy + r * np.sin(t)], 1)

def line(p0, p1, n=400):
    t = np.linspace(0, 1, n)[:, None]
    return p0 + (p1 - p0) * t

y1, y2, y3 = H * 0.20, H * 0.50, H * 0.80
xl, xr = W * 0.30, W * 0.66
turn = (y2 - y1) / 2
pts = np.concatenate([
    line(np.array([W * 1.08, y1]), np.array([xl, y1])),            # top run (enters from the right)
    arc(xl, y1 + turn, turn, -np.pi / 2, -3 * np.pi / 2),           # left U-turn
    line(np.array([xl, y2]), np.array([xr, y2])),                   # middle run
    arc(xr, y2 + turn, turn, -np.pi / 2, np.pi / 2),                # right U-turn
    line(np.array([xr, y3]), np.array([-W * 0.08, y3])),            # bottom run (exits left)
])

# rasterise the centerline and get, for every pixel, the nearest centre pixel
mask = np.ones((H, W), bool)
ix = np.clip(np.round(pts[:, 0]).astype(int), 0, W - 1)
iy = np.clip(np.round(pts[:, 1]).astype(int), 0, H - 1)
# densify so the line has no gaps
dense = np.concatenate([np.linspace(pts[i], pts[i + 1], 6) for i in range(len(pts) - 1)])
dx_ = np.clip(np.round(dense[:, 0]).astype(int), 0, W - 1)
dy_ = np.clip(np.round(dense[:, 1]).astype(int), 0, H - 1)
mask[dy_, dx_] = False
dist, (ny, nx) = ndimage.distance_transform_edt(mask, return_indices=True)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
d = dist / R
# smooth surface normals from the gradient of the (lightly blurred) distance
# field — avoids the radial streaks of nearest-pixel offsets on the bends
sm = ndimage.gaussian_filter(dist.astype(np.float32), 3.0)
gy, gx = np.gradient(sm)
gn = np.sqrt(gx ** 2 + gy ** 2) + 1e-6
ox = gx / gn * np.clip(d, 0, 1)
oy = gy / gn * np.clip(d, 0, 1)

# ── background: near-black with a faint vignette + contact shadow near the tube ──
vign = 1 - 0.55 * (((xx / W - 0.5) ** 2 + (yy / H - 0.5) ** 2) * 2.2)
bg = 0.055 * np.clip(vign, 0.3, 1)
shadow = 1 - 0.85 * np.exp(-np.clip(d - 1, 0, None) * 1.6)
bg = bg * shadow
# soft rim glow on the floor around the tube (light spill)
spill = 0.05 * np.exp(-np.clip(d - 1, 0, None) * 0.9) * np.clip(-oy + 0.3, 0, 1)
bg = bg + spill

# ── tube shading (Blinn-Phong on a cylinder cross-section) ──
inside = d < 1
nz = np.sqrt(np.clip(1 - d ** 2, 0, 1))
n = np.stack([ox, oy, nz], -1)
L = np.array([-0.35, -0.75, 0.56]); L /= np.linalg.norm(L)
V = np.array([0, 0, 1.0])
Hv = (L + V); Hv /= np.linalg.norm(Hv)
diff = np.clip(n @ L, 0, 1)
spec = np.clip(n @ Hv, 0, 1) ** 90
fres = (1 - nz) ** 3                      # rim light at grazing angles
soft = np.clip(n @ Hv, 0, 1) ** 8
tube = 0.022 + 0.11 * diff + 0.95 * spec + 0.10 * soft + 0.12 * fres
lum = np.where(inside, tube, bg)

# anti-aliased edge
edge = np.clip((1 - d) * R * 0.9, 0, 1)
lum = edge * np.where(inside, tube, 0) + (1 - edge) * bg

# cool tint: slightly blue-violet in shadows, neutral highlights
img = np.stack([lum * 0.97, lum * 0.98, lum * 1.06], -1)
img = np.clip(img, 0, 1) ** (1 / 1.15)
im = Image.fromarray((img * 255).astype(np.uint8), "RGB").filter(ImageFilter.GaussianBlur(0.6))
# film grain to avoid banding on dark gradients
grain = (np.random.default_rng(7).normal(0, 1.6, (H, W, 1))).astype(np.int16)
arr = np.clip(np.asarray(im).astype(np.int16) + grain, 0, 255).astype(np.uint8)
Image.fromarray(arr).save(out)
print("wrote", out, W, H)
