import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

/* =========================================================
   VILLA AURORA — шикарный американский особняк в 3D
   ========================================================= */

const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const isSmall = Math.min(innerWidth, innerHeight) < 700;

// ---------- renderer / scene ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isSmall ? 1.6 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 600);
camera.rotation.order = 'YXZ';

// ---------- utils ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261118);
const R = (a, b) => a + rnd() * (b - a);
const PI = Math.PI;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, maxAniso);
  return t;
}
function noise(g, w, h, alpha, n = 6000, dark = true) {
  for (let i = 0; i < n; i++) {
    const v = dark ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${rnd() * alpha})`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}

// ---------- textures ----------
const T = {};
T.wood = canvasTex(512, 512, (g, s) => {
  const rows = 8, rh = s / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * s * 0.6;
    while (x < s) {
      const len = s * R(0.35, 0.75), l = R(34, 46);
      g.fillStyle = `hsl(${R(26, 33)},${R(42, 55)}%,${l}%)`; g.fillRect(x, r * rh, len, rh);
      for (let k = 0; k < 16; k++) {
        g.strokeStyle = `rgba(60,30,10,${rnd() * 0.2})`; g.lineWidth = rnd() * 1.6;
        const yy = r * rh + rnd() * rh; g.beginPath(); g.moveTo(x, yy);
        g.bezierCurveTo(x + len * .3, yy + R(-4, 4), x + len * .6, yy + R(-4, 4), x + len, yy); g.stroke();
      }
      g.fillStyle = 'rgba(25,12,4,.55)'; g.fillRect(x, r * rh, 2, rh); x += len;
    }
    g.fillStyle = 'rgba(25,12,4,.5)'; g.fillRect(0, r * rh, s, 2);
  }
});
T.darkWood = canvasTex(256, 256, (g, s) => {
  g.fillStyle = '#3b2619'; g.fillRect(0, 0, s, s);
  for (let k = 0; k < 120; k++) { g.strokeStyle = `rgba(${rnd() < .5 ? '20,10,5' : '90,55,30'},${rnd() * .35})`; g.lineWidth = rnd() * 2; const y = rnd() * s; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * .3, y + R(-6, 6), s * .7, y + R(-6, 6), s, y); g.stroke(); }
});
T.marble = canvasTex(512, 512, (g, s) => {
  g.fillStyle = '#f1efea'; g.fillRect(0, 0, s, s); noise(g, s, s, 0.05, 9000);
  for (let v = 0; v < 14; v++) {
    let x = rnd() * s, y = rnd() * s, a = rnd() * PI * 2;
    const wdt = R(0.4, 2.2), al = R(0.12, 0.4);
    g.strokeStyle = `rgba(${R(110, 150) | 0},${R(110, 140) | 0},${R(110, 140) | 0},${al})`; g.lineWidth = wdt;
    g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < 60; i++) { a += R(-.5, .5); x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo((x + s) % s, (y + s) % s); if (x < 0 || x > s || y < 0 || y > s) { x = (x + s) % s; y = (y + s) % s; g.moveTo(x, y); } }
    g.stroke();
  }
});
T.marbleTiles = canvasTex(512, 512, (g, s) => {
  g.drawImage(T.marble.image, 0, 0);
  g.strokeStyle = 'rgba(150,140,125,.55)'; g.lineWidth = 2;
  for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * s / 2, 0); g.lineTo(i * s / 2, s); g.stroke(); g.beginPath(); g.moveTo(0, i * s / 2); g.lineTo(s, i * s / 2); g.stroke(); }
});
T.carpet = canvasTex(256, 256, (g, s) => { g.fillStyle = '#d9d0c2'; g.fillRect(0, 0, s, s); noise(g, s, s, .12, 14000); noise(g, s, s, .1, 6000, false); });
T.grass = canvasTex(512, 512, (g, s) => {
  g.fillStyle = '#4f7d34'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 26000; i++) { g.fillStyle = `hsla(${R(80, 110)},${R(35, 60)}%,${R(22, 42)}%,.55)`; g.fillRect(rnd() * s, rnd() * s, 1.2, R(2, 5)); }
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(160,220,90,.06)'; g.fillRect(0, i * s / 6, s, s / 12); }
});
T.pavers = canvasTex(512, 512, (g, s) => {
  g.fillStyle = '#b9ad9b'; g.fillRect(0, 0, s, s);
  const n = 8, c = s / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = `hsl(${R(30, 40)},${R(14, 24)}%,${R(64, 76)}%)`; g.fillRect(x * c + 2, y * c + 2, c - 4, c - 4);
  }
  noise(g, s, s, .08, 8000);
});
T.asphalt = canvasTex(256, 256, (g, s) => { g.fillStyle = '#2f3136'; g.fillRect(0, 0, s, s); noise(g, s, s, .25, 9000); noise(g, s, s, .12, 4000, false); });
T.stone = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#8f8476'; g.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const rh = R(20, 38); let x = -R(0, 40);
    while (x < w) { const rw = R(40, 90); g.fillStyle = `hsl(${R(25, 40)},${R(8, 20)}%,${R(48, 70)}%)`; g.fillRect(x + 2, y + 2, rw - 4, rh - 4); x += rw; }
    y += rh;
  }
  noise(g, w, h, .15, 6000);
});
T.poolTile = canvasTex(256, 256, (g, s) => {
  g.fillStyle = '#2aa7c9'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = `hsl(${R(188, 198)},70%,${R(42, 55)}%)`; g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14); }
});
T.water = canvasTex(256, 256, (g, s) => {
  g.fillStyle = '#3cc6e6'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(255,255,255,${R(.08, .35)})`; g.lineWidth = R(1, 2.5); g.beginPath(); const x = rnd() * s, y = rnd() * s; g.ellipse(x, y, R(10, 30), R(4, 10), R(0, PI), 0, PI * 2); g.stroke(); }
});
T.felt = canvasTex(128, 128, (g, s) => { g.fillStyle = '#1f6b46'; g.fillRect(0, 0, s, s); noise(g, s, s, .15, 3000); });
T.siding = canvasTex(256, 256, (g, s) => {
  g.fillStyle = '#f6f4ef'; g.fillRect(0, 0, s, s);
  for (let x = 0; x < s; x += 32) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x, 0, 3, s); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x + 3, 0, 1, s); }
});
T.shingle = canvasTex(256, 256, (g, s) => {
  g.fillStyle = '#34373c'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < 16; y++) { const off = (y % 2) * 16; for (let x = -1; x < 9; x++) { g.fillStyle = `hsl(215,${R(4, 9)}%,${R(18, 27)}%)`; g.fillRect(x * 32 + off + 1, y * 16 + 1, 30, 14); } }
});

// art & screens
function artTex(seed, kind) {
  const r = mulberry32(seed);
  return canvasTex(256, 320, (g, w, h) => {
    if (kind === 'land') {
      const sky = g.createLinearGradient(0, 0, 0, h * .6); sky.addColorStop(0, '#f4c27a'); sky.addColorStop(1, '#f08a5d');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f9e3a0'; g.beginPath(); g.arc(w * .65, h * .42, 28, 0, PI * 2); g.fill();
      for (let i = 0; i < 3; i++) { g.fillStyle = ['#7a4e64', '#4f3a57', '#2d2840'][i]; g.beginPath(); g.moveTo(0, h); let y = h * (.5 + i * .12); g.lineTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * .02 + i * 2 + r() * .5) * 18 - r() * 10); g.lineTo(w, h); g.fill(); }
      return;
    }
    const pal = [['#e8dccb', '#1d3b53', '#c9a24b', '#b5562f', '#f4efe6'], ['#f2ede4', '#2c2c2c', '#9aa8a0', '#c77d5a', '#e3c58e'], ['#10161f', '#d4b06a', '#6f8aa3', '#efe9de', '#8c3b3b']][seed % 3];
    g.fillStyle = pal[0]; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = pal[1 + (r() * 4 | 0)]; g.globalAlpha = .55 + r() * .45;
      if (r() < .5) { g.beginPath(); g.arc(r() * w, r() * h, 20 + r() * 80, 0, PI * 2); g.fill(); }
      else g.fillRect(r() * w, r() * h, 30 + r() * 120, 20 + r() * 120);
    }
    g.globalAlpha = 1; g.strokeStyle = pal[1]; g.lineWidth = 3; g.beginPath(); g.moveTo(r() * w, 0); g.bezierCurveTo(r() * w, h * .3, r() * w, h * .7, r() * w, h); g.stroke();
  }, false);
}

// TV screen (animated)
const tvCanvas = document.createElement('canvas'); tvCanvas.width = 320; tvCanvas.height = 180;
const tvCtx = tvCanvas.getContext('2d');
const tvTex = new THREE.CanvasTexture(tvCanvas); tvTex.colorSpace = THREE.SRGBColorSpace;
function drawTV(t) {
  const g = tvCtx, w = 320, h = 180;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0d3b66'); sky.addColorStop(.55, '#5fa8d3'); sky.addColorStop(.56, '#1b6f8f'); sky.addColorStop(1, '#0b3f57');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(240, 70, 18, 0, PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.5)';
  for (let i = 0; i < 18; i++) { const y = 105 + i * 4.5; const x = ((t * 18 * (1 + i * .1) + i * 57) % (w + 80)) - 40; g.fillRect(x, y, 30 + i * 2, 1.4); }
  g.fillStyle = '#123'; for (let i = 0; i < 3; i++) { const x = (t * 10 + i * 120) % (w + 40) - 20; g.beginPath(); g.moveTo(x, 40 + i * 9); g.lineTo(x + 6, 44 + i * 9); g.lineTo(x + 12, 40 + i * 9); g.lineWidth = 1.5; g.strokeStyle = '#123'; g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(14, 150, 110, 18);
  g.fillStyle = '#fff'; g.font = '600 11px Inter, sans-serif'; g.fillText('MALIBU · LIVE 4K', 22, 163);
  tvTex.needsUpdate = true;
}
drawTV(0);
const cinCanvas = document.createElement('canvas'); cinCanvas.width = 400; cinCanvas.height = 170;
const cinCtx = cinCanvas.getContext('2d');
const cinTex = new THREE.CanvasTexture(cinCanvas); cinTex.colorSpace = THREE.SRGBColorSpace;
function drawCinema(t) {
  const g = cinCtx, w = 400, h = 170;
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1a0b2e'); gr.addColorStop(1, '#3b1c5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { const a = i * 2.39996, rr = (i * 7 + t * 40) % 260; g.fillStyle = `rgba(255,${200 + (i % 50)},${150 + (i % 100)},${1 - rr / 260})`; g.fillRect(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr * .45, 2, 2); }
  g.fillStyle = '#f1d79a'; g.font = '600 30px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillText('AURORA PICTURES', w / 2, h / 2 + 10);
  g.font = '500 10px Inter, sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('NOW PLAYING', w / 2, h / 2 + 32); g.textAlign = 'left';
  cinTex.needsUpdate = true;
}
drawCinema(0);

// ---------- materials ----------
const std = (o) => new THREE.MeshStandardMaterial(o);
function texMat(tex, rx, ry, o = {}) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return std({ map: t, ...o }); }
const M = {
  wallInt: std({ color: 0xf1ebe1, roughness: .9 }),
  wallExt: texMat(T.siding, 6, 1, { color: 0xffffff, roughness: .85 }),
  wallExtPlain: std({ color: 0xf7f5f0, roughness: .85 }),
  trim: std({ color: 0x1d1e21, roughness: .5, metalness: .3 }),
  white: std({ color: 0xffffff, roughness: .5 }),
  ceiling: std({ color: 0xfbf9f5, roughness: .95 }),
  stone: texMat(T.stone, 4, 1, { roughness: .95 }),
  glass: std({ color: 0xa9cde3, roughness: .05, metalness: .2, transparent: true, opacity: .22, depthWrite: false }),
  railGlass: std({ color: 0xcfe6f0, roughness: .05, metalness: .1, transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide }),
  gold: std({ color: 0xd2ab5a, metalness: 1, roughness: .28 }),
  chrome: std({ color: 0xe6e9ee, metalness: 1, roughness: .12 }),
  steel: std({ color: 0xbfc4ca, metalness: .9, roughness: .3 }),
  black: std({ color: 0x0e0e10, roughness: .35, metalness: .2 }),
  blackMatte: std({ color: 0x18181b, roughness: .8 }),
  woodDark: std({ map: T.darkWood, roughness: .55 }),
  walnut: std({ color: 0x5a3a24, roughness: .45 }),
  oak: texMat(T.wood, 1, 1, { roughness: .55 }),
  marble: texMat(T.marble, 1, 1, { roughness: .18 }),
  cabinet: std({ color: 0xf4f2ee, roughness: .35 }),
  navy: std({ color: 0x1f2d4d, roughness: .45 }),
  fabricCream: std({ color: 0xe6dccb, roughness: .95 }),
  fabricCream2: std({ color: 0xf0e8da, roughness: .95 }),
  fabricGray: std({ color: 0x8a8682, roughness: .95 }),
  fabricGray2: std({ color: 0x9c9893, roughness: .95 }),
  velvetNavy: std({ color: 0x23335a, roughness: .7 }),
  velvetGreen: std({ color: 0x24503d, roughness: .7 }),
  velvetRose: std({ color: 0xc58c86, roughness: .75 }),
  mustard: std({ color: 0xc9962f, roughness: .8 }),
  leather: std({ color: 0x6e3d22, roughness: .45 }),
  leatherBlack: std({ color: 0x1c1b1d, roughness: .4 }),
  leatherRed: std({ color: 0x6d1420, roughness: .5 }),
  linen: std({ color: 0xf7f4ee, roughness: .95 }),
  ceramic: std({ color: 0xffffff, roughness: .12 }),
  plantGreen: std({ color: 0x3f7a3a, roughness: .8 }),
  plantGreen2: std({ color: 0x2f6131, roughness: .8 }),
  pot: std({ color: 0xe9e4dc, roughness: .6 }),
  potDark: std({ color: 0x2a2a2a, roughness: .5 }),
  bulb: std({ color: 0xfff1d6, emissive: 0xffe2a8, emissiveIntensity: 2.2 }),
  shade: std({ color: 0xf7efdf, emissive: 0xffdca0, emissiveIntensity: .35, roughness: .9, side: THREE.DoubleSide }),
  crystal: std({ color: 0xffffff, metalness: .1, roughness: 0, emissive: 0xfff2d0, emissiveIntensity: .6 }),
  mirror: std({ color: 0xdfe6ec, metalness: 1, roughness: .02 }),
  tv: std({ map: tvTex, emissive: 0xffffff, emissiveMap: tvTex, emissiveIntensity: .9, roughness: .3 }),
  cinema: std({ map: cinTex, emissive: 0xffffff, emissiveMap: cinTex, emissiveIntensity: 1.0 }),
  fire: std({ color: 0xff7a1a, emissive: 0xff6a00, emissiveIntensity: 3, transparent: true, opacity: .9 }),
  felt: std({ map: T.felt, roughness: .95 }),
  roof: texMat(T.shingle, 10, 6, { roughness: .85, side: THREE.DoubleSide }),
  grass: texMat(T.grass, 40, 40, { roughness: 1 }),
  asphalt: texMat(T.asphalt, 40, 2, { roughness: .95 }),
  hedge: std({ color: 0x2e5a2a, roughness: .95 }),
  trunk: std({ color: 0x5b4330, roughness: .95 }),
  leaves: std({ color: 0x3e6e34, roughness: .9 }),
  leaves2: std({ color: 0x5a8a3c, roughness: .9 }),
  carRed: std({ color: 0x8c0f16, metalness: .6, roughness: .22 }),
  carBlack: std({ color: 0x0c0d10, metalness: .7, roughness: .25 }),
  tire: std({ color: 0x151515, roughness: .9 }),
  water: std({ map: T.water, color: 0x7fe3f6, roughness: .05, metalness: .1, transparent: true, opacity: .82, emissive: 0x0a5f7a, emissiveIntensity: .35 }),
  poolTile: texMat(T.poolTile, 6, 3, { roughness: .3 }),
  windowGlow: std({ color: 0xffd79a, emissive: 0xffc36b, emissiveIntensity: 0, transparent: true, opacity: .0, depthWrite: false }),
  ledBlue: std({ color: 0x5aa9ff, emissive: 0x3a7dff, emissiveIntensity: 2.5 }),
  terracotta: std({ color: 0xb6643f, roughness: .8 }),
  umbrella: std({ color: 0xf2ece0, roughness: .9, side: THREE.DoubleSide }),
  bookColors: [0x7b2d26, 0x1f3b5a, 0x2f5233, 0xc9a24b, 0xe9e2d4, 0x3b3b3b, 0x8a5a44, 0x5c4a7a].map(c => std({ color: c, roughness: .8 })),
};
const towelMat = std({ color: 0xf3efe7, roughness: 1 });

