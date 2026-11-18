// Geometry helpers, collision data and static-mesh baking (merge by material)
import * as THREE from '../vendor/three/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/three/addons/RoundedBoxGeometry.js';
import { mergeGeometries } from '../vendor/three/addons/BufferGeometryUtils.js';

// ---- global level constants (meters) ----
export const F0 = 0.45;          // ground floor level (raised foundation)
export const FH = 3.4;           // floor-to-floor height
export const F1 = F0 + FH;       // second floor level
export const TOP = F1 + FH;      // eave height
export const CEIL0 = F1 - 0.2;   // ground floor ceiling
export const CEIL1 = TOP - 0.2;  // upper floor ceiling

export const root = new THREE.Group(); // everything static; baked later
export const colliders = [];           // {x0,x1,z0,z1,y0,y1}
export const surfaces = [];            // walkable areas {x0,x1,z0,z1,y | ramp, except:[]}
export const holes = [];               // where the default ground (y=0) is not walkable

const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

export function addCollider(x0, y0, z0, x1, y1, z1) {
  colliders.push({
    x0: Math.min(x0, x1), x1: Math.max(x0, x1),
    y0: Math.min(y0, y1), y1: Math.max(y0, y1),
    z0: Math.min(z0, z1), z1: Math.max(z0, z1),
  });
}

export function addSurface(x0, z0, x1, z1, y, except = []) {
  surfaces.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y, except });
}
export function addRamp(x0, z0, x1, z1, zA, yA, zB, yB) {
  surfaces.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), ramp: { zA, yA, zB, yB }, except: [] });
}
export function addHole(x0, z0, x1, z1) {
  holes.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
}

const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

export function floorCandidates(x, z) {
  const out = [];
  let hole = false;
  for (const h of holes) if (inR(h, x, z)) { hole = true; break; }
  if (!hole) out.push(0);
  for (const s of surfaces) {
    if (!inR(s, x, z)) continue;
    if (s.except.some((e) => inR(e, x, z))) continue;
    if (s.ramp) {
      const { zA, yA, zB, yB } = s.ramp;
      const t = Math.min(1, Math.max(0, (z - zA) / (zB - zA)));
      out.push(yA + (yB - yA) * t);
    } else out.push(s.y);
  }
  return out;
}

export function hitsCollider(x, z, rad, yLo, yHi) {
  for (const c of colliders) {
    if (c.y1 <= yLo || c.y0 >= yHi) continue;
    if (x + rad > c.x0 && x - rad < c.x1 && z + rad > c.z0 && z - rad < c.z1) return true;
  }
  return false;
}

