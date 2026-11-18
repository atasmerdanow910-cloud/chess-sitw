// Furniture library. Every function returns a THREE.Group in local space:
// front of the object faces +Z, base sits at y = 0, centered on x/z.
import * as THREE from '../vendor/three/three.module.min.js';
import { box, boxc, rbox, cyl, rod, sphere, blob, torus, cone, octa, plane } from './builder.js';
import { rng } from './materials.js';

let M;
export function setMaterials(m) { M = m; }
const G = () => new THREE.Group();

// ---------------- seating ----------------
export function sofa({ len = 2.4, dep = 0.95, fab = M.fabricCream, pillows = [M.pillowGold, M.velvetNavy], leg = M.gold, back = 0.95 } = {}) {
  const g = G(), hl = len / 2, hd = dep / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, leg, sx * (hl - 0.12), 0, sz * (hd - 0.12), 0.025, 0.018, 0.1, 8);
  rbox(g, fab, 0, 0.27, 0, len, 0.34, dep, 0.05);
  rbox(g, fab, -hl + 0.1, 0.42, 0, 0.2, 0.62, dep, 0.07);
  rbox(g, fab, hl - 0.1, 0.42, 0, 0.2, 0.62, dep, 0.07);
  rbox(g, fab, 0, (0.26 + back) / 2, -hd + 0.12, len - 0.02, back - 0.26, 0.24, 0.07);
  const n = Math.max(1, Math.round((len - 0.4) / 0.78)), cw = (len - 0.4) / n;
  for (let i = 0; i < n; i++) {
    const x = -hl + 0.2 + cw * (i + 0.5);
    rbox(g, fab, x, 0.51, 0.07, cw - 0.02, 0.16, dep - 0.3, 0.06);
    const bc = rbox(g, fab, x, 0.76, -hd + 0.33, cw - 0.04, 0.42, 0.18, 0.07);
    bc.rotation.x = -0.14;
  }
  pillows.forEach((pm, i) => {
    const side = i % 2 ? 1 : -1;
    const p = rbox(g, pm, side * (hl - 0.42 - (i >> 1) * 0.3), 0.76, -hd + 0.47, 0.42, 0.4, 0.12, 0.06);
    p.rotation.z = side * 0.12;
    p.rotation.x = -0.2;
  });
  return g;
}

export function armchair({ fab = M.velvetEmerald, leg = M.gold } = {}) {
  const g = G();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, leg, sx * 0.34, 0, sz * 0.33, 0.022, 0.016, 0.14, 8);
  rbox(g, fab, 0, 0.3, 0, 0.86, 0.32, 0.84, 0.06);
  rbox(g, fab, -0.36, 0.48, 0, 0.16, 0.42, 0.84, 0.07);
  rbox(g, fab, 0.36, 0.48, 0, 0.16, 0.42, 0.84, 0.07);
  rbox(g, fab, 0, 0.68, -0.33, 0.86, 0.72, 0.18, 0.07);
  rbox(g, fab, 0, 0.52, 0.06, 0.56, 0.12, 0.6, 0.05);
  return g;
}

export function diningChair({ fab = M.fabricCream, wood = M.walnut } = {}) {
  const g = G();
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) cyl(g, wood, x, 0, z, 0.022, 0.018, 0.46, 8);
  rbox(g, fab, 0, 0.5, 0, 0.5, 0.1, 0.5, 0.04);
  rbox(g, fab, 0, 0.82, -0.23, 0.48, 0.58, 0.07, 0.035);
  return g;
}

export function barStool({ seat = M.leatherCognac, metal = M.gold } = {}) {
  const g = G();
  cyl(g, seat, 0, 0.72, 0, 0.21, 0.2, 0.08, 20);
  rbox(g, seat, 0, 0.92, -0.17, 0.36, 0.26, 0.05, 0.02);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    rod(g, metal, [Math.cos(a) * 0.19, 0, Math.sin(a) * 0.19], [Math.cos(a) * 0.14, 0.72, Math.sin(a) * 0.14], 0.012, 6);
  }
  torus(g, metal, 0, 0.3, 0, 0.17, 0.008, 24);
  return g;
}

export function officeChair({ mat = M.leatherBlack } = {}) {
  const g = G();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(g, M.chrome, [0, 0.07, 0], [Math.cos(a) * 0.32, 0.05, Math.sin(a) * 0.32], 0.018, 6);
    sphere(g, M.blackMetal, Math.cos(a) * 0.32, 0.03, Math.sin(a) * 0.32, 0.03, 8);
  }
  cyl(g, M.chrome, 0, 0.06, 0, 0.03, 0.03, 0.38, 10);
  rbox(g, mat, 0, 0.5, 0, 0.56, 0.12, 0.54, 0.05);
  const b = rbox(g, mat, 0, 0.98, -0.25, 0.54, 0.86, 0.1, 0.05);
  b.rotation.x = -0.1;
  for (const s of [-1, 1]) {
    rbox(g, mat, s * 0.3, 0.72, 0.0, 0.06, 0.05, 0.36, 0.02);
    rod(g, M.chrome, [s * 0.3, 0.52, 0.05], [s * 0.3, 0.7, 0.05], 0.012, 6);
  }
  return g;
}

export function recliner({ mat = M.leatherBlack } = {}) {
  const g = G();
  rbox(g, mat, 0, 0.24, 0, 0.82, 0.4, 0.9, 0.06);
  rbox(g, mat, 0, 0.5, 0.05, 0.6, 0.14, 0.72, 0.06);
  rbox(g, mat, -0.36, 0.48, 0, 0.18, 0.4, 0.9, 0.06);
  rbox(g, mat, 0.36, 0.48, 0, 0.18, 0.4, 0.9, 0.06);
  const b = rbox(g, mat, 0, 0.88, -0.36, 0.62, 0.8, 0.2, 0.08);
  b.rotation.x = -0.18;
  rbox(g, mat, 0, 1.18, -0.38, 0.4, 0.16, 0.14, 0.05);
  rbox(g, mat, 0, 0.22, 0.52, 0.56, 0.12, 0.22, 0.04);
  for (const s of [-1, 1]) cyl(g, M.chrome, s * 0.36, 0.69, 0.3, 0.04, 0.035, 0.02, 12);
  return g;
}

// ---------------- tables ----------------
export function coffeeTable({ w = 1.4, d = 0.8, top = M.marble, base = M.gold } = {}) {
  const g = G();
  rbox(g, top, 0, 0.41, 0, w, 0.05, d, 0.02);
  box(g, base, -w / 2 + 0.06, 0, -d / 2 + 0.06, w / 2 - 0.06, 0.02, d / 2 - 0.06);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, base, [sx * (w / 2 - 0.08), 0.0, sz * (d / 2 - 0.08)], [sx * (w / 2 - 0.08), 0.39, sz * (d / 2 - 0.08)], 0.015, 6);
  // decor
  stackBooks(g, -w * 0.25, 0.435, 0, 3);
  cyl(g, M.ceramic, w * 0.25, 0.435, 0.05, 0.08, 0.06, 0.18, 16);
  sphere(g, M.flowerWhite, w * 0.25, 0.65, 0.05, 0.08, 10);
  return g;
}

