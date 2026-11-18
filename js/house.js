// House shell: floors, walls, stairs, roof, portico, garage, chimney
import * as THREE from '../vendor/three/three.module.min.js';
import {
  F0, FH, F1, TOP, CEIL0, CEIL1, root, box, cyl, rod, sphere, torus,
  extWall, intWall, addSurface, addRamp, addHole, addCollider,
} from './builder.js';

export const STAIR = { x0: 1.0, x1: 2.85, zBot: 6.6, zTop: 1.0, steps: 20 };
export const VOID = { x0: -2.92, x1: 2.92, z0: 1.0, z1: 8.15 };

const W = (c, w, b, t, extra = {}) => ({ a0: c - w / 2, a1: c + w / 2, b, t, type: 'window', ...extra });

function roofGeometry(faces, tile = 2) {
  // faces: arrays of 3 or 4 points [x,y,z]; first two points define the eave direction
  const pos = [], uv = [];
  const e = new THREE.Vector3(), s = new THREE.Vector3(), n = new THREE.Vector3(), p = new THREE.Vector3();
  for (const f of faces) {
    const P = f.map((q) => new THREE.Vector3(...q));
    e.subVectors(P[1], P[0]).normalize();
    n.subVectors(P[2], P[0]).cross(e).negate().normalize();
    s.crossVectors(n, e).normalize();
    const tris = f.length === 4 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 2]];
    for (const t of tris) for (const k of t) {
      pos.push(P[k].x, P[k].y, P[k].z);
      p.subVectors(P[k], P[0]);
      uv.push(p.dot(e) / tile, Math.abs(p.dot(s)) / tile);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

export function buildHouse(M) {
  const b0 = F0 + 0.8, t0 = F0 + 2.55, b1 = F1 + 0.8, t1 = F1 + 2.5;

  // ---------- foundation & floors ----------
  box(root, M.concrete, -12.15, 0, -8.15, 12.15, F0 - 0.02, 8.15);
  const fl = (mat, x0, z0, x1, z1, y) => box(root, mat, x0, y - 0.02, z0, x1, y, z1);
  fl(M.marbleTile, -3, 0, 3, 8, F0);         // foyer
  fl(M.oak, -12, 0, -3, 8, F0);              // living
  fl(M.oak, -12, -8, -4, 0, F0);             // dining
  fl(M.marbleTile, -4, -8, 4, 0, F0);        // kitchen
  fl(M.cinemaCarpet, 3, 0, 12, 8, F0);       // cinema
  fl(M.walnutFloor, 4, -8, 12, 0, F0);       // office
  // foyer medallion
  cyl(root, M.marbleDark, -0.6, F0, 4.2, 1.35, 1.35, 0.006, 48);
  cyl(root, M.marble, -0.6, F0, 4.2, 1.2, 1.2, 0.012, 48);
  cyl(root, M.marbleDark, -0.6, F0, 4.2, 0.35, 0.35, 0.018, 32);

  // ceiling slab of ground floor (leaves the foyer void open)
  const slab = (x0, z0, x1, z1) => box(root, M.ceiling, x0, CEIL0, z0, x1, F1 - 0.02, z1);
  slab(-12.15, -8.15, -2.92, 8.15);
  slab(2.92, -8.15, 12.15, 8.15);
  slab(-2.92, -8.15, 2.92, 1.0);
  box(root, M.trim, -2.92, CEIL0 - 0.06, 0.96, 2.92, F1, 1.04); // balcony edge trim

  // upper floors
  fl(M.oak, -12, 1, -3, 8, F1);              // master
  fl(M.oak, 3, 1, 12, 8, F1);                // guest
  fl(M.oak, -12, -1, 12, 1, F1);             // corridor
  fl(M.marbleTile, -12, -8, -5, -1, F1);     // master bath
  fl(M.oakLight, -5, -8, 2, -1, F1);         // kids
  fl(M.tileBath, 2, -8, 7, -1, F1);          // guest bath
  fl(M.gymFloor, 7, -8, 12, -1, F1);         // gym
  // top ceiling / attic floor
  box(root, M.ceiling, -12.15, CEIL1, -8.15, 12.15, TOP, 8.15);
  // cinema starry ceiling
  box(root, M.stars, 3.08, CEIL0 - 0.014, 0.08, 11.85, CEIL0 - 0.004, 7.85);

  // ---------- exterior walls ----------
  // front (z = 8)
  extWall(M, 'x', 8, -12.15, 12.15, 0, F1, 1, [
    W(-10.3, 1.3, b0, t0), W(-7.5, 1.3, b0, t0), W(-4.7, 1.3, b0, t0),
    W(-1.28, 0.36, F0 + 0.15, F0 + 2.75, { shutters: false, cols: 0, rows: 4 }),
    { a0: -0.95, a1: 0.95, b: F0, t: F0 + 2.75, type: 'door' },
    W(0, 1.9, F0 + 2.88, F0 + 3.22, { shutters: false, cols: 5, rows: 0 }),
    W(1.28, 0.36, F0 + 0.15, F0 + 2.75, { shutters: false, cols: 0, rows: 4 }),
    W(4.7, 1.3, b0, t0), W(7.5, 1.3, b0, t0), W(10.3, 1.3, b0, t0),
  ]);
  extWall(M, 'x', 8, -12.15, 12.15, F1, TOP, 1, [
    W(-10.3, 1.3, b1, t1), W(-7.5, 1.3, b1, t1), W(-4.7, 1.3, b1, t1),
    W(0, 2.4, F1 + 0.35, F1 + 2.85, { shutters: false, cols: 3, rows: 3 }),
    W(4.7, 1.3, b1, t1), W(7.5, 1.3, b1, t1), W(10.3, 1.3, b1, t1),
  ]);
  // back (z = -8)
  extWall(M, 'x', -8, -12.15, 12.15, 0, F1, -1, [
    W(-10.5, 1.4, b0, t0), W(-7, 1.4, b0, t0),
    { a0: -2.6, a1: 2.6, b: F0, t: F0 + 2.6, type: 'glassdoor' },
    W(6.5, 1.4, b0, t0), W(9.8, 1.4, b0, t0),
  ]);
  extWall(M, 'x', -8, -12.15, 12.15, F1, TOP, -1, [
    W(-10.2, 1.1, F1 + 1.0, t1), W(-7.0, 1.1, F1 + 1.0, t1),
    W(-3.3, 1.3, b1, t1), W(0.3, 1.3, b1, t1),
    W(4.5, 1.0, F1 + 1.0, t1),
    W(8.6, 1.2, b1, t1), W(10.7, 1.2, b1, t1),
  ]);
  // west (x = -12)
  extWall(M, 'z', -12, -7.85, 7.85, 0, F1, -1, [W(-4, 1.4, b0, t0), W(1.7, 1.1, b0, t0), W(6.3, 1.1, b0, t0)]);
  extWall(M, 'z', -12, -7.85, 7.85, F1, TOP, -1, [
    W(-4.5, 1.0, F1 + 1.0, t1), W(0, 0.8, b1, t1, { shutters: false }), W(2.0, 1.1, b1, t1), W(6.5, 1.1, b1, t1),
  ]);
  // east (x = 12) – garage sits against z 0..8 on the ground floor
  extWall(M, 'z', 12, -7.85, 7.85, 0, F1, 1, [
    W(-4, 1.4, b0, t0),
    { a0: 1.0, a1: 2.0, b: F0, t: F0 + 2.2, type: 'door' },
  ]);
  extWall(M, 'z', 12, -7.85, 7.85, F1, TOP, 1, [
    W(-4.5, 1.2, b1, t1), W(0, 0.8, b1, t1, { shutters: false }), W(6.6, 1.1, b1, t1, { shutters: false }),
  ]);

  // corner boards, belt course, frieze, foundation stone band
  for (const [x, z] of [[-12.15, 8.15], [12.15, 8.15], [-12.15, -8.15], [12.15, -8.15]]) {
    box(root, M.trim, x - 0.12, 0, z - 0.12, x + 0.12, TOP, z + 0.12);
  }
  const band = (y0, y1, out, mat) => {
    box(root, mat, -12.15 - out, y0, 8.15, 12.15 + out, y1, 8.15 + out);
    box(root, mat, -12.15 - out, y0, -8.15 - out, 12.15 + out, y1, -8.15);
    box(root, mat, -12.15 - out, y0, -8.15, -12.15, y1, 8.15);
  };
  band(0, F0 + 0.1, 0.05, M.stone);
  box(root, M.stone, 12.15, 0, -8.15, 12.2, F0 + 0.1, 0);
  band(F1 - 0.1, F1 + 0.06, 0.04, M.trim);
  box(root, M.trim, 12.15, F1 - 0.1, -8.15, 12.19, F1 + 0.06, -0.15);
  band(TOP - 0.32, TOP, 0.035, M.trim);
  box(root, M.trim, 12.15, TOP - 0.32, -8.15, 12.185, TOP, 8.15);

  // ---------- interior walls ----------
  // ground floor
  intWall(M, 'z', -3, 0.08, 7.85, F0, F1, [{ a0: 2.4, a1: 5.6, b: F0, t: F0 + 2.75, type: 'arch' }]);
  intWall(M, 'z', 3, 0.08, 7.85, F0, F1, [{ a0: 6.75, a1: 7.65, b: F0, t: F0 + 2.3, type: 'door' }]);
  intWall(M, 'x', 0, -11.85, 11.85, F0, F1, [
    { a0: -10.2, a1: -6.6, b: F0, t: F0 + 2.75, type: 'arch' },
    { a0: -2.2, a1: 0.6, b: F0, t: F0 + 2.75, type: 'arch' },
  ]);
  intWall(M, 'z', -4, -7.85, -0.08, F0, F1, [{ a0: -6.2, a1: -1.8, b: F0, t: F0 + 2.75, type: 'arch' }]);
  intWall(M, 'z', 4, -7.85, -0.08, F0, F1, [{ a0: -2.05, a1: -1.05, b: F0, t: F0 + 2.3, type: 'door' }]);
  // upper floor
  intWall(M, 'x', 1, -11.85, -3.0, F1, TOP, [{ a0: -5.1, a1: -4.1, b: F1, t: F1 + 2.3, type: 'door' }]);
  intWall(M, 'x', 1, 3.0, 11.85, F1, TOP, [{ a0: 4.1, a1: 5.1, b: F1, t: F1 + 2.3, type: 'door' }]);
  intWall(M, 'x', -1, -11.85, 11.85, F1, TOP, [
    { a0: -7.2, a1: -6.2, b: F1, t: F1 + 2.3, type: 'door' },
    { a0: -2.4, a1: -1.4, b: F1, t: F1 + 2.3, type: 'door' },
    { a0: 3.8, a1: 4.8, b: F1, t: F1 + 2.3, type: 'door' },
    { a0: 9.0, a1: 10.0, b: F1, t: F1 + 2.3, type: 'door' },
  ]);
  intWall(M, 'z', -3, 0.92, 7.85, F1, TOP);
  intWall(M, 'z', 3, 0.92, 7.85, F1, TOP);
  intWall(M, 'z', -5, -7.85, -1.08, F1, TOP);
  intWall(M, 'z', 2, -7.85, -1.08, F1, TOP);
  intWall(M, 'z', 7, -7.85, -1.08, F1, TOP);

  // ---------- grand staircase ----------
  const { x0, x1, zBot, zTop, steps } = STAIR;
  const run = (zBot - zTop) / steps, rise = FH / steps;
  for (let i = 0; i < steps; i++) {
    const zf = zBot - i * run, zb = zf - run, yt = F0 + (i + 1) * rise;
    box(root, M.whiteLacquer, x0, F0, zb, x1, yt - 0.035, zf);
    box(root, M.walnut, x0 - 0.02, yt - 0.035, zb, x1 + 0.01, yt, zf + 0.03);
    // balusters
    rod(root, M.blackMetal, [x0 + 0.05, yt, zb + run / 2], [x0 + 0.05, yt + 0.92, zb + run / 2], 0.012, 6);
  }
  rod(root, M.walnut, [x0 + 0.05, F0 + 0.95, zBot + 0.05], [x0 + 0.05, F1 + 0.95, zTop], 0.035, 10);
  box(root, M.walnut, x0 - 0.03, F0, zBot - 0.12, x0 + 0.15, F0 + 1.15, zBot + 0.06);
  sphere(root, M.gold, x0 + 0.06, F0 + 1.22, zBot - 0.03, 0.08, 14);
  addRamp(x0, zTop, x1, zBot, zBot, F0, zTop, F1);
  // stair runner (carpet strip on treads, look)
  for (let i = 0; i < steps; i++) {
    const zf = zBot - i * run, zb = zf - run, yt = F0 + (i + 1) * rise;
    box(root, M.velvetNavy, x0 + 0.3, yt, zb, x1 - 0.3, yt + 0.008, zf + 0.03);
  }

  // gallery railing at upper floor (glass + walnut handrail)
  box(root, M.glassClear, -2.92, F1, 0.98, x0, F1 + 0.98, 1.02);
  box(root, M.walnut, -2.92, F1 + 0.98, 0.95, x0 + 0.05, F1 + 1.04, 1.05);
  box(root, M.gold, -2.92, F1, 0.96, x0, F1 + 0.04, 1.04);
  for (let x = -2.9; x <= x0; x += 0.8) box(root, M.gold, x - 0.02, F1, 0.97, x + 0.02, F1 + 0.98, 1.03);
  addCollider(-2.92, F1, 0.92, x0 + 0.05, F1 + 1.05, 1.08);

  // walkable surfaces
  const stairRect = { x0: x0, x1: x1, z0: zTop, z1: zBot };
  addSurface(-12.15, -8.15, 12.15, 8.15, F0, [stairRect]);
  addSurface(-12.15, -8.15, 12.15, 8.15, F1, [VOID]);
  addHole(-12.2, -8.2, 12.2, 8.2);

  // ---------- front door (double, opened inward) ----------
  for (const s of [-1, 1]) {
    const hx = s * 0.95;
    const xa = s < 0 ? hx : hx - 0.06, xb = s < 0 ? hx + 0.06 : hx;
    box(root, M.ebony, xa, F0, 6.93, xb, F0 + 2.74, 7.85);
    for (const [y0, y1] of [[F0 + 0.2, F0 + 1.15], [F0 + 1.35, F0 + 2.55]]) {
      const ox = s < 0 ? xb : xa - 0.012;
      box(root, M.walnut, ox, y0, 7.05, ox + 0.012, y1, 7.73);
    }
    box(root, M.gold, s < 0 ? xb : xa - 0.03, F0 + 1.0, 7.0, s < 0 ? xb + 0.03 : xa, F0 + 1.35, 7.03);
    addCollider(xa, F0, 6.93, xb, F0 + 2.74, 7.85);
  }

  // ---------- portico with columns ----------
  box(root, M.marbleTile, -3.95, 0, 8.15, 3.95, F0, 10.95);
  box(root, M.marbleTile, -2.5, 0, 10.95, 2.5, 0.3, 11.4);
  box(root, M.marbleTile, -2.5, 0, 11.4, 2.5, 0.15, 11.85);
  addSurface(-3.95, 8.15, 3.95, 10.95, F0);
  addSurface(-2.5, 10.95, 2.5, 11.4, 0.3);
  addSurface(-2.5, 11.4, 2.5, 11.85, 0.15);
  for (const x of [-3.4, -1.25, 1.25, 3.4]) {
    box(root, M.trim, x - 0.38, F0, 10.0, x + 0.38, F0 + 0.28, 10.76);
    cyl(root, M.trim, x, F0 + 0.28, 10.38, 0.24, 0.29, TOP - 0.85 - F0, 28);
    torus(root, M.trim, x, F0 + 0.34, 10.38, 0.29, 0.05, 28);
    torus(root, M.trim, x, TOP - 0.62, 10.38, 0.25, 0.05, 28);
    box(root, M.trim, x - 0.36, TOP - 0.6, 10.02, x + 0.36, TOP - 0.55, 10.74);
    addCollider(x - 0.3, F0, 10.08, x + 0.3, TOP, 10.68);
  }
  box(root, M.trim, -4.0, TOP - 0.55, 8.15, 4.0, TOP + 0.06, 11.0);
  box(root, M.trim, -4.05, TOP - 0.2, 10.95, 4.05, TOP + 0.06, 11.08);
  // pediment
  const ped = new THREE.Shape();
  ped.moveTo(-4.0, 0);
  ped.lineTo(4.0, 0);
  ped.lineTo(0, 2.05);
  ped.closePath();
  const pedG = new THREE.ExtrudeGeometry(ped, { depth: 0.3, bevelEnabled: false });
  const pedM = new THREE.Mesh(pedG, M.trim);
  pedM.position.set(0, TOP + 0.06, 10.75);
  root.add(pedM);
  // oculus
  const oc = cyl(root, M.trim, 0, 0, 11.03, 0.42, 0.42, 0.06, 32);
  oc.rotation.x = Math.PI / 2;
  oc.position.set(0, TOP + 0.78, 11.06);
  const oc2 = cyl(root, M.glass, 0, 0, 11.07, 0.32, 0.32, 0.04, 32);
  oc2.rotation.x = Math.PI / 2;
  oc2.position.set(0, TOP + 0.78, 11.09);
  // portico roof
  const pr = TOP + 0.06, ph = 2.3;
  const porticoRoof = roofGeometry([
    [[-4.35, pr, 11.25], [-4.35, pr, 3.8], [0, pr + ph, 3.8], [0, pr + ph, 11.25]],
    [[4.35, pr, 3.8], [4.35, pr, 11.25], [0, pr + ph, 11.25], [0, pr + ph, 3.8]],
  ]);
  root.add(new THREE.Mesh(porticoRoof, M.roof));
  rod(root, M.shutter, [0, pr + ph + 0.02, 11.25], [0, pr + ph + 0.02, 4.0], 0.07, 8);
  // hanging lantern
  rod(root, M.blackMetal, [0, TOP - 0.55, 9.6], [0, TOP - 1.6, 9.6], 0.01, 4);
  box(root, M.blackMetal, -0.25, TOP - 2.4, 9.35, 0.25, TOP - 2.35, 9.85);
  box(root, M.blackMetal, -0.2, TOP - 1.68, 9.4, 0.2, TOP - 1.6, 9.8);
  box(root, M.glass, -0.2, TOP - 2.35, 9.4, 0.2, TOP - 1.68, 9.8);
  sphere(root, M.bulb, 0, TOP - 2.0, 9.6, 0.09, 12);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(root, M.blackMetal, sx * 0.2 - 0.015, TOP - 2.38, 9.6 + sz * 0.2 - 0.015, sx * 0.2 + 0.015, TOP - 1.62, 9.6 + sz * 0.2 + 0.015);
  // wall lanterns by the door
  for (const s of [-1, 1]) {
    box(root, M.blackMetal, s * 1.85 - 0.08, F0 + 1.95, 8.15, s * 1.85 + 0.08, F0 + 2.05, 8.25);
    box(root, M.glass, s * 1.85 - 0.11, F0 + 2.05, 8.18, s * 1.85 + 0.11, F0 + 2.45, 8.4);
    sphere(root, M.bulb, s * 1.85, F0 + 2.25, 8.29, 0.06, 10);
    box(root, M.blackMetal, s * 1.85 - 0.13, F0 + 2.45, 8.16, s * 1.85 + 0.13, F0 + 2.5, 8.42);
  }

  // ---------- main hip roof ----------
  const ex = 12.6, ez = 8.6, ry = TOP + 0.06, rh = 4.0, rx = ex - ez;
  const roof = roofGeometry([
    [[-ex, ry, ez], [ex, ry, ez], [rx, ry + rh, 0], [-rx, ry + rh, 0]],
    [[ex, ry, -ez], [-ex, ry, -ez], [-rx, ry + rh, 0], [rx, ry + rh, 0]],
    [[-ex, ry, -ez], [-ex, ry, ez], [-rx, ry + rh, 0]],
    [[ex, ry, ez], [ex, ry, -ez], [rx, ry + rh, 0]],
  ]);
  root.add(new THREE.Mesh(roof, M.roof));
  // ridge + hip caps
  rod(root, M.shutter, [-rx, ry + rh + 0.03, 0], [rx, ry + rh + 0.03, 0], 0.07, 8);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rod(root, M.shutter, [sx * ex, ry + 0.03, sz * ez], [sx * rx, ry + rh + 0.03, 0], 0.06, 8);
  // soffit + fascia
  box(root, M.trim, -ex, TOP, -ez, ex, TOP + 0.06, ez);
  box(root, M.trim, -ex - 0.04, TOP - 0.1, ez, ex + 0.04, TOP + 0.2, ez + 0.05);
  box(root, M.trim, -ex - 0.04, TOP - 0.1, -ez - 0.05, ex + 0.04, TOP + 0.2, -ez);
  box(root, M.trim, -ex - 0.05, TOP - 0.1, -ez, -ex, TOP + 0.2, ez);
  box(root, M.trim, ex, TOP - 0.1, -ez, ex + 0.05, TOP + 0.2, ez);

  // ---------- chimney ----------
  box(root, M.stone, -13.05, 0, 3.1, -12.15, 12.4, 4.9);
  box(root, M.trim, -13.15, 12.4, 3.0, -12.05, 12.55, 5.0);
  for (const z of [3.6, 4.4]) cyl(root, M.concrete, -12.6, 12.55, z, 0.13, 0.15, 0.4, 12);
  addCollider(-13.05, 0, 3.1, -12.15, 12.4, 4.9);

  // ---------- garage ----------
  const gx0 = 12.15, gx1 = 19.5;
  extWall(M, 'x', 8, gx0, gx1 + 0.15, 0, 3.6, 1, [{ a0: 12.75, a1: 18.95, b: 0, t: 2.6, type: 'door' }]);
  extWall(M, 'x', 0, gx0, gx1 + 0.15, 0, 3.6, -1, [W(16.0, 1.2, 1.2, 2.3)]);
  extWall(M, 'z', gx1, 0.15, 7.85, 0, 3.6, 1, [W(4.0, 1.4, 1.2, 2.3)]);
  box(root, M.concrete, gx0, 0, 0.15, gx1, 0.02, 7.85);
  box(root, M.ceiling, gx0, 3.4, 0.0, gx1, 3.6, 8.0);
  box(root, M.stone, gx0, 0, 0.0, gx1 + 0.2, 0.25, -0.2);
  box(root, M.stone, gx1 + 0.15, 0, 0.0, gx1 + 0.2, 0.25, 8.0);
  for (const [x, z] of [[gx1 + 0.15, 8.15], [gx1 + 0.15, -0.15]]) box(root, M.trim, x - 0.12, 0, z - 0.12, x + 0.12, 3.6, z + 0.12);
  box(root, M.trim, gx0, 3.3, 8.15, gx1 + 0.15, 3.6, 8.19);
  // rolled-up garage door panel + tracks
  box(root, M.whiteLacquer, 12.8, 2.62, 4.6, 18.9, 2.67, 7.85);
  for (const x of [12.8, 18.9]) box(root, M.steel, x - 0.03, 2.55, 4.6, x + 0.03, 2.62, 7.9);
  // garage -> house steps
  box(root, M.stone, gx0, 0, 0.85, 13.0, 0.22, 2.15);
  addSurface(gx0, 0.85, 13.0, 2.15, 0.22);
  // garage roof (abuts house)
  const gr = 3.6, gh = 1.8, gz0 = -0.4, gz1 = 8.4, gxr = gx1 + 0.4, gmid = 4.0, gr2 = gxr - (gz1 - gmid);
  const groof = roofGeometry([
    [[gx0, gr, gz1], [gxr, gr, gz1], [gr2, gr + gh, gmid], [gx0, gr + gh, gmid]],
    [[gxr, gr, gz0], [gx0, gr, gz0], [gx0, gr + gh, gmid], [gr2, gr + gh, gmid]],
    [[gxr, gr, gz1], [gxr, gr, gz0], [gr2, gr + gh, gmid]],
  ]);
  root.add(new THREE.Mesh(groof, M.roof));
  rod(root, M.shutter, [gx0, gr + gh + 0.03, gmid], [gr2, gr + gh + 0.03, gmid], 0.06, 8);
  box(root, M.trim, gx0, gr - 0.1, gz1, gxr, gr + 0.15, gz1 + 0.05);
  box(root, M.trim, gx0, gr - 0.1, gz0 - 0.05, gxr, gr + 0.15, gz0);
  box(root, M.trim, gxr, gr - 0.1, gz0, gxr + 0.05, gr + 0.15, gz1);
  box(root, M.trim, gx0, 3.6, gz0, gxr, 3.64, gz1);
  addSurface(gx0, 0.15, gx1, 7.85, 0.02);
}
