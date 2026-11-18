// Procedural textures (canvas) + shared material library
import * as THREE from '../vendor/three/three.module.min.js';

// One shared clipping plane: used by the "cutaway" (dollhouse) view.
// Points with y > constant are clipped. 1000 = clipping effectively off.
export const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);

let maxAniso = 4;

export function rng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function rgba(hex, a) {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l * f)));
  return '#' + c.getHexString();
}

export function makeTexture(cv, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.needsUpdate = true;
  return t;
}

function speckle(g, w, h, n, colors, s0, s1, alpha, r) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = rgba(colors[(r() * colors.length) | 0], alpha * (0.4 + r() * 0.6));
    const s = s0 + r() * (s1 - s0);
    g.fillRect(r() * w, r() * h, s, s);
  }
}

// ---------- texture generators ----------
function woodPlanks(size, colors, rows, seed) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  const rh = size / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * size * 0.6;
    while (x < size) {
      const len = size * (0.5 + r() * 0.45);
      const col = colors[(r() * colors.length) | 0];
      const grd = g.createLinearGradient(0, i * rh, 0, (i + 1) * rh);
      grd.addColorStop(0, shade(col, 1.04));
      grd.addColorStop(1, shade(col, 0.94));
      g.fillStyle = grd;
      g.fillRect(x, i * rh, len, rh);
      for (let k = 0; k < 16; k++) {
        g.strokeStyle = `rgba(55,32,14,${0.03 + r() * 0.09})`;
        g.lineWidth = 0.5 + r() * 1.6;
        const yy = i * rh + r() * rh;
        const amp = rh * 0.08 * r();
        const ph = r() * 6;
        g.beginPath();
        g.moveTo(x, yy);
        for (let s = 1; s <= 12; s++) g.lineTo(x + (len * s) / 12, yy + Math.sin(s * 0.7 + ph) * amp);
        g.stroke();
      }
      if (r() < 0.25) {
        g.fillStyle = 'rgba(70,40,18,0.25)';
        g.beginPath();
        g.ellipse(x + len * r(), i * rh + rh * (0.3 + r() * 0.4), 6 + r() * 6, 3 + r() * 2, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(20,10,4,0.45)';
      g.fillRect(x, i * rh, 2, rh);
      x += len;
    }
    g.fillStyle = 'rgba(20,10,4,0.5)';
    g.fillRect(0, i * rh, size, 2);
  }
  g.fillStyle = 'rgba(20,10,4,0.45)';
  g.fillRect(0, 0, 2, size);
  return c;
}

function woodGrain(size, base, seed) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let k = 0; k < 140; k++) {
    g.strokeStyle = r() < 0.5 ? `rgba(30,15,5,${0.04 + r() * 0.1})` : `rgba(255,230,190,${0.02 + r() * 0.05})`;
    g.lineWidth = 0.6 + r() * 2.5;
    const y = r() * size, amp = 2 + r() * 10, ph = r() * 6, f = 1 + r() * 3;
    for (const oy of [-size, 0, size]) {
      g.beginPath();
      for (let s = 0; s <= 32; s++) {
        const x = (size * s) / 32;
        const yy = y + oy + Math.sin((s / 32) * Math.PI * 2 * f + ph) * amp;
        s === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.stroke();
    }
  }
  return c;
}

function marble(size, base, vein, seed, tiles = 0) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 50; i++) {
    const x = r() * size, y = r() * size, rad = size * (0.05 + r() * 0.25);
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, rgba(vein, 0.035 + r() * 0.03));
      gr.addColorStop(1, rgba(vein, 0));
      g.fillStyle = gr;
      g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  const veinCount = 14;
  for (let v = 0; v < veinCount; v++) {
    let x = r() * size, y = r() * size, ang = r() * Math.PI * 2;
    const pts = [[x, y]];
    const steps = 50 + r() * 70;
    for (let s = 0; s < steps; s++) {
      ang += (r() - 0.5) * 0.55;
      x += Math.cos(ang) * size * 0.011;
      y += Math.sin(ang) * size * 0.011;
      pts.push([x, y]);
    }
    const w = 0.5 + r() * 2.4, a = 0.18 + r() * 0.45;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy)));
      g.strokeStyle = rgba(vein, a);
      g.lineWidth = w;
      g.stroke();
      g.strokeStyle = rgba(vein, a * 0.25);
      g.lineWidth = w * 4;
      g.stroke();
    }
  }
  if (tiles) {
    const s = size / tiles;
    g.fillStyle = 'rgba(150,145,140,0.55)';
    for (let i = 0; i <= tiles; i++) {
      g.fillRect(i * s - 1, 0, 2, size);
      g.fillRect(0, i * s - 1, size, 2);
    }
  }
  return c;
}