// ---------- geometry helpers ----------
function B(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z); parent.add(m); return m;
}
function C(rt, rb, h, mat, x, y, z, parent, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y + h / 2, z); parent.add(m); return m;
}
function S(r, mat, x, y, z, parent, ws = 16, hs = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.position.set(x, y, z); parent.add(m); return m;
}
function place(obj, parent, x, y, z, rot = 0) { obj.position.set(x, y, z); obj.rotation.y = rot; parent.add(obj); return obj; }
const face = (dx, dz) => Math.atan2(dx, dz); // rotation so local +z faces (dx,dz)

// ---------- world groups ----------
const world = new THREE.Group(); scene.add(world);
const G0 = new THREE.Group(); world.add(G0);          // 1st floor
const G1 = new THREE.Group(); world.add(G1);          // 2nd floor
const GRoof = new THREE.Group(); world.add(GRoof);    // roof + top ceiling
const GOut = new THREE.Group(); world.add(GOut);      // exterior

// colliders: {x1,x2,z1,z2,lv:[...]}
const colliders = [];
function addCol(x1, x2, z1, z2, lv = [0]) { colliders.push({ x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: Math.min(z1, z2), z2: Math.max(z1, z2), lv }); }

const H0 = 3.2, FL1 = 3.4, H1 = 3.2;     // heights
const HX = 12, HZ = 8;                   // house half extents

/* wall(axis, c, a1, a2, y0, h, openings, mat, lv, t)
   axis 'x' => wall runs along X at z=c ; axis 'z' => runs along Z at x=c
   openings: {at, w, type:'door'|'window', top, sill} */
const glowPanes = [];
function wall(axis, c, a1, a2, y0, h, openings, mat, lv, parent, t = 0.2, extSide = 0) {
  const ops = openings.slice().sort((a, b) => a.at - b.at);
  const seg = (s, e, yb, hh, m = mat) => {
    if (e - s < 0.001 || hh <= 0.001) return;
    const L = e - s, mid = (s + e) / 2;
    if (extSide && m === mat) { // siding outside, smooth paint inside
      const I = M.wallInt, E = mat;
      m = axis === 'x' ? [E, E, E, E, extSide > 0 ? E : I, extSide > 0 ? I : E] : [extSide > 0 ? E : I, extSide > 0 ? I : E, E, E, E, E];
    }
    if (axis === 'x') B(L, hh, t, m, mid, yb, c, parent); else B(t, hh, L, m, c, yb, mid, parent);
  };
  const col = (s, e) => { if (e - s < 0.01) return; if (axis === 'x') addCol(s, e, c - t / 2, c + t / 2, lv); else addCol(c - t / 2, c + t / 2, s, e, lv); };
  let cur = a1, colStart = a1;
  for (const o of ops) {
    const s = o.at - o.w / 2, e = o.at + o.w / 2;
    seg(cur, s, y0, h);
    const top = o.top ?? 2.4;
    seg(s, e, y0 + top, h - top);           // lintel
    if (o.type === 'window') {
      const sill = o.sill ?? 0.6;
      seg(s, e, y0, sill);
      // frame + glass
      const fh = top - sill, fw = o.w, ft = 0.06;
      const P = (w, hh, d, m, u, y, n = 0) => axis === 'x' ? B(w, hh, d, m, u, y, c + n, parent) : B(d, hh, w, m, c + n, y, u, parent);
      P(fw, ft, t + .04, M.trim, o.at, y0 + sill);
      P(fw, ft, t + .04, M.trim, o.at, y0 + top - ft);
      P(ft, fh, t + .04, M.trim, s + ft / 2, y0 + sill);
      P(ft, fh, t + .04, M.trim, e - ft / 2, y0 + sill);
      const mullions = Math.max(1, Math.round(fw / 0.9));
      for (let i = 1; i < mullions; i++) P(0.04, fh, t * .5, M.trim, s + fw * i / mullions, y0 + sill);
      P(fw, 0.04, t * .5, M.trim, o.at, y0 + sill + fh * 0.62);
      const gl = P(fw - .1, fh - .1, 0.02, M.glass, o.at, y0 + sill + .05); gl.castShadow = false; gl.userData.noShadow = true;
      if (extSide) { const glow = P(fw - .12, fh - .12, 0.01, M.windowGlow, o.at, y0 + sill + .06, -extSide * 0.06); glow.userData.noShadow = true; glowPanes.push(glow); }
      // exterior sill
      if (extSide) P(fw + .2, .06, .16, M.white, o.at, y0 + sill - .06, extSide * (t / 2 + .05));
    } else {
      col(colStart, s); colStart = e;
      if (o.frame !== false) {
        const P = (w, hh, d, m, u, y) => axis === 'x' ? B(w, hh, d, m, u, y, c, parent) : B(d, hh, w, m, c, y, u, parent);
        P(0.08, top, t + .06, M.white, s - .04, y0); P(0.08, top, t + .06, M.white, e + .04, y0); P(o.w + .16, 0.1, t + .06, M.white, o.at, y0 + top);
      }
    }
    cur = e;
  }
  seg(cur, a2, y0, h);
  col(colStart, a2);
}

function floorPlane(x1, x2, z1, z2, y, mat, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), mat);
  m.rotation.x = -PI / 2; m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2); parent.add(m); m.userData.noCast = true; return m;
}
const fWood = (w, d) => texMat(T.wood, w / 2.2, d / 2.2, { roughness: .4 });
const fMarble = (w, d) => texMat(T.marbleTiles, w / 1.6, d / 1.6, { roughness: .12 });
const fCarpet = (w, d, color) => texMat(T.carpet, w / 1.5, d / 1.5, { roughness: 1, color });

