// Room definitions (names, areas, camera spawn points) + all interior furnishing
import * as THREE from '../vendor/three/three.module.min.js';
import { F0, F1, CEIL0, CEIL1, root, box, boxc, cyl, rod, sphere, rbox, plane, place, addCollider } from './builder.js';
import * as F from './furniture.js';

const PI = Math.PI, H = PI / 2;

// level: 0 ground, 1 upper, -1 outside. rect = [x0, z0, x1, z1]
export const ROOMS = [
  { id: 'foyer', name: 'Парадный холл', icon: '🏛️', level: 0, rect: [-3, 0, 3, 8], spawn: [0, 7.45], look: [-0.6, 0], light: [-0.6, F0 + 4.2, 4.2] },
  { id: 'living', name: 'Гостиная', icon: '🛋️', level: 0, rect: [-12, 0, -3, 8], spawn: [-4.4, 1.45], look: [-10.5, 4.6], light: [-7.7, F0 + 2.6, 4] },
  { id: 'dining', name: 'Столовая', icon: '🍽️', level: 0, rect: [-12, -8, -4, 0], spawn: [-4.8, -1.0], look: [-9.5, -5], light: [-8, F0 + 2.5, -4] },
  { id: 'kitchen', name: 'Кухня', icon: '👨‍🍳', level: 0, rect: [-4, -8, 4, 0], spawn: [-0.4, -0.95], look: [1.5, -6.5], light: [-0.3, F0 + 2.5, -4] },
  { id: 'cinema', name: 'Домашний кинотеатр', icon: '🎬', level: 0, rect: [3, 0, 12, 8], spawn: [3.7, 7.2], look: [11.8, 4.6], light: [7.5, F0 + 2.4, 4] },
  { id: 'office', name: 'Кабинет-библиотека', icon: '📚', level: 0, rect: [4, -8, 12, 0], spawn: [4.6, -1.5], look: [10.5, -5.5], light: [8, F0 + 2.5, -4] },
  { id: 'garage', name: 'Гараж на 2 авто', icon: '🚗', level: 0, rect: [12, 0, 19.7, 12.4], spawn: [15.85, 11.6], look: [15.85, 2.5], light: [15.8, 2.9, 4], floor: 0 },
  { id: 'master', name: 'Главная спальня', icon: '🛏️', level: 1, rect: [-12, 1, -3, 8], spawn: [-4.6, 1.65], look: [-10.5, 4.8], light: [-7.5, F1 + 2.5, 4.4] },
  { id: 'mbath', name: 'Ванная комната', icon: '🛁', level: 1, rect: [-12, -8, -5, -1], spawn: [-6.7, -1.45], look: [-9.5, -6.5], light: [-8.5, F1 + 2.5, -4.5] },
  { id: 'kids', name: 'Детская', icon: '🧸', level: 1, rect: [-5, -8, 2, -1], spawn: [-1.9, -1.45], look: [-2.5, -6.5], light: [-1.5, F1 + 2.5, -4.5] },
  { id: 'guest', name: 'Гостевая спальня', icon: '🛌', level: 1, rect: [3, 1, 12, 8], spawn: [4.6, 1.65], look: [10.5, 4.6], light: [7.5, F1 + 2.5, 4.4] },
  { id: 'gbath', name: 'Гостевая ванная', icon: '🚿', level: 1, rect: [2, -8, 7, -1], spawn: [4.3, -1.45], look: [4.8, -6.5], light: [4.5, F1 + 2.5, -4.5] },
  { id: 'gym', name: 'Спортзал', icon: '🏋️', level: 1, rect: [7, -8, 12, -1], spawn: [9.5, -1.45], look: [9.5, -6.5], light: [9.5, F1 + 2.5, -4.5] },
  { id: 'hall2', name: 'Галерея 2 этажа', icon: '🖼️', level: 1, rect: [-12, -1, 12, 1], spawn: [-1.5, 0.2], look: [-0.6, 5], light: [-6, F1 + 2.5, 0] },
  { id: 'pool', name: 'Бассейн и терраса', icon: '🏊', level: -1, rect: [-14, -30, 14, -8.2], spawn: [-10.3, -13.6], look: [2, -18.6], light: null, floor: 0 },
  { id: 'yard', name: 'Фасад и сад', icon: '🌳', level: -1, rect: [-40, 8.2, 40, 40], spawn: [0, 23.1], look: [0, 7], light: null, floor: 0 },
];

let M;