function tileGrid(size, color, grout, n, seed, vari = 0.04) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  const s = size / n;
  g.fillStyle = grout;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = shade(color, 1 - vari + r() * vari * 2);
    g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
    gr.addColorStop(0, 'rgba(255,255,255,0.08)');
    gr.addColorStop(1, 'rgba(0,0,0,0.06)');
    g.fillStyle = gr;
    g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
  }
  return c;
}

function grass(size, seed) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#5b7d3f';
  g.fillRect(0, 0, size, size);
  const cols = ['#52733a', '#68894a', '#46663a', '#738f50', '#5a7a3e', '#829b5c', '#6b7f45'];
  for (let i = 0; i < 14000; i++) {
    g.strokeStyle = rgba(cols[(r() * cols.length) | 0], 0.55 + r() * 0.4);
    g.lineWidth = 1 + r();
    const x = r() * size, y = r() * size, l = 3 + r() * 7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 3, y - l);
    g.stroke();
  }
  return c;
}

function pavers(size, seed, palette) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#8f8676';
  g.fillRect(0, 0, size, size);
  const rows = 6, rh = size / rows;
  for (let i = 0; i < rows; i++) {
    let x = i % 2 ? -rh * 0.7 : 0;
    while (x < size) {
      const w = rh * (1.1 + r() * 0.9);
      g.fillStyle = palette[(r() * palette.length) | 0];
      g.fillRect(x + 2, i * rh + 2, w - 4, rh - 4);
      speckle(g, 0, 0, 0, ['#000'], 1, 1, 0, r);
      x += w;
    }
  }
  speckle(g, size, size, 4000, ['#ffffff', '#000000', '#a09888'], 1, 2.5, 0.08, r);
  return c;
}

function shingles(size, seed) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  const rows = 14, rh = size / rows;
  const cols = ['#3b3f45', '#44484e', '#34373c', '#4d5157', '#3f3a36', '#2f3237'];
  for (let i = 0; i < rows; i++) {
    let x = i % 2 ? -rh * 0.6 : 0;
    while (x < size) {
      const w = rh * (0.9 + r() * 0.8);
      g.fillStyle = cols[(r() * cols.length) | 0];
      g.fillRect(x, i * rh, w - 2, rh);
      x += w;
    }
    const gr = g.createLinearGradient(0, i * rh, 0, (i + 1) * rh);
    gr.addColorStop(0, 'rgba(0,0,0,0.35)');
    gr.addColorStop(0.25, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(255,255,255,0.05)');
    g.fillStyle = gr;
    g.fillRect(0, i * rh, size, rh);
  }
  speckle(g, size, size, 5000, ['#ffffff', '#000000'], 1, 2, 0.12, r);
  return c;
}

function siding(size) {
  const c = canvas(size), g = c.getContext('2d');
  const bands = 8, bh = size / bands;
  for (let i = 0; i < bands; i++) {
    const gr = g.createLinearGradient(0, i * bh, 0, (i + 1) * bh);
    gr.addColorStop(0, '#f6f4ef');
    gr.addColorStop(0.85, '#e7e3db');
    gr.addColorStop(1, '#cfcac0');
    g.fillStyle = gr;
    g.fillRect(0, i * bh, size, bh);
  }
  return c;
}

function stone(size, seed, palette, mortar = '#8f897f') {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = mortar;
  g.fillRect(0, 0, size, size);
  let y = 0;
  while (y < size) {
    const h = size * (0.08 + r() * 0.07);
    let x = -r() * 40;
    while (x < size) {
      const w = size * (0.1 + r() * 0.16);
      g.fillStyle = palette[(r() * palette.length) | 0];
      const rr = 6;
      g.beginPath();
      if (g.roundRect) g.roundRect(x + 3, y + 3, w - 6, Math.min(h, size - y) - 6, rr);
      else g.rect(x + 3, y + 3, w - 6, Math.min(h, size - y) - 6);
      g.fill();
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, 'rgba(255,255,255,0.12)');
      gr.addColorStop(1, 'rgba(0,0,0,0.15)');
      g.fillStyle = gr;
      g.fill();
      x += w;
    }
    y += h;
  }
  speckle(g, size, size, 3000, ['#ffffff', '#000000'], 1, 2, 0.1, r);
  return c;
}