/* ================= FURNITURE ================= */
function sofa(len, mat, mat2 = mat, pillows = []) {
  const g = new THREE.Group(), d = 0.95;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) C(.025, .018, .1, M.gold, sx * (len / 2 - .12), 0, sz * (d / 2 - .12), g, 8);
  B(len, .3, d, mat, 0, .1, 0, g);
  B(.2, .58, d, mat, -(len / 2 - .1), .1, 0, g); B(.2, .58, d, mat, len / 2 - .1, .1, 0, g);
  B(len, .78, .22, mat, 0, .1, -d / 2 + .11, g);
  const inner = len - .4, n = Math.max(1, Math.round(inner / .8)), cw = inner / n;
  for (let i = 0; i < n; i++) {
    const x = -inner / 2 + cw * (i + .5);
    B(cw - .02, .14, d - .3, mat2, x, .4, .08, g);
    const bc = B(cw - .05, .44, .16, mat2, x, .5, -d / 2 + .3, g); bc.rotation.x = -.12;
  }
  pillows.forEach((pm, i) => { const p = B(.42, .4, .12, pm, (i % 2 ? 1 : -1) * (inner / 2 - .3 - (i > 1 ? .45 : 0)), .52, -d / 2 + .42, g); p.rotation.x = -.2; p.rotation.y = (i % 2 ? -1 : 1) * .15; });
  return g;
}
function armchair(mat, mat2 = mat) { return sofa(1.0, mat, mat2); }
function coffeeTable(w, d, top = M.marble) {
  const g = new THREE.Group();
  B(w, .05, d, top, 0, .38, 0, g);
  B(w - .1, .03, d - .1, M.gold, 0, .08, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.03, .38, .03, M.gold, sx * (w / 2 - .06), 0, sz * (d / 2 - .06), g);
  // decor
  C(.08, .06, .16, M.ceramic, -w * .25, .43, 0, g); S(.05, M.plantGreen, -w * .25, .63, 0, g);
  B(.3, .05, .22, M.bookColors[1], w * .2, .43, -.05, g); B(.26, .04, .2, M.bookColors[3], w * .2, .48, -.05, g);
  return g;
}
function sideTable(top = M.marble) { const g = new THREE.Group(); C(.25, .25, .04, top, 0, .55, 0, g); C(.02, .02, .55, M.gold, 0, 0, 0, g); C(.18, .2, .02, M.gold, 0, 0, 0, g); return g; }
function rug(w, d, mat, border = M.fabricCream) {
  const g = new THREE.Group(); B(w, .012, d, border, 0, 0, 0, g); B(w - .25, .016, d - .25, mat, 0, 0, 0, g);
  g.traverse(o => o.userData.noCast = true); return g;
}
const rugMat = (c1, c2) => std({ roughness: 1, map: canvasTex(256, 256, (g, s) => { g.fillStyle = c1; g.fillRect(0, 0, s, s); g.strokeStyle = c2; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.strokeRect(10 + i * 14, 10 + i * 14, s - 20 - i * 28, s - 20 - i * 28); } noise(g, s, s, .12, 5000); }, false) });
function floorLamp() {
  const g = new THREE.Group(); C(.18, .2, .03, M.gold, 0, 0, 0, g); C(.015, .015, 1.5, M.gold, 0, 0, 0, g);
  C(.17, .24, .3, M.shade, 0, 1.45, 0, g); return g;
}
function tableLamp() { const g = new THREE.Group(); C(.08, .1, .3, M.ceramic, 0, 0, 0, g); C(.01, .01, .1, M.gold, 0, .3, 0, g); C(.13, .18, .22, M.shade, 0, .36, 0, g); return g; }
function plant(h = 1.4, potMat = M.pot) {
  const g = new THREE.Group(); C(.22, .17, .4, potMat, 0, 0, 0, g); C(.2, .2, .02, M.trunk, 0, .38, 0, g);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = R(.05, .2); S(R(.16, .26), i % 2 ? M.plantGreen : M.plantGreen2, Math.cos(a) * r, .4 + h * R(.45, 1), Math.sin(a) * r, g, 10, 8); }
  C(.015, .02, h * .8, M.trunk, 0, .4, 0, g); return g;
}
function palmPlant() {
  const g = new THREE.Group(); C(.2, .16, .45, M.potDark, 0, 0, 0, g);
  for (let i = 0; i < 10; i++) { const leaf = new THREE.Mesh(new THREE.BoxGeometry(.06, .02, .7), M.plantGreen); const a = i * PI * 2 / 10; leaf.position.set(Math.sin(a) * .3, 1.1 + R(-.1, .2), Math.cos(a) * .3); leaf.rotation.y = a; leaf.rotation.x = .6; g.add(leaf); }
  C(.02, .03, .8, M.trunk, 0, .4, 0, g); return g;
}
function painting(w, h, tex) {
  const g = new THREE.Group(); B(w + .1, h + .1, .04, M.gold, 0, -.05, 0, g);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: tex, roughness: .8 })); p.position.set(0, h / 2, .025); g.add(p); return g;
}
function chandelier(r = .6, tiers = 2) {
  const g = new THREE.Group();
  C(.01, .01, .7, M.gold, 0, -.7, 0, g);
  for (let t = 0; t < tiers; t++) {
    const rr = r * (1 - t * .35), y = -.7 - t * .28;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, .02, 8, 40), M.gold); ring.rotation.x = PI / 2; ring.position.y = y; g.add(ring);
    const n = Math.round(10 * rr / r) + 4;
    for (let i = 0; i < n; i++) {
      const a = i / n * PI * 2;
      S(.035, M.crystal, Math.cos(a) * rr, y - .08, Math.sin(a) * rr, g, 8, 6);
      S(.025, M.crystal, Math.cos(a) * rr, y - .17, Math.sin(a) * rr, g, 8, 6);
      if (i % 2 === 0) { C(.012, .012, .1, M.gold, Math.cos(a) * rr, y, Math.sin(a) * rr, g, 6); S(.03, M.bulb, Math.cos(a) * rr, y + .13, Math.sin(a) * rr, g, 8, 6); }
    }
  }
  S(.07, M.crystal, 0, -.7 - tiers * .3, 0, g, 12, 8);
  g.traverse(o => o.userData.noCast = true); return g;
}
function ceilingLight(r = .3) { const g = new THREE.Group(); C(r, r * .9, .06, M.bulb, 0, -.06, 0, g); C(r + .03, r + .03, .02, M.gold, 0, -.02, 0, g); g.traverse(o => o.userData.noCast = true); return g; }
function pendant() { const g = new THREE.Group(); C(.006, .006, .8, M.black, 0, -.8, 0, g); const s = C(.05, .18, .22, M.gold, 0, -1.02, 0, g); s.material = M.gold; S(.05, M.bulb, 0, -1.03, 0, g, 8, 6); g.traverse(o => o.userData.noCast = true); return g; }
function tv(w) {
  const g = new THREE.Group(), h = w * .5625;
  B(w + .04, h + .04, .045, M.black, 0, 0, 0, g);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.tv); sc.position.set(0, h / 2 + .02, .024); g.add(sc); return g;
}
function mediaConsole(len) {
  const g = new THREE.Group(); B(len, .45, .45, M.woodDark, 0, .12, 0, g);
  for (const sx of [-1, 1]) B(.04, .12, .4, M.gold, sx * (len / 2 - .1), 0, 0, g);
  for (let i = 1; i < 4; i++) B(.01, .38, .01, M.gold, -len / 2 + len * i / 4, .15, .226, g);
  B(.5, .06, .12, M.black, 0, .57, 0, g); // soundbar
  return g;
}
function fireplace() {
  const g = new THREE.Group();
  B(2.6, 3.2, .4, M.wallInt, 0, 0, -.2, g);                 // chimney breast
  B(2.2, 1.25, .25, M.marble, 0, 0, .1, g);                 // surround
  B(1.3, .75, .27, M.black, 0, .18, .1, g);                 // firebox
  B(2.5, .07, .4, M.marble, 0, 1.25, .1, g);                // mantel
  const logs = new THREE.Group(); g.add(logs);
  for (let i = 0; i < 3; i++) { const l = C(.06, .06, .9, M.trunk, 0, 0, 0, logs, 8); l.rotation.z = PI / 2; l.position.set(0, .26 + i * .07, .18 - i * .05); }
  const flames = [];
  for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.1, .4, 8), M.fire); f.position.set(-.4 + i * .2, .45, .2); g.add(f); flames.push(f); }
  g.userData.flames = flames;
  B(.08, .3, .08, M.gold, -.8, 1.32, .1, g); B(.08, .3, .08, M.gold, .8, 1.32, .1, g);
  return g;
}
function bed(w, l, head, duvet, accent) {
  const g = new THREE.Group();
  B(w + .16, .3, l, M.woodDark, 0, .06, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.06, .06, .06, M.gold, sx * (w / 2), 0, sz * (l / 2 - .05), g);
  B(w, .28, l - .08, M.linen, 0, .36, .02, g);
  B(w + .06, .08, l * .7, duvet, 0, .6, l * .14, g);
  B(w + .06, .32, .04, duvet, 0, .36, l / 2 - .05 + .02, g);
  B(w + .1, .1, .55, accent, 0, .64, l / 2 - .4, g);
  B(w + .4, 1.45, .14, head, 0, 0, -l / 2 - .06, g);
  for (let i = 0; i < 4; i++) B(.04, .9, .02, M.gold, -w / 2 + (w * (i + .5) / 4), .5, -l / 2 + .02, g).scale.set(.4, 1, 1);
  const pn = w > 1.7 ? 3 : 2, pw = (w - .1) / pn;
  for (let i = 0; i < pn; i++) { const p = B(pw - .04, .2, .42, M.linen, -w / 2 + .05 + pw * (i + .5), .64, -l / 2 + .3, g); p.rotation.x = -.35; }
  for (let i = 0; i < pn - 1; i++) { const p = B(.45, .35, .1, accent, -w / 2 + .05 + pw * (i + 1), .66, -l / 2 + .55, g); p.rotation.x = -.3; }
  return g;
}
function nightstand() { const g = new THREE.Group(); B(.55, .55, .45, M.walnut, 0, .05, 0, g); B(.55, .02, .45, M.gold, 0, .6, 0, g); B(.5, .005, .005, M.gold, 0, .32, .226, g); B(.12, .02, .02, M.gold, 0, .44, .23, g); for (const sx of [-1, 1]) B(.04, .05, .04, M.gold, sx * .23, 0, 0, g); place(tableLamp(), g, 0, .62, 0); return g; }
function wardrobe(len, h = 2.5) {
  const g = new THREE.Group(); B(len, h, .62, M.cabinet, 0, 0, 0, g);
  const n = Math.round(len / .55);
  for (let i = 1; i < n; i++) B(.01, h - .1, .01, M.trim, -len / 2 + len * i / n, .05, .315, g);
  for (let i = 0; i < n; i++) B(.02, .5, .03, M.gold, -len / 2 + len * (i + .5) / n + (i % 2 ? -.2 : .2) * (len / n), h * .45, .33, g);
  B(len + .04, .06, .64, M.white, 0, h, 0, g);
  return g;
}
function dresser(len) {
  const g = new THREE.Group(); B(len, .85, .5, M.walnut, 0, .1, 0, g);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) { B(len / 2 - .06, .24, .01, M.woodDark, -len / 4 + i * len / 2, .15 + r * .26, .255, g); B(.14, .02, .02, M.gold, -len / 4 + i * len / 2, .27 + r * .26, .265, g); }
  for (const sx of [-1, 1]) B(.04, .1, .04, M.gold, sx * (len / 2 - .05), 0, 0, g);
  B(len, .02, .5, M.marble, 0, .95, 0, g); return g;
}
function bench(len, mat) { const g = new THREE.Group(); B(len, .1, .45, mat, 0, .38, 0, g); B(len - .05, .3, .4, M.woodDark, 0, .08, 0, g).scale.y = .2; for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.04, .38, .04, M.gold, sx * (len / 2 - .05), 0, sz * .18, g); return g; }
function chair(mat) {
  const g = new THREE.Group();
  B(.5, .1, .5, mat, 0, .42, 0, g);
  const b = B(.5, .62, .08, mat, 0, .5, -.23, g); b.rotation.x = -.08;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.04, .42, .04, M.woodDark, sx * .2, 0, sz * .2, g);
  return g;
}
function diningTable(len, wid) {
  const g = new THREE.Group(); B(len, .07, wid, M.marble, 0, .72, 0, g);
  for (const sx of [-1, 1]) { B(.5, .62, .5, M.woodDark, sx * len * .3, .1, 0, g).scale.set(.5, 1, 1.2); B(.8, .1, .7, M.woodDark, sx * len * .3, 0, 0, g); }
  // centerpiece
  for (let i = 0; i < 3; i++) { C(.02, .03, .3, M.gold, -.3 + i * .3, .79, 0, g, 8); S(.025, M.bulb, -.3 + i * .3, 1.12, 0, g, 6, 6); }
  C(.18, .12, .1, M.ceramic, 0, .79, .25, g); S(.12, M.velvetRose, 0, .95, .25, g, 10, 8);
  return g;
}
function stool() { const g = new THREE.Group(); C(.2, .2, .07, M.leather, 0, .72, 0, g); C(.02, .03, .72, M.gold, 0, 0, 0, g); C(.18, .2, .02, M.gold, 0, 0, 0, g); const r = new THREE.Mesh(new THREE.TorusGeometry(.15, .01, 6, 20), M.gold); r.rotation.x = PI / 2; r.position.y = .3; g.add(r); return g; }
function cabinetRun(len, depth = .62, withUppers = true, upperFrom = 1.5) {
  const g = new THREE.Group();
  B(len, .1, depth - .05, M.blackMatte, 0, 0, -.03, g);
  B(len, .78, depth, M.cabinet, 0, .1, 0, g);
  const n = Math.max(1, Math.round(len / .6));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + len * (i + .5) / n;
    B(.005, .7, .005, M.trim, -len / 2 + len * i / n, .14, depth / 2 + .002, g);
    B(.2, .015, .02, M.gold, x, .78, depth / 2 + .01, g);
  }
  B(len + .02, .04, depth + .04, M.marble, 0, .88, .02, g);
  if (withUppers) {
    B(len, .85, .36, M.cabinet, 0, upperFrom, -depth / 2 + .18, g);
    for (let i = 0; i < n; i++) { B(.005, .8, .005, M.trim, -len / 2 + len * i / n, upperFrom + .02, -depth / 2 + .361, g); B(.015, .18, .02, M.gold, -len / 2 + len * (i + .5) / n + .2, upperFrom + .05, -depth / 2 + .37, g); }
    B(len, .5, .02, M.marble, 0, .92, -depth / 2 + .01, g); // backsplash
    B(len, .02, .02, M.bulb, 0, upperFrom - .02, -depth / 2 + .33, g); // under-cabinet LED
  }
  return g;
}
function fridge() {
  const g = new THREE.Group(); B(1.0, 2.15, .75, M.steel, 0, 0, 0, g);
  B(.005, 2.1, .005, M.black, 0, .02, .376, g); B(1.0, .005, .005, M.black, 0, .75, .376, g);
  for (const sx of [-1, 1]) B(.025, .9, .04, M.chrome, sx * .06, .95, .4, g);
  B(.25, .35, .01, M.black, -.25, 1.3, .38, g); return g;
}
function range() {
  const g = new THREE.Group(); B(.92, .9, .66, M.steel, 0, 0, 0, g); B(.9, .02, .64, M.black, 0, .9, 0, g);
  for (const [x, z] of [[-.22, -.15], [.22, -.15], [-.22, .15], [.22, .15]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.09, .012, 6, 20), M.steel); r.rotation.x = PI / 2; r.position.set(x, .925, z); g.add(r); }
  B(.8, .45, .02, M.black, 0, .2, .335, g); B(.6, .03, .03, M.chrome, 0, .72, .35, g);
  for (let i = 0; i < 5; i++) C(.025, .025, .03, M.chrome, -.32 + i * .16, .82, .34, g, 10).rotation.x = PI / 2;
  // hood
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(.18, .62, .55, 4, 1), M.steel); hood.rotation.y = PI / 4; hood.scale.set(1, 1, .7); hood.position.set(0, 2.05, -.05); g.add(hood);
  B(.3, .7, .25, M.steel, 0, 2.3, -.15, g);
  return g;
}
function island(len, wid) {
  const g = new THREE.Group();
  B(len, .1, wid - .1, M.blackMatte, 0, 0, 0, g);
  B(len, .8, wid - .3, M.navy, 0, .1, -.1, g);
  const n = Math.round(len / .6);
  for (let i = 0; i < n; i++) B(.2, .015, .02, M.gold, -len / 2 + len * (i + .5) / n, .75, -.1 - (wid - .3) / 2 - .01, g);
  B(len + .1, .06, wid, M.marble, 0, .9, 0, g);
  B(.7, .02, .4, M.steel, -len * .2, .955, -.15, g);
  const fau = new THREE.Group(); place(fau, g, -len * .2, .96, -.42);
  C(.02, .02, .35, M.gold, 0, 0, 0, fau, 8); const arc = new THREE.Mesh(new THREE.TorusGeometry(.1, .015, 6, 16, PI), M.gold); arc.position.set(0, .35, .1); arc.rotation.y = PI / 2; fau.add(arc);
  // fruit bowl
  C(.18, .1, .08, M.ceramic, len * .2, .96, 0, g); for (let i = 0; i < 5; i++) S(.045, i % 2 ? M.mustard : M.terracotta, len * .2 + R(-.08, .08), 1.05, R(-.08, .08), g, 8, 6);
  return g;
}
function bookshelf(w, h) {
  const g = new THREE.Group(); const d = .38;
  B(w, h, .03, M.woodDark, 0, 0, -d / 2, g);
  B(.04, h, d, M.woodDark, -w / 2, 0, 0, g); B(.04, h, d, M.woodDark, w / 2, 0, 0, g);
  const shelves = Math.round(h / .38);
  for (let s = 0; s <= shelves; s++) {
    const y = s * (h - .03) / shelves; B(w, .03, d, M.woodDark, 0, y, 0, g);
    if (s === shelves) break;
    let x = -w / 2 + .05;
    while (x < w / 2 - .1) {
      if (rnd() < .12) { x += R(.1, .3); continue; }
      const bw = R(.025, .055), bh = R(.2, .31);
      B(bw, bh, R(.18, .26), M.bookColors[rnd() * 8 | 0], x + bw / 2, y + .03, .02, g); x += bw + .004;
    }
  }
  g.traverse(o => o.userData.noCast = true); return g;
}
function desk() {
  const g = new THREE.Group(); B(2.0, .06, .9, M.walnut, 0, .74, 0, g);
  B(.5, .74, .8, M.walnut, -.72, 0, 0, g); B(.5, .74, .8, M.walnut, .72, 0, 0, g);
  B(.9, .3, .02, M.walnut, 0, .44, -.35, g);
  // laptop + monitor
  B(.6, .02, .3, M.steel, -.2, .8, .1, g);
  const sc = B(.6, .36, .02, M.black, -.2, .82, -.05, g); sc.rotation.x = -.2;
  B(.8, .45, .03, M.black, .35, .95, -.3, g); C(.02, .03, .15, M.steel, .35, .8, -.3, g);
  place(tableLamp(), g, .85, .8, -.2);
  C(.12, .12, .01, M.gold, -.75, .8, .2, g);
  return g;
}
function officeChair() {
  const g = new THREE.Group(); B(.55, .1, .55, M.leatherBlack, 0, .48, 0, g);
  const b = B(.55, .8, .1, M.leatherBlack, 0, .55, -.26, g); b.rotation.x = -.1;
  C(.03, .03, .4, M.chrome, 0, .08, 0, g);
  for (let i = 0; i < 5; i++) { const leg = B(.04, .03, .32, M.chrome, 0, .05, 0, g); leg.rotation.y = i * PI * 2 / 5; leg.position.set(Math.sin(i * PI * 2 / 5) * .16, .06, Math.cos(i * PI * 2 / 5) * .16); }
  for (const sx of [-1, 1]) B(.06, .04, .4, M.leatherBlack, sx * .3, .72, 0, g);
  return g;
}
function globe() { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const l = B(.03, .7, .03, M.woodDark, Math.cos(i * 2.1) * .2, 0, Math.sin(i * 2.1) * .2, g); } S(.25, std({ color: 0xc9b98f, roughness: .6 }), 0, .95, 0, g); const r = new THREE.Mesh(new THREE.TorusGeometry(.28, .01, 6, 30), M.gold); r.position.y = .95; r.rotation.z = .4; g.add(r); return g; }
function tub() {
  const g = new THREE.Group();
  const o = C(.5, .44, .62, M.ceramic, 0, 0, 0, g, 32); o.scale.set(1.75, 1, .9);
  const w = C(.45, .45, .01, std({ color: 0xbfe8f2, roughness: .05, transparent: true, opacity: .9 }), 0, .55, 0, g, 32); w.scale.set(1.72, 1, .86);
  const f = new THREE.Group(); place(f, g, .95, 0, 0);
  C(.025, .025, 1.0, M.gold, 0, 0, 0, f, 8); const sp = C(.02, .02, .25, M.gold, -.12, .95, 0, f, 8); sp.rotation.z = PI / 2;
  return g;
}
function vanity(len) {
  const g = new THREE.Group(); B(len, .7, .55, M.walnut, 0, .15, 0, g);
  B(len + .04, .05, .58, M.marble, 0, .85, .01, g);
  const n = len > 1.8 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i ? len / 4 : -len / 4);
    const s = C(.22, .18, .14, M.ceramic, x, .9, .03, g, 24); s.scale.z = .75;
    const f = C(.015, .015, .28, M.gold, x, .9, -.2, g, 8); const sp = C(.012, .012, .14, M.gold, x, 1.16, -.14, g, 8); sp.rotation.x = PI / 2;
    const mr = B(.75, 1.0, .03, M.mirror, x, 1.25, -.27, g);
    const fr = new THREE.Mesh(new THREE.TorusGeometry(.0, 0, 3, 3), M.gold); g.add(fr);
    B(.79, .03, .04, M.gold, x, 2.25, -.27, g); B(.79, .03, .04, M.gold, x, 1.22, -.27, g);
    C(.04, .04, .3, M.bulb, x - .45, 1.6, -.25, g, 10); C(.04, .04, .3, M.bulb, x + .45, 1.6, -.25, g, 10);
  }
  for (let i = 0; i < 4; i++) B(.2, .01, .02, M.gold, -len / 2 + len * (i + .5) / 4, .5, .28, g);
  return g;
}
function toilet() {
  const g = new THREE.Group(); const b = C(.2, .16, .4, M.ceramic, 0, 0, .1, g, 20); b.scale.z = 1.3;
  B(.4, .38, .18, M.ceramic, 0, .38, -.2, g); B(.42, .03, .2, M.ceramic, 0, .76, -.2, g); const lid = C(.21, .21, .03, M.ceramic, 0, .4, .1, g, 20); lid.scale.z = 1.3; return g;
}
function shower(w, d) {
  const g = new THREE.Group();
  B(w, .05, d, texMat(T.marbleTiles, 1, 1, { roughness: .15, color: 0xd9d6d0 }), 0, 0, 0, g);
  const p1 = B(w, 2.1, .02, M.railGlass, 0, .05, d / 2, g); const p2 = B(.02, 2.1, d, M.railGlass, -w / 2, .05, 0, g);
  B(w, .03, .03, M.gold, 0, 2.15, d / 2, g); B(.03, .03, d, M.gold, -w / 2, 2.15, 0, g);
  C(.15, .15, .015, M.gold, 0, 2.2, -d / 2 + .3, g); C(.01, .01, .3, M.gold, 0, 2.2, -d / 2 + .15, g).rotation.x = PI / 2;
  p1.userData.noShadow = p2.userData.noShadow = true; return g;
}
function towelRack() { const g = new THREE.Group(); B(.6, .02, .02, M.gold, 0, 1.2, 0, g); B(.55, .7, .03, towelMat, 0, .55, .02, g); return g; }
function recliner() {
  const g = sofa(1.0, M.leatherBlack, M.leatherBlack);
  C(.04, .04, .02, M.chrome, .42, .69, .25, g, 10);
  return g;
}
function poolTable() {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.14, .62, .14, M.woodDark, sx * .6, 0, sz * 1.15, g);
  B(1.45, .2, 2.65, M.woodDark, 0, .6, 0, g);
  B(1.24, .02, 2.44, M.felt, 0, .8, 0, g);
  B(.12, .06, 2.65, M.woodDark, -.665, .8, 0, g); B(.12, .06, 2.65, M.woodDark, .665, .8, 0, g);
  B(1.45, .06, .12, M.woodDark, 0, .8, -1.265, g); B(1.45, .06, .12, M.woodDark, 0, .8, 1.265, g);
  const cols = [0xf4d03f, 0x1f4e9c, 0xc0392b, 0x6c3483, 0xe67e22, 0x1e8449, 0x7b241c, 0x111111, 0xffffff];
  cols.forEach((c, i) => { const row = Math.floor((Math.sqrt(8 * i + 1) - 1) / 2), k = i - row * (row + 1) / 2; S(.028, std({ color: c, roughness: .15 }), (k - row / 2) * .058, .85, -.6 - row * .05, g, 10, 8); });
  S(.028, std({ color: 0xffffff, roughness: .1 }), 0, .85, .7, g, 10, 8);
  const cue = C(.008, .014, 1.45, M.walnut, .3, .85, .3, g, 6); cue.rotation.x = PI / 2; cue.rotation.z = .4;
  return g;
}
function bar(len) {
  const g = new THREE.Group(); B(len, 1.05, .55, M.woodDark, 0, 0, 0, g); B(len + .1, .05, .65, M.marble, 0, 1.05, 0, g);
  B(len, .04, .02, M.ledBlue, 0, .05, .28, g);
  for (let i = 0; i < 6; i++) { C(.035, .035, .28, M.bookColors[i % 8], -len / 2 + .2 + i * .18, 1.1, -.12, g, 10); C(.012, .012, .08, M.black, -len / 2 + .2 + i * .18, 1.38, -.12, g, 6); }
  return g;
}

