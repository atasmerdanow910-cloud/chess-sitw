#!/usr/bin/env python3
"""Generate the Sstym Linux boot artwork:
  * GRUB theme  -> <out>/grub/themes/sstym/   (UEFI boot menu)
  * Plymouth    -> <out>/plymouth/sstym/      (boot splash)
Needs (Arch): python-pillow librsvg grub ttf-dejavu ttf-nerd-fonts-symbols-mono
Usage: python3 boottheme.py <logo.svg> <outdir>
"""
import os, sys, subprocess, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

LOGO_SVG, OUT = sys.argv[1], sys.argv[2]
DEJAVU = "/usr/share/fonts/TTF/DejaVuSans.ttf"
DEJAVU_B = "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"
NERD = "/usr/share/fonts/TTF/SymbolsNerdFontMono-Regular.ttf"

def logo(size, path):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), LOGO_SVG, "-o", path], check=True)
    return Image.open(path).convert("RGBA")

def gradient(w, h, top=(8, 11, 22), bottom=(30, 12, 44)):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img.convert("RGBA")

def glow_blob(img, cx, cy, r, color, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (alpha,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r * 0.45)))

# ───────────────────────────── GRUB theme ─────────────────────────────
g = os.path.join(OUT, "grub", "themes", "sstym")
os.makedirs(os.path.join(g, "icons"), exist_ok=True)

DARK = os.environ.get("SSTYM_DARK_WALL", "")
if DARK and os.path.exists(DARK):
    bg = Image.open(DARK).convert("RGBA").resize((1920, 1080), Image.LANCZOS).filter(ImageFilter.GaussianBlur(5))
    shade = Image.new("RGBA", bg.size, (6, 7, 12, 150))
    bg.alpha_composite(shade)
    glow_blob(bg, 960, 250, 300, (124, 77, 255), 55)
else:
    bg = gradient(1920, 1080)
    glow_blob(bg, 1460, 260, 420, (0, 229, 255), 70)
    glow_blob(bg, 420, 900, 520, (255, 43, 214), 55)
    glow_blob(bg, 960, 330, 260, (124, 77, 255), 60)
bg.convert("RGB").save(os.path.join(g, "background.png"))

lg = logo(120, os.path.join(g, "logo.png"))

# selection highlight (9-slice pixmap): translucent rounded pill with cyan edge
R = 6
def piece(name, w, h, draw_fn):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(im), w, h)
    im.save(os.path.join(g, f"select_{name}.png"))
FILL = (255, 255, 255, 34)
EDGE = (0, 229, 255, 170)
big = Image.new("RGBA", (R * 3, R * 3), (0, 0, 0, 0))
ImageDraw.Draw(big).rounded_rectangle((0, 0, R * 3 - 1, R * 3 - 1), radius=R, fill=FILL, outline=EDGE, width=2)
crops = {"nw": (0, 0, R, R), "n": (R, 0, 2 * R, R), "ne": (2 * R, 0, 3 * R, R),
         "w": (0, R, R, 2 * R), "c": (R, R, 2 * R, 2 * R), "e": (2 * R, R, 3 * R, 2 * R),
         "sw": (0, 2 * R, R, 3 * R), "s": (R, 2 * R, 2 * R, 3 * R), "se": (2 * R, 2 * R, 3 * R, 3 * R)}
for k, box in crops.items():
    big.crop(box).save(os.path.join(g, f"select_{k}.png"))

# frosted panel behind the whole menu (9-slice)
P = 20
pan = Image.new("RGBA", (P * 3, P * 3), (0, 0, 0, 0))
ImageDraw.Draw(pan).rounded_rectangle((0, 0, P * 3 - 1, P * 3 - 1), radius=P, fill=(12, 14, 22, 165), outline=(255, 255, 255, 30), width=1)
for k, box in {"nw": (0, 0, P, P), "n": (P, 0, 2 * P, P), "ne": (2 * P, 0, 3 * P, P), "w": (0, P, P, 2 * P),
               "c": (P, P, 2 * P, 2 * P), "e": (2 * P, P, 3 * P, 2 * P), "sw": (0, 2 * P, P, 3 * P),
               "s": (P, 2 * P, 2 * P, 3 * P), "se": (2 * P, 2 * P, 3 * P, 3 * P)}.items():
    pan.crop(box).save(os.path.join(g, f"panel_{k}.png"))

# menu icons (rendered from Nerd Font symbols)
nerd = ImageFont.truetype(NERD, 44)
icons = {"sstym": None, "lang": "\uf0ac", "advanced": "\uf1de", "safe": "", "install": "", "ram": "",
         "memtest": "\uf0e4", "efi": "", "restart": "", "shutdown": ""}
