#!/usr/bin/env python3
# Generate a Big Sur-style macOS wallpaper in the Sstym palette.
import math, sys
from PIL import Image, ImageFilter
W,H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv)>2 else (3840,2160)
out = sys.argv[3] if len(sys.argv)>3 else "mac-wallpaper.png"
palette = sys.argv[4] if len(sys.argv)>4 else "dusk"
PALETTES = {
  # base gradient stops, then blobs: (x, y, r, color, alpha)
  "dusk":   ([(0.0,(10,14,32)),(0.45,(26,20,60)),(0.72,(60,28,92)),(1.0,(120,40,120))],
             [(0.72,0.30,0.42,(0,229,255),120),(0.80,0.26,0.26,(255,255,255),150),(0.30,0.78,0.48,(255,43,214),90),(0.12,0.20,0.30,(124,77,255),80)]),
  "ocean":  ([(0.0,(4,16,30)),(0.5,(6,40,70)),(1.0,(4,90,110))],
             [(0.25,0.30,0.45,(0,229,255),110),(0.30,0.25,0.22,(255,255,255),130),(0.80,0.80,0.50,(0,140,255),90),(0.90,0.15,0.30,(80,255,200),60)]),
  "sunset": ([(0.0,(30,10,40)),(0.5,(120,30,70)),(1.0,(250,120,60))],
             [(0.50,0.62,0.40,(255,190,90),150),(0.50,0.60,0.18,(255,255,230),170),(0.15,0.25,0.35,(255,43,214),80),(0.85,0.20,0.30,(124,77,255),70)]),
  "graphite":([(0.0,(14,15,18)),(0.6,(26,28,34)),(1.0,(40,42,52))],
             [(0.75,0.25,0.40,(120,130,160),70),(0.20,0.85,0.45,(0,229,255),35),(0.80,0.24,0.18,(255,255,255),60)]),
}
stops, BLOBS = PALETTES[palette]

def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def grad(y):
    t=y/(H-1)
    for i in range(len(stops)-1):
        y0,c0=stops[i]; y1,c1=stops[i+1]
        if t<=y1:
            return lerp(c0,c1,(t-y0)/(y1-y0) if y1>y0 else 0)
    return stops[-1][1]
img=Image.new("RGB",(W,H))
px=img.load()
for y in range(H):
    c=grad(y)
    for x in range(W): px[x,y]=c

# soft glowing light blobs (the Big Sur "sun" bloom + accent orbs)
def blob(cx,cy,r,color,alpha):
    layer=Image.new("RGBA",(W,H),(0,0,0,0)); lp=layer.load()
    r2=r*r
    x0,x1=max(0,int(cx-r)),min(W,int(cx+r)); y0,y1=max(0,int(cy-r)),min(H,int(cy+r))
    for y in range(y0,y1):
        for x in range(x0,x1):
            d2=(x-cx)**2+(y-cy)**2
            if d2<r2:
                f=(1-math.sqrt(d2)/r)**2
                lp[x,y]=(color[0],color[1],color[2],int(alpha*f))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r*0.12)))
img=img.convert("RGBA")
for bx,by,br,bc,ba in BLOBS:
    blob(W*bx,H*by,H*br,bc,ba)

# gentle diagonal "wave" sheen bands
band=Image.new("RGBA",(W,H),(0,0,0,0)); bp=band.load()
for y in range(H):
    for x in range(0,W,1):
        v=math.sin((x*0.6+y*1.4)/H*math.pi*2.0)
        if v>0.86:
            bp[x,y]=(255,255,255,int((v-0.86)/0.14*22))
img.alpha_composite(band.filter(ImageFilter.GaussianBlur(2)))

img.convert("RGB").save(out, quality=92)
print("wrote",out,img.size)