/* ================= HOUSE SHELL ================= */
// foundation + plinth
B(24.6, .35, 16.6, M.stone, 0, -.35, 0, G0);

// ---- floors level 0 ----
floorPlane(-2.5, 2.5, -8, 8, .005, fMarble(5, 16), G0);              // foyer + hall
floorPlane(2.5, 12, 0, 8, .005, fWood(9.5, 8), G0);                  // living
floorPlane(-12, -2.5, 1, 8, .005, fWood(9.5, 7), G0);                // dining
floorPlane(-12, -2.5, -8, 1, .005, fMarble(9.5, 9), G0);             // kitchen
floorPlane(2.5, 12, -8, 0, .005, fCarpet(9.5, 8, 0x3a2f39), G0);    // cinema/game

// ---- exterior walls level 0 (y 0..3.4) ----
const EXT_T = .3;
wall('x', HZ, -HX - .15, HX + .15, 0, FL1, [
  { at: -9.3, w: 2.2, type: 'window', sill: .5, top: 2.7 },
  { at: -5.2, w: 2.2, type: 'window', sill: .5, top: 2.7 },
  { at: 0, w: 1.9, type: 'door', top: 2.75 },
  { at: 5.2, w: 2.2, type: 'window', sill: .5, top: 2.7 },
  { at: 9.3, w: 2.2, type: 'window', sill: .5, top: 2.7 },
], M.wallExt, [0], G0, EXT_T, 1);
wall('x', -HZ, -HX - .15, HX + .15, 0, FL1, [
  { at: -9.5, w: 1.8, type: 'window', sill: 1.1, top: 2.5 },
  { at: -5, w: 1.8, type: 'window', sill: 1.1, top: 2.5 },
  { at: 0, w: 2.6, type: 'door', top: 2.6 },
  { at: 7, w: 1.4, type: 'window', sill: .9, top: 2.5 },
], M.wallExt, [0], G0, EXT_T, -1);
wall('z', -HX, -HZ + .15, HZ - .15, 0, FL1, [
  { at: 4.5, w: 2.0, type: 'window', sill: .5, top: 2.7 },
], M.wallExt, [0], G0, EXT_T, -1);
wall('z', HX, -HZ + .15, HZ - .15, 0, FL1, [
  { at: 1.5, w: 1.6, type: 'window', sill: .5, top: 2.7 },
  { at: 6.6, w: 1.6, type: 'window', sill: .5, top: 2.7 },
], M.wallExt, [0], G0, EXT_T, 1);

// ---- interior walls level 0 ----
wall('z', -2.5, -HZ + .15, HZ - .15, 0, H0, [{ at: 4.5, w: 2.6, type: 'door', top: 2.6 }, { at: -3, w: 2.4, type: 'door', top: 2.6 }], M.wallInt, [0], G0);
wall('z', 2.5, -HZ + .15, HZ - .15, 0, H0, [{ at: 4, w: 3.0, type: 'door', top: 2.6 }, { at: -4, w: 1.4, type: 'door', top: 2.3 }], M.wallInt, [0], G0);
wall('x', 1, -HX + .15, -2.6, 0, H0, [{ at: -7, w: 3.4, type: 'door', top: 2.6 }], M.wallInt, [0], G0);
wall('x', 0, 2.6, HX - .15, 0, H0, [{ at: 4, w: 1.2, type: 'door', top: 2.3 }], M.wallInt, [0], G0);

// ---- stairs ----
const ST_Z0 = 5, ST_Z1 = -3, ST_W = 2.1, STEPS = 17;
const stairs = new THREE.Group(); G0.add(stairs);
{
  const rise = FL1 / STEPS, run = (ST_Z0 - ST_Z1) / STEPS;
  for (let i = 0; i < STEPS; i++) {
    const top = (i + 1) * rise, z = ST_Z0 - (i + .5) * run;
    B(ST_W, top - .04, run, M.wallInt, 0, 0, z, stairs);
    B(ST_W + .02, .04, run + .03, M.oak, 0, top - .04, z + .015, stairs);
  }
  // sloped glass balustrade + gold handrail
  const len = Math.hypot(ST_Z0 - ST_Z1, FL1), ang = Math.atan2(FL1, ST_Z0 - ST_Z1);
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(.02, .95, len), M.railGlass);
    p.position.set(sx * (ST_W / 2 + .02), FL1 / 2 + .5, (ST_Z0 + ST_Z1) / 2); p.rotation.x = ang; p.userData.noShadow = true; stairs.add(p);
    const h = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, len), M.gold);
    h.position.set(sx * (ST_W / 2 + .02), FL1 / 2 + 1.0, (ST_Z0 + ST_Z1) / 2); h.rotation.x = ang; stairs.add(h);
    B(.06, 1.0, .06, M.gold, sx * (ST_W / 2 + .02), 0, ST_Z0 - .05, stairs);
  }
  addCol(-ST_W / 2 - .12, -ST_W / 2 - .02, ST_Z1, ST_Z0, [0, 1]);
  addCol(ST_W / 2 + .02, ST_W / 2 + .12, ST_Z1, ST_Z0, [0, 1]);
  addCol(-ST_W / 2 - .1, ST_W / 2 + .1, ST_Z1 - .12, ST_Z1 + .05, [0]);
}

// ---- slab between floors (with stair opening) ----
{
  const y = H0, h = FL1 - H0, ox = ST_W / 2 + .1;
  const slab = (x1, x2, z1, z2) => { B(x2 - x1, h, z2 - z1, M.ceiling, (x1 + x2) / 2, y, (z1 + z2) / 2, G1); };
  slab(-HX + .15, -ox, -HZ + .15, HZ - .15); slab(ox, HX - .15, -HZ + .15, HZ - .15);
  slab(-ox, ox, -HZ + .15, ST_Z1); slab(-ox, ox, ST_Z0, HZ - .15);
}

// ---- floors level 1 ----
const Y1 = FL1 + .006;
floorPlane(-2.5, 2.5, -8, ST_Z1, Y1, fWood(5, 5), G1);
floorPlane(-2.5, 2.5, ST_Z0, 8, Y1, fWood(5, 3), G1);
floorPlane(-2.5, -ST_W / 2 - .1, ST_Z1, ST_Z0, Y1, fWood(1.4, 8), G1);
floorPlane(ST_W / 2 + .1, 2.5, ST_Z1, ST_Z0, Y1, fWood(1.4, 8), G1);
floorPlane(2.5, 12, -8, 3, Y1, fCarpet(9.5, 11, 0xd8cfc1), G1);     // master
floorPlane(2.5, 12, 3, 8, Y1, fMarble(9.5, 5), G1);                 // master bath
floorPlane(-12, -2.5, 0, 8, Y1, fWood(9.5, 8), G1);                 // bedroom 2
floorPlane(-12, -2.5, -8, 0, Y1, fWood(9.5, 8), G1);                // office