function art(x, y, z, rot, w, h, mat, frame) {
  place(F.painting({ w, h, art: mat, frame: frame || M.gold }), x, y, z, rot);
}
function downlights(x0, z0, x1, z1, y, nx, nz) {
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    F.downlight(root, x0 + ((x1 - x0) * (i + 0.5)) / nx, y, z0 + ((z1 - z0) * (j + 0.5)) / nz);
  }
}
function consoleTable(w = 1.4, d = 0.4, top = M.marble) {
  const g = new THREE.Group();
  box(g, top, -w / 2, 0.8, -d / 2, w / 2, 0.84, d / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, M.gold, [sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05)], [sx * (w / 2 - 0.05), 0.8, sz * (d / 2 - 0.05)], 0.015, 6);
  box(g, M.gold, -w / 2 + 0.05, 0.15, -d / 2 + 0.05, w / 2 - 0.05, 0.17, d / 2 - 0.05);
  return g;
}

export function furnish(materials) {
  M = materials;
  F.setMaterials(M);
  livingRoom();
  foyer();
  dining();
  kitchen();
  cinema();
  office();
  garage();
  master();
  masterBath();
  kids();
  guest();
  guestBath();
  gym();
  hall2();
}

// ======================= GROUND FLOOR =======================
function livingRoom() {
  const y = F0;
  place(F.fireplace({ w: 2.4, hFull: CEIL0 - F0 }), -11.47, y, 4.0, H, true);
  place(F.tv({ w: 1.65 }), -11.445, y + 1.45, 4.0, H);
  F.rug(root, -7.9, 4.0, y, 4.6, 3.6, M.rugPersian);
  place(F.sofa({ len: 3.0, fab: M.fabricCream, pillows: [M.pillowGold, M.velvetNavy, M.pillowTeal, M.pillowGold] }), -5.6, y, 4.0, -H, true);
  place(F.coffeeTable({ w: 1.4, d: 0.8 }), -7.7, y, 4.0, H, true);
  place(F.armchair({ fab: M.velvetEmerald }), -7.8, y, 1.7, 0, true);
  place(F.armchair({ fab: M.velvetEmerald }), -7.8, y, 6.3, PI, true);
  for (const z of [2.15, 5.85]) {
    place(F.sideTable(), -5.6, y, z, 0, true);
    place(F.tableLamp(), -5.6, y + 0.59, z);
  }
  place(F.grandPiano(), -9.9, y, 6.9, H, true);
  place(F.plant({ s: 1.3, tall: true }), -11.35, y, 0.6, 0, true);
  place(F.plant({ s: 1.2, tall: true }), -3.6, y, 7.35, 0, true);
  place(F.plant({ s: 1.0 }), -3.55, y, 0.55, 0, true);
  place(F.floorLamp(), -6.4, y, 7.45, 0, true);
  art(-4.85, y + 1.75, 0.08, 0, 1.5, 1.05, M.art0);
  art(-3.08, y + 1.7, 1.25, -H, 0.9, 1.2, M.art1);
  art(-3.08, y + 1.7, 6.6, -H, 0.9, 1.2, M.art2);
  place(F.ringChandelier({ r: 0.8 }), -7.7, CEIL0, 4.0);
  for (const c of [-10.3, -7.5, -4.7]) F.curtains(root, 'x', 7.85, c - 0.65, c + 0.65, y + 2.78, y + 0.02, -1, M.fabricSand);
  for (const c of [1.7, 6.3]) F.curtains(root, 'z', -11.85, c - 0.55, c + 0.55, y + 2.78, y + 0.02, 1, M.fabricSand);
  downlights(-11.5, 0.5, -3.5, 7.5, CEIL0, 3, 2);
}

function foyer() {
  const y = F0;
  place(F.roundTable({ r: 0.7, h: 0.8 }), -0.6, y, 4.2, 0, true);
  place(F.vaseFlowers({ s: 1.2 }), -0.6, y + 0.8, 4.2);
  place(F.chandelier({ r: 1.0, tiers: 3, drop: 1.3 }), -0.6, CEIL1, 4.2);
  F.rug(root, 0, 6.6, y, 1.5, 1.6, M.rugNavy);
  place(consoleTable(1.5, 0.42), -2.7, y, 6.75, H, true);
  place(F.mirror({ w: 1.1, h: 1.5 }), -2.92, y + 1.75, 6.75, H);
  for (const z of [6.0, 7.5]) place(F.tableLamp(), -2.72, y + 0.84, z);
  place(F.plant({ s: 1.3, tall: true }), -2.45, y, 0.6, 0, true);
  place(F.plant({ s: 1.1, tall: true }), -2.4, y, 7.45, 0, true);
  art(-2.92, F1 + 1.6, 4.4, H, 1.8, 1.3, M.art3, M.blackMetal);
  art(2.92, F1 + 1.75, 4.2, -H, 1.6, 1.15, M.artLand1);
  for (const z of [2.8, 6.0]) {
    place(F.sconce(), -2.92, F1 + 1.7, z, H);
  }
  downlights(-2.5, 0.2, 2.5, 0.9, CEIL0, 3, 1);
}