for name, glyph in icons.items():
    if glyph is None:
        logo(48, os.path.join(g, "icons", f"{name}.png"))
        continue
    im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = d.textlength(glyph, font=nerd)
    d.text(((48 - w) / 2, 2), glyph, font=nerd, fill=(198, 204, 219, 255))
    im.save(os.path.join(g, "icons", f"{name}.png"))

# fonts (GRUB pf2)
# grub-mkfont appends the style itself → family "DejaVu Sans" gives
# "DejaVu Sans Regular 16" / "DejaVu Sans Bold 20" (the names theme.txt uses)
def mkfont(ttf, size, style):
    subprocess.run(["grub-mkfont", "-s", str(size), "-n", "DejaVu Sans", "-o",
                    os.path.join(g, f"dejavu_{style}_{size}.pf2"), ttf], check=True)
mkfont(DEJAVU, 16, "regular")
mkfont(DEJAVU, 20, "regular")
mkfont(DEJAVU_B, 20, "bold")
mkfont(DEJAVU_B, 42, "bold")

open(os.path.join(g, "theme.txt"), "w").write('''# Sstym Linux — GRUB boot menu theme
title-text: ""
desktop-image: "background.png"
desktop-image-scale-method: "stretch"
desktop-color: "#08090e"
terminal-font: "DejaVu Sans Regular 16"
terminal-left: "10%"
terminal-top: "10%"
terminal-width: "80%"
terminal-height: "80%"

+ image {
    left = 50%-60
    top = 5%
    width = 120
    height = 120
    file = "logo.png"
}
+ label {
    left = 0
    top = 5%+128
    width = 100%
    align = "center"
    text = "SSTYM LINUX"
    font = "DejaVu Sans Bold 42"
    color = "#f2f2f4"
}
+ label {
    left = 0
    top = 5%+180
    width = 100%
    align = "center"
    text = "Arch Linux  ·  Hyprland"
    font = "DejaVu Sans Regular 20"
    color = "#00e5ff"
}
+ boot_menu {
    left = 50%-310
    top = 5%+232
    width = 620
    height = 340
    menu_pixmap_style = "panel_*.png"
    item_font = "DejaVu Sans Regular 20"
    selected_item_font = "DejaVu Sans Bold 20"
    item_color = "#b4bacb"
    selected_item_color = "#ffffff"
    icon_width = 30
    icon_height = 30
    item_icon_space = 16
    item_height = 36
    item_padding = 2
    item_spacing = 12
    selected_item_pixmap_style = "select_*.png"
    scrollbar = false
}
+ label {
    left = 0
    top = 5%+600
    width = 100%
    align = "center"
    id = "__timeout__"
    text = "Автозапуск через %d с  ·  auto start"
    font = "DejaVu Sans Regular 16"
    color = "#8b93a7"
}
+ label {
    left = 0
    top = 100%-38
    width = 100%
    align = "center"
    text = "↑ ↓  выбрать / choose      Enter  запуск / start      Esc  назад / back"
    font = "DejaVu Sans Regular 16"
    color = "#6a7288"
}
''')

# ───────────────────────────── Plymouth ─────────────────────────────
p = os.path.join(OUT, "plymouth", "sstym")
os.makedirs(p, exist_ok=True)
# logo with soft glow + wordmark
L = 180
base = Image.new("RGBA", (L + 120, L + 160), (0, 0, 0, 0))
lg = logo(L, "/tmp/_pl_logo.png")
glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
solid = Image.new("RGBA", lg.size, (124, 77, 255, 255))
glow.paste(solid, (60, 20), lg.split()[3])
base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)))
base.alpha_composite(lg, (60, 20))
d = ImageDraw.Draw(base)
f = ImageFont.truetype(DEJAVU_B, 30)
t = "SSTYM LINUX"
w = d.textlength(t, font=f)
d.text(((base.width - w) / 2, L + 50), t, font=f, fill=(238, 241, 248, 255))
base.save(os.path.join(p, "logo.png"))
# progress bar pieces
W, H = 260, 6
Image.new("RGBA", (W, H), (255, 255, 255, 40)).save(os.path.join(p, "bar-bg.png"))
fill = Image.new("RGBA", (W, H))
fd = ImageDraw.Draw(fill)
for x in range(W):
    t = x / (W - 1)
    c = (int(0 + 255 * t), int(229 - 186 * t), int(255 - 41 * t), 255)
    fd.line([(x, 0), (x, H)], fill=c)