export function roundTable({ r = 0.55, h = 0.75, top = M.marble, base = M.gold } = {}) {
  const g = G();
  cyl(g, top, 0, h - 0.04, 0, r, r, 0.04, 40);
  cyl(g, base, 0, 0, 0, 0.06, 0.06, h - 0.04, 12);
  cyl(g, base, 0, 0, 0, 0.22, 0.26, 0.04, 24);
  return g;
}

export function sideTable({ top = M.marble, base = M.gold } = {}) {
  const g = G();
  cyl(g, top, 0, 0.56, 0, 0.26, 0.26, 0.03, 28);
  cyl(g, base, 0, 0, 0, 0.03, 0.03, 0.56, 10);
  cyl(g, base, 0, 0, 0, 0.18, 0.18, 0.02, 20);
  return g;
}

export function diningTable({ w = 3.2, d = 1.2, top = M.walnut } = {}) {
  const g = G();
  rbox(g, top, 0, 0.755, 0, w, 0.06, d, 0.02);
  for (const s of [-1, 1]) {
    box(g, M.blackMetal, s * (w / 2 - 0.45) - 0.05, 0.0, -d / 2 + 0.12, s * (w / 2 - 0.45) + 0.05, 0.72, d / 2 - 0.12);
    box(g, M.blackMetal, s * (w / 2 - 0.45) - 0.08, 0.0, -d / 2 + 0.1, s * (w / 2 - 0.45) + 0.08, 0.04, d / 2 - 0.1);
  }
  box(g, M.blackMetal, -w / 2 + 0.5, 0.36, -0.04, w / 2 - 0.5, 0.42, 0.04);
  // runner + decor
  box(g, M.linen, -w / 2 + 0.4, 0.786, -0.18, w / 2 - 0.4, 0.79, 0.18);
  for (const x of [-0.9, 0, 0.9]) {
    cyl(g, M.gold, x, 0.79, 0, 0.05, 0.07, 0.02, 12);
    cyl(g, M.gold, x, 0.79, 0, 0.012, 0.012, 0.28, 8);
    cyl(g, M.linen, x, 1.07, 0, 0.018, 0.018, 0.18, 8);
  }
  cyl(g, M.ceramic, 0.45, 0.79, 0, 0.12, 0.08, 0.12, 20);
  for (let i = 0; i < 6; i++) sphere(g, i % 2 ? M.kidsYellow : M.kidsRed, 0.45 + Math.cos(i) * 0.06, 0.92, Math.sin(i) * 0.06, 0.045, 8);
  return g;
}

export function desk({ w = 1.8, d = 0.8, wood = M.walnut, exec = true } = {}) {
  const g = G();
  rbox(g, wood, 0, 0.75, 0, w, 0.05, d, 0.015);
  if (exec) {
    box(g, wood, -w / 2 + 0.02, 0, -d / 2 + 0.03, -w / 2 + 0.5, 0.725, d / 2 - 0.03);
    box(g, wood, w / 2 - 0.5, 0, -d / 2 + 0.03, w / 2 - 0.02, 0.725, d / 2 - 0.03);
    box(g, wood, -w / 2 + 0.5, 0.25, -d / 2 + 0.03, w / 2 - 0.5, 0.725, -d / 2 + 0.06);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const y = 0.12 + k * 0.22;
      box(g, M.gold, s * (w / 2 - 0.26) - 0.06, y, d / 2 - 0.03, s * (w / 2 - 0.26) + 0.06, y + 0.015, d / 2 - 0.01);
      box(g, M.ebony, s * (w / 2 - 0.26) - 0.22, y + 0.09, d / 2 - 0.031, s * (w / 2 - 0.26) + 0.22, y + 0.095, d / 2 - 0.02);
    }
  } else {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, M.gold, sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), 0.02, 0.02, 0.725, 8);
  }
  return g;
}

// ---------------- electronics ----------------
export function tv({ w = 1.65, screen = M.screen } = {}) {
  const g = G();
  const h = w * 0.5625;
  rbox(g, M.blackGloss, 0, h / 2, 0, w, h, 0.045, 0.01);
  plane(g, screen, 0, h / 2, 0.0235, w - 0.03, h - 0.03);
  return g;
}

export function monitor() {
  const g = G();
  box(g, M.blackGloss, -0.14, 0, -0.1, 0.14, 0.01, 0.1);
  box(g, M.blackGloss, -0.02, 0, -0.05, 0.02, 0.22, -0.02);
  const t = tv({ w: 0.66 });
  t.position.set(0, 0.12, 0);
  g.add(t);
  box(g, M.blackGloss, -0.22, 0, 0.18, 0.22, 0.015, 0.32);
  return g;
}

export function laptop() {
  const g = G();
  box(g, M.steel, -0.17, 0, -0.12, 0.17, 0.015, 0.12);
  const lid = G();
  box(lid, M.steel, -0.17, 0, -0.006, 0.17, 0.23, 0.006);
  plane(lid, M.screen, 0, 0.115, 0.0065, 0.31, 0.2);
  lid.position.set(0, 0.015, -0.12);
  lid.rotation.x = -0.25;
  g.add(lid);
  return g;
}

export function mediaConsole({ w = 2.4, d = 0.45, h = 0.5, wood = M.walnut, soundbar = true } = {}) {
  const g = G();
  rbox(g, wood, 0, h / 2 + 0.1, 0, w, h, d, 0.015);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, M.gold, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08), 0.018, 0.014, 0.1, 8);
  const n = 4;
  for (let i = 1; i < n; i++) box(g, M.ebony, -w / 2 + (w * i) / n - 0.004, 0.13, d / 2 - 0.004, -w / 2 + (w * i) / n + 0.004, h + 0.07, d / 2 + 0.002);
  for (let i = 0; i < n; i++) box(g, M.gold, -w / 2 + (w * (i + 0.5)) / n - 0.08, h * 0.75 + 0.1, d / 2, -w / 2 + (w * (i + 0.5)) / n + 0.08, h * 0.75 + 0.115, d / 2 + 0.015);
  // soundbar & decor
  if (soundbar) rbox(g, M.blackMetal, 0, h + 0.14, 0.02, 1.0, 0.07, 0.1, 0.02);
  stackBooks(g, -w / 2 + 0.35, h + 0.1, 0, 3);
  cyl(g, M.ceramic, w / 2 - 0.3, h + 0.1, 0, 0.07, 0.1, 0.3, 16);
  return g;
}

// ---------------- lighting ----------------
export function tableLamp({ base = M.ceramic } = {}) {
  const g = G();
  cyl(g, base, 0, 0, 0, 0.08, 0.1, 0.05, 16);
  sphere(g, base, 0, 0.2, 0, 0.12, 16);
  cyl(g, M.gold, 0, 0.3, 0, 0.012, 0.012, 0.14, 8);
  cyl(g, M.lampShade, 0, 0.4, 0, 0.13, 0.18, 0.24, 24);
  return g;
}

export function floorLamp() {
  const g = G();
  cyl(g, M.blackMetal, 0, 0, 0, 0.17, 0.17, 0.03, 20);
  cyl(g, M.gold, 0, 0.03, 0, 0.015, 0.015, 1.45, 8);
  cyl(g, M.lampShade, 0, 1.38, 0, 0.18, 0.24, 0.3, 24);
  return g;
}

