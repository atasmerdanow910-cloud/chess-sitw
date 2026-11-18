// Landscape: lawn, driveway, street, pool & terrace, trees, fence, fountain, flag
import * as THREE from '../vendor/three/three.module.min.js';
import { F0, root, box, boxc, cyl, rod, sphere, blob, cone, place, addSurface, addHole, addCollider } from './builder.js';
import * as F from './furniture.js';
import { rng } from './materials.js';

const PI = Math.PI, H = PI / 2;
let M;

function outMat(name, p) {
  const m = new THREE.MeshStandardMaterial(p);
  m.name = name;
  M[name] = m;
  return m;
}

export function buildExterior(materials, scene) {
  M = materials;
  ground();
  frontYard();
  backYard();
  street();
  trees();
  fence();
  return { flag: flag(scene) };
}

function ground() {
  // grass with a hole where the pool basin is
  const g = M.grass, y0 = -0.1, y1 = 0;
  box(root, g, -140, y0, -14.4, 140, y1, 140);
  box(root, g, -140, y0, -140, 140, y1, -22.1);
  box(root, g, -140, y0, -22.1, -5.1, y1, -14.4);
  box(root, g, 5.1, y0, -22.1, 140, y1, -14.4);
}

function frontYard() {
  // walkway, path to driveway, driveway
  box(root, M.pavers, -1.25, 0, 11.85, 1.25, 0.025, 22.0);
  box(root, M.pavers, 1.25, 0, 13.6, 12.6, 0.025, 14.8);
  box(root, M.paversGray, 12.6, 0, 7.85, 19.3, 0.03, 22.0);
  box(root, M.outStone, 12.45, 0, 8.15, 12.6, 0.08, 22.0);
  box(root, M.outStone, 19.3, 0, 8.15, 19.45, 0.08, 22.0);
  // hedges & flower beds along the facade
  for (const [a, b] of [[-11.7, -4.4], [4.4, 11.7]]) {
    const hg = box(root, M.hedge, a, 0, 8.5, b, 0.95, 9.25);
    box(root, M.flowerBed, a, 0, 9.25, b, 0.12, 9.95);
    const r = rng(Math.round(a * 10));
    for (let x = a + 0.2; x < b - 0.1; x += 0.32) {
      const m = [M.flowersR, M.flowersW, M.flowersY][(r() * 3) | 0];
      blob(root, m, x + (r() - 0.5) * 0.1, 0.22, 9.45 + (r() - 0.5) * 0.25, 0.14, 0.12, 0.14);
      blob(root, M.hedge, x + 0.16, 0.16, 9.78, 0.12, 0.1, 0.12);
    }
    addCollider(a, 0, 8.5, b, 0.95, 9.25);
  }
  // round boxwood balls by the portico steps
  for (const x of [-3.2, 3.2]) {
    cyl(root, M.outStone, x, 0, 11.6, 0.42, 0.36, 0.55, 20);
    blob(root, M.hedge, x, 1.0, 11.6, 0.55, 0.5, 0.55);
    addCollider(x - 0.42, 0, 11.18, x + 0.42, 1.5, 12.02);
  }
  // garden lights along the walkway
  for (const z of [13.2, 15.8, 18.4, 21.0]) for (const x of [-1.6, 1.6]) {
    cyl(root, M.outBlack, x, 0, z, 0.06, 0.07, 0.55, 10);
    cyl(root, M.lampOut, x, 0.55, z, 0.09, 0.09, 0.1, 12);
    cyl(root, M.outBlack, x, 0.65, z, 0.11, 0.11, 0.03, 12);
  }
  // fountain
  const fx = -7.5, fz = 16.5;
  cyl(root, M.outStone, fx, 0, fz, 2.05, 2.15, 0.55, 40);
  cyl(root, M.fountainWater, fx, 0.4, fz, 1.85, 1.85, 0.08, 40);
  cyl(root, M.outStone, fx, 0.45, fz, 0.28, 0.38, 0.7, 20);
  cyl(root, M.outStone, fx, 1.12, fz, 0.98, 0.32, 0.22, 32);
  cyl(root, M.fountainWater, fx, 1.25, fz, 0.86, 0.86, 0.06, 32);
  cyl(root, M.outStone, fx, 1.3, fz, 0.12, 0.18, 0.6, 16);
  cyl(root, M.outStone, fx, 1.86, fz, 0.46, 0.16, 0.12, 24);
  cyl(root, M.fountainWater, fx, 1.95, fz, 0.4, 0.4, 0.04, 24);
  sphere(root, M.outStone, fx, 2.12, fz, 0.1, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    rod(root, M.fountainWater, [fx + Math.cos(a) * 0.9, 1.28, fz + Math.sin(a) * 0.9], [fx + Math.cos(a) * 1.35, 0.45, fz + Math.sin(a) * 1.35], 0.025, 5);
  }
  addCollider(fx - 2.1, 0, fz - 2.1, fx + 2.1, 2.2, fz + 2.1);
  // flower ring around the fountain
  const r = rng(5);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * PI * 2;
    blob(root, [M.flowersR, M.flowersW, M.flowersY][i % 3], fx + Math.cos(a) * 2.5, 0.18, fz + Math.sin(a) * 2.5, 0.2 + r() * 0.08, 0.14, 0.2);
  }
  // mailbox
  box(root, M.outWhite, 12.0, 0, 21.3, 12.12, 1.05, 21.42);
  box(root, M.outBlack, 11.85, 1.05, 21.1, 12.27, 1.32, 21.65);
  box(root, M.flowersR, 12.27, 1.15, 21.5, 12.3, 1.45, 21.56);
  addCollider(11.85, 0, 21.1, 12.27, 1.4, 21.65);
  // basketball hoop at the driveway
  cyl(root, M.outBlack, 19.9, 0, 18.5, 0.07, 0.08, 3.35, 12);
  rod(root, M.outBlack, [19.9, 3.2, 18.5], [19.35, 3.2, 18.5], 0.05, 8);
  box(root, M.outWhite, 19.25, 2.85, 17.6, 19.3, 3.9, 19.4);
  box(root, M.flowersR, 19.24, 3.05, 18.2, 19.25, 3.5, 18.8);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.015, 6, 24), M.flowersR);
  ring.rotation.x = H;
  ring.position.set(19.0, 3.05, 18.5);
  root.add(ring);
  addCollider(19.8, 0, 18.4, 20.0, 3.4, 18.6);
  // black sedan in the driveway
  place(F.car({ paint: M.carBlack, type: 'sedan' }), 15.9, 0.03, 15.2, PI, true);
  // flag pole base
  box(root, M.outStone, -12.2, 0, 13.1, -11.4, 0.3, 13.9);
  cyl(root, M.outWhite, -11.8, 0.3, 13.5, 0.05, 0.08, 8.2, 12);
  sphere(root, M.gold, -11.8, 8.55, 13.5, 0.12, 14);
  addCollider(-12.2, 0, 13.1, -11.4, 8.5, 13.9);
}

