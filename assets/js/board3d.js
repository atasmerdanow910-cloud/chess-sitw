// 3D-сцена: доска, фигуры (LatheGeometry / ExtrudeGeometry), свет и анимация ходов.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const GRAVE_SCALE = 0.7;
const FLOOR_Y = -0.55;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------------------------------------------ */
/*  Геометрия фигур                                                    */
/* ------------------------------------------------------------------ */

function arc(cx, cy, r, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([Math.max(0, cx + r * Math.cos(a)), cy + r * Math.sin(a)]);
  }
  return pts;
}

function lathe(profile, segments = 48) {
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments);
}

// Общее основание фигуры (подставка с валиком).
function base(r) {
  return [
    [0, 0], [r, 0], [r + 0.012, 0.014], [r + 0.012, 0.06], [r - 0.025, 0.09],
    [r - 0.03, 0.108], [r - 0.02, 0.128], [r - 0.07, 0.158],
  ];
}

function merge(parts) {
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
}

function buildGeometries() {
  const G = {};

  // Пешка
  G.P = lathe([
    ...base(0.31),
    [0.2, 0.18], [0.16, 0.23], [0.13, 0.3], [0.112, 0.38], [0.108, 0.41],
    [0.18, 0.425], [0.19, 0.445], [0.178, 0.462], [0.1, 0.472],
    ...arc(0, 0.585, 0.13, -1.0, Math.PI / 2, 16),
  ]);

  // Ладья: корпус + зубцы короны
  {
    const body = lathe([
      ...base(0.335),
      [0.235, 0.2], [0.205, 0.26], [0.19, 0.38], [0.188, 0.52],
      [0.225, 0.55], [0.25, 0.58], [0.25, 0.6], [0.265, 0.62], [0.265, 0.7],
      [0.205, 0.7], [0.205, 0.665], [0, 0.665],
    ]);
    const parts = [body];
    // зубцы — выдавленные кольцевые секторы со скруглёнными гранями
    const n = 6;
    const span = (Math.PI * 2 / n) * 0.6;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = a0 + span;
      const sh = new THREE.Shape();
      sh.absarc(0, 0, 0.255, a0, a1, false);
      sh.absarc(0, 0, 0.215, a1, a0, true);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, {
        depth: 0.085, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 10,
      });
      g.rotateX(-Math.PI / 2);
      g.translate(0, 0.712, 0);
      parts.push(g);
    }
    G.R = merge(parts);
  }

  // Конь: точёное основание + выдавленный силуэт головы
  {
    const foot = lathe([
      ...base(0.335),
      [0.25, 0.19], [0.245, 0.225], [0, 0.225],
    ]);
    const V = (x, y) => new THREE.Vector2(x, y);
    const s = new THREE.Shape();
    s.moveTo(-0.21, 0);
    s.lineTo(0.21, 0);
    s.splineThru([
      V(0.2, 0.07), V(0.13, 0.16), V(0.095, 0.25),
      V(0.15, 0.32), V(0.25, 0.37), V(0.31, 0.43),
      V(0.3, 0.495), V(0.22, 0.54), V(0.14, 0.6),
      V(0.1, 0.68), V(0.065, 0.77),
      V(0.0, 0.705), V(-0.08, 0.675),
      V(-0.16, 0.585), V(-0.21, 0.45), V(-0.235, 0.3), V(-0.24, 0.15), V(-0.22, 0.05),
    ]);
    s.lineTo(-0.21, 0);
    const head = new THREE.ExtrudeGeometry(s, {
      depth: 0.15, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.035,
      bevelSegments: 5, curveSegments: 48,
    });
    head.translate(-0.02, 0, -0.075);
    // морда и уши уже затылка — так голова выглядит живее
    const pos = head.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      let k = 1 - clamp((x - 0.02) / 0.3, 0, 1) * 0.38;
      if (y > 0.62) k *= 1 - clamp((y - 0.62) / 0.16, 0, 1) * 0.3;
      pos.setZ(i, pos.getZ(i) * k);
    }
    head.scale(1.05, 1.05, 1);
    head.translate(0, 0.205, 0);
    // глаз — маленькая выемка-бусина с обеих сторон
    const eyeL = new THREE.SphereGeometry(0.022, 12, 8);
    eyeL.translate(0.17, 0.205 + 0.565, 0.11);
    const eyeR = eyeL.clone();
    eyeR.translate(0, 0, -0.22);
    G.N = merge([foot, head, eyeL, eyeR]);
  }

  // Слон: ножка, воротник, митра и шарик
  {
    const mitre = [];
    for (let i = 0; i <= 18; i++) {
      const t = (i / 18) * 0.94;
      mitre.push([0.172 * Math.sin(Math.PI * (0.25 + 0.75 * t)), 0.63 + t * 0.33]);
    }
    G.B = lathe([
      ...base(0.325),
      [0.215, 0.2], [0.175, 0.27], [0.145, 0.4], [0.128, 0.5], [0.122, 0.54],
      [0.2, 0.555], [0.215, 0.578], [0.2, 0.6], [0.128, 0.612],
      ...mitre,
      [0.02, 0.955],
      ...arc(0, 0.995, 0.045, -1.1, Math.PI / 2, 10),
    ]);
  }

  // Ферзь: высокая ножка, корона с зубчиками и шар на вершине
  {
    const body = lathe([
      ...base(0.36),
      [0.25, 0.2], [0.2, 0.27], [0.165, 0.4], [0.145, 0.55], [0.135, 0.66], [0.132, 0.69],
      [0.22, 0.705], [0.235, 0.727], [0.22, 0.75], [0.14, 0.76], [0.132, 0.785],
      [0.16, 0.84], [0.205, 0.92], [0.245, 0.985], [0.25, 1.0],
      [0.23, 1.008], [0.17, 1.004], [0.13, 1.022], [0.1, 1.05], [0.06, 1.066], [0, 1.07],
    ]);
    const parts = [body];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      const b = new THREE.SphereGeometry(0.036, 12, 8);
      b.translate(Math.cos(th) * 0.232, 1.025, Math.sin(th) * 0.232);
      parts.push(b);
    }
    const top = new THREE.SphereGeometry(0.065, 20, 14);
    top.translate(0, 1.125, 0);
    parts.push(top);
    G.Q = merge(parts);
  }

  // Король: самая высокая фигура с крестом
  {
    const body = lathe([
      ...base(0.37),
      [0.26, 0.2], [0.21, 0.28], [0.175, 0.42], [0.155, 0.58], [0.143, 0.73], [0.14, 0.76],
      [0.23, 0.775], [0.245, 0.798], [0.23, 0.822], [0.15, 0.832], [0.14, 0.858],
      [0.17, 0.92], [0.215, 1.01], [0.24, 1.075], [0.236, 1.095],
      [0.17, 1.108], [0.13, 1.14], [0.08, 1.168], [0.05, 1.18], [0, 1.185],
    ]);
    const v = new THREE.BoxGeometry(0.075, 0.25, 0.075);
    v.translate(0, 1.29, 0);
    const h = new THREE.BoxGeometry(0.21, 0.075, 0.075);
    h.translate(0, 1.32, 0);
    G.K = merge([body, v, h]);
  }

  for (const g of Object.values(G)) g.computeBoundingSphere();
  return G;
}