function noiseTex(size, base, cols, n, seed, s0 = 1, s1 = 3, a = 0.3) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  speckle(g, size, size, n, cols, s0, s1, a, r);
  return c;
}

function persianRug(seed) {
  const W = 768, H = 512;
  const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#7b1e26';
  g.fillRect(0, 0, W, H);
  const band = (m, w, col) => {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.strokeRect(m, m, W - 2 * m, H - 2 * m);
  };
  band(14, 22, '#1d2848');
  band(34, 6, '#d9b56a');
  band(52, 26, '#efe3c6');
  band(70, 5, '#1d2848');
  // little motifs on cream border
  g.fillStyle = '#9c2a33';
  for (let x = 60; x < W - 60; x += 26) {
    g.fillRect(x, 48, 8, 8);
    g.fillRect(x, H - 56, 8, 8);
  }
  for (let y = 60; y < H - 60; y += 26) {
    g.fillRect(48, y, 8, 8);
    g.fillRect(W - 56, y, 8, 8);
  }
  // field motifs
  for (let x = 110; x < W - 90; x += 44) for (let y = 105; y < H - 90; y += 44) {
    g.fillStyle = (x + y) % 88 === 0 ? '#c79a4b' : '#2a3560';
    g.beginPath();
    g.moveTo(x, y - 8);
    g.lineTo(x + 8, y);
    g.lineTo(x, y + 8);
    g.lineTo(x - 8, y);
    g.closePath();
    g.fill();
  }
  // central medallion
  const cx = W / 2, cy = H / 2;
  const layers = [['#1d2848', 150, 120], ['#d9b56a', 128, 100], ['#7b1e26', 112, 86], ['#efe3c6', 80, 60], ['#1d2848', 56, 40], ['#c79a4b', 26, 18]];
  for (const [col, rx, ry] of layers) {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const k = i % 2 ? 0.78 : 1;
      const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
    g.fill();
  }
  // corners
  for (const [x, y] of [[90, 90], [W - 90, 90], [90, H - 90], [W - 90, H - 90]]) {
    g.fillStyle = '#d9b56a';
    g.beginPath();
    g.arc(x, y, 20, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1d2848';
    g.beginPath();
    g.arc(x, y, 10, 0, Math.PI * 2);
    g.fill();
  }
  speckle(g, W, H, 9000, ['#000000', '#ffffff'], 1, 2, 0.08, r);
  return c;
}

function modernRug(seed, bg = '#e6dfd2', lines = '#b49a6c', dark = '#3a3a3c') {
  const W = 768, H = 512;
  const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.lineWidth = 6;
  for (let i = 0; i < 7; i++) {
    g.strokeStyle = i % 3 === 0 ? dark : lines;
    g.globalAlpha = 0.5 + r() * 0.4;
    g.beginPath();
    const x = r() * W, y = r() * H;
    g.moveTo(x - 400, y - 200);
    g.bezierCurveTo(x - 100, y + 120, x + 100, y - 140, x + 420, y + 180);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.strokeStyle = lines;
  g.lineWidth = 10;
  g.strokeRect(22, 22, W - 44, H - 44);
  speckle(g, W, H, 12000, ['#000000', '#ffffff'], 1, 2, 0.07, r);
  return c;
}

function kidsRug() {
  const S = 512, c = canvas(S), g = c.getContext('2d');
  const cols = ['#3d7fd1', '#f2c14e', '#e05a47', '#5bb56a', '#9b6ad6', '#f7f1e3'];
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i];
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - i * 40, 0, Math.PI * 2);
    g.fill();
  }
  star(g, S / 2, S / 2, 5, 40, 18, '#f2c14e');
  return c;
}

function star(g, x, y, n, r1, r2, col) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r2 : r1;
    i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