function lounger() {
  const g = new THREE.Group();
  box(g, M.oakWood, -0.36, 0.2, -1.0, 0.36, 0.3, 1.0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, M.oakWood, sx * 0.33 - 0.03, 0, sz * 0.9 - 0.03, sx * 0.33 + 0.03, 0.2, sz * 0.9 + 0.03);
  F.rug(g, 0, 0.35, 0.3, 0.66, 1.3, M.fabricCream);
  // backrest hinged at z = -0.3, extending toward -z and tilted up
  const back = new THREE.Group();
  box(back, M.oakWood, -0.36, 0, -0.75, 0.36, 0.06, 0);
  box(back, M.fabricCream, -0.33, 0.06, -0.73, 0.33, 0.12, -0.02);
  back.position.set(0, 0.3, -0.3);
  back.rotation.x = 0.85;
  g.add(back);
  boxc(g, M.linen, 0, 0.34, 0.75, 0.5, 0.05, 0.3);
  return g;
}

function umbrella(x, z) {
  cyl(root, M.outBlack, x, 0, z, 0.35, 0.35, 0.08, 20);
  cyl(root, M.outWhite, x, 0.08, z, 0.03, 0.03, 2.45, 8);
  cone(root, M.fabricCream, x, 2.15, z, 1.45, 0.55, 8);
  cyl(root, M.fabricSand, x, 2.12, z, 1.45, 1.45, 0.05, 8);
  addCollider(x - 0.2, 0, z - 0.2, x + 0.2, 2.6, z + 0.2);
}