function dining() {
  const y = F0;
  F.rug(root, -8.0, -4.0, y, 4.6, 3.2, M.rugModern);
  place(F.diningTable({ w: 3.2, d: 1.2 }), -8.0, y, -4.0, 0, true);
  for (const x of [-9.05, -8.0, -6.95]) {
    place(F.diningChair({ fab: M.fabricCream }), x, y, -3.15, PI);
    place(F.diningChair({ fab: M.fabricCream }), x, y, -4.85, 0);
  }
  place(F.diningChair({ fab: M.velvetNavy }), -10.05, y, -4.0, H);
  place(F.diningChair({ fab: M.velvetNavy }), -5.95, y, -4.0, -H);
  place(F.chandelier({ r: 0.75, tiers: 2, drop: 0.55 }), -8.0, CEIL0, -4.0);
  place(F.mediaConsole({ w: 1.8, d: 0.48, h: 0.72, soundbar: false }), -8.75, y, -7.6, 0, true);
  place(F.mirror({ w: 1.0, round: true }), -8.75, y + 1.85, -7.85, 0);
  // china cabinet
  const cab = new THREE.Group();
  box(cab, M.walnut, -0.9, 0, -0.22, 0.9, 2.3, -0.2);
  box(cab, M.walnut, -0.9, 0, -0.22, -0.86, 2.3, 0.22);
  box(cab, M.walnut, 0.86, 0, -0.22, 0.9, 2.3, 0.22);
  box(cab, M.walnut, -0.9, 0, -0.22, 0.9, 0.9, 0.22);
  box(cab, M.walnut, -0.9, 2.25, -0.22, 0.9, 2.35, 0.24);
  for (const sy of [1.35, 1.8]) box(cab, M.glassClear, -0.86, sy, -0.2, 0.86, sy + 0.02, 0.2);
  for (const sy of [0.9, 1.37, 1.82]) for (let i = 0; i < 6; i++) {
    const p = cyl(cab, M.ceramic, -0.7 + i * 0.28, sy, -0.1, 0.11, 0.11, 0.015, 20);
    p.rotation.x = 1.3;
    p.position.set(-0.7 + i * 0.28, sy + 0.12, -0.12);
  }
  box(cab, M.glassClear, -0.86, 0.9, 0.2, 0.86, 2.25, 0.22);
  box(cab, M.gold, -0.02, 0.9, 0.2, 0.02, 2.25, 0.225);
  place(cab, -5.35, y, -0.3, PI, true);
  art(-11.85, y + 1.75, -1.6, H, 1.0, 1.3, M.art4);
  art(-11.85, y + 1.75, -6.6, H, 1.0, 1.3, M.art1);
  for (const c of [-10.5, -7]) F.curtains(root, 'x', -7.85, c - 0.7, c + 0.7, y + 2.78, y + 0.02, 1, M.velvetNavy);
  F.curtains(root, 'z', -11.85, -4.7, -3.3, y + 2.78, y + 0.02, 1, M.velvetNavy);
  place(F.plant({ s: 1.2, tall: true }), -11.35, y, -7.35, 0, true);
  place(F.plant({ s: 1.0 }), -4.55, y, -7.4, 0, true);
}

function kitchen() {
  const y = F0;
  // counter run along the east wall (local x == world z)
  const k = new THREE.Group();
  const fr = F.fridge();
  fr.position.set(-7.375, 0, 0.035);
  k.add(fr);
  box(k, M.whiteLacquer, -6.9, 0, -0.325, -6.25, 2.35, 0.325);
  box(k, M.blackGloss, -6.82, 0.85, 0.325, -6.33, 1.45, 0.33);
  box(k, M.blackGloss, -6.82, 1.5, 0.325, -6.33, 2.05, 0.33);
  for (const yy of [1.4, 2.0]) rod(k, M.chrome, [-6.78, yy, 0.37], [-6.37, yy, 0.37], 0.01, 6);
  F.counterRun(k, -6.25, -4.7);
  F.counterRun(k, -4.7, -3.75, { upper: false });
  F.counterRun(k, -3.75, -2.25);
  // cooktop
  box(k, M.blackGloss, -4.6, 0.92, -0.25, -3.85, 0.93, 0.2);
  for (const [bx, bz] of [[-4.42, -0.12], [-4.03, -0.12], [-4.42, 0.08], [-4.03, 0.08], [-4.225, -0.02]]) cyl(k, M.blackMetal, bx, 0.93, bz, 0.08, 0.08, 0.004, 20);
  const hood = F.rangeHood({ w: 0.95, top: CEIL0 - F0 - 1.55 });
  hood.position.set(-4.225, 1.55, 0.17);
  k.add(hood);
  // sink
  box(k, M.blackGloss, -5.8, 0.915, -0.2, -5.0, 0.925, 0.15);
  rod(k, M.gold, [-5.4, 0.92, -0.25], [-5.4, 1.3, -0.25], 0.015, 8);
  rod(k, M.gold, [-5.4, 1.3, -0.25], [-5.4, 1.3, -0.02], 0.014, 8);
  place(k, 3.595, y, 0, -H, true);
  // pantry + wine fridge along z = 0 wall
  place(F.wardrobe({ w: 2.0, h: 2.6, d: 0.6 }), 2.0, y, -0.38, PI, true);
  const wine = new THREE.Group();
  box(wine, M.steel, -0.45, 0, -0.3, 0.45, 2.6, 0.3);
  box(wine, M.blackGloss, -0.4, 0.1, 0.3, 0.4, 2.0, 0.305);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
    const b = cyl(wine, (r + c) % 3 ? M.leaf2 : M.velvetRed, 0, 0, 0, 0.035, 0.035, 0.28, 8);
    b.rotation.x = H;
    b.position.set(-0.27 + c * 0.18, 0.25 + r * 0.22, 0.17);
  }
  box(wine, M.glass, -0.4, 0.1, 0.31, 0.4, 2.0, 0.315);
  box(wine, M.ledStrip, -0.4, 1.98, 0.29, 0.4, 2.0, 0.3);
  place(wine, 3.45, y, -0.38, PI, true);
  // island + stools + pendants
  place(F.islandKitchen({ w: 3.2, d: 1.25 }), -0.3, y, -4.0, 0, true);
  for (const x of [-1.45, -0.7, 0.05, 0.8]) place(F.barStool(), x, y, -2.95, PI);
  for (const x of [-1.3, -0.3, 0.7]) place(F.pendant({ drop: 1.15, r: 0.14 }), x, CEIL0, -4.0);
  place(F.plant({ s: 1.25, tall: true }), -3.45, y, -0.6, 0, true);
  place(F.plant({ s: 1.1, tall: true }), -3.45, y, -7.4, 0, true);
  downlights(-3.5, -7.5, 3.0, -0.5, CEIL0, 3, 3);
}