// ---- exterior walls level 1 ----
wall('x', HZ, -HX - .15, HX + .15, FL1, H1 + .2, [
  { at: -9.3, w: 1.8, type: 'window', sill: .7, top: 2.5 },
  { at: -5.2, w: 1.8, type: 'window', sill: .7, top: 2.5 },
  { at: 0, w: 1.6, type: 'door', top: 2.5 },
  { at: 6, w: 1.8, type: 'window', sill: 1.0, top: 2.5 },
  { at: 9.6, w: 1.4, type: 'window', sill: 1.0, top: 2.5 },
], M.wallExt, [1], G1, EXT_T, 1);
wall('x', -HZ, -HX - .15, HX + .15, FL1, H1 + .2, [
  { at: -9.5, w: 1.8, type: 'window', sill: .7, top: 2.5 },
  { at: -5, w: 1.8, type: 'window', sill: .7, top: 2.5 },
  { at: 0, w: 1.4, type: 'window', sill: .9, top: 2.5 },
  { at: 4.4, w: 1.6, type: 'window', sill: .7, top: 2.5 },
  { at: 10.6, w: 1.6, type: 'window', sill: .7, top: 2.5 },
], M.wallExt, [1], G1, EXT_T, -1);
wall('z', -HX, -HZ + .15, HZ - .15, FL1, H1 + .2, [
  { at: 6.6, w: 1.4, type: 'window', sill: .7, top: 2.5 },
  { at: 1.5, w: 1.4, type: 'window', sill: .7, top: 2.5 },
], M.wallExt, [1], G1, EXT_T, -1);
wall('z', HX, -HZ + .15, HZ - .15, FL1, H1 + .2, [
  { at: 0, w: 2.0, type: 'window', sill: .5, top: 2.6 },
  { at: 5.6, w: 1.4, type: 'window', sill: 1.1, top: 2.5 },
], M.wallExt, [1], G1, EXT_T, 1);

// ---- interior walls level 1 ----
wall('z', -2.5, -HZ + .15, HZ - .15, FL1, H1, [{ at: 2, w: 1.2, type: 'door', top: 2.3 }, { at: -2, w: 1.2, type: 'door', top: 2.3 }], M.wallInt, [1], G1);
wall('z', 2.5, -HZ + .15, HZ - .15, FL1, H1, [{ at: -1.2, w: 1.6, type: 'door', top: 2.4 }], M.wallInt, [1], G1);
wall('x', 0, -HX + .15, -2.6, FL1, H1, [], M.wallInt, [1], G1);
wall('x', 3, 2.6, HX - .15, FL1, H1, [{ at: 4, w: 1.0, type: 'door', top: 2.3 }], M.wallInt, [1], G1);

// stair opening railing (upper floor)
{
  const ox = ST_W / 2 + .1;
  for (const sx of [-1, 1]) {
    const p = B(.02, .95, ST_Z0 - ST_Z1, M.railGlass, sx * ox, FL1, (ST_Z0 + ST_Z1) / 2, G1); p.userData.noShadow = true;
    B(.05, .05, ST_Z0 - ST_Z1, M.gold, sx * ox, FL1 + .95, (ST_Z0 + ST_Z1) / 2, G1);
  }
  const p = B(ox * 2, .95, .02, M.railGlass, 0, FL1, ST_Z0, G1); p.userData.noShadow = true;
  B(ox * 2, .05, .05, M.gold, 0, FL1 + .95, ST_Z0, G1);
  addCol(-ox - .05, ox + .05, ST_Z0 - .05, ST_Z0 + .08, [1]);
}

// ---- top ceiling + roof ----
B(24, .2, 16, M.ceiling, 0, FL1 + H1, 0, GRoof);
function hipRoof(w, d, h, y, mat) {
  const hw = w / 2, hd = d / 2, rx = Math.max(0, hw - hd);
  const v = [
    -hw, 0, hd, hw, 0, hd, rx, h, 0, -hw, 0, hd, rx, h, 0, -rx, h, 0,
    hw, 0, -hd, -hw, 0, -hd, -rx, h, 0, hw, 0, -hd, -rx, h, 0, rx, h, 0,
    -hw, 0, -hd, -hw, 0, hd, -rx, h, 0,
    hw, 0, hd, hw, 0, -hd, rx, h, 0,
  ];
  const uv = [];
  for (let i = 0; i < v.length; i += 3) uv.push(v[i] / 4, (v[i + 2] + v[i + 1]) / 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.position.y = y; return m;
}
const roofTex = T.shingle.clone(); roofTex.needsUpdate = true; roofTex.repeat.set(1, 1);
const roofMat = std({ map: roofTex, roughness: .85, side: THREE.DoubleSide });
GRoof.add(hipRoof(26, 18, 4.2, FL1 + H1 + .2, roofMat));
B(26.1, .3, 18.1, M.white, 0, FL1 + H1 + .05, 0, GRoof);        // cornice
// chimney + dormers
B(1.6, 3.6, 1.2, M.stone, 10.5, FL1 + H1 + 1, 4, GRoof);
B(1.8, .15, 1.4, M.trim, 10.5, FL1 + H1 + 4.6, 4, GRoof);
for (const x of [-7, 7]) {
  const dm = new THREE.Group(); place(dm, GRoof, x, FL1 + H1 + .6, 7.4);
  B(2.2, 1.6, 1.6, M.wallExtPlain, 0, 0, -.6, dm);
  B(1.4, 1.1, .05, M.glass, 0, .25, .21, dm).userData.noShadow = true;
  B(1.5, .06, .1, M.trim, 0, .2, .22, dm); B(1.5, .06, .1, M.trim, 0, 1.35, .22, dm); B(.06, 1.2, .1, M.trim, 0, .2, .22, dm);
  const r = new THREE.Mesh(new THREE.CylinderGeometry(0, 1.6, 1.0, 4, 1), roofMat); r.rotation.y = PI / 4; r.scale.set(1, 1, 1.25); r.position.set(0, 2.05, -.6); dm.add(r);
}

/* ================= PORTICO & BALCONY ================= */
{
  const g = GOut;
  B(7.4, .2, 3.2, M.white, 0, H0 + .02, 9.6, G1);          // balcony slab (part of 2nd floor)
  B(7.4, .25, 3.2, M.trim, 0, H0 - .25, 9.6, G0);
  floorPlane(-3.6, 3.6, 8.15, 11.15, FL1 - .17, texMat(T.marbleTiles, 4, 2, { roughness: .15 }), G1);
  for (const x of [-3.3, -1.5, 1.5, 3.3]) {
    C(.22, .22, .25, M.white, x, 0, 10.8, g, 20);
    C(.17, .19, H0 - .55, M.white, x, .25, 10.8, g, 24);
    B(.5, .3, .5, M.white, x, H0 - .3, 10.8, g);
  }
  // balcony glass railing
  for (const [x1, x2, z1, z2] of [[-3.6, 3.6, 11.15, 11.2], [-3.65, -3.6, 8.15, 11.2], [3.6, 3.65, 8.15, 11.2]]) {
    const p = B(x2 - x1, 1.0, z2 - z1, M.railGlass, (x1 + x2) / 2, FL1 - .17, (z1 + z2) / 2, G1); p.userData.noShadow = true;
    B(Math.max(x2 - x1, .06), .06, Math.max(z2 - z1, .06), M.gold, (x1 + x2) / 2, FL1 + .83, (z1 + z2) / 2, G1);
    addCol(x1 - .05, x2 + .05, z1 - .05, z2 + .05, [1]);
  }
  // balcony furniture
  place(armchair(M.fabricCream), G1, -2.2, FL1 - .17, 9.8, face(1, -.3));
  place(armchair(M.fabricCream), G1, 2.2, FL1 - .17, 9.8, face(-1, -.3));
  place(sideTable(), G1, 0, FL1 - .17, 10.1);
  place(plant(1.2, M.potDark), G1, -3.1, FL1 - .17, 8.6); place(plant(1.2, M.potDark), G1, 3.1, FL1 - .17, 8.6);
  // entry steps & wall lanterns
  floorPlane(-3.6, 3.6, 8.15, 11.4, .02, texMat(T.marbleTiles, 4, 2, { roughness: .15 }), g);
  for (const x of [-1.5, 1.5]) { const l = new THREE.Group(); place(l, g, x, 1.9, 8.2); B(.22, .4, .22, M.black, 0, 0, 0, l); B(.16, .32, .16, M.bulb, 0, .04, 0, l); }
  // double front doors (open inward)
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * .93, 0, HZ - .1); piv.rotation.y = s * -1.25; G0.add(piv);
    B(.92, 2.7, .07, M.navy, -s * .46, 0, 0, piv);
    for (const yy of [.3, 1.5]) B(.6, .9, .02, M.navy, -s * .46, yy, .045, piv);
    B(.03, .4, .05, M.gold, -s * .82, 1.0, .06, piv);
  }
}

/* ================= GARAGE WING ================= */
{
  const g = GOut;
  B(7.6, .35, 10.6, M.stone, -16, -.35, 3, g);
  B(7.4, 3.6, 10.4, M.wallExt, -16, 0, 3, g);
  for (const x of [-17.9, -14.1]) {
    B(3.0, 2.6, .05, M.white, x, .05, 8.21, g);
    for (let i = 0; i < 5; i++) B(2.9, .02, .03, std({ color: 0xdedbd5 }), x, .5 + i * .45, 8.24, g);
    B(2.6, .4, .03, M.glass, x, 2.1, 8.25, g);
    B(3.2, .1, .1, M.trim, x, 2.65, 8.25, g);
    const l = new THREE.Group(); place(l, g, x + 1.75, 2.4, 8.22); B(.16, .3, .16, M.black, 0, 0, 0, l); B(.11, .22, .11, M.bulb, 0, .04, .01, l);
  }
  B(7.8, .25, 10.8, M.white, -16, 3.6, 3, g);
  const gr = hipRoof(11.2, 8.2, 2.4, 0, roofMat); gr.rotation.y = PI / 2; gr.position.set(-16, 3.85, 3); g.add(gr);
  addCol(-19.8, -12.15, -2.3, 8.3, [0, 1]);
}

/* ================= FURNISH ROOMS ================= */
const pts = []; // point lights
const fireFlames = [];
function roomLight(x, y, z, parent, int = 1) { const l = new THREE.PointLight(0xffd9a8, 0, 14, 2); l.position.set(x, y, z); l.userData.base = int; parent.add(l); pts.push(l); return l; }

// ---- FOYER / HALL ----
{
  const g = G0;
  place(rug(3.2, 2.4, rugMat('#1f2d4d', '#c9a24b')), g, 0, .01, 6.6);
  place(chandelier(.75, 3), g, 0, FL1 + H1, 1);
  roomLight(0, 2.6, 6.2, g, 1.2);
  for (const sx of [-1, 1]) {
    const con = new THREE.Group(); place(con, g, sx * 2.15, 0, 6.6, sx > 0 ? -PI / 2 : PI / 2);
    B(1.3, .05, .38, M.marble, 0, .82, 0, con); for (const ax of [-1, 1]) B(.04, .82, .3, M.gold, ax * .6, 0, 0, con);
    place(tableLamp(), con, -.4, .87, 0); C(.1, .07, .25, M.ceramic, .35, .87, 0, con); S(.14, M.velvetRose, .35, 1.2, 0, con, 10, 8);
    place(painting(1.1, 1.3, artTex(3 + sx, 'abs')), g, sx * 2.38, 1.35, 6.6, sx > 0 ? -PI / 2 : PI / 2);
    place(plant(1.6), g, sx * 1.9, 0, 7.5);
    place(painting(.9, 1.1, artTex(9 + sx, 'abs')), g, sx * 2.38, 1.4, -5.5, sx > 0 ? -PI / 2 : PI / 2);
  }
  // back hall bench
  place(bench(1.6, M.velvetGreen), g, 1.9, 0, -5.5, -PI / 2);
  place(palmPlant(), g, -1.9, 0, -7.3);
  place(ceilingLight(.3), g, 0, H0, -5.8);
}

// ---- LIVING ROOM ---- (x 2.5..12, z 0..8)
{
  const g = G0;
  place(rug(5.2, 4.4, rugMat('#d9cfbf', '#9c8f7a')), g, 8.6, .01, 4);
  const fp = fireplace(); place(fp, g, 11.65, 0, 4, -PI / 2); fireFlames.push(...fp.userData.flames);
  const t = tv(1.9); place(t, g, 11.42, 1.55, 4, -PI / 2);
  place(sofa(3.2, M.fabricCream, M.fabricCream2, [M.velvetNavy, M.mustard, M.velvetNavy]), g, 6.5, 0, 4, PI / 2);
  place(armchair(M.velvetGreen), g, 9.2, 0, 1.4, face(.3, 1));
  place(armchair(M.velvetGreen), g, 9.2, 0, 6.6, face(.3, -1));
  place(coffeeTable(1.5, .8), g, 8.4, 0, 4);
  place(sideTable(), g, 6.4, 0, 1.9); place(tableLamp(), g, 6.4, .6, 1.9);
  place(sideTable(), g, 6.4, 0, 6.1);
  place(floorLamp(), g, 11, 0, 1.0);
  place(plant(1.8), g, 11.3, 0, 7.3); place(palmPlant(), g, 3.1, 0, 7.4);
  place(bookshelf(2.2, 2.6), g, 4.3, 0, .32, 0);
  place(bookshelf(2.2, 2.6), g, 7.2, 0, .32, 0);
  place(painting(1.6, 1.0, artTex(1, 'land')), g, 3.0, 1.2, 1.8, PI / 2);
  // grand piano (stylised)
  {
    const pn = new THREE.Group(); place(pn, g, 4.2, 0, 6.3, -.5);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .3, 28, 1, false, 0, PI), M.black); body.scale.set(1, 1, 1.6); body.position.y = .85; body.rotation.y = -PI / 2; pn.add(body);
    B(1.5, .3, .6, M.black, 0, .7, .3, pn); B(1.3, .04, .18, M.white, 0, .78, .7, pn);
    for (let i = 0; i < 24; i++) B(.025, .02, .1, M.black, -.6 + i * .053, .8, .65, pn);
    const lid = B(1.4, .03, 1.2, M.black, 0, 1.0, -.4, pn); lid.rotation.x = -.5;
    for (const [x, z] of [[-.6, .4], [.6, .4], [0, -1]]) B(.08, .7, .08, M.black, x, 0, z, pn);
    place(bench(.8, M.leatherBlack), pn, 0, 0, 1.2);
  }
  place(ceilingLight(.45), g, 8.6, H0, 4);
  roomLight(8, 2.7, 4, g, 1.4);
}