// hangs down from y = 0 (ceiling point)
export function chandelier({ r = 0.6, tiers = 2, drop = 0.7, crystals = true } = {}) {
  const g = G();
  cyl(g, M.gold, 0, -0.04, 0, 0.12, 0.12, 0.04, 20);
  cyl(g, M.gold, 0, -drop, 0, 0.012, 0.012, drop, 6);
  for (let t = 0; t < tiers; t++) {
    const rt = r * (1 - t * 0.42), y = -drop - t * 0.3;
    torus(g, M.gold, 0, y, 0, rt, 0.016, 40);
    const n = Math.max(6, Math.round(rt * 16));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * rt, z = Math.sin(a) * rt;
      cyl(g, M.linen, x, y, z, 0.014, 0.014, 0.1, 6);
      sphere(g, M.bulb, x, y + 0.13, z, 0.028, 8);
      if (crystals) {
        octa(g, M.crystal, x, y - 0.08, z, 0.035);
        octa(g, M.crystal, x * 0.85, y - 0.16 - (i % 2) * 0.06, z * 0.85, 0.03);
      }
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      rod(g, M.gold, [0, y + 0.1, 0], [Math.cos(a) * rt, y, Math.sin(a) * rt], 0.01, 6);
    }
  }
  if (crystals) for (let i = 0; i < 10; i++) octa(g, M.crystal, 0, -drop - tiers * 0.3 - i * 0.05, 0, 0.03 - i * 0.001);
  return g;
}

export function ringChandelier({ r = 0.75 } = {}) {
  const g = G();
  for (const a of [0, 2.1, 4.2]) rod(g, M.gold, [0, 0, 0], [Math.cos(a) * r, -0.7, Math.sin(a) * r], 0.005, 4);
  torus(g, M.gold, 0, -0.7, 0, r, 0.03, 48);
  torus(g, M.ledStrip, 0, -0.73, 0, r, 0.018, 48);
  torus(g, M.gold, 0, -0.9, 0, r * 0.62, 0.025, 40);
  torus(g, M.ledStrip, 0, -0.925, 0, r * 0.62, 0.015, 40);
  for (const a of [0, 2.1, 4.2]) rod(g, M.gold, [Math.cos(a) * r, -0.7, Math.sin(a) * r], [Math.cos(a) * r * 0.62, -0.9, Math.sin(a) * r * 0.62], 0.004, 4);
  return g;
}

export function pendant({ drop = 1.0, r = 0.13 } = {}) {
  const g = G();
  cyl(g, M.gold, 0, -0.03, 0, 0.05, 0.05, 0.03, 12);
  cyl(g, M.blackMetal, 0, -drop, 0, 0.004, 0.004, drop, 4);
  sphere(g, M.crystal, 0, -drop - r, 0, r, 20);
  sphere(g, M.bulb, 0, -drop - r, 0, r * 0.35, 10);
  cyl(g, M.gold, 0, -drop - 0.02, 0, 0.04, 0.04, 0.04, 12);
  return g;
}

export function sconce() {
  const g = G();
  box(g, M.gold, -0.05, -0.1, 0, 0.05, 0.1, 0.02);
  rod(g, M.gold, [0, 0, 0.01], [0, 0.05, 0.13], 0.01, 6);
  cyl(g, M.lampShade, 0, 0.04, 0.14, 0.06, 0.08, 0.14, 16);
  return g;
}

export function downlight(parent, x, y, z) {
  cyl(parent, M.bulb, x, y - 0.012, z, 0.07, 0.07, 0.012, 16);
  cyl(parent, M.chrome, x, y - 0.006, z, 0.09, 0.09, 0.006, 16);
}

// ---------------- bedroom ----------------
export function bed({ w = 2.0, len = 2.15, frame = M.velvetNavy, sheet = M.linen, duvet = M.duvetGray, throwM = M.pillowGold, headH = 1.4, tufted = true, kids = false } = {}) {
  const g = G(), hl = len / 2, hw = w / 2;
  rbox(g, frame, 0, 0.24, 0, w + 0.1, 0.32, len + 0.06, 0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, M.gold, sx * (hw - 0.05), 0, sz * (hl - 0.05), 0.025, 0.02, 0.08, 8);
  rbox(g, sheet, 0, 0.53, -0.02, w - 0.04, 0.26, len - 0.1, 0.08);
  rbox(g, duvet, 0, 0.56, 0.17, w + 0.06, 0.28, len * 0.7, 0.07);
  rbox(g, throwM, 0, 0.71, hl - 0.38, w + 0.1, 0.04, 0.42, 0.02);
  // headboard
  rbox(g, frame, 0, 0.2 + headH / 2, -hl - 0.05, w + 0.3, headH, 0.14, 0.06);
  if (tufted) {
    for (let i = -3; i <= 3; i++) for (let j = 0; j < 3; j++) sphere(g, M.gold, (i * (w + 0.1)) / 7, 0.65 + j * (headH - 0.55) / 3, -hl + 0.025, 0.012, 6);
  }
  // pillows
  const pw = w > 1.6 ? 0.68 : 0.62;
  const np = w > 1.6 ? 2 : 1;
  for (let i = 0; i < np; i++) {
    const x = np === 1 ? 0 : (i - 0.5) * (w * 0.5);
    const p = rbox(g, sheet, x, 0.78, -hl + 0.3, pw, 0.17, 0.42, 0.07);
    p.rotation.x = -0.45;
    const p2 = rbox(g, kids ? M.kidsYellow : M.velvetBlush, x, 0.76, -hl + 0.52, pw * 0.75, 0.15, 0.36, 0.07);
    p2.rotation.x = -0.4;
  }
  if (w > 1.6) {
    const c = rbox(g, throwM, 0, 0.75, -hl + 0.66, 0.42, 0.32, 0.12, 0.05);
    c.rotation.x = -0.3;
  }
  return g;
}

export function bunkBed() {
  const g = G();
  const w = 1.0, len = 2.05;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, M.whiteLacquer, sx * (w / 2) - 0.04, 0, sz * (len / 2) - 0.04, sx * (w / 2) + 0.04, 1.85, sz * (len / 2) + 0.04);
  for (const y of [0.25, 1.25]) {
    box(g, M.whiteLacquer, -w / 2, y, -len / 2, w / 2, y + 0.08, len / 2);
    rbox(g, M.linen, 0, y + 0.17, 0, w - 0.06, 0.18, len - 0.06, 0.05);
    rbox(g, y < 1 ? M.kidsBlue : M.kidsRed, 0, y + 0.2, 0.2, w + 0.02, 0.16, len * 0.65, 0.05);
    const p = rbox(g, M.linen, 0, y + 0.33, -len / 2 + 0.25, 0.55, 0.12, 0.35, 0.05);
    p.rotation.x = -0.4;
  }
  // rail upper
  box(g, M.whiteLacquer, w / 2 - 0.03, 1.5, -len / 2, w / 2 + 0.03, 1.58, len / 2 - 0.6);
  for (let i = 0; i < 6; i++) box(g, M.kidsYellow, w / 2 + 0.03, 0.25 + i * 0.27, len / 2 - 0.5, w / 2 + 0.07, 0.29 + i * 0.27, len / 2 - 0.1);
  box(g, M.kidsYellow, w / 2 + 0.03, 0, len / 2 - 0.52, w / 2 + 0.07, 1.85, len / 2 - 0.48);
  box(g, M.kidsYellow, w / 2 + 0.03, 0, len / 2 - 0.12, w / 2 + 0.07, 1.85, len / 2 - 0.08);
  return g;
}