function cinema() {
  const y = F0;
  // dark wall finishes
  box(root, M.paintCinema, 3.08, y, 0.08, 3.1, CEIL0, 6.66);
  box(root, M.paintCinema, 3.08, y + 2.39, 6.66, 3.1, CEIL0, 7.85);
  box(root, M.paintCinema, 3.08, y, 0.08, 11.85, CEIL0, 0.1);
  box(root, M.paintCinema, 11.83, y, 2.09, 11.85, CEIL0, 7.85);
  box(root, M.paintCinema, 11.83, y, 0.08, 11.85, CEIL0, 0.91);
  box(root, M.paintCinema, 11.83, y + 2.29, 0.91, 11.85, CEIL0, 2.09);
  // stage + screen
  box(root, M.velvetRed, 11.0, y, 2.3, 11.83, y + 0.2, 6.9, true);
  box(root, M.ledStrip, 10.99, y + 0.05, 2.3, 11.0, y + 0.08, 6.9);
  box(root, M.blackMetal, 11.78, y + 0.55, 2.35, 11.83, y + 3.1, 6.85);
  place(F.tv({ w: 3.9 }), 11.75, y + 0.72, 4.6, -H);
  for (const z of [2.6, 6.6]) {
    const sp = new THREE.Group();
    rbox(sp, M.blackGloss, 0, 0.7, 0, 0.32, 1.4, 0.34, 0.02);
    for (const yy of [0.35, 0.75, 1.15]) {
      const c = cyl(sp, M.blackMetal, 0, 0, 0, 0.1, 0.1, 0.02, 20);
      c.rotation.x = H;
      c.position.set(0, yy, 0.17);
    }
    place(sp, 11.45, y + 0.2, z, -H, true);
  }
  // seats
  for (const x of [8.4, 6.6]) for (const z of [3.4, 4.6, 5.8]) place(F.recliner({ mat: M.leatherBlack }), x, y, z, H, true);
  // pool table
  place(F.poolTable(), 4.6, y, 4.0, 0, true);
  for (const z of [3.4, 4.6]) place(F.pendant({ drop: 1.5, r: 0.15 }), 4.6, CEIL0, z);
  // acoustic panels + sconces
  for (let x = 3.9; x < 11.4; x += 1.25) {
    box(root, M.fabricCharcoal, x - 0.5, y + 0.6, 0.1, x + 0.5, y + 2.5, 0.16);
  }
  for (let x = 4.5; x < 11.4; x += 2.5) place(F.sconce(), x + 0.1, y + 2.75, 0.16, 0);
  // drapes
  for (const c of [4.7, 7.5, 10.3]) {
    F.curtains(root, 'x', 7.85, c - 0.65, c + 0.65, y + 2.78, y + 0.02, -1, M.velvetRed);
    box(root, M.velvetRed, c - 0.65, y + 0.02, 7.6, c + 0.65, y + 2.78, 7.66);
  }
  // popcorn machine
  const pop = new THREE.Group();
  box(pop, M.kidsRed, -0.3, 0, -0.25, 0.3, 0.9, 0.25);
  box(pop, M.glassClear, -0.28, 0.9, -0.23, 0.28, 1.45, 0.23);
  box(pop, M.kidsRed, -0.3, 1.45, -0.25, 0.3, 1.55, 0.25);
  for (let i = 0; i < 40; i++) sphere(pop, M.kidsYellow, -0.22 + (i % 8) * 0.06, 0.93 + ((i / 8) | 0) * 0.04, -0.15 + (i % 5) * 0.07, 0.03, 6);
  place(pop, 3.6, y, 0.55, 0, true);
}