// ---- DINING ---- (x -12..-2.5, z 1..8)
{
  const g = G0;
  place(rug(5.4, 3.2, rugMat('#6b4a3a', '#d2b48c')), g, -7.4, .01, 4.6);
  place(diningTable(3.4, 1.2), g, -7.4, 0, 4.6);
  for (let i = 0; i < 3; i++) {
    const x = -8.6 + i * 1.2;
    place(chair(M.fabricCream), g, x, 0, 3.6, 0);
    place(chair(M.fabricCream), g, x, 0, 5.6, PI);
  }
  place(chair(M.velvetNavy), g, -9.6, 0, 4.6, PI / 2); place(chair(M.velvetNavy), g, -5.2, 0, 4.6, -PI / 2);
  place(chandelier(.7, 2), g, -7.4, H0, 4.6);
  roomLight(-7.4, 2.4, 4.6, g, 1.3);
  const sb = new THREE.Group(); place(sb, g, -11.6, 0, 3.3, PI / 2);
  B(2.2, .8, .5, M.walnut, 0, .1, 0, sb); B(2.24, .03, .52, M.marble, 0, .9, 0, sb); for (const ax of [-1, 1]) B(.05, .1, .05, M.gold, ax, 0, 0, sb);
  place(tableLamp(), sb, -.8, .93, 0); C(.1, .07, .3, M.gold, .6, .93, 0, sb);
  place(painting(2.0, 1.2, artTex(1, 'land')), g, -11.83, 1.4, 3.3, PI / 2);
  place(plant(1.7), g, -11.4, 0, 1.6); place(plant(1.7), g, -3, 0, 7.4);
  // wine cabinet
  const wc = new THREE.Group(); place(wc, g, -4.2, 0, 1.4, 0);
  B(1.4, 2.3, .45, M.woodDark, 0, 0, 0, wc); B(1.3, 2.1, .02, M.glass, 0, .1, .23, wc);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) { const b = C(.035, .035, .3, M.bookColors[(r + c) % 3 === 0 ? 0 : 2], -.5 + c * .2, .25 + r * .24, 0, wc, 8); b.rotation.x = PI / 2; }
  B(1.3, .02, .02, M.bulb, 0, 2.2, .2, wc);
}

// ---- KITCHEN ---- (x -12..-2.5, z -8..1)
{
  const g = G0;
  const run = cabinetRun(6.4, .62, false); place(run, g, -7.2, 0, -7.5);
  // upper cabinets avoiding windows
  for (const x of [-11.2, -7.25, -3.3]) { const u = new THREE.Group(); place(u, g, x, 1.5, -7.67); B(1.2, .9, .36, M.cabinet, 0, 0, 0, u); B(.01, .85, .01, M.trim, 0, .02, .181, u); B(.015, .2, .02, M.gold, .1, .05, .19, u); B(.015, .2, .02, M.gold, -.1, .05, .19, u); }
  place(range(), g, -7.25, 0, -7.45);
  const side = cabinetRun(5.0, .62, true); place(side, g, -11.55, 0, -3.6, PI / 2);
  place(fridge(), g, -11.45, 0, -.3, PI / 2);
  place(island(3.4, 1.3), g, -7.2, 0, -3.6, PI);
  for (let i = 0; i < 4; i++) place(stool(), g, -8.4 + i * .8, 0, -2.6);
  for (let i = 0; i < 3; i++) place(pendant(), g, -8.3 + i * 1.1, H0, -3.6);
  roomLight(-7.2, 2.5, -3.6, g, 1.3);
  roomLight(-7.2, 2.5, -6.8, g, .7);
  // breakfast nook
  const nt = new THREE.Group(); place(nt, g, -4.2, 0, -6.2);
  C(.55, .55, .04, M.marble, 0, .74, 0, nt, 32); C(.05, .05, .72, M.gold, 0, .02, 0, nt); C(.3, .35, .03, M.gold, 0, 0, 0, nt);
  for (let i = 0; i < 3; i++) { const a = i * PI * 2 / 3 + .4; place(chair(M.velvetGreen), nt, Math.sin(a) * .85, 0, Math.cos(a) * .85, a + PI); }
  place(plant(1.4), g, -3.0, 0, -7.4);
}

// ---- CINEMA / GAME ROOM ---- (x 2.5..12, z -8..0)
{
  const g = G0;
  B(.25, 2.2, 4.4, M.black, 11.78, .45, -4, g);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.7), M.cinema); sc.rotation.y = -PI / 2; sc.position.set(11.64, 1.6, -4); g.add(sc);
  for (const z of [-6.6, -1.4]) { B(.4, 1.1, .4, M.blackMatte, 11.6, 0, z, g); B(.36, .6, .02, M.blackMatte, 11.4, .3, z, g); }
  // two rows of recliners
  B(1.6, .25, 4.2, M.blackMatte, 7.6, 0, -4, g);
  for (let i = 0; i < 3; i++) { place(recliner(), g, 9.6, 0, -5.2 + i * 1.2, PI / 2); place(recliner(), g, 7.6, .25, -5.2 + i * 1.2, PI / 2); }
  // LED strips
  B(.04, .04, 7.6, M.ledBlue, 2.65, H0 - .08, -4, g); B(.04, .04, 7.6, M.ledBlue, 11.83, H0 - .08, -4, g);
  B(9.2, .04, .04, M.ledBlue, 7.25, H0 - .08, -.15, g); B(9.2, .04, .04, M.ledBlue, 7.25, H0 - .08, -7.83, g);
  place(poolTable(), g, 4.4, 0, -4.4);
  place(bar(2.4), g, 4.4, 0, -7.5);
  for (let i = 0; i < 3; i++) place(stool(), g, 3.6 + i * .8, 0, -6.8);
  for (let i = 0; i < 2; i++) place(pendant(), g, 4.4, H0, -5.0 + i * 1.2);
  place(painting(1.0, 1.4, artTex(12, 'abs')), g, 2.62, 1.3, -1.6, PI / 2);
  roomLight(4.4, 2.6, -4.4, g, .9); roomLight(9, 2.6, -4, g, .35);
}

// ---- MASTER BEDROOM ---- (lvl1, x 2.5..12, z -8..3)
{
  const g = G1, y = FL1;
  B(4.4, 2.6, .06, M.velvetNavy, 7.5, y, -7.82, g);                 // accent panel
  for (let i = 0; i < 6; i++) B(.03, 2.5, .02, M.gold, 5.4 + i * .84, y + .05, -7.78, g);
  place(rug(4.2, 3.6, rugMat('#efe6d6', '#b89f78')), g, 7.5, y + .01, -5.2);
  place(bed(1.95, 2.15, M.velvetNavy, M.linen, M.mustard), g, 7.5, y, -6.6);
  place(nightstand(), g, 5.8, y, -7.45); place(nightstand(), g, 9.2, y, -7.45);
  place(bench(1.6, M.velvetRose), g, 7.5, y, -4.9);
  place(chandelier(.6, 2), g, 7.5, FL1 + H1, -5.5);
  // TV wall on z=3 interior side facing -z
  place(mediaConsole(2.4), g, 8, y, 2.65, PI);
  place(tv(1.75), g, 8, y + 1.15, 2.86, PI);
  // sitting area by the big window
  place(armchair(M.fabricCream), g, 10.6, y, -1.2, face(0, 1));
  place(armchair(M.fabricCream), g, 10.6, y, 1.4, face(0, -1));
  place(sideTable(), g, 10.8, y, .1); place(floorLamp(), g, 11.5, y, -2.3);
  place(wardrobe(3.2), g, 2.92, y, -5.1, PI / 2);
  place(dresser(1.6), g, 2.86, y, 1.6, PI / 2);
  place(painting(1.0, .8, artTex(21, 'abs')), g, 2.62, y + 1.5, 1.6, PI / 2);
  place(plant(1.6), g, 11.4, y, -7.4); place(plant(1.4), g, 3.2, y, -7.4);
  roomLight(7.5, y + 2.6, -4.5, g, 1.2); roomLight(8, y + 2.6, .6, g, .7);
}

// ---- MASTER BATH ---- (lvl1, x 2.5..12, z 3..8)
{
  const g = G1, y = FL1;
  B(9.4, 1.3, .03, texMat(T.marble, 4, 1, { roughness: .15 }), 7.25, y, 3.13, g);
  place(tub(), g, 6.3, y, 6.9);
  place(vanity(2.6), g, 8.3, y, 3.42);
  place(shower(1.7, 1.8), g, 11.05, y, 4.0, -PI / 2);
  place(toilet(), g, 3.1, y, 7.4, PI / 2 + PI);
  place(towelRack(), g, 2.62, y, 5.4, PI / 2);
  place(plant(1.2), g, 4.2, y, 7.5);
  place(chandelier(.4, 1), g, 6.3, FL1 + H1, 6.6);
  B(.5, .45, .35, M.walnut, 9.6, y, 7.7, g); for (let i = 0; i < 3; i++) B(.42, .08, .3, towelMat, 9.6, y + .46 + i * .08, 7.7, g);
  C(.2, .25, .02, std({ color: 0xffffff, roughness: 1 }), 6.3, y + .01, 5.8, g, 20);
  roomLight(7.5, y + 2.6, 5.5, g, .9);
}

// ---- BEDROOM 2 ---- (lvl1, x -12..-2.5, z 0..8)
{
  const g = G1, y = FL1;
  B(.06, 2.2, 3.2, M.velvetRose, -11.82, y, 4, g);
  place(rug(3.4, 3, rugMat('#f2e3e0', '#c58c86')), g, -9.2, y + .01, 4);
  place(bed(1.6, 2.05, M.velvetRose, M.linen, M.fabricGray), g, -10.7, y, 4, PI / 2);
  place(nightstand(), g, -11.5, y, 2.5, PI / 2); place(nightstand(), g, -11.5, y, 5.5, PI / 2);
  place(mediaConsole(1.6), g, -2.85, y, 5.5, -PI / 2);
  place(tv(1.3), g, -2.65, y + 1.05, 5.5, -PI / 2);
  const dk = desk(); dk.scale.set(.7, 1, .7); place(dk, g, -7.2, y, 7.4, PI);
  place(officeChair(), g, -7.2, y, 6.7, 0);
  place(wardrobe(2.2), g, -5.5, y, .43, 0);
  place(armchair(M.mustard), g, -3.6, y, 1.1, face(-1, 1));
  place(ceilingLight(.35), g, -7.2, FL1 + H1, 4);
  place(painting(.8, 1.0, artTex(5, 'abs')), g, -11.78, y + 1.4, 1.4, PI / 2);
  place(plant(1.4), g, -11.4, y, 7.5);
  roomLight(-7.2, y + 2.6, 4, g, 1.1);
}

// ---- OFFICE / LIBRARY ---- (lvl1, x -12..-2.5, z -8..0)
{
  const g = G1, y = FL1;
  for (let i = 0; i < 3; i++) place(bookshelf(1.8, 2.9), g, -11.6, y, -6.6 + i * 1.85, PI / 2);
  place(rug(3.6, 2.8, rugMat('#2b3a32', '#c9a24b')), g, -7, y + .01, -5.2);
  place(desk(), g, -7, y, -5.8, 0);
  place(officeChair(), g, -7, y, -6.6, PI);
  place(armchair(M.leather), g, -7.6, y, -4.4, PI);
  place(armchair(M.leather), g, -6.4, y, -4.4, PI);
  place(sofa(2.4, M.leather, M.leather), g, -6.5, y, -.6, PI);
  place(coffeeTable(1.2, .6, M.woodDark), g, -6.5, y, -1.9);
  place(globe(), g, -3.4, y, -7.2);
  place(painting(1.4, 1.0, artTex(1, 'land')), g, -6.5, y + 1.4, -.13, PI);
  place(chandelier(.5, 2), g, -7, FL1 + H1, -5.2);
  place(palmPlant(), g, -3.2, y, -1.0);
  roomLight(-7, y + 2.6, -4.5, g, 1.1);
}

// ---- UPPER HALL ----
{
  const g = G1, y = FL1;
  const con = new THREE.Group(); place(con, g, 0, y, -7.6);
  B(1.6, .05, .38, M.marble, 0, .82, 0, con); for (const ax of [-1, 1]) B(.04, .82, .3, M.gold, ax * .7, 0, 0, con);
  place(tableLamp(), con, .5, .87, 0);
  place(painting(1.3, .9, artTex(30, 'abs')), g, 0, y + 1.4, -7.83, 0);
  place(plant(1.4), g, -2, y, 7.4); place(plant(1.4), g, 2, y, 7.4);
  place(ceilingLight(.3), g, 0, FL1 + H1, 6.5); place(ceilingLight(.3), g, 0, FL1 + H1, -5.5);
}