function abstractArt(seed, pal) {
  const W = 512, H = 640;
  const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, pal[0]);
  gr.addColorStop(1, pal[1]);
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    g.globalAlpha = 0.35 + r() * 0.5;
    g.fillStyle = pal[2 + ((r() * (pal.length - 2)) | 0)];
    g.beginPath();
    if (r() < 0.5) g.arc(r() * W, r() * H, 30 + r() * 160, 0, Math.PI * 2);
    else {
      g.ellipse(r() * W, r() * H, 40 + r() * 200, 10 + r() * 60, r() * 3, 0, Math.PI * 2);
    }
    g.fill();
  }
  g.globalAlpha = 0.8;
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = pal[2 + ((r() * (pal.length - 2)) | 0)];
    g.lineWidth = 4 + r() * 18;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(r() * W, r() * H);
    g.quadraticCurveTo(r() * W, r() * H, r() * W, r() * H);
    g.stroke();
  }
  g.globalAlpha = 1;
  speckle(g, W, H, 6000, ['#000000', '#ffffff'], 1, 2, 0.05, r);
  return c;
}

function landscapeArt(seed, sky1, sky2, hills) {
  const W = 640, H = 420;
  const c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, sky1);
  gr.addColorStop(0.65, sky2);
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,240,200,0.9)';
  g.beginPath();
  g.arc(W * (0.25 + r() * 0.5), H * 0.38, 34, 0, Math.PI * 2);
  g.fill();
  hills.forEach((col, k) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, H);
    const base = H * (0.5 + k * 0.12);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, base - Math.sin(x * 0.012 + k * 2 + r()) * 30 - Math.sin(x * 0.03 + k) * 12);
    g.lineTo(W, H);
    g.fill();
  });
  speckle(g, W, H, 8000, ['#000000', '#ffffff'], 1, 2, 0.06, r);
  return c;
}

function usFlag() {
  const W = 760, H = 400;
  const c = canvas(W, H), g = c.getContext('2d');
  const sh = H / 13;
  for (let i = 0; i < 13; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : '#b22234';
    g.fillRect(0, i * sh, W, sh + 1);
  }
  const cw = W * 0.4, ch = sh * 7;
  g.fillStyle = '#3c3b6e';
  g.fillRect(0, 0, cw, ch);
  for (let row = 0; row < 9; row++) {
    const n = row % 2 ? 5 : 6;
    for (let k = 0; k < n; k++) {
      const x = (cw / 12) * (row % 2 ? 2 + k * 2 : 1 + k * 2);
      const y = (ch / 10) * (row + 1);
      star(g, x, y, 5, 9, 3.8, '#ffffff');
    }
  }
  return c;
}

function water(size, seed) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#2aa3d8';
  g.fillRect(0, 0, size, size);
  for (let v = 0; v < 70; v++) {
    let x = r() * size, y = r() * size, a = r() * 6.28;
    const pts = [[x, y]];
    for (let s = 0; s < 14; s++) {
      a += (r() - 0.5) * 1.2;
      x += Math.cos(a) * 12;
      y += Math.sin(a) * 12;
      pts.push([x, y]);
    }
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy)));
      g.strokeStyle = 'rgba(200,245,255,0.35)';
      g.lineWidth = 1.5 + r() * 2;
      g.stroke();
    }
  }
  return c;
}

function starCeiling(size, seed) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#05060c';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const s = r() < 0.9 ? 1 + r() * 1.5 : 2.5 + r() * 2;
    g.fillStyle = `rgba(255,${230 + r() * 25},${200 + r() * 55},${0.5 + r() * 0.5})`;
    g.beginPath();
    g.arc(r() * size, r() * size, s, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ---------- animated TV picture ----------
const tvCanvas = canvas(512, 288);
const tvCtx = tvCanvas.getContext('2d');
export const tvTexture = new THREE.CanvasTexture(tvCanvas);
tvTexture.colorSpace = THREE.SRGBColorSpace;

export function drawTV(t) {
  const g = tvCtx, W = 512, H = 288;
  const phase = (Math.sin(t * 0.05) + 1) / 2; // slow day cycle on screen
  const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, `hsl(${205 - phase * 180}, 70%, ${38 + phase * 12}%)`);
  sky.addColorStop(1, `hsl(${30 + phase * 10}, 85%, ${62 + phase * 6}%)`);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,236,180,0.95)';
  g.beginPath();
  g.arc(W * 0.7, H * (0.28 + phase * 0.12), 26, 0, Math.PI * 2);
  g.fill();
  // clouds
  g.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 4; i++) {
    const x = ((t * 12 + i * 160) % (W + 200)) - 100;
    g.beginPath();
    g.ellipse(x, 40 + i * 18, 60, 10, 0, 0, Math.PI * 2);
    g.fill();
  }
  const layers = [['#4b5d7a', 0.5, 8], ['#2f4058', 0.6, 16], ['#1b2a3c', 0.72, 30]];
  layers.forEach(([col, base, speed], k) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const xx = x + t * speed;
      g.lineTo(x, H * base - Math.sin(xx * 0.013 + k) * 26 - Math.sin(xx * 0.041 + k * 3) * 9);
    }
    g.lineTo(W, H);
    g.fill();
  });
  // water
  const wg = g.createLinearGradient(0, H * 0.8, 0, H);
  wg.addColorStop(0, '#16324a');
  wg.addColorStop(1, '#0a1622');
  g.fillStyle = wg;
  g.fillRect(0, H * 0.82, W, H * 0.18);
  g.fillStyle = 'rgba(255,220,160,0.35)';
  for (let i = 0; i < 12; i++) g.fillRect(W * 0.6 + Math.sin(t * 2 + i) * 20, H * 0.84 + i * 3.5, 60 - i * 3, 1.5);
  // channel bug
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(W - 92, 12, 80, 24);
  g.fillStyle = '#e8c66a';
  g.font = 'bold 15px sans-serif';
  g.fillText('AURORA HD', W - 88, 29);
  tvTexture.needsUpdate = true;
}
drawTV(0);