function office() {
  const y = F0;
  place(F.bookshelf({ w: 6.8, h: 3.0, d: 0.4, seed: 11 }), 8.2, y, -0.3, PI, true);
  F.rug(root, 9.4, -4.0, y, 2.8, 3.4, M.rugPersian);
  place(F.desk({ w: 2.0, d: 0.85 }), 9.2, y, -4.0, H, true);
  place(F.officeChair({ mat: M.leatherBrown }), 10.15, y, -4.0, -H);
  place(F.monitor(), 9.0, y + 0.775, -4.25, H);
  place(F.laptop(), 9.3, y + 0.775, -3.4, H + 0.2);
  place(F.tableLamp(), 9.0, y + 0.775, -4.85);
  F.stackBooks(root, 9.25, y + 0.775, -3.0, 4);
  F.rug(root, 6.0, -5.0, y, 3.0, 2.4, M.rugPersian2);
  place(F.sofa({ len: 2.3, fab: M.leatherBrown, pillows: [M.velvetNavy], leg: M.walnut }), 4.66, y, -5.0, H, true);
  place(F.coffeeTable({ w: 1.15, d: 0.65, top: M.marbleDark, base: M.brass }), 6.0, y, -5.0, H, true);
  place(F.armchair({ fab: M.leatherCognac, leg: M.walnut }), 7.2, y, -5.0, -H, true);
  // globe
  const gl = new THREE.Group();
  cyl(gl, M.walnut, 0, 0, 0, 0.18, 0.22, 0.05, 16);
  cyl(gl, M.walnut, 0, 0.05, 0, 0.03, 0.03, 0.6, 8);
  sphere(gl, M.kidsBlue, 0, 0.92, 0, 0.27, 24);
  const tr = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 40), M.brass);
  tr.position.set(0, 0.92, 0);
  tr.rotation.y = H;
  gl.add(tr);
  for (let i = 0; i < 5; i++) sphere(gl, M.kidsGreen, Math.cos(i * 1.3) * 0.2, 0.92 + Math.sin(i * 2.1) * 0.15, Math.sin(i * 1.3) * 0.19, 0.08, 8);
  place(gl, 11.25, y, -7.25, 0, true);
  place(F.floorLamp(), 4.6, y, -7.35, 0, true);
  place(F.plant({ s: 1.25, tall: true }), 11.35, y, -1.0, 0, true);
  art(8.15, y + 1.7, -7.85, 0, 1.2, 0.85, M.artLand0);
  for (const c of [6.5, 9.8]) F.curtains(root, 'x', -7.85, c - 0.7, c + 0.7, y + 2.78, y + 0.02, 1, M.velvetEmerald);
  F.curtains(root, 'z', 11.85, -4.7, -3.3, y + 2.78, y + 0.02, -1, M.velvetEmerald);
  place(F.chandelier({ r: 0.55, tiers: 1, drop: 0.5, crystals: false }), 8.0, CEIL0, -4.0);
  downlights(4.5, -7.5, 11.5, -0.8, CEIL0, 3, 2);
}

function garage() {
  place(F.car({ paint: M.carWhite, type: 'suv' }), 14.3, 0.02, 4.25, 0, true);
  place(F.car({ paint: M.carRed, type: 'sport' }), 17.4, 0.02, 4.25, 0, true);
  // tool chest + pegboard
  box(root, M.kidsRed, 16.8, 0.02, 0.15, 18.4, 1.0, 0.7, true);
  for (let i = 0; i < 5; i++) box(root, M.blackMetal, 16.85, 0.15 + i * 0.17, 0.7, 18.35, 0.16 + i * 0.17, 0.71);
  box(root, M.oakWood, 16.6, 1.3, 0.15, 18.6, 2.3, 0.18);
  box(root, M.steel, 14.0, 0.02, 0.15, 15.6, 2.0, 0.55, true);
  for (let i = 0; i < 4; i++) box(root, M.steel, 14.0, 0.4 + i * 0.5, 0.15, 15.6, 0.43 + i * 0.5, 0.55);
  for (let i = 0; i < 6; i++) boxc(root, [M.kidsBlue, M.kidsYellow, M.fabricGray][i % 3], 14.3 + (i % 3) * 0.5, 0.65 + ((i / 3) | 0) * 0.5, 0.35, 0.4, 0.2, 0.3);
  for (const x of [14.3, 17.4]) box(root, M.ledStrip, x - 1.2, 3.38, 3.0, x + 1.2, 3.4, 3.1);
  for (const x of [14.3, 17.4]) box(root, M.ledStrip, x - 1.2, 3.38, 5.5, x + 1.2, 3.4, 5.6);
}