export function nightstand({ wood = M.walnut } = {}) {
  const g = G();
  rbox(g, wood, 0, 0.3, 0, 0.58, 0.5, 0.45, 0.015);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, M.gold, sx * 0.24, 0, sz * 0.18, 0.015, 0.012, 0.06, 6);
  box(g, M.ebony, -0.27, 0.32, 0.225, 0.27, 0.33, 0.228);
  box(g, M.gold, -0.08, 0.42, 0.225, 0.08, 0.435, 0.24);
  box(g, M.gold, -0.08, 0.2, 0.225, 0.08, 0.215, 0.24);
  const l = tableLamp();
  l.position.set(0.05, 0.55, -0.02);
  l.scale.setScalar(0.9);
  g.add(l);
  return g;
}

export function wardrobe({ w = 2.4, h = 2.5, d = 0.62, mat = M.whiteLacquer } = {}) {
  const g = G();
  box(g, mat, -w / 2, 0, -d / 2, w / 2, h, d / 2);
  const n = Math.max(2, Math.round(w / 0.6));
  for (let i = 1; i < n; i++) box(g, M.ebony, -w / 2 + (w * i) / n - 0.004, 0.08, d / 2, -w / 2 + (w * i) / n + 0.004, h - 0.05, d / 2 + 0.003);
  box(g, M.ebony, -w / 2, 0.06, d / 2, w / 2, 0.075, d / 2 + 0.003);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w * (i + (i % 2 ? 0.12 : 0.88))) / n;
    box(g, M.gold, x - 0.01, h * 0.4, d / 2, x + 0.01, h * 0.62, d / 2 + 0.03);
  }
  return g;
}

export function dresser({ w = 1.6, wood = M.walnut } = {}) {
  const g = G();
  rbox(g, wood, 0, 0.47, 0, w, 0.82, 0.5, 0.015);
  for (let k = 0; k < 3; k++) {
    const y = 0.15 + k * 0.27;
    box(g, M.ebony, -w / 2 + 0.03, y + 0.24, 0.25, w / 2 - 0.03, y + 0.25, 0.253);
    for (const s of [-1, 1]) box(g, M.gold, s * w * 0.25 - 0.07, y + 0.12, 0.25, s * w * 0.25 + 0.07, y + 0.135, 0.265);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, M.gold, sx * (w / 2 - 0.05), 0, sz * 0.2, 0.015, 0.012, 0.06, 6);
  return g;
}

export function bench({ w = 1.5, fab = M.velvetBlush } = {}) {
  const g = G();
  rbox(g, fab, 0, 0.42, 0, w, 0.14, 0.45, 0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, M.gold, sx * (w / 2 - 0.08), 0, sz * 0.15, 0.018, 0.014, 0.36, 8);
  return g;
}

// ---------------- decor ----------------
export function painting({ w = 1.2, h = 0.9, art = M.art0, frame = M.gold } = {}) {
  const g = G();
  box(g, frame, -w / 2, -h / 2, 0, w / 2, h / 2, 0.045);
  plane(g, art, 0, 0, 0.047, w - 0.1, h - 0.1);
  return g;
}

export function mirror({ w = 1.0, h = 1.4, frame = M.gold, round = false } = {}) {
  const g = G();
  if (round) {
    const r = w / 2;
    const m = cyl(g, frame, 0, -0.02, 0, r, r, 0.04, 40);
    m.rotation.x = Math.PI / 2;
    m.position.set(0, 0, 0.02);
    const m2 = cyl(g, M.mirror, 0, -0.01, 0, r - 0.05, r - 0.05, 0.02, 40);
    m2.rotation.x = Math.PI / 2;
    m2.position.set(0, 0, 0.045);
  } else {
    box(g, frame, -w / 2, -h / 2, 0, w / 2, h / 2, 0.035);
    box(g, M.mirror, -w / 2 + 0.05, -h / 2 + 0.05, 0.035, w / 2 - 0.05, h / 2 - 0.05, 0.04);
  }
  return g;
}

export function plant({ s = 1, pot = M.ceramic, tall = false } = {}) {
  const g = G();
  const r = rng(Math.floor(s * 1000) + (tall ? 7 : 3));
  cyl(g, pot, 0, 0, 0, 0.2 * s, 0.15 * s, 0.38 * s, 20);
  cyl(g, M.soil, 0, 0.36 * s, 0, 0.18 * s, 0.18 * s, 0.02, 16);
  if (tall) {
    rod(g, M.trunkIn || M.walnut, [0, 0.36 * s, 0], [0.02, 1.3 * s, 0.01], 0.02 * s, 6);
    for (let i = 0; i < 9; i++) {
      const y = (0.95 + r() * 0.85) * s;
      const a = r() * Math.PI * 2, d = (0.1 + r() * 0.22) * s;
      blob(g, i % 2 ? M.leaf : M.leaf2, Math.cos(a) * d, y, Math.sin(a) * d, 0.2 * s, 0.14 * s, 0.2 * s);
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r();
      const d = 0.16 * s;
      const lf = blob(g, i % 2 ? M.leaf : M.leaf2, Math.cos(a) * d, (0.62 + r() * 0.3) * s, Math.sin(a) * d, 0.09 * s, 0.32 * s, 0.05 * s);
      lf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
    }
  }
  return g;
}

export function vaseFlowers({ s = 1 } = {}) {
  const g = G();
  cyl(g, M.ceramic, 0, 0, 0, 0.11 * s, 0.08 * s, 0.32 * s, 20);
  const r = rng(77);
  for (let i = 0; i < 30; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.19 * s;
    sphere(g, i % 3 ? M.flowerWhite : M.flowerPink, Math.cos(a) * d, (0.42 + r() * 0.22 - d * 0.6) * s, Math.sin(a) * d, (0.032 + r() * 0.022) * s, 8);
  }
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2;
    blob(g, M.leaf, Math.cos(a) * 0.2 * s, 0.4 * s, Math.sin(a) * 0.2 * s, 0.08 * s, 0.03 * s, 0.05 * s);
  }
  return g;
}

export function stackBooks(g, x, y, z, n = 3) {
  const cols = [M.book0, M.book1, M.book2, M.book3, M.book4];
  let yy = y;
  for (let i = 0; i < n; i++) {
    const h = 0.03 + (i % 2) * 0.01;
    const b = boxc(g, cols[i % cols.length], x, yy + h / 2, z, 0.3 - i * 0.03, h, 0.22 - i * 0.02);
    b.rotation.y = (i - 1) * 0.15;
    yy += h;
  }
}

export function rug(g, x, z, y, w, d, mat, round = false) {
  if (round) cyl(g, mat, x, y, z, w / 2, w / 2, 0.012, 48);
  else box(g, mat, x - w / 2, y, z - d / 2, x + w / 2, y + 0.012, z + d / 2);
}