function backYard() {
  // terrace (house level) + steps down to the pool deck
  box(root, M.pavers, -7.0, 0, -12.0, 7.0, F0, -8.15);
  box(root, M.outStone, -7.05, 0, -12.05, 7.05, 0.15, -8.15);
  box(root, M.pavers, -2.5, 0, -12.4, 2.5, 0.3, -12.0);
  box(root, M.pavers, -2.5, 0, -12.8, 2.5, 0.15, -12.4);
  addSurface(-7.0, -12.0, 7.0, -8.15, F0);
  addSurface(-2.5, -12.4, 2.5, -12.0, 0.3);
  addSurface(-2.5, -12.8, 2.5, -12.4, 0.15);
  for (const x of [-7.0, 7.0]) for (const z of [-12.0]) {
    cyl(root, M.outStone, x, F0, z, 0.32, 0.36, 0.5, 16);
    cyl(root, M.fabricSand, x, F0 + 0.5, z, 0.34, 0.34, 0.02, 16);
    blob(root, M.hedge, x, F0 + 0.75, z, 0.32, 0.3, 0.32);
  }
  // outdoor dining
  place(F.diningTable({ w: 1.9, d: 0.95, top: M.oakWood }), -4.6, F0, -10.2, 0, true);
  for (const x of [-5.2, -4.0]) {
    place(F.diningChair({ fab: M.linen, wood: M.oakWood }), x, F0, -9.4, PI);
    place(F.diningChair({ fab: M.linen, wood: M.oakWood }), x, F0, -11.0, 0);
  }
  place(F.diningChair({ fab: M.linen, wood: M.oakWood }), -6.0, F0, -10.2, H);
  place(F.diningChair({ fab: M.linen, wood: M.oakWood }), -3.2, F0, -10.2, -H);
  // lounge + fire pit
  place(F.sofa({ len: 2.4, fab: M.fabricGray, pillows: [M.pillowTeal, M.pillowGold], leg: M.oakWood }), 4.8, F0, -9.0, PI, true);
  cyl(root, M.outStone, 4.8, F0, -10.5, 0.65, 0.65, 0.4, 28);
  cyl(root, M.blackMetal, 4.8, F0 + 0.4, -10.5, 0.4, 0.4, 0.02, 24);
  for (let i = 0; i < 5; i++) cone(root, M.fire, 4.6 + i * 0.1, F0 + 0.42, -10.5 + Math.sin(i * 2) * 0.12, 0.07, 0.22 + (i % 2) * 0.1, 6);
  addCollider(4.15, F0, -11.15, 5.45, F0 + 0.45, -9.85);
  place(F.armchair({ fab: M.fabricGray, leg: M.oakWood }), 6.3, F0, -10.6, -H, true);
  place(F.armchair({ fab: M.fabricGray, leg: M.oakWood }), 3.3, F0, -10.6, H, true);
  // grill
  const gr = new THREE.Group();
  box(gr, M.steel, -0.55, 0.0, -0.3, 0.55, 0.85, 0.3);
  box(gr, M.blackMetal, -0.5, 0.85, -0.28, 0.5, 1.05, 0.28);
  box(gr, M.steel, 0.55, 0.75, -0.25, 0.95, 0.8, 0.25);
  rod(gr, M.chrome, [-0.35, 1.0, 0.32], [0.35, 1.0, 0.32], 0.015, 6);
  place(gr, -6.5, F0, -8.75, H, true);
  // pool deck
  const pv = M.pavers;
  box(root, pv, -11, 0, -14.5, 11, 0.02, -12.0);
  box(root, pv, -11, 0, -26, 11, 0.02, -22.0);
  box(root, pv, -11, 0, -22.0, -5.0, 0.02, -14.5);
  box(root, pv, 5.0, 0, -22.0, 11, 0.02, -14.5);
  // coping
  const cp = M.coping;
  box(root, cp, -5.35, 0, -14.5, 5.35, 0.06, -14.15);
  box(root, cp, -5.35, 0, -22.35, 5.35, 0.06, -22.0);
  box(root, cp, -5.35, 0, -22.0, -5.0, 0.06, -14.5);
  box(root, cp, 5.0, 0, -22.0, 5.35, 0.06, -14.5);
  // basin
  const t = M.poolTile, d = -1.6;
  box(root, t, -5.0, d, -14.5, 5.0, 0, -14.4);
  box(root, t, -5.0, d, -22.1, 5.0, 0, -22.0);
  box(root, t, -5.1, d, -22.1, -5.0, 0, -14.4);
  box(root, t, 5.0, d, -22.1, 5.1, 0, -14.4);
  box(root, t, -5.0, d - 0.1, -22.0, 5.0, d, -14.5);
  box(root, t, -5.0, d, -15.0, -3.6, -0.35, -14.5);
  box(root, t, -5.0, d, -15.5, -3.6, -0.7, -15.0);
  box(root, t, -5.0, d, -16.0, -3.6, -1.05, -15.5);
  box(root, M.ledStrip, -4.9, -0.3, -14.52, 4.9, -0.27, -14.5);
  box(root, M.waterPool, -5.0, -0.17, -22.0, 5.0, -0.12, -14.5);
  addHole(-5.0, -22.0, 5.0, -14.5);
  // spa
  cyl(root, M.outStone, 8.0, 0, -18.2, 1.3, 1.35, 0.6, 32);
  cyl(root, M.fountainWater, 8.0, 0.5, -18.2, 1.12, 1.12, 0.06, 32);
  addCollider(6.7, 0, -19.5, 9.3, 0.6, -16.9);
  // loungers + umbrellas
  for (const z of [-15.5, -17.3, -19.2, -21.0]) place(lounger(), -8.0, 0.02, z, H, true);
  umbrella(-8.2, -16.4);
  umbrella(-8.2, -20.1);
  for (const z of [-16.0, -20.0]) {
    place(F.plant({ s: 1.3, pot: M.blackMetal, tall: true }), 10.2, 0.02, z, 0, true);
  }
  // outdoor shower / cabana-like pergola at the far end
  for (const [x, z] of [[-3, -24.8], [3, -24.8], [-3, -23.0], [3, -23.0]]) {
    cyl(root, M.outWhite, x, 0, z, 0.1, 0.1, 2.7, 12);
    addCollider(x - 0.1, 0, z - 0.1, x + 0.1, 2.7, z + 0.1);
  }
  for (const z of [-24.8, -23.0]) box(root, M.outWhite, -3.3, 2.7, z - 0.08, 3.3, 2.9, z + 0.08);
  for (let x = -3.2; x <= 3.2; x += 0.4) box(root, M.outWhite, x - 0.04, 2.9, -25.1, x + 0.04, 3.0, -22.7);
  place(F.sofa({ len: 3.0, fab: M.linen, pillows: [M.pillowTeal, M.pillowGold, M.pillowTeal], leg: M.oakWood }), 0, 0.02, -24.6, 0, true);
  place(F.coffeeTable({ w: 1.2, d: 0.6, top: M.oakWood, base: M.oakWood }), 0, 0.02, -23.4, 0, true);
}