// ======================= UPPER FLOOR =======================
function master() {
  const y = F1;
  // slatted wall behind bed
  box(root, M.walnut, -11.85, y, 2.6, -11.82, CEIL1, 5.9);
  for (let z = 2.66; z < 5.86; z += 0.12) box(root, M.walnut, -11.82, y, z, -11.79, CEIL1, z + 0.05);
  box(root, M.ledStrip, -11.79, CEIL1 - 0.04, 2.6, -11.75, CEIL1 - 0.02, 5.9);
  place(F.bed({ w: 2.0, len: 2.15, frame: M.velvetNavy, duvet: M.linen, throwM: M.pillowGold }), -10.64, y, 4.25, H, true);
  for (const z of [2.75, 5.75]) place(F.nightstand(), -11.6, y, z, H, true);
  F.rug(root, -9.6, 4.25, y, 3.8, 3.3, M.rugModernGray);
  place(F.bench({ w: 1.6 }), -9.15, y, 4.25, H, true);
  place(F.mediaConsole({ w: 2.2 }), -3.33, y, 4.25, -H, true);
  place(F.tv({ w: 1.65 }), -3.11, y + 1.1, 4.25, -H);
  place(F.wardrobe({ w: 4.0, h: 2.7 }), -9.0, y, 1.39, 0, true);
  place(F.armchair({ fab: M.velvetBlush }), -5.8, y, 6.95, PI * 0.78, true);
  place(F.armchair({ fab: M.velvetBlush }), -4.0, y, 6.95, -PI * 0.78, true);
  place(F.sideTable(), -4.9, y, 7.35, 0, true);
  place(F.vaseFlowers({ s: 0.8 }), -4.9, y + 0.59, 7.35);
  place(F.plant({ s: 1.3, tall: true }), -11.35, y, 7.4, 0, true);
  place(F.floorLamp(), -8.9, y, 7.5, 0, true);
  art(-8.9, y + 1.85, 7.85, PI, 1.0, 1.25, M.art2);
  art(-6.3, y + 1.85, 1.08, 0, 1.2, 0.85, M.artLand0);
  place(F.chandelier({ r: 0.65, tiers: 2, drop: 0.45 }), -7.5, CEIL1, 4.4);
  for (const c of [-10.3, -7.5, -4.7]) F.curtains(root, 'x', 7.85, c - 0.65, c + 0.65, y + 2.72, y + 0.02, -1, M.linen);
  for (const c of [2.0, 6.5]) F.curtains(root, 'z', -11.85, c - 0.55, c + 0.55, y + 2.72, y + 0.02, 1, M.linen);
  downlights(-11, 1.5, -3.5, 7.5, CEIL1, 3, 2);
}

function masterBath() {
  const y = F1;
  box(root, M.marble, -11.85, y, -7.85, -5.08, y + 0.95, -7.82);
  place(F.bathtub(), -8.6, y, -6.6, 0, true);
  place(F.vanity({ w: 2.0 }), -5.38, y, -4.4, -H, true);
  for (const z of [-4.9, -3.9]) place(F.mirror({ w: 0.75, h: 1.0 }), -5.085, y + 1.65, z, -H);
  for (const z of [-5.45, -4.4, -3.35]) place(F.sconce(), -5.085, y + 1.75, z, -H);
  // shower (north-west corner)
  box(root, M.tileShower, -11.85, y, -2.9, -11.82, y + 2.5, -1.08);
  box(root, M.tileShower, -11.85, y, -1.11, -10.0, y + 2.5, -1.08);
  box(root, M.tileShower, -11.85, y, -2.9, -10.0, y + 0.03, -1.08);
  box(root, M.glassClear, -11.82, y, -2.92, -10.0, y + 2.15, -2.9, true);
  box(root, M.glassClear, -10.02, y, -2.9, -10.0, y + 2.15, -1.95, true);
  box(root, M.chrome, -11.82, y + 2.12, -2.93, -10.0, y + 2.15, -2.89);
  cyl(root, M.chrome, -10.9, y + 2.3, -2.0, 0.17, 0.17, 0.02, 24);
  rod(root, M.chrome, [-10.9, y + 2.31, -2.0], [-10.9, y + 2.5, -1.1], 0.012, 6);
  rbox(root, M.marble, -11.6, y + 0.25, -2.0, 0.4, 0.5, 1.3, 0.02);
  place(F.toilet(), -11.5, y, -4.6, H, true);
  place(F.towelRack(), -8.6, y, -1.1, PI);
  F.rug(root, -8.6, -5.5, y, 1.4, 0.7, M.linen);
  place(F.plant({ s: 1.0 }), -5.6, y, -7.35, 0, true);
  place(F.chandelier({ r: 0.4, tiers: 1, drop: 0.4 }), -8.6, CEIL1, -6.4);
  art(-11.85, y + 1.7, -6.4, H, 0.8, 1.0, M.art4);
  downlights(-11.5, -7.5, -5.5, -1.5, CEIL1, 2, 2);
}