export function bookshelf({ w = 2.0, h = 2.6, d = 0.38, wood = M.walnut, seed = 1 } = {}) {
  const g = G();
  const r = rng(seed);
  const books = [M.book0, M.book1, M.book2, M.book3, M.book4, M.book5, M.book6, M.book7];
  box(g, wood, -w / 2, 0, -d / 2, w / 2, h, -d / 2 + 0.02);
  box(g, wood, -w / 2, 0, -d / 2, -w / 2 + 0.03, h, d / 2);
  box(g, wood, w / 2 - 0.03, 0, -d / 2, w / 2, h, d / 2);
  const cols = Math.max(1, Math.round(w / 0.9));
  for (let c = 1; c < cols; c++) box(g, wood, -w / 2 + (w * c) / cols - 0.015, 0, -d / 2, -w / 2 + (w * c) / cols + 0.015, h, d / 2);
  const shelves = Math.round(h / 0.4);
  for (let s = 0; s <= shelves; s++) {
    const y = (h * s) / shelves;
    box(g, wood, -w / 2, Math.max(0, y - 0.025), -d / 2, w / 2, Math.max(0.025, y), d / 2);
    if (s === shelves) break;
    for (let c = 0; c < cols; c++) {
      let x = -w / 2 + (w * c) / cols + 0.03;
      const xEnd = -w / 2 + (w * (c + 1)) / cols - 0.03;
      while (x < xEnd - 0.06) {
        if (r() < 0.08) {
          // decor object
          const o = r() < 0.5 ? sphere(g, M.gold, x + 0.08, y + 0.08, 0, 0.07, 10) : cyl(g, M.ceramic, x + 0.07, y, 0, 0.05, 0.07, 0.2, 12);
          x += 0.2;
          continue;
        }
        const bw = 0.022 + r() * 0.035, bh = 0.2 + r() * 0.12, bd = 0.2 + r() * 0.08;
        if (x + bw > xEnd) break;
        boxc(g, books[(r() * books.length) | 0], x + bw / 2, y + bh / 2, -d / 2 + 0.03 + bd / 2, bw, bh, bd);
        x += bw + 0.002;
        if (r() < 0.04) x += 0.12;
      }
    }
  }
  return g;
}

export function curtains(parent, axis, c, a0, a1, yTop, yBot, side, mat) {
  // side: offset sign from wall plane where curtains hang
  const off = side * 0.14;
  const panel = (u0) => {
    for (let i = 0; i < 5; i++) {
      const u = u0 + i * 0.085;
      axis === 'x' ? cyl(parent, mat, u, yBot, c + off + (i % 2) * 0.03 * side, 0.055, 0.06, yTop - yBot, 10) : cyl(parent, mat, c + off + (i % 2) * 0.03 * side, yBot, u, 0.055, 0.06, yTop - yBot, 10);
    }
  };
  panel(a0 - 0.45);
  panel(a1 + 0.08);
  if (axis === 'x') rod(parent, M.gold, [a0 - 0.6, yTop + 0.05, c + off], [a1 + 0.6, yTop + 0.05, c + off], 0.018, 8);
  else rod(parent, M.gold, [c + off, yTop + 0.05, a0 - 0.6], [c + off, yTop + 0.05, a1 + 0.6], 0.018, 8);
}

// ---------------- living ----------------
export function fireplace({ w = 2.4, hFull = 3.18 } = {}) {
  const g = G();
  // chimney breast (stone)
  box(g, M.stone, -w / 2, 0, -0.38, w / 2, hFull, 0);
  // marble surround
  box(g, M.marble, -1.0, 0, 0, 1.0, 1.15, 0.12);
  box(g, M.blackGloss, -0.6, 0.12, 0.0, 0.6, 0.8, 0.125);
  box(g, M.walnut, -1.15, 1.15, -0.05, 1.15, 1.23, 0.26);
  // hearth
  box(g, M.marbleDark, -1.2, 0, 0, 1.2, 0.06, 0.6);
  // fire & logs
  for (let i = 0; i < 3; i++) {
    rod(g, M.walnut, [-0.35 + i * 0.05, 0.2 + (i === 2 ? 0.08 : 0), 0.06 + i * 0.03], [0.35 - i * 0.05, 0.2 + (i === 2 ? 0.08 : 0), 0.06 + (2 - i) * 0.03], 0.05, 8);
  }
  for (let i = 0; i < 5; i++) cone(g, M.fire, -0.3 + i * 0.15, 0.22, 0.09, 0.08 + (i % 2) * 0.02, 0.28 + (i % 3) * 0.1, 8);
  return g;
}

export function grandPiano() {
  const g = G();
  const shape = new THREE.Shape();
  // spine at x = 0, keyboard end at y = 0, tail at y = 1.75
  shape.moveTo(0, 0);
  shape.lineTo(1.45, 0);
  shape.lineTo(1.45, 0.45);
  shape.bezierCurveTo(1.45, 0.95, 0.75, 0.95, 0.65, 1.35);
  shape.bezierCurveTo(0.6, 1.65, 0.45, 1.8, 0.2, 1.8);
  shape.lineTo(0, 1.8);
  shape.lineTo(0, 0);
  const body = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 18 });
  const lidG = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 18 });
  // rotation.x = -PI/2 maps shape y -> -z and extrusion -> +y
  const holder = G();
  const bodyMesh = new THREE.Mesh(body, M.blackGloss);
  bodyMesh.rotation.x = -Math.PI / 2; // shape y -> -z, extrude z -> +y
  holder.add(bodyMesh);
  holder.position.set(-0.72, 0.62, 0);
  g.add(holder);
  // lid (opened around the spine)
  const lidHolder = G();
  const lid = new THREE.Mesh(lidG, M.blackGloss);
  lid.rotation.x = -Math.PI / 2;
  lidHolder.add(lid);
  lidHolder.position.set(-0.72, 0.93, 0);
  lidHolder.rotation.z = 0.62;
  g.add(lidHolder);
  rod(g, M.blackGloss, [0.2, 0.92, -0.8], [0.45, 1.6, -0.82], 0.012, 6);
  // legs
  for (const [x, z] of [[-0.6, -0.12], [0.62, -0.12], [-0.6, -1.6]]) cyl(g, M.blackGloss, x, 0, z, 0.06, 0.05, 0.62, 12);
  // keyboard
  box(g, M.blackGloss, -0.72, 0.6, 0, 0.73, 0.76, 0.3);
  box(g, M.ceramic, -0.66, 0.76, 0.02, 0.67, 0.79, 0.26);
  for (let i = 0; i < 36; i++) {
    if ([2, 6, 9, 13, 16, 20, 23, 27, 30, 34].includes(i)) continue;
    const x = -0.64 + i * 0.037;
    box(g, M.blackGloss, x, 0.79, 0.02, x + 0.018, 0.805, 0.15);
  }
  box(g, M.blackGloss, -0.72, 0.79, 0.0, 0.73, 0.92, 0.03);
  // bench
  rbox(g, M.leatherBlack, 0, 0.5, 0.75, 0.8, 0.06, 0.36, 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, M.blackGloss, sx * 0.34, 0, 0.75 + sz * 0.13, 0.025, 0.025, 0.47, 8);
  return g;
}

// ---------------- kitchen ----------------
export function stool() { return barStool(); }