// ---- primitive helpers (parent can be root or a local group) ----
export function box(parent, mat, x0, y0, z0, x1, y1, z1, collide = false) {
  const m = new THREE.Mesh(UNIT_BOX, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.scale.set(Math.max(1e-4, Math.abs(x1 - x0)), Math.max(1e-4, Math.abs(y1 - y0)), Math.max(1e-4, Math.abs(z1 - z0)));
  parent.add(m);
  if (collide) addCollider(x0, y0, z0, x1, y1, z1);
  return m;
}
// center/size variant
export function boxc(parent, mat, cx, cy, cz, w, h, d) {
  const m = new THREE.Mesh(UNIT_BOX, mat);
  m.position.set(cx, cy, cz);
  m.scale.set(w, h, d);
  parent.add(m);
  return m;
}
export function plane(parent, mat, cx, cy, cz, w, h) {
  const m = new THREE.Mesh(UNIT_PLANE, mat);
  m.position.set(cx, cy, cz);
  m.scale.set(w, h, 1);
  parent.add(m);
  return m;
}
export function rbox(parent, mat, cx, cy, cz, w, h, d, r = 0.04) {
  const rr = Math.min(r, Math.min(w, h, d) * 0.49);
  const key = `rb${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${rr.toFixed(3)}`;
  const g = cached(key, () => new RoundedBoxGeometry(w, h, d, 2, rr));
  const m = new THREE.Mesh(g, mat);
  m.position.set(cx, cy, cz);
  parent.add(m);
  return m;
}
// cylinder standing on y0
export function cyl(parent, mat, x, y0, z, rTop, rBot, h, seg = 20) {
  const key = `cy${rTop.toFixed(3)}_${rBot.toFixed(3)}_${seg}`;
  const g = cached(key, () => new THREE.CylinderGeometry(rTop, rBot, 1, seg));
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y0 + h / 2, z);
  m.scale.set(1, h, 1);
  parent.add(m);
  return m;
}
// cylinder between two points
const _up = new THREE.Vector3(0, 1, 0);
export function rod(parent, mat, a, b, r, seg = 10) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const key = `rod${r.toFixed(3)}_${seg}`;
  const g = cached(key, () => new THREE.CylinderGeometry(r, r, 1, seg));
  const m = new THREE.Mesh(g, mat);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(_up, dir.normalize());
  parent.add(m);
  return m;
}
export function sphere(parent, mat, x, y, z, r, seg = 16) {
  const key = `sp${seg}`;
  const g = cached(key, () => new THREE.SphereGeometry(1, seg, Math.max(6, (seg * 0.7) | 0)));
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.scale.setScalar(r);
  parent.add(m);
  return m;
}
export function blob(parent, mat, x, y, z, sx, sy, sz) {
  const g = cached('ico1', () => new THREE.IcosahedronGeometry(1, 1));
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}
export function torus(parent, mat, x, y, z, R, r, seg = 32, arc = Math.PI * 2) {
  const key = `to${R.toFixed(3)}_${r.toFixed(3)}_${seg}_${arc.toFixed(2)}`;
  const g = cached(key, () => new THREE.TorusGeometry(R, r, 8, seg, arc));
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.rotation.x = Math.PI / 2;
  parent.add(m);
  return m;
}
export function cone(parent, mat, x, y0, z, r, h, seg = 12) {
  const g = cached('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg));
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y0 + h / 2, z);
  m.scale.set(r, h, r);
  parent.add(m);
  return m;
}
export function octa(parent, mat, x, y, z, s) {
  const g = cached('octa', () => new THREE.OctahedronGeometry(1, 0));
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.scale.set(s * 0.6, s, s * 0.6);
  parent.add(m);
  return m;
}

// Place a local group into the world
const _box3 = new THREE.Box3();
export function place(obj, x, y, z, rot = 0, collide = false, shrink = 0.04) {
  obj.position.set(x, y, z);
  obj.rotation.y = rot;
  root.add(obj);
  if (collide) {
    obj.updateMatrixWorld(true);
    _box3.setFromObject(obj);
    addCollider(_box3.min.x + shrink, _box3.min.y, _box3.min.z + shrink, _box3.max.x - shrink, _box3.max.y, _box3.max.z - shrink);
  }
  return obj;
}

// ---- walls ----
// axis 'x': wall runs along X at z = c ; axis 'z': runs along Z at x = c
// layers: [{mat, w0, w1}] offsets perpendicular to wall
// openings: [{a0, a1, b, t, type: 'window'|'door'|'arch'|'glassdoor'|'hole', ...}]
export function wall(axis, c, a0, a1, y0, y1, layers, openings = [], opt = {}) {
  const P = (u0, yy0, w0, u1, yy1, w1, mat, collide) => {
    if (axis === 'x') return box(root, mat, u0, yy0, c + w0, u1, yy1, c + w1, collide);
    return box(root, mat, c + w0, yy0, u0, c + w1, yy1, u1, collide);
  };
  const wMin = Math.min(...layers.map((l) => l.w0));
  const wMax = Math.max(...layers.map((l) => l.w1));
  const piece = (u0, u1, yy0, yy1) => {
    if (u1 - u0 < 1e-3 || yy1 - yy0 < 1e-3) return;
    layers.forEach((l) => P(u0, yy0, l.w0, u1, yy1, l.w1, l.mat, false));
    if (axis === 'x') addCollider(u0, yy0, c + wMin, u1, yy1, c + wMax);
    else addCollider(c + wMin, yy0, u0, c + wMax, yy1, u1);
  };
  const ops = [...openings].sort((p, q) => p.a0 - q.a0);
  let cur = a0;
  for (const o of ops) {
    piece(cur, o.a0, y0, y1);
    piece(o.a0, o.a1, y0, o.b);
    piece(o.a0, o.a1, o.t, y1);
    cur = o.a1;
  }
  piece(cur, a1, y0, y1);

  const trim = opt.trim || null;
  for (const o of ops) decorateOpening(P, o, wMin, wMax, trim, opt);
}