function kids() {
  const y = F1;
  box(root, M.paintKids, -4.92, y, -7.85, -4.9, CEIL1, -1.08);
  box(root, M.paintKids, -4.92, y, -7.85, 1.92, CEIL1, -7.83);
  place(F.bunkBed(), -4.37, y, -6.7, 0, true);
  place(F.desk({ w: 1.3, d: 0.6, wood: M.whiteLacquer, exec: false }), 0.3, y, -7.53, 0, true);
  place(F.officeChair({ mat: M.kidsBlue }), 0.3, y, -6.85, PI);
  place(F.laptop(), 0.2, y + 0.775, -7.55, 0);
  place(F.tableLamp({ base: M.kidsYellow }), 0.8, y + 0.775, -7.6);
  place(F.mediaConsole({ w: 1.6, wood: M.whiteLacquer, soundbar: false }), 1.68, y, -4.2, -H, true);
  place(F.tv({ w: 1.3 }), 1.89, y + 1.05, -4.2, -H);
  boxc(root, M.blackGloss, 1.68, y + 0.67, -4.6, 0.3, 0.06, 0.25);
  F.rug(root, -0.8, -4.2, y, 2.6, 2.6, M.rugKids, true);
  const kidChair = (mat, x, z, rot) => {
    const c = F.armchair({ fab: mat, leg: M.whiteLacquer });
    c.scale.setScalar(0.72);
    place(c, x, y, z, rot, true);
  };
  kidChair(M.kidsRed, -0.2, -4.9, H);
  kidChair(M.kidsYellow, -0.2, -3.5, H);
  place(F.teepee(), 1.15, y, -1.9, 0.3, true);
  place(F.toyBox(), -3.2, y, -1.45, PI, true);
  place(F.cubbyShelf(), -4.72, y, -3.5, H, true);
  // basketball hoop
  box(root, M.whiteLacquer, -0.6, y + 2.0, -1.1, 0.2, y + 2.55, -1.08);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 24), M.kidsRed);
  hoop.rotation.x = H;
  hoop.position.set(-0.2, y + 2.08, -1.32);
  root.add(hoop);
  sphere(root, M.leatherCognac, -1.1, y + 0.12, -2.2, 0.12, 14);
  // hanging planets
  for (const [x, z, r, m] of [[-2.0, -4.5, 0.2, M.kidsYellow], [-1.2, -5.2, 0.13, M.kidsBlue], [-2.6, -5.4, 0.1, M.kidsRed]]) {
    rod(root, M.linen, [x, CEIL1, z], [x, CEIL1 - 0.7, z], 0.003, 3);
    sphere(root, m, x, CEIL1 - 0.7 - r, z, r, 16);
  }
  art(-1.6, y + 1.75, -7.83, 0, 0.9, 0.7, M.art2, M.whiteLacquer);
  for (const c of [-3.3, 0.3]) F.curtains(root, 'x', -7.83, c - 0.65, c + 0.65, y + 2.72, y + 0.02, 1, M.kidsYellow);
  place(F.pendant({ drop: 0.6, r: 0.22 }), -1.5, CEIL1, -4.4);
  downlights(-4.5, -7.5, 1.5, -1.5, CEIL1, 2, 2);
}

function guest() {
  const y = F1;
  box(root, M.paintSage, 11.83, y, 2.8, 11.85, CEIL1, 6.0);
  place(F.bed({ w: 1.75, len: 2.1, frame: M.fabricSand, duvet: M.linen, throwM: M.pillowTeal }), 10.65, y, 4.4, -H, true);
  for (const z of [3.05, 5.75]) place(F.nightstand({ wood: M.oakWood }), 11.6, y, z, -H, true);
  art(11.83, y + 2.2, 4.4, -H, 1.4, 0.9, M.artLand1);
  F.rug(root, 9.6, 4.4, y, 3.2, 3.0, M.rugModern);
  place(F.mediaConsole({ w: 2.0, wood: M.oakWood }), 3.33, y, 4.4, H, true);
  place(F.tv({ w: 1.5 }), 3.11, y + 1.1, 4.4, H);
  place(F.wardrobe({ w: 3.0, h: 2.6 }), 8.5, y, 1.39, 0, true);
  place(F.desk({ w: 1.2, d: 0.6, wood: M.oakWood, exec: false }), 6.1, y, 7.53, PI, true);
  place(F.diningChair({ fab: M.velvetEmerald, wood: M.oakWood }), 6.1, y, 6.95, 0);
  place(F.laptop(), 6.1, y + 0.775, 7.5, PI);
  place(F.tableLamp(), 5.7, y + 0.775, 7.6);
  place(F.armchair({ fab: M.fabricGray }), 10.4, y, 7.0, -PI * 0.75, true);
  place(F.floorLamp(), 11.4, y, 7.5, 0, true);
  place(F.plant({ s: 1.2, tall: true }), 3.55, y, 7.4, 0, true);
  place(F.ringChandelier({ r: 0.6 }), 7.5, CEIL1, 4.4);
  for (const c of [4.7, 7.5, 10.3]) F.curtains(root, 'x', 7.85, c - 0.65, c + 0.65, y + 2.72, y + 0.02, -1, M.fabricSand);
  downlights(3.5, 1.5, 11.5, 7.5, CEIL1, 3, 2);
}

