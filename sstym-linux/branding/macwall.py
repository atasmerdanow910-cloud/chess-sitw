#!/usr/bin/env python3
# Generate a Big Sur-style macOS wallpaper in the Sstym palette.
import math, sys
from PIL import Image, ImageFilter
W,H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv)>2 else (3840,2160)
out = sys.argv[3] if len(sys.argv)>3 else "mac-wallpaper.png"

# vertical base gradient: deep indigo -> violet -> magenta-ish (Big Sur dusk)
stops = [(0.0,(10,14,32)),(0.45,(26,20,60)),(0.72,(60,28,92)),(1.0,(120,40,120))]
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
blob(W*0.72,H*0.30,H*0.42,(0,229,255),120)    # cyan bloom
blob(W*0.80,H*0.26,H*0.26,(255,255,255),150)  # bright sun core
blob(W*0.30,H*0.78,H*0.48,(255,43,214),90)    # magenta glow lower-left
blob(W*0.12,H*0.20,H*0.30,(124,77,255),80)    # violet upper-left

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