/* ================= EXTERIOR ================= */
{
  const g = GOut;
  // grass with a cut-out for the backyard patio/pool
  const grassPiece = (x1, x2, z1, z2) => { const m = floorPlane(x1, x2, z1, z2, -.02, texMat(T.grass, (x2 - x1) / 5.5, (z2 - z1) / 5.5, { roughness: 1 }), g); m.userData.noCast = true; };
  grassPiece(-110, 110, -14, 110); grassPiece(-110, 110, -110, -24); grassPiece(-110, -11, -24, -14); grassPiece(11, 110, -24, -14);
  const road = floorPlane(-110, 110, 36, 44, -.01, M.asphalt, g);
  for (let x = -100; x < 100; x += 6) B(2.6, .005, .15, std({ color: 0xf2e7b5 }), x, -.005, 40, g);
  floorPlane(-110, 110, 34.5, 36, -.005, texMat(T.pavers, 60, 1), g);
  // driveway & walkway
  floorPlane(-19.6, -12.4, 8.3, 36, .0, texMat(T.pavers, 3, 12), g);
  floorPlane(-1.6, 1.6, 11.4, 20, .0, texMat(T.pavers, 1.4, 4), g);
  floorPlane(-12.4, 1.6, 20, 23, .0, texMat(T.pavers, 6, 1.4), g);
  // hedges & flowers along the walk
  for (const sx of [-1, 1]) {
    B(.7, .7, 8, M.hedge, sx * 2.2, 0, 15.7, g);
    for (let i = 0; i < 6; i++) S(.18, std({ color: [0xe64980, 0xffffff, 0xf9c74f][i % 3], roughness: .8 }), sx * 2.2, .78, 12.3 + i * 1.3, g, 8, 6);
  }
  B(.6, .9, 15.6, M.hedge, 12.9, 0, 0, g);
  // flowerbeds along the front facade
  for (const [x1, x2] of [[-12, -3.7], [3.7, 12]]) {
    B(x2 - x1, .15, 1, std({ color: 0x3b2a1e, roughness: 1 }), (x1 + x2) / 2, 0, 8.7, g);
    for (let x = x1 + .4; x < x2; x += .8) S(.32, M.hedge, x, .35, 8.7, g, 10, 8);
  }
  // trees
  const tree = (x, z, s = 1) => { const t = new THREE.Group(); place(t, g, x, 0, z); C(.18 * s, .25 * s, 2.6 * s, M.trunk, 0, 0, 0, t, 10); S(1.6 * s, M.leaves, 0, 3.4 * s, 0, t, 14, 10); S(1.2 * s, M.leaves2, .6 * s, 4.1 * s, .3 * s, t, 12, 8); S(1.1 * s, M.leaves, -.6 * s, 3.9 * s, -.4 * s, t, 12, 8); };
  const palm = (x, z, h = 7) => { const t = new THREE.Group(); place(t, g, x, 0, z); for (let i = 0; i < 8; i++) { const seg = C(.2 - i * .01, .22 - i * .01, h / 8, M.trunk, Math.sin(i * .2) * .3, i * h / 8, 0, t, 8); } for (let i = 0; i < 9; i++) { const a = i * PI * 2 / 9; const leaf = new THREE.Mesh(new THREE.BoxGeometry(.35, .04, 2.8), M.plantGreen); leaf.geometry.translate(0, 0, 1.4); leaf.position.set(.5, h, 0); leaf.rotation.y = a; leaf.rotation.x = .45; t.add(leaf); } };
  tree(-26, 14, 1.2); tree(18, 16, 1.1); tree(24, 4, 1.3); tree(-28, -6, 1.2); tree(20, -14, 1.1); tree(-22, -22, 1.3); tree(8, 28, .9); tree(-8, 28, .9);
  palm(-5, 14); palm(5, 14); palm(-11, -22); palm(11, -22); palm(16, 9.5, 8); palm(-24, 30, 8); palm(24, 30, 8);
  // mailbox
  const mb = new THREE.Group(); place(mb, g, -11.6, 0, 34.8); B(.1, 1.1, .1, M.white, 0, 0, 0, mb); B(.25, .25, .5, M.black, 0, 1.1, 0, mb); B(.04, .2, .04, std({ color: 0xc0392b }), .14, 1.25, .1, mb);
  // street lamps
  for (const x of [-30, -6, 18, 42]) { const l = new THREE.Group(); place(l, g, x, 0, 35.2); C(.06, .09, 5, M.black, 0, 0, 0, l, 8); B(.9, .06, .06, M.black, .4, 4.95, 0, l); B(.3, .1, .2, M.bulb, .8, 4.85, 0, l); }
  // car on the driveway
  const car = new THREE.Group(); place(car, g, -16, 0, 14, 0);
  B(1.95, .55, 4.7, M.carRed, 0, .35, 0, car);
  const cab = B(1.7, .45, 2.3, M.glass, 0, .9, -.2, car); cab.material = std({ color: 0x1a222b, metalness: .5, roughness: .1 });
  B(1.72, .05, 2.0, M.carRed, 0, 1.35, -.3, car);
  B(1.6, .12, .05, M.chrome, 0, .55, 2.36, car); B(1.8, .14, .05, M.black, 0, .4, -2.36, car);
  for (const sx of [-1, 1]) { B(.3, .08, .05, M.bulb, sx * .65, .72, 2.36, car); B(.4, .08, .05, std({ color: 0xff2020, emissive: 0xaa0000, emissiveIntensity: 1 }), sx * .65, .72, -2.36, car); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = C(.36, .36, .26, M.tire, sx * .92, 0, sz * 1.5, car, 18); w.rotation.z = PI / 2; w.position.y = .36; const hub = C(.22, .22, .27, M.chrome, sx * .92, 0, sz * 1.5, car, 14); hub.rotation.z = PI / 2; hub.position.y = .36; }
  addCol(-17.1, -14.9, 11.5, 16.5, [0]);
  // second car (black SUV)
  const suv = new THREE.Group(); place(suv, g, -16, 0, 22, 0);
  B(2.0, .9, 5.0, M.carBlack, 0, .35, 0, suv); B(1.9, .7, 3.2, std({ color: 0x15191e, metalness: .5, roughness: .1 }), 0, 1.25, -.3, suv);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = C(.42, .42, .3, M.tire, sx * .95, 0, sz * 1.6, suv, 18); w.rotation.z = PI / 2; w.position.y = .42; }
  for (const sx of [-1, 1]) B(.35, .1, .05, M.bulb, sx * .7, .95, 2.51, suv);
  addCol(-17.1, -14.9, 19.4, 24.6, [0]);

  // ---- backyard: patio + pool ----
  floorPlane(-11, 11, -14, -8.15, .01, texMat(T.pavers, 10, 3), g);
  const PX1 = -7, PX2 = 7, PZ1 = -22, PZ2 = -15;
  for (const [x1, x2, z1, z2] of [[-11, 11, -15, -14], [-11, 11, -24, -22], [-11, PX1, -22, -15], [PX2, 11, -22, -15]])
    floorPlane(x1, x2, z1, z2, .01, texMat(T.pavers, (x2 - x1) / 2.2, (z2 - z1) / 2.2), g);
  // pool shell
  const pool = new THREE.Group(); g.add(pool);
  B(PX2 - PX1, .05, PZ2 - PZ1, M.poolTile, (PX1 + PX2) / 2, -1.6, (PZ1 + PZ2) / 2, pool);
  B(PX2 - PX1, 1.6, .05, M.poolTile, (PX1 + PX2) / 2, -1.6, PZ1, pool); B(PX2 - PX1, 1.6, .05, M.poolTile, (PX1 + PX2) / 2, -1.6, PZ2, pool);
  B(.05, 1.6, PZ2 - PZ1, M.poolTile, PX1, -1.6, (PZ1 + PZ2) / 2, pool); B(.05, 1.6, PZ2 - PZ1, M.poolTile, PX2, -1.6, (PZ1 + PZ2) / 2, pool);
  const water = floorPlane(PX1, PX2, PZ1, PZ2, -.12, M.water, pool); water.userData.noCast = true;
  // hide the grass/pavers above the pool by building coping as a frame around (pavers plane drawn over pool) -> cut-out
  for (const [x1, x2, z1, z2] of [[PX1 - .5, PX2 + .5, PZ2, PZ2 + .5], [PX1 - .5, PX2 + .5, PZ1 - .5, PZ1], [PX1 - .5, PX1, PZ1, PZ2], [PX2, PX2 + .5, PZ1, PZ2]]) B(x2 - x1, .08, z2 - z1, M.white, (x1 + x2) / 2, 0, (z1 + z2) / 2, g);
  addCol(PX1, PX2, PZ1, PZ2, [0]);
  // pool lights
  for (let i = 0; i < 4; i++) B(.25, .12, .02, M.bulb, PX1 + 2 + i * 3.3, -.7, PZ2 - .04, pool);
  // loungers
  const lounger = () => { const l = new THREE.Group(); B(.7, .3, 1.9, M.white, 0, .0, 0, l); B(.65, .1, 1.3, M.fabricCream2, 0, .3, .3, l); const b = B(.65, .1, .7, M.fabricCream2, 0, .3, -.6, l); b.rotation.x = .7; b.position.set(0, .55, -.75); return l; };
  for (let i = 0; i < 4; i++) place(lounger(), g, -5.4 + i * 1.3, 0, -12.7, PI);
  for (let i = 0; i < 2; i++) place(lounger(), g, 8.8, 0, -18.5 + i * 1.6, PI / 2 * 0);
  const umb = new THREE.Group(); place(umb, g, -1.4, 0, -12.2); C(.03, .03, 2.5, M.white, 0, 0, 0, umb, 8); const can = new THREE.Mesh(new THREE.ConeGeometry(1.6, .6, 8, 1, true), M.umbrella); can.position.y = 2.6; umb.add(can); C(.4, .4, .08, M.white, 0, 0, 0, umb);
  // outdoor lounge with fire pit
  const fpGroup = new THREE.Group(); place(fpGroup, g, 7, 0, -11.5);
  C(.7, .8, .4, M.stone, 0, 0, 0, fpGroup, 20); const of = C(.5, .5, .02, M.fire, 0, .41, 0, fpGroup, 16);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.12, .45, 8), M.fire); f.position.set(Math.cos(i * 1.6) * .2, .62, Math.sin(i * 1.6) * .2); fpGroup.add(f); fireFlames.push(f); }
  place(sofa(2.2, M.fabricCream, M.fabricCream2, [M.velvetNavy, M.velvetNavy]), fpGroup, 0, 0, -1.9, 0);
  place(sofa(2.2, M.fabricCream, M.fabricCream2, [M.mustard, M.mustard]), fpGroup, 1.9, 0, 0, -PI / 2);
  // BBQ
  const bbq = new THREE.Group(); place(bbq, g, -9, 0, -9.2);
  B(2.4, .9, .7, M.stone, 0, 0, 0, bbq); B(2.5, .05, .75, M.marble, 0, .9, 0, bbq); B(.8, .35, .5, M.steel, -.3, .95, 0, bbq);
  // outdoor dining table
  const odt = new THREE.Group(); place(odt, g, -6.5, 0, -10.8);
  B(2.2, .06, 1.0, M.oak, 0, .72, 0, odt); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.06, .72, .06, M.black, sx * 1.0, 0, sz * .42, odt);
  for (let i = 0; i < 3; i++) { place(chair(M.white), odt, -.7 + i * .7, 0, -.8, 0); place(chair(M.white), odt, -.7 + i * .7, 0, .8, PI); }
  // garden lights + white fence around backyard
  for (let x = -24; x <= 24; x += 2.4) { B(.1, 1.2, .1, M.white, x, 0, -28, g); }
  B(48, .08, .06, M.white, 0, 1.05, -28, g); B(48, .08, .06, M.white, 0, .5, -28, g);
  for (let z = -28; z <= -9; z += 2.4) for (const x of [-24, 24]) B(.1, 1.2, .1, M.white, x, 0, z, g);
  for (const x of [-24, 24]) { B(.06, .08, 19, M.white, x, 1.05, -18.5, g); B(.06, .08, 19, M.white, x, .5, -18.5, g); }
  for (const [x, z] of [[-10, -14.5], [10, -14.5], [-10, -23.5], [10, -23.5]]) { C(.05, .05, .7, M.black, x, 0, z, g, 8); S(.1, M.bulb, x, .75, z, g, 8, 6); }
  const poolLight = new THREE.PointLight(0x55d0ff, 0, 18, 2); poolLight.position.set(0, .5, -18.5); g.add(poolLight); poolLight.userData.base = 1.6; pts.push(poolLight);
  // world bounds
  addCol(-60, 60, 45, 46, [0]); addCol(-60, 60, -29, -28.2, [0]); addCol(-61, -60, -30, 46, [0]); addCol(60, 61, -30, 46, [0]);
}