function decorateOpening(P, o, wMin, wMax, M, opt) {
  if (!M || o.type === 'hole') return;
  const T = M.trim;
  const cw = o.type === 'arch' ? 0.14 : 0.09; // casing width
  const ext = 0.025;
  const mid = (wMin + wMax) / 2;
  // casings on both faces
  for (const [f0, f1] of [[wMax, wMax + ext], [wMin - ext, wMin]]) {
    P(o.a0 - cw, o.b, f0, o.a0, o.t + cw, f1, T);
    P(o.a1, o.b, f0, o.a1 + cw, o.t + cw, f1, T);
    P(o.a0 - cw, o.t, f0, o.a1 + cw, o.t + cw, f1, T);
  }
  // jamb lining
  P(o.a0, o.b, wMin, o.a0 + 0.02, o.t, wMax, T);
  P(o.a1 - 0.02, o.b, wMin, o.a1, o.t, wMax, T);
  P(o.a0, o.t - 0.02, wMin, o.a1, o.t, wMax, T);
  if (o.type === 'window') {
    P(o.a0 - 0.12, o.b - 0.05, wMin - 0.06, o.a1 + 0.12, o.b, wMax + 0.06, T); // sill
    P(o.a0, o.b, wMin, o.a1, o.b + 0.02, wMax, T);
    // glass + mullions
    const g0 = mid - 0.012, g1 = mid + 0.012;
    P(o.a0, o.b, g0, o.a1, o.t, g1, M.glass);
    const fr = 0.05;
    P(o.a0, o.b, mid - 0.035, o.a0 + fr, o.t, mid + 0.035, T);
    P(o.a1 - fr, o.b, mid - 0.035, o.a1, o.t, mid + 0.035, T);
    P(o.a0, o.b, mid - 0.035, o.a1, o.b + fr, mid + 0.035, T);
    P(o.a0, o.t - fr, mid - 0.035, o.a1, o.t, mid + 0.035, T);
    if (!o.plain) {
      const w = o.a1 - o.a0, h = o.t - o.b;
      const nv = o.cols ?? Math.max(1, Math.round(w / 0.45) - 1);
      const nh = o.rows ?? Math.max(1, Math.round(h / 0.5) - 1);
      for (let i = 1; i <= nv; i++) {
        const u = o.a0 + (w * i) / (nv + 1);
        P(u - 0.016, o.b, mid - 0.025, u + 0.016, o.t, mid + 0.025, T);
      }
      for (let j = 1; j <= nh; j++) {
        const y = o.b + (h * j) / (nh + 1);
        P(o.a0, y - 0.016, mid - 0.025, o.a1, y + 0.016, mid + 0.025, T);
      }
    }
    // exterior shutters
    if (o.shutters && opt.out) {
      const s = opt.out; // +1 or -1 : outside direction
      const face = s > 0 ? wMax + ext : wMin - ext;
      const sw = Math.min(0.55, (o.a1 - o.a0) * 0.45);
      for (const [u0, u1] of [[o.a0 - cw - sw - 0.02, o.a0 - cw - 0.02], [o.a1 + cw + 0.02, o.a1 + cw + sw + 0.02]]) {
        P(u0, o.b, s > 0 ? face : face - 0.04, u1, o.t, s > 0 ? face + 0.04 : face, M.shutter);
        const h = o.t - o.b;
        for (let k = 0; k < 2; k++) {
          const yb = o.b + 0.08 + k * (h / 2), yt = o.b + (k + 1) * (h / 2) - 0.08;
          P(u0 + 0.06, yb, s > 0 ? face + 0.04 : face - 0.06, u1 - 0.06, yt, s > 0 ? face + 0.06 : face - 0.04, M.shutter);
        }
      }
    }
  }
  if (o.type === 'glassdoor') {
    const w = o.a1 - o.a0;
    const g0 = mid - 0.012, g1 = mid + 0.012;
    const n = 4, pw = w / n;
    // 4 panels: outer two fixed, inner two slid open (stacked behind) -> opening in the middle
    const panels = [[o.a0, o.a0 + pw, 0], [o.a0 + pw * 0.15, o.a0 + pw * 1.15, 0.06], [o.a1 - pw * 1.15, o.a1 - pw * 0.15, 0.06], [o.a1 - pw, o.a1, 0]];
    for (const [u0, u1, off] of panels) {
      P(u0, o.b, g0 + off, u1, o.t, g1 + off, M.glass);
      P(u0, o.b, mid - 0.03 + off, u0 + 0.05, o.t, mid + 0.03 + off, M.blackMetal);
      P(u1 - 0.05, o.b, mid - 0.03 + off, u1, o.t, mid + 0.03 + off, M.blackMetal);
      P(u0, o.b, mid - 0.03 + off, u1, o.b + 0.06, mid + 0.03 + off, M.blackMetal);
      P(u0, o.t - 0.06, mid - 0.03 + off, u1, o.t, mid + 0.03 + off, M.blackMetal);
    }
    // collide with fixed glass panels
    const cA = (u0, u1) => {
      if (opt.axis === 'x') addCollider(u0, o.b, opt.c + wMin, u1, o.t, opt.c + wMax);
      else addCollider(opt.c + wMin, o.b, u0, opt.c + wMax, o.t, u1);
    };
    cA(o.a0, o.a0 + pw * 1.15);
    cA(o.a1 - pw * 1.15, o.a1);
  }
}