// ---------- material library ----------
export function buildMaterials(renderer) {
  maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const M = {};
  const clipList = [clipPlane];

  const std = (name, p, o = {}) => {
    const m = new THREE.MeshStandardMaterial(p);
    m.name = name;
    if (o.worldUV) m.userData.worldUV = o.worldUV;
    if (o.cast === false) m.userData.cast = false;
    if (o.outdoor !== true) {
      m.clippingPlanes = clipList;
      m.clipShadows = true;
    }
    M[name] = m;
    return m;
  };
  const phys = (name, p, o = {}) => {
    const m = new THREE.MeshPhysicalMaterial(p);
    m.name = name;
    if (o.worldUV) m.userData.worldUV = o.worldUV;
    if (o.cast === false) m.userData.cast = false;
    if (o.outdoor !== true) {
      m.clippingPlanes = clipList;
      m.clipShadows = true;
    }
    M[name] = m;
    return m;
  };
  const T = (cv, srgb = true) => makeTexture(cv, { srgb });

  // ---- architecture ----
  std('paint', { color: '#f1ece3', roughness: 0.92, side: THREE.DoubleSide });
  std('paintGreige', { color: '#ddd3c4', roughness: 0.92, side: THREE.DoubleSide });
  std('paintSage', { color: '#b9c4b0', roughness: 0.92, side: THREE.DoubleSide });
  std('paintNavy', { color: '#2b3a55', roughness: 0.9, side: THREE.DoubleSide });
  std('paintKids', { color: '#a9cbe8', roughness: 0.92, side: THREE.DoubleSide });
  std('paintCinema', { color: '#2a1a1f', roughness: 0.95, side: THREE.DoubleSide });
  std('siding', { map: T(siding(256)), roughness: 0.75, side: THREE.DoubleSide }, { worldUV: 1.6 });
  std('trim', { color: '#fbfaf6', roughness: 0.45 });
  std('shutter', { color: '#1b2430', roughness: 0.55 });
  std('ceiling', { color: '#f8f6f1', roughness: 0.95, side: THREE.DoubleSide });
  const roofTex = T(shingles(512, 4));
  std('roof', { map: roofTex, roughness: 0.85, side: THREE.DoubleSide });
  std('stone', { map: T(stone(512, 21, ['#bcb19c', '#a99d88', '#c9bfab', '#9c917e', '#8a8173', '#d2c8b5'])), roughness: 0.9 }, { worldUV: 2.2 });
  std('concrete', { map: T(noiseTex(512, '#bdbab4', ['#9a978f', '#d9d6cf', '#8a877f'], 9000, 5, 1, 4, 0.25)), roughness: 0.9 }, { worldUV: 3 });

  // ---- floors ----
  std('oak', { map: T(woodPlanks(1024, ['#b48a5e', '#bb9165', '#ae8457', '#bf976b', '#b38759'], 12, 11)), roughness: 0.4 }, { worldUV: 2.4 });
  std('oakLight', { map: T(woodPlanks(1024, ['#d3b48a', '#d9bb92', '#cdad83', '#d6b98f'], 12, 13)), roughness: 0.5 }, { worldUV: 2.4 });
  std('walnutFloor', { map: T(woodPlanks(1024, ['#5b3b25', '#634029', '#553823', '#68452f'], 12, 7)), roughness: 0.38 }, { worldUV: 2.4 });
  std('marbleTile', { map: T(marble(1024, '#f3f1ed', '#8f9096', 3, 4)), roughness: 0.12, metalness: 0.0 }, { worldUV: 2.4 });
  std('marble', { map: T(marble(1024, '#f5f3ef', '#8a8c92', 5, 0)), roughness: 0.15 }, { worldUV: 1.6 });
  std('marbleDark', { map: T(marble(512, '#1c1c1f', '#c8b58a', 9, 0)), roughness: 0.15 }, { worldUV: 1.4 });
  std('tileBath', { map: T(tileGrid(512, '#d9d6d0', '#b9b4ac', 4, 2, 0.03)), roughness: 0.25 }, { worldUV: 2.4 });
  std('tileShower', { map: T(tileGrid(512, '#2f3d47', '#1d262c', 8, 3, 0.08)), roughness: 0.2 }, { worldUV: 1.2 });
  std('cinemaCarpet', { map: T(noiseTex(256, '#3b1c24', ['#260f15', '#55303a', '#4a2129'], 5000, 8, 1, 2, 0.4)), roughness: 1 }, { worldUV: 1 });
  std('gymFloor', { map: T(noiseTex(256, '#2b2d32', ['#4a6fa8', '#8a8d93', '#1b1c1f'], 2500, 9, 1, 2, 0.5)), roughness: 0.9 }, { worldUV: 1 });

  // ---- metals / glass ----
  std('gold', { color: '#caa24e', metalness: 1, roughness: 0.28 });
  std('brass', { color: '#b8924a', metalness: 1, roughness: 0.4 });
  std('chrome', { color: '#e0e2e5', metalness: 1, roughness: 0.12 });
  std('steel', { color: '#c3c6ca', metalness: 0.9, roughness: 0.32 });
  std('blackMetal', { color: '#1b1b1d', metalness: 0.6, roughness: 0.42 });
  std('blackGloss', { color: '#0a0a0c', metalness: 0.3, roughness: 0.12 });
  std('glass', { color: '#b9d3e6', metalness: 0.5, roughness: 0.04, transparent: true, opacity: 0.25, depthWrite: false, emissive: '#ffcf86', emissiveIntensity: 0 }, { cast: false });
  std('glassClear', { color: '#d8ecf2', metalness: 0.3, roughness: 0.03, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }, { cast: false });
  std('mirror', { color: '#eef3f6', metalness: 1, roughness: 0.03, envMapIntensity: 1.6 });

  // ---- woods / lacquers ----
  std('walnut', { map: T(woodGrain(512, '#5a3a24', 31)), roughness: 0.45 }, { worldUV: 1.2 });
  std('oakWood', { map: T(woodGrain(512, '#b58958', 33)), roughness: 0.5 }, { worldUV: 1.2 });
  std('ebony', { map: T(woodGrain(512, '#2a1d17', 35)), roughness: 0.35 }, { worldUV: 1.2 });
  std('whiteLacquer', { color: '#f3f1ec', roughness: 0.3 });
  std('navyLacquer', { color: '#1f2c45', roughness: 0.32 });
  std('greenLacquer', { color: '#2e4a3c', roughness: 0.35 });
  std('ceramic', { color: '#fbfbfa', roughness: 0.12 });

  // ---- fabrics ----
  std('fabricCream', { color: '#e8dfcf', roughness: 0.95 });
  std('fabricGray', { color: '#8c8e93', roughness: 0.95 });
  std('fabricCharcoal', { color: '#3d3f44', roughness: 0.95 });
  std('fabricSand', { color: '#cdb895', roughness: 0.95 });
  std('velvetNavy', { color: '#22314f', roughness: 0.75 });
  std('velvetEmerald', { color: '#1f5547', roughness: 0.75 });
  std('velvetRed', { color: '#6c1820', roughness: 0.75 });
  std('velvetBlush', { color: '#d7a9a0', roughness: 0.8 });
  std('leatherBrown', { color: '#6b3d22', roughness: 0.48 });
  std('leatherCognac', { color: '#9a5a2e', roughness: 0.45 });
  std('leatherBlack', { color: '#1c1a19', roughness: 0.42 });
  std('linen', { color: '#f7f4ee', roughness: 0.95 });
  std('duvetGray', { color: '#cfc9c0', roughness: 0.95 });
  std('pillowGold', { color: '#c49a52', roughness: 0.8 });
  std('pillowTeal', { color: '#2c6e73', roughness: 0.85 });
  std('kidsBlue', { color: '#3d7fd1', roughness: 0.7 });
  std('kidsYellow', { color: '#f2c14e', roughness: 0.7 });
  std('kidsRed', { color: '#e05a47', roughness: 0.7 });
  std('kidsGreen', { color: '#5bb56a', roughness: 0.7 });
  std('kidsPurple', { color: '#9b6ad6', roughness: 0.7 });
  std('rubber', { color: '#141414', roughness: 0.9 });
  std('feltGreen', { color: '#1f6b45', roughness: 1 });

  // ---- plants ----
  std('leaf', { color: '#3f7a3a', roughness: 0.75, flatShading: true });
  std('leaf2', { color: '#2d5f30', roughness: 0.75, flatShading: true });
  std('flowerWhite', { color: '#fbf7f0', roughness: 0.7 });
  std('flowerPink', { color: '#e7a3b5', roughness: 0.7 });
  std('soil', { color: '#3a2a1e', roughness: 1 });

  // ---- light emitters ----
  std('lampShade', { color: '#f7ecd9', emissive: '#ffdca8', emissiveIntensity: 0.55, roughness: 0.9, side: THREE.DoubleSide }, { cast: false });
  std('bulb', { color: '#fff4dc', emissive: '#ffe1a6', emissiveIntensity: 2.4, roughness: 0.4 }, { cast: false });
  std('crystal', { color: '#ffffff', emissive: '#fff1d8', emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.85 }, { cast: false });
  std('ledStrip', { color: '#ffffff', emissive: '#ffe9c7', emissiveIntensity: 1.6 }, { cast: false });
  std('fire', { color: '#ff8a2a', emissive: '#ff6a10', emissiveIntensity: 2.2, roughness: 1 }, { cast: false });
  std('stars', { color: '#000000', emissive: '#ffffff', emissiveMap: T(starCeiling(512, 4)), emissiveIntensity: 1.2, roughness: 1, side: THREE.DoubleSide }, { worldUV: 3 });
  std('neonBlue', { color: '#5ab8ff', emissive: '#3aa0ff', emissiveIntensity: 1.6 }, { cast: false });

  // ---- rugs (no world UV) ----
  std('rugPersian', { map: T(persianRug(3)), roughness: 1 });
  std('rugPersian2', { map: T(persianRug(17)), roughness: 1, color: '#c9d0e0' });
  std('rugModern', { map: T(modernRug(5)), roughness: 1 });
  std('rugModernGray', { map: T(modernRug(8, '#cfcbc4', '#8a8f99', '#2f3135')), roughness: 1 });
  std('rugKids', { map: T(kidsRug()), roughness: 1 });
  std('rugNavy', { map: T(modernRug(12, '#24304a', '#caa24e', '#111827')), roughness: 1 });

  // ---- art ----
  const pals = [
    ['#1d2a44', '#2f4870', '#d8b46a', '#f2e8d4', '#9fb7d6'],
    ['#c8643c', '#e9c9a1', '#3d5a40', '#f5efe4', '#8a3324'],
    ['#0f3b3f', '#2c7a7b', '#f2a65a', '#f7f0e1', '#e85d4f'],
    ['#111111', '#3a3a3a', '#d4af37', '#f5f5f0', '#8e8e8e'],
    ['#efe7da', '#d9c9b0', '#2b2b2b', '#b5523b', '#6f8f9c'],
  ];
  pals.forEach((p, i) => std('art' + i, { map: T(abstractArt(100 + i * 7, p)), roughness: 0.7 }));
  std('artLand0', { map: T(landscapeArt(3, '#f4b88a', '#fde3c0', ['#7d8f6a', '#56704d', '#36513a'])), roughness: 0.7 });
  std('artLand1', { map: T(landscapeArt(9, '#7fb3d9', '#e7f1f7', ['#9aa7b5', '#6c7f92', '#41566b'])), roughness: 0.7 });

  // ---- cars ----
  phys('carWhite', { color: '#f2f2f0', metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  phys('carRed', { color: '#a5101a', metalness: 0.5, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.06 });
  phys('carBlack', { color: '#0d0e10', metalness: 0.6, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 });
  std('carGlass', { color: '#0b1118', metalness: 0.9, roughness: 0.06 });
  std('headlight', { color: '#ffffff', emissive: '#e8f2ff', emissiveIntensity: 1.2 }, { cast: false });
  std('taillight', { color: '#5a0000', emissive: '#ff1a1a', emissiveIntensity: 0.9 }, { cast: false });

  // ---- outdoor (not clipped) ----
  const out = { outdoor: true };
  std('grass', { map: T(grass(512, 2)), roughness: 1 }, { worldUV: 4, outdoor: true });
  std('pavers', { map: T(pavers(512, 6, ['#d8cdb8', '#cbbfa8', '#e2d8c5', '#bfb39b', '#d2c4aa'])), roughness: 0.85 }, { worldUV: 2.6, outdoor: true });
  std('paversGray', { map: T(pavers(512, 16, ['#a7a7a2', '#b7b6b0', '#9a9a95', '#c2c1bb'])), roughness: 0.85 }, { worldUV: 2.6, outdoor: true });
  std('asphalt', { map: T(noiseTex(512, '#3a3b3e', ['#2a2b2d', '#55565a', '#1e1f21'], 16000, 7, 1, 3, 0.5)), roughness: 0.95 }, { worldUV: 5, outdoor: true });
  std('sidewalk', { map: T(tileGrid(256, '#c9c7c1', '#9d9b95', 2, 4, 0.03)), roughness: 0.9 }, { worldUV: 3, outdoor: true });
  std('poolTile', { map: T(tileGrid(256, '#7fd3ea', '#e9f6fa', 8, 6, 0.05)), roughness: 0.25 }, { worldUV: 1.2 });
  std('coping', { color: '#efe8dc', roughness: 0.7 });
  std('waterPool', { map: T(water(512, 3)), color: '#bfefff', transparent: true, opacity: 0.82, roughness: 0.06, metalness: 0.1, emissive: '#2ab8ff', emissiveIntensity: 0.0, depthWrite: false }, { cast: false, worldUV: 3 });
  std('hedge', { color: '#3a5c33', roughness: 1, flatShading: true }, out);
  std('treeLeaf', { color: '#567a3e', roughness: 0.95, flatShading: true }, out);
  std('treeLeaf2', { color: '#44653a', roughness: 0.95, flatShading: true }, out);
  std('treeLeaf3', { color: '#6e8a46', roughness: 0.95, flatShading: true }, out);
  std('pine', { color: '#315236', roughness: 0.95, flatShading: true }, out);
  std('trunk', { color: '#5a4030', roughness: 1 }, out);
  std('outWhite', { color: '#f6f5f1', roughness: 0.5 }, out);
  std('outBlack', { color: '#1d1e20', metalness: 0.5, roughness: 0.5 }, out);
  std('outStone', { map: M.stone.map, roughness: 0.9 }, { worldUV: 2.2, outdoor: true });
  std('flowerBed', { color: '#3b2a1f', roughness: 1 }, out);
  std('flowersR', { color: '#d94a5b', roughness: 0.8, flatShading: true }, out);
  std('flowersY', { color: '#f2c94c', roughness: 0.8, flatShading: true }, out);
  std('flowersW', { color: '#f4f1ea', roughness: 0.8, flatShading: true }, out);
  std('lampOut', { color: '#fff4d8', emissive: '#ffd890', emissiveIntensity: 0.3 }, { cast: false, outdoor: true });
  std('roadLine', { color: '#e8c547', roughness: 0.8 }, out);
  std('fountainWater', { color: '#9fe3ff', transparent: true, opacity: 0.75, roughness: 0.05, emissive: '#3ab8ff', emissiveIntensity: 0.0, depthWrite: false }, { cast: false, outdoor: true });

  ['#7a2e2e', '#2e4a7a', '#2f5e3e', '#c9b38a', '#1f1f1f', '#8a5a2b', '#5b3a6e', '#d8d2c4'].forEach((c, i) => std('book' + i, { color: c, roughness: 0.8 }));
  // TV / cinema screens share one animated canvas texture
  const scr = new THREE.MeshBasicMaterial({ map: tvTexture, toneMapped: false });
  scr.clippingPlanes = clipList;
  scr.userData.cast = false;
  M.screen = scr;

  const flagTex = T(usFlag());
  const flag = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.85 });
  M.flag = flag;

  M._roofTex = roofTex;
  return M;
}