// sky dome
const skyGeo = new THREE.SphereGeometry(400, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { top: { value: new THREE.Color(0x4f8fd8) }, bot: { value: new THREE.Color(0xdcecf7) }, sun: { value: new THREE.Vector3(.5, .6, .4).normalize() }, night: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 sun; uniform float night; varying vec3 vP;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
    void main(){ float t = clamp(vP.y*1.4, 0., 1.); vec3 c = mix(bot, top, pow(t,.7));
      float s = max(dot(vP, sun), 0.); c += vec3(1.,.85,.6)*pow(s, 180.)*1.5*(1.-night) + vec3(1.,.8,.5)*pow(s,8.)*.15*(1.-night);
      if(night>.5){ vec3 q = floor(vP*260.); float st = step(.997, h(q)); c += vec3(st)*t; c += vec3(.95,.95,.85)*pow(s,900.)*2.; }
      gl_FragColor = vec4(c,1.); }`
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xe8f1ff, 0x8a7a60, 1.1); scene.add(hemi);
const amb = new THREE.AmbientLight(0xfff4e6, .35); scene.add(amb);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.position.set(30, 40, 22); sun.target.position.set(0, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
const sc = 34; Object.assign(sun.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, near: 5, far: 120 });
sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
skyMat.uniforms.sun.value.copy(sun.position).normalize();

// shadows flags
world.traverse(o => {
  if (!o.isMesh) return;
  o.receiveShadow = true;
  o.castShadow = !o.userData.noCast && !o.userData.noShadow && !(o.material && o.material.transparent);
});

/* ================= ROOMS / NAV ================= */
const ROOMS = [
  { id: 'facade', name: 'Фасад', icon: '🏛️', lv: 'out', x: 0, z: 26, look: [0, 4, 0] },
  { id: 'hall', name: 'Парадный холл', icon: '✨', lv: 0, x: 0, z: 7.4, look: [0, 2.2, 0], box: [-2.5, 2.5, -8, 8] },
  { id: 'living', name: 'Гостиная', icon: '🛋️', lv: 0, x: 3.4, z: 3, look: [11, 1.4, 4.4], box: [2.5, 12, 0, 8] },
  { id: 'dining', name: 'Столовая', icon: '🍽️', lv: 0, x: -3.3, z: 6.8, look: [-9, 1.0, 3.6], box: [-12, -2.5, 1, 8] },
  { id: 'kitchen', name: 'Кухня', icon: '👨‍🍳', lv: 0, x: -3.2, z: .2, look: [-9, 1.0, -6], box: [-12, -2.5, -8, 1] },
  { id: 'cinema', name: 'Кинозал и бильярд', icon: '🎬', lv: 0, x: 3.3, z: -1.0, look: [11, 1.4, -5], box: [2.5, 12, -8, 0] },
  { id: 'master', name: 'Главная спальня', icon: '🛏️', lv: 1, x: 3.4, z: 2.2, look: [7.5, 4.4, -6.5], box: [2.5, 12, -8, 3] },
  { id: 'bath', name: 'Ванная комната', icon: '🛁', lv: 1, x: 4.0, z: 3.7, look: [8, 4.2, 6.8], box: [2.5, 12, 3, 8] },
  { id: 'bed2', name: 'Гостевая спальня', icon: '🌸', lv: 1, x: -3.4, z: 1.0, look: [-10.5, 4.2, 4.6], box: [-12, -2.5, 0, 8] },
  { id: 'office', name: 'Кабинет-библиотека', icon: '📚', lv: 1, x: -3.4, z: -1.0, look: [-9, 4.6, -6.5], box: [-12, -2.5, -8, 0] },
  { id: 'hall2', name: 'Холл 2-го этажа', icon: '🪜', lv: 1, x: 0, z: -6.5, look: [0, 3, 6], box: [-2.5, 2.5, -8, 8] },
  { id: 'balcony', name: 'Балкон', icon: '🌇', lv: 1, x: 0, z: 8.8, look: [0, 3.5, 25], box: [-3.6, 3.6, 8, 11.2] },
  { id: 'pool', name: 'Бассейн и патио', icon: '🏊', lv: 'out', x: 2.6, z: -10.2, look: [0, 0, -20], box: [-24, 24, -28, -8] },
  { id: 'garage', name: 'Гараж и авто', icon: '🚗', lv: 'out', x: -10.5, z: 19, look: [-16, 1, 15] },
];
const roomsEl = document.getElementById('rooms');
for (const r of ROOMS) {
  const b = document.createElement('button'); b.innerHTML = `<i>${r.icon}</i>${r.name}`;
  b.onclick = () => { goRoom(r); roomsEl.classList.remove('open'); };
  roomsEl.querySelector(`.grid[data-level="${r.lv}"]`).appendChild(b);
}

/* ================= CONTROLS ================= */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08;
controls.maxPolarAngle = PI * .49; controls.minDistance = 4; controls.maxDistance = 90;
controls.target.set(0, 3, 0);
camera.position.set(30, 20, 34);

let mode = 'orbit';
const player = { x: 0, z: 26, y: 0, yaw: 0, pitch: 0 };
const EYE = 1.65, RAD = .28;
let tween = null;

function setMode(m) {
  mode = m;
  document.body.classList.toggle('walk', m === 'walk');
  document.getElementById('mOrbit').classList.toggle('on', m === 'orbit');
  document.getElementById('mWalk').classList.toggle('on', m === 'walk');
  controls.enabled = m === 'orbit';
  if (m === 'walk') {
    setVis(true, true);
    camera.fov = isSmall && innerWidth < innerHeight ? 72 : 65; camera.updateProjectionMatrix();
    hint(isTouch ? 'Джойстик — ходить · свайп по экрану — смотреть' : 'WASD / стрелки — ходить · тяните мышью — смотреть · Shift — бег');
  } else {
    camera.fov = 55; camera.updateProjectionMatrix();
    hint(isTouch ? 'Вращайте одним пальцем, приближайте двумя' : 'Вращение — мышь, зум — колесо, сдвиг — правая кнопка');
  }
}
function goRoom(r) {
  const lvl = r.lv === 1 ? 1 : 0;
  player.x = r.x; player.z = r.z; player.y = lvl ? FL1 : 0;
  const dx = r.look[0] - r.x, dz = r.look[2] - r.z, dy = r.look[1] - (player.y + EYE);
  player.yaw = Math.atan2(-dx, -dz);
  player.pitch = Math.atan2(dy, Math.hypot(dx, dz)) * .8;
  setMode('walk');
}
document.getElementById('mOrbit').onclick = () => { if (mode !== 'orbit') { setMode('orbit'); flyOrbit(); } };
document.getElementById('mWalk').onclick = () => { if (mode !== 'walk') goRoom(ROOMS[0]); };
document.getElementById('roomsBtn').onclick = () => roomsEl.classList.toggle('open');
canvas.addEventListener('pointerdown', () => roomsEl.classList.remove('open'));

function flyOrbit() {
  const from = camera.position.clone(), tFrom = controls.target.clone();
  const to = new THREE.Vector3(26, 22, 30), tTo = new THREE.Vector3(0, 3, 0);
  tween = { t: 0, from, to, tFrom, tTo };
}

// toggles
let roofOn = true, f2On = true, night = false;
function setVis(roof, f2) {
  roofOn = roof; f2On = f2;
  GRoof.visible = roof && f2; G1.visible = f2;
  document.getElementById('tRoof').classList.toggle('on', roof && f2);
  document.getElementById('tFloor2').classList.toggle('on', f2);
}
document.getElementById('tRoof').onclick = () => { if (mode === 'walk') setMode('orbit'); setVis(!(roofOn && f2On), true); };
document.getElementById('tFloor2').onclick = () => { if (mode === 'walk') setMode('orbit'); setVis(f2On ? false : roofOn, !f2On); };
document.getElementById('tNight').onclick = () => setNight(!night);
function setNight(n) {
  night = n; document.getElementById('tNight').classList.toggle('on', n);
  document.getElementById('tNight').firstChild.textContent = n ? '☀️' : '🌙';
  skyMat.uniforms.top.value.set(n ? 0x050a1a : 0x4f8fd8);
  skyMat.uniforms.bot.value.set(n ? 0x1b2340 : 0xdcecf7);
  skyMat.uniforms.night.value = n ? 1 : 0;
  sun.intensity = n ? .25 : 2.6; sun.color.set(n ? 0x9fb4ff : 0xfff0d8);
  hemi.intensity = n ? .18 : 1.1; amb.intensity = n ? .12 : .35;
  scene.environmentIntensity = n ? .18 : .55;
  for (const l of pts) l.intensity = l.userData.base * (n ? 14 : 3);
  M.windowGlow.opacity = n ? .55 : 0; M.windowGlow.emissiveIntensity = n ? 1.4 : 0;
  M.bulb.emissiveIntensity = n ? 4 : 2.2;
  renderer.toneMappingExposure = n ? 1.15 : 1.0;
}
setNight(false);

// ---------- input: keyboard ----------
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyN') setNight(!night); });
addEventListener('keyup', e => { keys[e.code] = false; });

// ---------- input: look (pointer drag) ----------
let lookId = null, lx = 0, ly = 0;
canvas.addEventListener('pointerdown', e => {
  if (mode !== 'walk' || lookId !== null) return;
  lookId = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== lookId) return;
  const s = isTouch ? .0055 : .0042;
  player.yaw -= (e.clientX - lx) * s; player.pitch -= (e.clientY - ly) * s;
  player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch));
  lx = e.clientX; ly = e.clientY;
});
const endLook = e => { if (e.pointerId === lookId) lookId = null; };
canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);

// ---------- input: joystick ----------
const joy = document.getElementById('joy'), knob = document.getElementById('knob');
let joyId = null, jx = 0, jy = 0;
function joyMove(e) {
  const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2 - 10;
  let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
  if (d > max) { dx *= max / d; dy *= max / d; }
  jx = dx / max; jy = dy / max; knob.style.transform = `translate(${dx}px,${dy}px)`;
}
joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); e.preventDefault(); });
joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; jx = jy = 0; knob.style.transform = ''; };
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);

// ---------- hint ----------
const hintEl = document.getElementById('hint'); let hintT;
function hint(t) { hintEl.textContent = t; hintEl.classList.add('show'); clearTimeout(hintT); hintT = setTimeout(() => hintEl.classList.remove('show'), 4200); }

/* ================= WALK PHYSICS ================= */
function inStairs(x, z) { return Math.abs(x) < ST_W / 2 && z < ST_Z0 && z > ST_Z1; }
function groundAt(x, z, lvl) {
  if (inStairs(x, z)) return Math.max(0, Math.min(FL1, FL1 * (ST_Z0 - z) / (ST_Z0 - ST_Z1)));
  return lvl ? FL1 - (z > HZ ? .17 : 0) : 0;
}
function collide(p, lvl) {
  for (const c of colliders) {
    if (!c.lv.includes(lvl)) continue;
    const nx = Math.max(c.x1, Math.min(p.x, c.x2)), nz = Math.max(c.z1, Math.min(p.z, c.z2));
    const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 < RAD * RAD) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (RAD - d) / d; p.x += dx * k; p.z += dz * k; }
      else { // inside: push out along smallest axis
        const l = p.x - c.x1, r = c.x2 - p.x, f = p.z - c.z1, b = c.z2 - p.z, m = Math.min(l, r, f, b);
        if (m === l) p.x = c.x1 - RAD; else if (m === r) p.x = c.x2 + RAD; else if (m === f) p.z = c.z1 - RAD; else p.z = c.z2 + RAD;
      }
    }
  }
}
const roomNameEl = document.getElementById('roomName'); let lastRoom = '';
function currentRoom() {
  const lvl = player.y > 1.7 ? 1 : 0;
  if (inStairs(player.x, player.z)) return 'Парадная лестница';
  for (const r of ROOMS) {
    if (!r.box) continue;
    if ((r.lv === 'out' ? 0 : r.lv) !== lvl) continue;
    const [x1, x2, z1, z2] = r.box;
    if (player.x >= x1 && player.x <= x2 && player.z >= z1 && player.z <= z2) return r.name;
  }
  return Math.abs(player.x) < HX && Math.abs(player.z) < HZ ? 'Дом' : 'Территория виллы';
}

function updateWalk(dt) {
  let f = 0, s = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1; if (keys.KeyA || keys.ArrowLeft) s -= 1;
  if (keys.KeyQ) player.yaw += dt * 1.8; if (keys.KeyE) player.yaw -= dt * 1.8;
  f -= jy; s += jx;
  const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
  const speed = (keys.ShiftLeft || keys.ShiftRight ? 6 : 3.2);
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  const vx = (-sy * f + cy * s) * speed * dt, vz = (-cy * f - sy * s) * speed * dt;
  const lvl = player.y > 1.7 ? 1 : 0;
  // sub-steps for robust collision
  const steps = Math.ceil(Math.hypot(vx, vz) / .1) || 1;
  const p = { x: player.x, z: player.z };
  for (let i = 0; i < steps; i++) { p.x += vx / steps; p.z += vz / steps; collide(p, lvl); }
  player.x = p.x; player.z = p.z;
  const gy = groundAt(player.x, player.z, lvl);
  player.y += (gy - player.y) * Math.min(1, dt * 14);
  const bob = len > .1 ? Math.sin(performance.now() * .009) * .025 * len : 0;
  camera.position.set(player.x, player.y + EYE + bob, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
  const rn = currentRoom(); if (rn !== lastRoom) { lastRoom = rn; roomNameEl.textContent = rn; }
}

/* ================= LOOP ================= */
const fireFlamesRef = fireFlames;
const clock = new THREE.Clock();
let tvT = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  if (mode === 'walk') updateWalk(dt);
  else {
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 1.6); const k = 1 - Math.pow(1 - tween.t, 3);
      camera.position.lerpVectors(tween.from, tween.to, k); controls.target.lerpVectors(tween.tFrom, tween.tTo, k);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
  }
  for (let i = 0; i < fireFlamesRef.length; i++) { const f = fireFlamesRef[i]; f.scale.y = .8 + Math.sin(t * 9 + i * 1.7) * .25 + Math.sin(t * 23 + i) * .1; f.scale.x = f.scale.z = .9 + Math.sin(t * 7 + i) * .1; }
  M.water.map.offset.set(Math.sin(t * .3) * .05, t * .02);
  tvT += dt; if (tvT > .08) { tvT = 0; drawTV(t); drawCinema(t); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

// start
setMode('orbit');
camera.position.set(48, 30, 58);
flyOrbit();
requestAnimationFrame(() => { frame(); setTimeout(() => document.getElementById('loader').classList.add('hide'), 250); });
// debug hook for automated screenshots
window.__villa = { goRoom: id => goRoom(ROOMS.find(r => r.id === id)), setVis, setNight, setMode, camera, controls, player, updateWalk, keys };