function street() {
  box(root, M.sidewalk, -110, 0, 22.0, 110, 0.045, 24.2);
  box(root, M.outStone, -110, -0.02, 24.2, 110, 0.12, 24.4);
  box(root, M.asphalt, -110, -0.1, 24.4, 110, 0.005, 33.6);
  box(root, M.outStone, -110, -0.02, 33.6, 110, 0.12, 33.8);
  box(root, M.sidewalk, -110, 0, 33.8, 110, 0.045, 36.0);
  for (let x = -108; x < 108; x += 6) box(root, M.roadLine, x, 0.005, 28.92, x + 3, 0.012, 29.08);
  for (const x of [-27, -6, 24, 44]) {
    cyl(root, M.outBlack, x, 0, 23.7, 0.08, 0.12, 4.6, 10);
    rod(root, M.outBlack, [x, 4.5, 23.7], [x, 4.5, 24.6], 0.04, 6);
    box(root, M.outBlack, x - 0.2, 4.35, 24.45, x + 0.2, 4.45, 24.85);
    box(root, M.lampOut, x - 0.17, 4.2, 24.48, x + 0.17, 4.35, 24.82);
    addCollider(x - 0.12, 0, 23.58, x + 0.12, 4.6, 23.82);
  }
  // neighbour houses across the street (simple silhouettes)
  const walls = [outMat('nb1', { color: '#e4dccb', roughness: 0.8 }), outMat('nb2', { color: '#c9d2d8', roughness: 0.8 }), outMat('nb3', { color: '#efe9e1', roughness: 0.8 }), outMat('nb4', { color: '#d8c7ae', roughness: 0.8 })];
  const roofN = outMat('nbRoof', { color: '#4a4c52', roughness: 0.9, flatShading: true });
  const winN = outMat('nbWin', { color: '#22303d', roughness: 0.15, metalness: 0.6, emissive: '#ffcf86', emissiveIntensity: 0 });
  M._nbWin = winN;
  const pyramid = new THREE.ConeGeometry(1, 1, 4).rotateY(PI / 4);
  [[-34, 0], [-10, 1], [14, 2], [38, 3]].forEach(([x, i]) => {
    const w = 14, d = 10, z0 = 45, hgt = 6.6;
    box(root, walls[i], x - w / 2, 0, z0, x + w / 2, hgt, z0 + d);
    const rf = new THREE.Mesh(pyramid, roofN);
    rf.position.set(x, hgt + 1.6, z0 + d / 2);
    rf.scale.set((w / 2 + 0.5) / 0.7071, 3.2, (d / 2 + 0.5) / 0.7071);
    root.add(rf);
    for (const wy of [1.0, 4.0]) for (let k = 0; k < 5; k++) {
      const wx = x - w / 2 + 1.5 + k * 2.75;
      box(root, winN, wx - 0.55, wy, z0 - 0.03, wx + 0.55, wy + 1.5, z0);
    }
    box(root, walls[(i + 2) % 4], x - 1, 0, z0 - 0.04, x + 1, 2.4, z0);
    box(root, M.paversGray, x - 1, 0, 36, x + 1, 0.03, z0);
  });
}