// helpers for typical walls
export function extWall(M, axis, c, a0, a1, y0, y1, out, openings, outerMat) {
  const th = 0.15;
  const outer = outerMat || M.siding;
  const layers = out > 0
    ? [{ mat: outer, w0: 0, w1: th }, { mat: M.paint, w0: -th, w1: 0 }]
    : [{ mat: outer, w0: -th, w1: 0 }, { mat: M.paint, w0: 0, w1: th }];
  wall(axis, c, a0, a1, y0, y1, layers, openings.map((o) => ({ shutters: o.type === 'window' && o.shutters !== false, ...o })), { trim: M, out, axis, c });
}
export function intWall(M, axis, c, a0, a1, y0, y1, openings = [], mat) {
  const t = 0.08;
  wall(axis, c, a0, a1, y0, y1, [{ mat: mat || M.paint, w0: -t, w1: t }], openings, { trim: M, axis, c });
}

// ---- bake: merge every static mesh by material ----
export function bake(scene) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const tmpN = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.dynamic) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', g.getAttribute('position'));
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    ng.setAttribute('normal', g.getAttribute('normal'));
    const cnt = g.getAttribute('position').count;
    ng.setAttribute('uv', g.getAttribute('uv') ? g.getAttribute('uv') : new THREE.Float32BufferAttribute(new Float32Array(cnt * 2), 2));
    const s = o.material.userData.worldUV;
    if (s) {
      const pos = ng.getAttribute('position'), nor = ng.getAttribute('normal');
      const uv = new Float32Array(cnt * 2);
      for (let i = 0; i < cnt; i += 3) {
        tmpN.set(0, 0, 0);
        for (let k = 0; k < 3; k++) tmpN.x += nor.getX(i + k), tmpN.y += nor.getY(i + k), tmpN.z += nor.getZ(i + k);
        const ax = Math.abs(tmpN.x), ay = Math.abs(tmpN.y), az = Math.abs(tmpN.z);
        for (let k = 0; k < 3; k++) {
          const x = pos.getX(i + k), y = pos.getY(i + k), z = pos.getZ(i + k);
          let u, v;
          if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
          uv[(i + k) * 2] = u / s;
          uv[(i + k) * 2 + 1] = v / s;
        }
      }
      ng.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    }
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, list: [] });
    buckets.get(key).list.push(ng);
  });
  const meshes = [];
  for (const { mat, list } of buckets.values()) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mat.userData.cast !== false;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    scene.add(mesh);
    meshes.push(mesh);
  }
  // free source
  root.clear();
  return meshes;
}