fill.save(os.path.join(p, "bar-fill.png"))
# password field + bullet
pw = Image.new("RGBA", (300, 44), (0, 0, 0, 0))
ImageDraw.Draw(pw).rounded_rectangle((0, 0, 299, 43), radius=12, fill=(255, 255, 255, 28), outline=(0, 229, 255, 160), width=2)
pw.save(os.path.join(p, "entry.png"))
bl = Image.new("RGBA", (12, 12), (0, 0, 0, 0))
ImageDraw.Draw(bl).ellipse((0, 0, 11, 11), fill=(238, 241, 248, 255))
bl.save(os.path.join(p, "bullet.png"))

open(os.path.join(p, "sstym.plymouth"), "w").write('''[Plymouth Theme]
Name=Sstym
Description=Sstym Linux boot splash
ModuleName=script

[script]
ImageDir=/usr/share/plymouth/themes/sstym
ScriptFile=/usr/share/plymouth/themes/sstym/sstym.script
''')

open(os.path.join(p, "sstym.script"), "w").write('''// Sstym Linux — Plymouth boot splash
Window.SetBackgroundTopColor(0.03, 0.04, 0.09);
Window.SetBackgroundBottomColor(0.12, 0.05, 0.17);

sw = Window.GetWidth();
sh = Window.GetHeight();

logo.image = Image("logo.png");
logo.sprite = Sprite(logo.image);
logo.x = Window.GetX() + sw / 2 - logo.image.GetWidth() / 2;
logo.y = Window.GetY() + sh / 2 - logo.image.GetHeight() / 2 - 40;
logo.sprite.SetPosition(logo.x, logo.y, 10);

bar.bg_image = Image("bar-bg.png");
bar.fill_image = Image("bar-fill.png");
bar.bg = Sprite(bar.bg_image);
bar.x = Window.GetX() + sw / 2 - bar.bg_image.GetWidth() / 2;
bar.y = logo.y + logo.image.GetHeight() + 30;
bar.bg.SetPosition(bar.x, bar.y, 10);
bar.fill = Sprite();
bar.fill.SetPosition(bar.x, bar.y, 11);

progress_shown = 0;
fun progress_callback (duration, progress) {
    w = Math.Int(bar.fill_image.GetWidth() * progress);
    if (w < 1) w = 1;
    if (w != progress_shown) {
        bar.fill.SetImage(bar.fill_image.Scale(w, bar.fill_image.GetHeight()));
        progress_shown = w;
    }
}
Plymouth.SetBootProgressFunction(progress_callback);

// gentle "breathing" of the logo
t = 0;
fun refresh_callback () {
    t++;
    logo.sprite.SetOpacity(0.82 + 0.18 * Math.Sin(t / 18));
}
Plymouth.SetRefreshFunction(refresh_callback);

// messages (e.g. "Press Enter for emergency shell")
msg.sprite = Sprite();
fun message_callback (text) {
    img = Image.Text(text, 0.75, 0.78, 0.86);
    msg.sprite.SetImage(img);
    msg.sprite.SetPosition(Window.GetX() + sw / 2 - img.GetWidth() / 2, Window.GetY() + sh - 60, 20);
}
Plymouth.SetMessageFunction(message_callback);

// disk-encryption password prompt (installed systems with LUKS)
entry.image = Image("entry.png");
bullet.image = Image("bullet.png");
entry.sprite = Sprite();
prompt.sprite = Sprite();
bullets = [];
fun display_password_callback (prompt_text, nbullets) {
    entry.sprite.SetImage(entry.image);
    entry.sprite.SetOpacity(1);
    prompt.sprite.SetOpacity(1);
    ex = Window.GetX() + sw / 2 - entry.image.GetWidth() / 2;
    ey = bar.y + 30;
    entry.sprite.SetPosition(ex, ey, 30);
    pimg = Image.Text(prompt_text, 0.93, 0.95, 0.97);
    prompt.sprite.SetImage(pimg);
    prompt.sprite.SetPosition(Window.GetX() + sw / 2 - pimg.GetWidth() / 2, ey - 28, 30);
    for (i = 0; bullets[i] || i < nbullets; i++) {
        if (!bullets[i]) bullets[i] = Sprite(bullet.image);
        bullets[i].SetPosition(ex + 16 + i * 18, ey + 16, 31);
        bullets[i].SetOpacity(i < nbullets);
    }
}
Plymouth.SetDisplayPasswordFunction(display_password_callback);

fun display_normal_callback () {
    entry.sprite.SetOpacity(0);
    prompt.sprite.SetOpacity(0);
    for (i = 0; bullets[i]; i++) bullets[i].SetOpacity(0);
}
Plymouth.SetDisplayNormalFunction(display_normal_callback);
''')
print("boot artwork written to", OUT)