function oak(x, z, s, r) {
  cyl(root, M.trunk, x, 0, z, 0.2 * s, 0.32 * s, 3.2 * s, 8);
  const leaves = [M.treeLeaf, M.treeLeaf2, M.treeLeaf3];
  for (let i = 0; i < 6; i++) {
    const a = r() * PI * 2, d = (0.4 + r() * 1.2) * s;
    const rr = (1.2 + r() * 0.9) * s;
    blob(root, leaves[(r() * 3) | 0], x + Math.cos(a) * d, (3.6 + r() * 1.8) * s, z + Math.sin(a) * d, rr, rr * 0.85, rr);
  }
  blob(root, leaves[0], x, 5.2 * s, z, 1.6 * s, 1.3 * s, 1.6 * s);
  addCollider(x - 0.3 * s, 0, z - 0.3 * s, x + 0.3 * s, 3 * s, z + 0.3 * s);
}
function pine(x, z, s) {
  cyl(root, M.trunk, x, 0, z, 0.15 * s, 0.25 * s, 2 * s, 8);
  for (let i = 0; i < 4; i++) cone(root, M.pine, x, (1.3 + i * 1.35) * s, z, (2.0 - i * 0.42) * s, 2.6 * s, 9);
  addCollider(x - 0.25 * s, 0, z - 0.25 * s, x + 0.25 * s, 3 * s, z + 0.25 * s);
}