export function fridge() {
  const g = G();
  box(g, M.steel, -0.47, 0, -0.36, 0.47, 2.12, 0.36);
  box(g, M.blackMetal, -0.004, 0.75, 0.36, 0.004, 2.1, 0.366);
  box(g, M.blackMetal, -0.47, 0.74, 0.36, 0.47, 0.75, 0.366);
  for (const s of [-1, 1]) rod(g, M.chrome, [s * 0.06, 1.0, 0.41], [s * 0.06, 1.8, 0.41], 0.012, 8);
  rod(g, M.chrome, [-0.3, 0.62, 0.41], [0.3, 0.62, 0.41], 0.012, 8);
  box(g, M.blackGloss, -0.36, 1.35, 0.366, -0.16, 1.6, 0.372);
  return g;
}

export function rangeHood({ w = 0.95, top = 2.4 } = {}) {
  const g = G();
  // trapezoid hood approximated with stacked boxes
  box(g, M.steel, -w / 2, 0, -0.5, w / 2, 0.08, 0.02);
  box(g, M.steel, -w / 2 + 0.08, 0.08, -0.45, w / 2 - 0.08, 0.32, -0.05);
  box(g, M.steel, -0.17, 0.32, -0.42, 0.17, top, -0.1);
  return g;
}

export function islandKitchen({ w = 3.2, d = 1.25 } = {}) {
  const g = G();
  box(g, M.navyLacquer, -w / 2 + 0.06, 0.06, -d / 2 + 0.05, w / 2 - 0.06, 0.9, d / 2 - 0.3);
  box(g, M.blackMetal, -w / 2 + 0.1, 0, -d / 2 + 0.1, w / 2 - 0.1, 0.06, d / 2 - 0.35);
  // panel grooves + handles on work side (-z)
  const n = 5;
  for (let i = 1; i < n; i++) box(g, M.blackGloss, -w / 2 + (w * i) / n - 0.004, 0.07, -d / 2 + 0.045, -w / 2 + (w * i) / n + 0.004, 0.88, -d / 2 + 0.05);
  for (let i = 0; i < n; i++) box(g, M.gold, -w / 2 + (w * (i + 0.5)) / n - 0.12, 0.8, -d / 2 + 0.03, -w / 2 + (w * (i + 0.5)) / n + 0.12, 0.815, -d / 2 + 0.05);
  // waterfall marble top
  box(g, M.marble, -w / 2, 0.9, -d / 2, w / 2, 0.96, d / 2);
  box(g, M.marble, -w / 2, 0, -d / 2, -w / 2 + 0.06, 0.9, d / 2);
  box(g, M.marble, w / 2 - 0.06, 0, -d / 2, w / 2, 0.9, d / 2);
  // prep sink
  box(g, M.blackGloss, -0.25, 0.955, -d / 2 + 0.15, 0.25, 0.962, -d / 2 + 0.5);
  rod(g, M.gold, [0, 0.96, -d / 2 + 0.1], [0, 1.3, -d / 2 + 0.1], 0.015, 8);
  rod(g, M.gold, [0, 1.3, -d / 2 + 0.1], [0, 1.3, -d / 2 + 0.3], 0.015, 8);
  // fruit bowl
  cyl(g, M.ceramic, 0.8, 0.96, 0.05, 0.2, 0.12, 0.09, 20);
  for (let i = 0; i < 7; i++) sphere(g, [M.kidsRed, M.kidsYellow, M.kidsGreen][i % 3], 0.8 + Math.cos(i * 1.7) * 0.09, 1.07, 0.05 + Math.sin(i * 1.7) * 0.09, 0.05, 10);
  vaseFlowersInto(g, -0.9, 0.96, 0.1, 0.7);
  return g;
}

function vaseFlowersInto(g, x, y, z, s) {
  const v = vaseFlowers({ s });
  v.position.set(x, y, z);
  g.add(v);
}

// counter run along local +x, back at -z, depth 0.65
export function counterRun(g, x0, x1, { upper = true, top = M.marble, cab = M.whiteLacquer, y0 = 0 } = {}) {
  const d = 0.65;
  box(g, M.blackMetal, x0, y0, -d / 2 + 0.06, x1, y0 + 0.1, d / 2 - 0.06);
  box(g, cab, x0, y0 + 0.1, -d / 2, x1, y0 + 0.88, d / 2 - 0.02);
  box(g, top, x0 - 0.01, y0 + 0.88, -d / 2, x1 + 0.01, y0 + 0.92, d / 2 + 0.02);
  const n = Math.max(1, Math.round((x1 - x0) / 0.6));
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    box(g, M.ebony, x - 0.003, y0 + 0.12, d / 2 - 0.02, x + 0.003, y0 + 0.86, d / 2 - 0.015);
  }
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n;
    box(g, M.gold, x - 0.1, y0 + 0.78, d / 2 - 0.02, x + 0.1, y0 + 0.795, d / 2 + 0.005);
  }
  // backsplash
  box(g, top, x0, y0 + 0.92, -d / 2, x1, y0 + 1.5, -d / 2 + 0.02);
  if (upper) {
    box(g, cab, x0, y0 + 1.5, -d / 2, x1, y0 + 2.35, -d / 2 + 0.38);
    for (let i = 1; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      box(g, M.ebony, x - 0.003, y0 + 1.52, -d / 2 + 0.38, x + 0.003, y0 + 2.33, -d / 2 + 0.385);
    }
    for (let i = 0; i < n; i++) {
      const x = x0 + ((x1 - x0) * (i + 0.5)) / n;
      box(g, M.gold, x - 0.006, y0 + 1.55, -d / 2 + 0.38, x + 0.006, y0 + 1.72, -d / 2 + 0.4);
    }
    box(g, M.ledStrip, x0, y0 + 1.48, -d / 2 + 0.3, x1, y0 + 1.5, -d / 2 + 0.34);
  }
}

// ---------------- bathroom ----------------
export function bathtub() {
  const g = G();
  rbox(g, M.ceramic, 0, 0.31, 0, 1.75, 0.62, 0.84, 0.2);
  rbox(g, M.marbleTileIn || M.tileBath, 0, 0.6, 0, 1.5, 0.04, 0.62, 0.015);
  rbox(g, M.waterPool, 0, 0.605, 0, 1.48, 0.04, 0.6, 0.015);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) sphere(g, M.gold, sx * 0.7, 0.03, sz * 0.3, 0.05, 8);
  // floor mounted faucet
  rod(g, M.gold, [0.95, 0, 0], [0.95, 0.95, 0], 0.02, 8);
  rod(g, M.gold, [0.95, 0.95, 0], [0.78, 0.95, 0], 0.018, 8);
  rod(g, M.gold, [0.78, 0.95, 0], [0.78, 0.85, 0], 0.016, 8);
  return g;
}

export function toilet() {
  const g = G();
  const b = cyl(g, M.ceramic, 0, 0, 0.05, 0.2, 0.16, 0.4, 20);
  b.scale.set(1, 0.4, 1.3);
  cyl(g, M.ceramic, 0, 0.38, 0.06, 0.21, 0.21, 0.04, 24).scale.set(1, 0.04, 1.35);
  rbox(g, M.ceramic, 0, 0.6, -0.27, 0.42, 0.42, 0.18, 0.04);
  box(g, M.chrome, -0.04, 0.82, -0.25, 0.04, 0.83, -0.2);
  return g;
}