function guestBath() {
  const y = F1;
  place(F.vanity({ w: 1.2, double: false }), 6.62, y, -4.0, -H, true);
  place(F.mirror({ w: 0.85, round: true }), 6.915, y + 1.65, -4.0, -H);
  place(F.toilet(), 2.45, y, -4.4, H, true);
  // shower
  box(root, M.tileShower, 6.89, y, -7.85, 6.92, y + 2.5, -6.0);
  box(root, M.tileShower, 5.2, y, -7.85, 6.92, y + 2.5, -7.82);
  box(root, M.tileShower, 5.2, y, -7.85, 6.92, y + 0.03, -6.0);
  box(root, M.glassClear, 5.18, y, -7.82, 5.2, y + 2.15, -6.0, true);
  box(root, M.glassClear, 5.9, y, -6.02, 6.89, y + 2.15, -6.0, true);
  cyl(root, M.chrome, 6.05, y + 2.3, -6.9, 0.15, 0.15, 0.02, 24);
  rod(root, M.chrome, [6.05, y + 2.31, -6.9], [6.88, y + 2.45, -6.9], 0.012, 6);
  place(F.towelRack(), 4.2, y, -1.1, PI);
  place(F.plant({ s: 0.9 }), 2.5, y, -7.4, 0, true);
  F.rug(root, 5.9, -4.0, y, 0.7, 1.2, M.linen);
  art(2.08, y + 1.8, -6.0, H, 0.7, 0.9, M.art0);
  place(F.pendant({ drop: 0.5, r: 0.16 }), 4.5, CEIL1, -4.2);
}

function gym() {
  const y = F1;
  box(root, M.paintNavy, 7.08, y, -7.85, 7.1, CEIL1, -1.08);
  box(root, M.ledStrip, 7.1, CEIL1 - 0.05, -7.85, 7.13, CEIL1 - 0.03, -1.08);
  place(F.mirror({ w: 1.6, h: 2.0, frame: M.blackMetal }), 7.1, y + 1.35, -4.6, H);
  place(F.treadmill(), 8.6, y, -6.5, PI, true);
  place(F.exerciseBike(), 10.7, y, -6.6, PI, true);
  place(F.weightBench(), 9.4, y, -3.5, 0, true);
  place(F.dumbbellRack(), 11.55, y, -4.3, -H, true);
  place(F.punchingBag(), 8.0, CEIL1, -2.3);
  addCollider(7.8, y, -2.5, 8.2, CEIL1, -2.1);
  place(F.tv({ w: 1.2 }), 11.83, y + 1.5, -6.6, -H);
  box(root, M.kidsPurple, 10.0, y, -2.9, 10.6, y + 0.012, -1.3);
  sphere(root, M.kidsBlue, 11.3, y + 0.32, -1.7, 0.32, 20);
  for (const c of [8.6, 10.7]) F.curtains(root, 'x', -7.85, c - 0.6, c + 0.6, y + 2.72, y + 0.02, 1, M.fabricGray);
  downlights(7.5, -7.5, 11.5, -1.5, CEIL1, 2, 3);
}

function hall2() {
  const y = F1;
  F.rug(root, -7.5, 0, y, 6.5, 1.1, M.rugNavy);
  F.rug(root, 7.6, 0, y, 6.5, 1.1, M.rugNavy);
  place(consoleTable(1.3, 0.36), -10.4, y, -0.72, 0, true);
  place(F.vaseFlowers({ s: 0.9 }), -10.4, y + 0.84, -0.72);
  art(-10.4, y + 1.85, -0.92, 0, 1.1, 0.75, M.art1);
  art(-9.0, y + 1.75, 0.92, PI, 1.2, 0.85, M.art3);
  art(8.0, y + 1.75, 0.92, PI, 1.2, 0.85, M.art4);
  art(6.5, y + 1.75, -0.92, 0, 1.0, 0.75, M.artLand0);
  place(F.plant({ s: 1.1, tall: true }), 11.4, y, -0.5, 0, true);
  for (const x of [-9, -5, 6, 10]) F.downlight(root, x, CEIL1, 0);
  for (const x of [-2.4, 0.4]) F.downlight(root, x, CEIL1, 0);
}