function trees() {
  const r = rng(42);
  const oaks = [[-17, 12, 1.25], [-22.5, 19.5, 1.05], [25, 12.5, 1.2], [28, 19.5, 0.95], [-26, -2, 1.1], [27, -4, 1.15], [-20, -27, 1.0], [20, -28, 1.1], [-36, 8, 1.3], [37, 5, 1.2], [0, -35, 1.25], [-13, -34, 0.95], [13, -34.5, 1.05], [-3.6, 20.6, 0.55], [3.6, 20.6, 0.55]];
  oaks.forEach(([x, z, s]) => oak(x, z, s, r));
  for (let x = -60; x <= 60; x += 15) oak(x + 4, 38.5, 0.8 + r() * 0.3, r);
  const pines = [[-28, -14, 1.1], [29, -15, 1.2], [-31.5, -22, 1.0], [32, -24, 1.1], [-25, -32, 1.0], [24.5, -32.5, 1.0], [-38, 20, 1.2], [38.5, 17, 1.1], [-44, -8, 1.3], [45, -10, 1.25], [-9, -40, 1.2], [9, -41, 1.1]];
  pines.forEach(([x, z, s]) => pine(x, z, s));
}

function fence() {
  const pts = [[-30, 6], [-30, -30], [30, -30], [30, 6]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
    for (let t = 0; t <= len; t += 2.5) {
      const x = x0 + dx * t, z = z0 + dz * t;
      box(root, M.outBlack, x - 0.05, 0, z - 0.05, x + 0.05, 1.7, z + 0.05);
    }
    for (const y of [0.15, 1.5]) {
      if (dx !== 0) box(root, M.outBlack, Math.min(x0, x1), y, z0 - 0.02, Math.max(x0, x1), y + 0.04, z0 + 0.02);
      else box(root, M.outBlack, x0 - 0.02, y, Math.min(z0, z1), x0 + 0.02, y + 0.04, Math.max(z0, z1));
    }
    for (let t = 0.14; t < len; t += 0.16) {
      const x = x0 + dx * t, z = z0 + dz * t;
      box(root, M.outBlack, x - 0.012, 0.05, z - 0.012, x + 0.012, 1.62, z + 0.012);
    }
    if (dx !== 0) addCollider(Math.min(x0, x1), 0, z0 - 0.08, Math.max(x0, x1), 1.7, z0 + 0.08);
    else addCollider(x0 - 0.08, 0, Math.min(z0, z1), x0 + 0.08, 1.7, Math.max(z0, z1));
    // privacy shrubs just outside the fence
    const nx = dz !== 0 ? (x0 < 0 ? -1 : 1) : 0, nz = dx !== 0 ? -1 : 0;
    const rb = rng(i * 31 + 7);
    for (let t = 0.6; t < len; t += 1.25) {
      const x = x0 + dx * t + nx * 1.05, z = z0 + dz * t + nz * 1.05;
      const sz = 0.85 + rb() * 0.35;
      blob(root, rb() < 0.5 ? M.hedge : M.treeLeaf2, x, 0.95 * sz, z, sz * 1.05, sz * 1.15, sz * 1.05);
    }
  }
}

function flag(scene) {
  const geo = new THREE.PlaneGeometry(1.9, 1.0, 24, 12);
  geo.translate(0.95, 0, 0);
  const base = geo.attributes.position.array.slice();
  const mesh = new THREE.Mesh(geo, M.flag);
  mesh.position.set(-11.74, 7.75, 13.5);
  mesh.castShadow = false;
  scene.add(mesh);
  return {
    mesh,
    update(t) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        const x = base[i], y = base[i + 1];
        const k = x / 1.9;
        p[i + 2] = Math.sin(x * 3.2 - t * 5.0 + y * 0.6) * 0.13 * k + Math.sin(x * 7 - t * 8) * 0.03 * k;
        p[i + 1] = y - k * k * 0.06 + Math.sin(x * 2.5 - t * 3) * 0.02 * k;
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}