export function vanity({ w = 1.9, double = true } = {}) {
  const g = G();
  box(g, M.walnut, -w / 2, 0.2, -0.28, w / 2, 0.85, 0.28);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, M.gold, sx * (w / 2 - 0.05), 0, sz * 0.22, 0.02, 0.02, 0.2, 8);
  box(g, M.marble, -w / 2 - 0.02, 0.85, -0.29, w / 2 + 0.02, 0.89, 0.3);
  const xs = double ? [-w / 4, w / 4] : [0];
  for (const x of xs) {
    cyl(g, M.ceramic, x, 0.89, 0.03, 0.2, 0.16, 0.13, 28);
    cyl(g, M.blackGloss, x, 1.015, 0.03, 0.17, 0.17, 0.005, 24);
    rod(g, M.gold, [x, 0.89, -0.2], [x, 1.2, -0.2], 0.014, 8);
    rod(g, M.gold, [x, 1.2, -0.2], [x, 1.2, -0.05], 0.012, 8);
    box(g, M.ebony, x - 0.25, 0.5, 0.28, x + 0.25, 0.505, 0.284);
    box(g, M.gold, x - 0.07, 0.65, 0.28, x + 0.07, 0.665, 0.295);
  }
  return g;
}

export function towelRack() {
  const g = G();
  rod(g, M.gold, [-0.35, 1.1, 0.06], [0.35, 1.1, 0.06], 0.012, 8);
  for (const s of [-1, 1]) rod(g, M.gold, [s * 0.35, 1.1, 0], [s * 0.35, 1.1, 0.06], 0.01, 6);
  box(g, M.linen, -0.3, 0.6, 0.04, 0.3, 1.12, 0.09);
  box(g, M.duvetGray, -0.25, 0.75, 0.09, 0.2, 1.12, 0.11);
  return g;
}

// ---------------- gym ----------------
export function treadmill() {
  const g = G();
  rbox(g, M.blackMetal, 0, 0.1, 0, 0.82, 0.18, 1.9, 0.04);
  box(g, M.rubber, -0.3, 0.19, -0.85, 0.3, 0.2, 0.75);
  for (const s of [-1, 1]) {
    rod(g, M.steel, [s * 0.36, 0.18, 0.75], [s * 0.34, 1.25, 0.88], 0.03, 8);
    rod(g, M.steel, [s * 0.34, 1.05, 0.85], [s * 0.34, 1.05, 0.35], 0.02, 8);
  }
  const c = rbox(g, M.blackGloss, 0, 1.3, 0.88, 0.75, 0.3, 0.1, 0.03);
  c.rotation.x = -0.6;
  plane(g, M.screen, 0, 1.31, 0.84, 0.4, 0.2).rotation.x = -0.6 + Math.PI;
  return g;
}

export function exerciseBike() {
  const g = G();
  box(g, M.blackMetal, -0.3, 0, -0.5, 0.3, 0.06, -0.4);
  box(g, M.blackMetal, -0.3, 0, 0.45, 0.3, 0.06, 0.55);
  rod(g, M.blackMetal, [0, 0.06, -0.45], [0, 0.5, 0.05], 0.04, 8);
  rod(g, M.blackMetal, [0, 0.06, 0.5], [0, 0.5, 0.05], 0.04, 8);
  rod(g, M.blackMetal, [0, 0.5, 0.05], [0, 0.95, -0.25], 0.035, 8);
  rbox(g, M.leatherBlack, 0, 0.98, -0.28, 0.2, 0.06, 0.28, 0.03);
  rod(g, M.blackMetal, [0, 0.5, 0.05], [0, 1.1, 0.4], 0.035, 8);
  rod(g, M.chrome, [-0.25, 1.12, 0.42], [0.25, 1.12, 0.42], 0.018, 8);
  const fw = cyl(g, M.kidsRed, 0, -0.04, 0.32, 0.25, 0.25, 0.08, 28);
  fw.rotation.z = Math.PI / 2;
  fw.position.set(0, 0.42, 0.32);
  plane(g, M.screen, 0, 1.2, 0.4, 0.22, 0.13).rotation.x = -0.5;
  return g;
}

export function weightBench() {
  const g = G();
  rbox(g, M.leatherBlack, 0, 0.45, 0, 0.32, 0.08, 1.2, 0.03);
  for (const z of [-0.45, 0.45]) {
    rod(g, M.steel, [0, 0, z], [0, 0.41, z], 0.03, 8);
    rod(g, M.steel, [-0.25, 0.02, z], [0.25, 0.02, z], 0.025, 8);
  }
  // rack + barbell
  for (const s of [-1, 1]) rod(g, M.steel, [s * 0.55, 0, -0.55], [s * 0.55, 1.15, -0.55], 0.03, 8);
  rod(g, M.chrome, [-1.0, 1.08, -0.55], [1.0, 1.08, -0.55], 0.015, 8);
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
    const p = cyl(g, M.blackMetal, 0, 0, 0, 0.22 - k * 0.04, 0.22 - k * 0.04, 0.04, 24);
    p.rotation.z = Math.PI / 2;
    p.position.set(s * (0.75 + k * 0.05), 1.08, -0.55);
  }
  return g;
}

export function dumbbellRack() {
  const g = G();
  for (const s of [-1, 1]) {
    rod(g, M.blackMetal, [s * 0.7, 0, -0.15], [s * 0.7, 0.9, -0.15], 0.025, 8);
    rod(g, M.blackMetal, [s * 0.7, 0, 0.15], [s * 0.7, 0.6, 0.15], 0.025, 8);
  }
  for (const [y, z] of [[0.6, 0.15], [0.9, -0.15]]) {
    box(g, M.blackMetal, -0.72, y - 0.03, z - 0.12, 0.72, y, z + 0.12);
    for (let i = 0; i < 6; i++) {
      const x = -0.6 + i * 0.24;
      const r = 0.045 + i * 0.006;
      for (const e of [-0.08, 0.08]) {
        const d = cyl(g, M.blackGloss, 0, 0, 0, r, r, 0.05, 12);
        d.rotation.x = Math.PI / 2;
        d.position.set(x, y + r, z + e);
      }
      rod(g, M.chrome, [x, y + r, z - 0.06], [x, y + r, z + 0.06], 0.012, 6);
    }
  }
  return g;
}

export function punchingBag() {
  const g = G();
  rod(g, M.chrome, [0, 0, 0], [0, -0.6, 0], 0.006, 4);
  cyl(g, M.kidsRed, 0, -1.6, 0, 0.18, 0.18, 1.0, 20);
  cyl(g, M.leatherBlack, 0, -0.66, 0, 0.17, 0.17, 0.06, 20);
  return g;
}

// ---------------- kids ----------------
export function teepee() {
  const g = G();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(g, M.oakWood, [Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55], [Math.cos(a) * -0.06, 1.65, Math.sin(a) * -0.06], 0.015, 6);
  }
  cone(g, M.linen, 0, 0, 0, 0.53, 1.45, 5);
  rbox(g, M.kidsYellow, 0, 0.06, 0, 0.6, 0.1, 0.6, 0.04);
  return g;
}