/* ------------------------------------------------------------------ */
/*  Текстуры                                                           */
/* ------------------------------------------------------------------ */

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function woodSquare(g, x, y, size, base, grain, rnd, vertical) {
  g.fillStyle = base;
  g.fillRect(x, y, size, size);
  g.save();
  g.beginPath();
  g.rect(x, y, size, size);
  g.clip();
  const lines = 26;
  for (let i = 0; i < lines; i++) {
    const off = (i / lines) * size + rnd() * 6;
    const amp = 1 + rnd() * 3.5;
    const freq = 0.01 + rnd() * 0.02;
    const ph = rnd() * 10;
    g.strokeStyle = grain;
    g.globalAlpha = 0.05 + rnd() * 0.09;
    g.lineWidth = 0.8 + rnd() * 2.2;
    g.beginPath();
    for (let t = 0; t <= size; t += 6) {
      const w = Math.sin(t * freq + ph) * amp;
      if (vertical) (t === 0 ? g.moveTo(x + off + w, y + t) : g.lineTo(x + off + w, y + t));
      else (t === 0 ? g.moveTo(x + t, y + off + w) : g.lineTo(x + t, y + off + w));
    }
    g.stroke();
  }
  g.restore();
  g.globalAlpha = 1;
}

function boardTexture(maxAniso) {
  const S = 2048;
  const unit = S / 9.2; // 8 клеток + рамка по 0.6
  const B = 0.6 * unit;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const rnd = rand(7);

  // рамка — тёмный орех
  woodSquare(g, 0, 0, S, '#1d140e', '#000000', rnd, false);
  const vign = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = vign;
  g.fillRect(0, 0, S, S);

  // клетки
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const light = (r + f) % 2 === 0;
      const x = B + f * unit;
      const y = B + r * unit;
      woodSquare(
        g, x, y, unit + 0.5,
        light ? '#d8c29a' : '#6a4630',
        light ? '#8a6a44' : '#22140b',
        rnd, (r + f) % 4 < 2,
      );
    }
  }

  // золотая окантовка игрового поля
  g.strokeStyle = 'rgba(214,178,108,0.9)';
  g.lineWidth = 5;
  g.strokeRect(B - 14, B - 14, 8 * unit + 28, 8 * unit + 28);
  g.strokeStyle = 'rgba(214,178,108,0.35)';
  g.lineWidth = 2;
  g.strokeRect(B - 26, B - 26, 8 * unit + 52, 8 * unit + 52);

  // координаты
  g.fillStyle = 'rgba(222,190,125,0.85)';
  g.font = 'italic 600 62px Georgia, "Times New Roman", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const files = 'abcdefgh';
  for (let i = 0; i < 8; i++) {
    const cx = B + (i + 0.5) * unit;
    g.fillText(files[i], cx, S - B / 2 + 4);
    g.save();
    g.translate(cx, B / 2 - 4);
    g.rotate(Math.PI);
    g.fillText(files[i], 0, 0);
    g.restore();
    const cy = B + (i + 0.5) * unit;
    g.fillText(String(8 - i), B / 2, cy);
    g.save();
    g.translate(S - B / 2, cy);
    g.rotate(Math.PI);
    g.fillText(String(8 - i), 0, 0);
    g.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function radialTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
/*  Сцена                                                              */
/* ------------------------------------------------------------------ */

export class ChessScene {
  constructor(canvas, container, { reduceMotion = false } = {}) {
    this.canvas = canvas;
    this.container = container;
    this.reduceMotion = reduceMotion;
    this.tweens = new Map();
    this.meshes = [];
    this.sim = null;
    this.ply = 0;
    this.autoRotate = !reduceMotion;
    this.userHold = false;
    this.camTween = null;
    this.running = false;
    this.onInteract = null;

    const coarse = matchMedia('(pointer: coarse)').matches;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    this.spherical = new THREE.Spherical(20, 0.92, 0.45);
    this.target = new THREE.Vector3(0, 0, 0);

    const controls = new OrbitControls(this.camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.6;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = 1.22;
    controls.autoRotateSpeed = 0.45;
    // вертикальный свайп на телефоне листает страницу, горизонтальный — вращает доску
    canvas.style.touchAction = 'pan-y';
    controls.addEventListener('start', () => {
      this.userHold = true;
      this.camTween = null;
      clearTimeout(this.holdTimer);
      this.onInteract?.();
    });
    controls.addEventListener('end', () => {
      clearTimeout(this.holdTimer);
      this.holdTimer = setTimeout(() => { this.userHold = false; }, 6000);
    });
    this.controls = controls;

    this.buildLights(coarse);
    this.buildBoard();
    this.geoms = buildGeometries();
    this.materials = {
      w: new THREE.MeshPhysicalMaterial({
        color: 0xe6d9bf, roughness: 0.36, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.22,
        sheen: 0.4, sheenColor: new THREE.Color(0xffe9c2), sheenRoughness: 0.6,
      }),
      b: new THREE.MeshPhysicalMaterial({
        color: 0x16161b, roughness: 0.24, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08,
      }),
    };

    this.resize();
    this.applyCamera();
    controls.update();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.visible = true;
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.syncRunning();
    }, { threshold: 0.01 });
    this.io.observe(container);
    document.addEventListener('visibilitychange', () => this.syncRunning());

    this.loop = this.loop.bind(this);
    this.lastT = performance.now() / 1000;
    this.syncRunning();
  }

  /* ---------- окружение ---------- */

  buildLights(coarse) {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xfff4e2, 0x1a1410, 0.45));

    const key = new THREE.DirectionalLight(0xffe4bd, 2.3);
    key.position.set(5.5, 11, 6.5);
    key.castShadow = true;
    key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    const sc = key.shadow.camera;
    sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 2; sc.far = 30;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.025;
    s.add(key);

    const fill = new THREE.DirectionalLight(0xa9bcff, 0.55);
    fill.position.set(-8, 5, -3);
    s.add(fill);

    const rim = new THREE.PointLight(0xe0b56a, 70, 40, 2);
    rim.position.set(-2, 4.5, -8.5);
    s.add(rim);
  }

  buildBoard() {
    const s = this.scene;
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 9.2),
      new THREE.MeshPhysicalMaterial({
        map: boardTexture(maxAniso), roughness: 0.48, clearcoat: 0.55, clearcoatRoughness: 0.18,
      }),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.001;
    top.receiveShadow = true;
    s.add(top);

    const walnut = new THREE.MeshStandardMaterial({ color: 0x1b120c, roughness: 0.55, metalness: 0.05 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.3, 9.2), walnut);
    frame.position.y = -0.15;
    frame.castShadow = true;
    frame.receiveShadow = true;
    s.add(frame);

    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a05a, roughness: 0.28, metalness: 1 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(9.32, 0.035, 9.32), gold);
    strip.position.y = -0.3;
    s.add(strip);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(9.8, 0.235, 9.8),
      new THREE.MeshStandardMaterial({ color: 0x0e0a07, roughness: 0.6, metalness: 0.05 }),
    );
    plinth.position.y = -0.4325;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    s.add(plinth);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ opacity: 0.45 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    s.add(floor);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 26),
      new THREE.MeshBasicMaterial({
        map: radialTexture('rgba(214,170,96,0.16)', 'rgba(214,170,96,0)'),
        transparent: true, depthWrite: false,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = FLOOR_Y + 0.002;
    s.add(glow);

    // подсветка последнего хода и шаха
    const hlGeo = new THREE.PlaneGeometry(1, 1);
    hlGeo.rotateX(-Math.PI / 2);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xf2c46b, transparent: true, opacity: 0.32, depthWrite: false });
    this.hlFrom = new THREE.Mesh(hlGeo, hlMat);
    this.hlTo = new THREE.Mesh(hlGeo, hlMat.clone());
    this.hlTo.material.opacity = 0.42;
    this.hlCheck = new THREE.Mesh(
      hlGeo,
      new THREE.MeshBasicMaterial({
        map: radialTexture('rgba(255,70,50,0.95)', 'rgba(255,70,50,0)'),
        transparent: true, depthWrite: false,
      }),
    );
    for (const m of [this.hlFrom, this.hlTo, this.hlCheck]) {
      m.position.y = 0.006;
      m.visible = false;
      m.renderOrder = 1;
      s.add(m);
    }
  }

  /* ---------- координаты ---------- */

  posOf(w) {
    if (typeof w === 'string') {
      const f = w.charCodeAt(0) - 97;
      const r = Number(w[1]) - 1;
      return new THREE.Vector3(f - 3.5, 0, 3.5 - r);
    }
    const col = Math.floor(w.slot / 8);
    const row = w.slot % 8;
    if (w.grave === 'w') return new THREE.Vector3(5.75 + col * 0.72, FLOOR_Y, 3.15 - row * 0.9);
    return new THREE.Vector3(-5.75 - col * 0.72, FLOOR_Y, -3.15 + row * 0.9);
  }

  /* ---------- фигуры и партия ---------- */

  setGame(sim) {
    const first = !this.meshes.length;
    this.sim = sim;
    if (first) {
      for (const p of sim.pieces) {
        const mesh = new THREE.Mesh(this.geoms[p.type], this.materials[p.color]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { color: p.color, type: p.type };
        this.setType(mesh, p.type);
        this.scene.add(mesh);
        this.meshes.push(mesh);
      }
      this.ply = 0;
      this.intro();
    } else {
      this.ply = -1;
      this.show(0, { animate: true });
    }
  }

  setType(mesh, type) {
    if (mesh.geometry !== this.geoms[type]) mesh.geometry = this.geoms[type];
    mesh.userData.type = type;
    // кони развёрнуты вполоборота к сопернику, чтобы был виден профиль
    mesh.rotation.y = type === 'N' ? (mesh.userData.color === 'w' ? Math.PI / 2 + 0.9 : -Math.PI / 2 + 0.9) : 0;
  }

  intro() {
    const st = this.sim.states[0];
    const now = performance.now() / 1000;
    this.meshes.forEach((m, id) => {
      const to = this.posOf(st.where[id]);
      if (this.reduceMotion) {
        m.position.copy(to);
        return;
      }
      m.position.set(to.x, to.y + 5 + Math.random() * 2, to.z);
      this.addTween(id, to, { t0: now + 0.25 + id * 0.035, dur: 0.9, arc: 0 });
    });
    this.updateHighlights(0);
  }

  addTween(id, to, { t0, dur, arc = 0, scale = null, onDone = null }) {
    const m = this.meshes[id];
    this.tweens.set(id, {
      m, from: m.position.clone(), to: to.clone(), t0, dur: Math.max(0.001, dur), arc,
      s0: m.scale.x, s1: scale ?? m.scale.x, onDone,
    });
  }

  finishTweens() {
    for (const t of this.tweens.values()) {
      t.m.position.copy(t.to);
      t.m.scale.setScalar(t.s1);
      t.onDone?.();
    }
    this.tweens.clear();
  }

  busy() {
    return this.tweens.size > 0;
  }

  show(ply, { animate = true } = {}) {
    if (!this.sim) return;
    const st = this.sim.states[ply];
    const now = performance.now() / 1000;
    const rm = this.reduceMotion;
    this.finishTweens();

    if (animate && ply === this.ply + 1 && ply > 0) {
      const mv = this.sim.moves[ply - 1];
      const a = this.posOf(mv.from);
      const b = this.posOf(mv.to);
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      const dur = rm ? 0.2 : 0.5 + 0.045 * d;
      this.addTween(mv.id, b, {
        t0: now, dur, arc: rm ? 0 : (mv.knight ? 0.95 : 0.16 + 0.07 * d),
        onDone: () => this.setType(this.meshes[mv.id], st.type[mv.id]),
      });
      if (mv.rook) {
        this.addTween(mv.rook.id, this.posOf(mv.rook.to), { t0: now + (rm ? 0 : 0.14), dur: rm ? 0.2 : 0.6, arc: rm ? 0 : 0.5 });
      }
      if (mv.captured !== null) {
        this.addTween(mv.captured, this.posOf(st.where[mv.captured]), {
          t0: now + (rm ? 0 : dur * 0.72), dur: rm ? 0.2 : 0.8, arc: rm ? 0 : 1.5, scale: GRAVE_SCALE,
        });
      }
    } else {
      this.meshes.forEach((m, id) => {
        const w = st.where[id];
        const to = this.posOf(w);
        const scale = typeof w === 'string' ? 1 : GRAVE_SCALE;
        this.setType(m, st.type[id]);
        if (m.position.distanceToSquared(to) < 1e-6 && Math.abs(m.scale.x - scale) < 1e-3) return;
        if (!animate || rm) {
          m.position.copy(to);
          m.scale.setScalar(scale);
          return;
        }
        this.addTween(id, to, { t0: now + Math.random() * 0.12, dur: 0.65, arc: 0.6, scale });
      });
    }
    this.ply = ply;
    this.updateHighlights(ply);
  }

  updateHighlights(ply) {
    const mv = ply > 0 ? this.sim.moves[ply - 1] : null;
    if (mv) {
      this.hlFrom.position.copy(this.posOf(mv.from)).setY(0.006);
      this.hlTo.position.copy(this.posOf(mv.to)).setY(0.007);
    }
    this.hlFrom.visible = this.hlTo.visible = !!mv;

    const check = ply > 0 && /[+#]$/.test(this.sim.san?.[ply - 1] ?? '');
    this.hlCheck.visible = false;
    if (check) {
      const color = ply % 2 === 1 ? 'b' : 'w';
      const st = this.sim.states[ply];
      const kid = this.sim.pieces.findIndex((p) => p.color === color && st.type[p.id] === 'K');
      if (kid >= 0 && typeof st.where[kid] === 'string') {
        this.hlCheck.position.copy(this.posOf(st.where[kid])).setY(0.008);
        this.hlCheck.scale.setScalar(1.35);
        this.hlCheck.visible = true;
      }
    }
  }

  /* ---------- камера ---------- */

  setAutoRotate(v) {
    this.autoRotate = v;
  }

  view(name) {
    const presets = {
      white: { theta: 0, phi: 0.92 },
      black: { theta: Math.PI, phi: 0.92 },
      top: { theta: 0, phi: 0.09 },
      side: { theta: Math.PI / 2, phi: 1.0 },
    };
    const p = presets[name];
    if (!p) return;
    const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.target));
    let dTheta = p.theta - sph.theta;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
    this.camTween = {
      t0: performance.now() / 1000, dur: this.reduceMotion ? 0.01 : 1.3,
      theta0: sph.theta, theta1: sph.theta + dTheta, phi0: sph.phi, phi1: p.phi,
    };
  }

  applyCamera() {
    this.spherical.radius = this.dist;
    this.camera.position.setFromSpherical(this.spherical).add(this.target);
    this.camera.lookAt(this.target);
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    const cs = getComputedStyle(this.container);
    const sx = parseFloat(cs.getPropertyValue('--shift-x')) || 0;
    const sy = parseFloat(cs.getPropertyValue('--shift-y')) || 0;
    const cam = this.camera;
    cam.aspect = w / h;
    if (sx || sy) cam.setViewOffset(w, h, -w * sx, h * sy, w, h);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();

    // подбираем дистанцию, чтобы доска целиком помещалась в кадр
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const effAspect = (w * (1 - 2 * Math.abs(sx))) / (h * (1 - 2 * Math.abs(sy)));
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * effAspect);
    const dist = Math.max(6.2 / Math.sin(vfov / 2) * 0.9, 6.5 / Math.sin(hfov / 2));
    const prev = this.dist;
    this.dist = clamp(dist, 16, 44);
    if (prev) {
      const off = this.camera.position.clone().sub(this.target).setLength(this.dist);
      this.camera.position.copy(this.target).add(off);
    }
    this.render();
  }

  /* ---------- цикл ---------- */

  syncRunning() {
    const should = this.visible && !document.hidden;
    if (should && !this.running) {
      this.running = true;
      this.lastT = performance.now() / 1000;
      this.raf = requestAnimationFrame(this.loop);
    } else if (!should && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  updateTweens(now) {
    for (const [id, t] of this.tweens) {
      const p = clamp((now - t.t0) / t.dur, 0, 1);
      if (now < t.t0) continue;
      const e = easeInOut(p);
      t.m.position.lerpVectors(t.from, t.to, e);
      t.m.position.y += Math.sin(Math.PI * p) * t.arc;
      t.m.scale.setScalar(t.s0 + (t.s1 - t.s0) * e);
      if (p >= 1) {
        this.tweens.delete(id);
        t.onDone?.();
      }
    }
  }

  updateCamera(now, dt) {
    const c = this.camTween;
    if (c) {
      const p = clamp((now - c.t0) / c.dur, 0, 1);
      const e = easeInOut(p);
      const sph = new THREE.Spherical(this.dist, c.phi0 + (c.phi1 - c.phi0) * e, c.theta0 + (c.theta1 - c.theta0) * e);
      this.camera.position.setFromSpherical(sph).add(this.target);
      this.camera.lookAt(this.target);
      if (p >= 1) this.camTween = null;
    }
    this.controls.autoRotate = this.autoRotate && !this.userHold && !this.camTween;
    if (!c) this.controls.update(dt);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  loop() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, now - this.lastT);
    this.lastT = now;
    this.updateTweens(now);
    this.updateCamera(now, dt);
    this.render();
    if (!this.readyFlag) {
      this.readyFlag = true;
      this.container.classList.add('is-ready');
    }
  }
}