export function toyBox() {
  const g = G();
  rbox(g, M.kidsBlue, 0, 0.25, 0, 0.8, 0.5, 0.45, 0.04);
  box(g, M.kidsYellow, -0.4, 0.5, -0.22, 0.4, 0.53, 0.22);
  sphere(g, M.kidsRed, -0.15, 0.62, 0, 0.1, 14);
  boxc(g, M.kidsGreen, 0.18, 0.6, 0.05, 0.14, 0.14, 0.14).rotation.y = 0.5;
  return g;
}

export function beanBag(mat) {
  const g = G();
  const b = sphere(g, mat, 0, 0.3, 0, 0.45, 16);
  b.scale.set(0.45, 0.32, 0.45);
  const b2 = sphere(g, mat, 0, 0.5, -0.22, 0.3, 12);
  b2.scale.set(0.38, 0.3, 0.2);
  return g;
}

export function cubbyShelf() {
  const g = G();
  const cols = [M.kidsBlue, M.kidsYellow, M.kidsRed, M.kidsGreen, M.kidsPurple];
  box(g, M.whiteLacquer, -0.6, 0, -0.18, 0.6, 1.2, 0.18);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const x = -0.4 + i * 0.4, y = 0.05 + j * 0.39;
    box(g, M.paint, x - 0.17, y, -0.15, x + 0.17, y + 0.34, 0.19);
    if ((i + j) % 2 === 0) boxc(g, cols[(i + j * 3) % 5], x, y + 0.14, 0.02, 0.3, 0.28, 0.3);
    else sphere(g, cols[(i * 2 + j) % 5], x, y + 0.11, 0.05, 0.1, 12);
  }
  return g;
}

export function poolTable() {
  const g = G();
  const W = 1.45, L = 2.6;
  rbox(g, M.walnut, 0, 0.75, 0, W, 0.18, L, 0.03);
  box(g, M.feltGreen, -W / 2 + 0.11, 0.84, -L / 2 + 0.11, W / 2 - 0.11, 0.86, L / 2 - 0.11);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]) cyl(g, M.blackGloss, x * (W / 2 - 0.1), 0.85, z * (L / 2 - 0.1), 0.05, 0.05, 0.02, 12);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0]]) cyl(g, M.walnut, x * (W / 2 - 0.15), 0, z * (L / 2 - 0.25), 0.08, 0.06, 0.68, 12);
  const cols = [M.kidsYellow, M.kidsBlue, M.kidsRed, M.kidsPurple, M.carRed, M.kidsGreen, M.blackGloss];
  let k = 0;
  for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) {
    sphere(g, cols[k++ % cols.length], (i - row / 2) * 0.058, 0.889, -0.5 - row * 0.05, 0.029, 10);
  }
  sphere(g, M.ceramic, 0, 0.889, 0.6, 0.029, 10);
  rod(g, M.oakWood, [0.3, 0.875, 0.75], [0.1, 0.875, -0.6], 0.008, 6);
  return g;
}

// ---------------- vehicles ----------------
export function car({ paint = M.carWhite, type = 'sedan' } = {}) {
  const g = G();
  const suv = type === 'suv', sport = type === 'sport';
  const L = suv ? 4.95 : sport ? 4.55 : 5.0;
  const W = suv ? 2.0 : 1.95;
  const bodyH = suv ? 0.95 : sport ? 0.6 : 0.72;
  const y0 = suv ? 0.38 : 0.28;
  rbox(g, paint, 0, y0 + bodyH / 2, 0, W, bodyH, L, 0.2);
  // cabin: tinted glasshouse (side profile extruded across the width) + painted roof & pillars
  const cl = suv ? L * 0.62 : sport ? L * 0.44 : L * 0.5;
  const ch = suv ? 0.72 : sport ? 0.42 : 0.55;
  const cz = suv ? -0.2 : sport ? -0.3 : -0.2;
  const fs = suv ? 0.28 : sport ? 0.62 : 0.5, rs = suv ? 0.12 : sport ? 0.45 : 0.4;
  const cw = W - 0.26;
  const prof = new THREE.Shape();
  prof.moveTo(-cl / 2, 0);
  prof.lineTo(cl / 2, 0);
  prof.lineTo(cl / 2 - fs, ch);
  prof.lineTo(-cl / 2 + rs, ch);
  prof.closePath();
  const cab = new THREE.ExtrudeGeometry(prof, { depth: cw, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  cab.rotateY(-Math.PI / 2);
  cab.translate(cw / 2, 0, 0);
  const cabin = new THREE.Mesh(cab, M.carGlass);
  cabin.position.set(0, y0 + bodyH - 0.04, cz);
  g.add(cabin);
  const roofY = y0 + bodyH - 0.04 + ch;
  box(g, paint, -cw / 2 - 0.035, roofY, cz - cl / 2 + rs - 0.02, cw / 2 + 0.035, roofY + 0.05, cz + cl / 2 - fs + 0.02);
  for (const s of [-1, 1]) {
    const x0 = s * (cw / 2 + 0.035), x1 = s * (cw / 2 + 0.005);
    box(g, paint, Math.min(x0, x1), y0 + bodyH - 0.04, cz - 0.07, Math.max(x0, x1), roofY, cz + 0.07);
    box(g, paint, Math.min(x0, x1), y0 + bodyH - 0.04, cz - cl / 2 - 0.03, Math.max(x0, x1), y0 + bodyH + 0.06, cz + cl / 2 + 0.03);
  }
  // wheels
  const wr = suv ? 0.42 : 0.36;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = cyl(g, M.rubber, 0, -0.14, 0, wr, wr, 0.28, 24);
    w.rotation.z = Math.PI / 2;
    w.position.set(sx * (W / 2 - 0.1), wr, sz * (L / 2 - (sport ? 0.85 : 0.95)));
    const r = cyl(g, M.chrome, 0, -0.01, 0, wr * 0.62, wr * 0.62, 0.02, 20);
    r.rotation.z = Math.PI / 2;
    r.position.set(sx * (W / 2 + 0.045), wr, sz * (L / 2 - (sport ? 0.85 : 0.95)));
  }
  // lights / grille
  for (const s of [-1, 1]) {
    box(g, M.headlight, s * (W / 2 - 0.42) - 0.24, y0 + bodyH * 0.62, L / 2 - 0.08, s * (W / 2 - 0.42) + 0.24, y0 + bodyH * 0.62 + 0.08, L / 2 + 0.01);
    box(g, M.taillight, s * (W / 2 - 0.38) - 0.26, y0 + bodyH * 0.7, -L / 2 - 0.01, s * (W / 2 - 0.38) + 0.26, y0 + bodyH * 0.7 + 0.07, -L / 2 + 0.08);
    rbox(g, paint, s * (W / 2 + 0.08), y0 + bodyH + 0.08, L * 0.12, 0.12, 0.1, 0.18, 0.03);
  }
  box(g, M.blackGloss, -0.4, y0 + 0.12, L / 2 - 0.06, 0.4, y0 + bodyH * 0.5, L / 2 + 0.005);
  box(g, M.chrome, -0.42, y0 + bodyH * 0.5, L / 2 - 0.05, 0.42, y0 + bodyH * 0.5 + 0.02, L / 2 + 0.008);
  return g;
}
