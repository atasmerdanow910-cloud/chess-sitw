import * as THREE from '../vendor/three/three.module.min.js';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';
import { RoomEnvironment } from '../vendor/three/addons/RoomEnvironment.js';
import { buildMaterials, clipPlane, drawTV } from './materials.js';
import { F0, F1, bake, colliders, hitsCollider, floorCandidates } from './builder.js';
import { buildHouse } from './house.js';
import { furnish, ROOMS } from './rooms.js';
import { buildExterior } from './exterior.js';
import { WalkControls } from './controls.js';

const $ = (s) => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const smallScreen = Math.min(screen.width, screen.height) < 820;
const mobile = isTouch && smallScreen;

const loaderBar = $('#loaderBar'), loaderText = $('#loaderText');
const progress = (p, text) => {
  loaderBar.style.width = `${p}%`;
  loaderText.textContent = text;
};
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

function fail(msg) {
  $('#loader').classList.add('error');
  loaderText.textContent = msg;
}

// ---------------------------------------------------------------- renderer
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  fail('Ваш браузер не поддерживает WebGL. Попробуйте открыть сайт в Chrome или Safari.');
  throw e;
}
let pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.08, 1200);
camera.position.set(44, 22, 52);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------------------------------------------------------------- sky
const skyU = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyU,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: `varying vec3 vP;
void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP;
void main() {
  float h = vP.y;
  vec3 c = mix(horizon, top, smoothstep(-0.02, 0.6, h));
  c = mix(c, bottom, smoothstep(0.0, -0.3, h));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
});
const skyGroup = new THREE.Group();
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat);
sky.renderOrder = -1;
skyGroup.add(sky);
{
  const n = 1100, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random(), v = 0.06 + Math.random() * 0.94;
    const th = u * Math.PI * 2, y = v, r = Math.sqrt(1 - y * y);
    p[i * 3] = Math.cos(th) * r * 560;
    p[i * 3 + 1] = y * 560;
    p[i * 3 + 2] = Math.sin(th) * r * 560;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
  stars.name = 'stars';
  skyGroup.add(stars);
}
scene.add(skyGroup);
scene.fog = new THREE.Fog(0xdfe8f0, 90, 330);

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight(0xdfefff, 0x8a7a5c, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.8);
sun.position.set(32, 46, 26);
sun.target.position.set(3, 0, -3);
sun.castShadow = true;
const SM = mobile ? 1024 : 2048;
sun.shadow.mapSize.set(SM, SM);
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 5, far: 150 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);
const lampPool = [];
for (let i = 0; i < 6; i++) {
  const l = new THREE.PointLight(0xffd5a0, 0, 12, 2);
  scene.add(l);
  lampPool.push(l);
}

// ---------------------------------------------------------------- controls
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.rotateSpeed = 0.7;
orbit.zoomSpeed = 0.9;
orbit.panSpeed = 0.9;
orbit.screenSpacePanning = false;
orbit.target.set(3, 2.5, 0);
orbit.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

const walk = new WalkControls(camera, renderer.domElement, $('#joystick'));

// ---------------------------------------------------------------- state
const state = { mode: 'outside', floor: 0, night: false, roomId: null, ready: false };
let M, ext;
let tween = null;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function flyTo(pos, target, dur = 1.3) {
  tween = { p0: camera.position.clone(), q0: orbit.target.clone(), p1: pos.clone(), q1: target.clone(), t: 0, dur };
}
orbit.addEventListener('start', () => {
  tween = null;
  orbit.autoRotate = false;
});

const portrait = () => window.innerWidth / window.innerHeight < 0.85;
function updateFov() {
  const asp = window.innerWidth / window.innerHeight;
  let fov = state.mode === 'walk' ? 72 : 48;
  if (asp < 0.85) fov = state.mode === 'walk' ? 80 : 60;
  camera.fov = fov;
  camera.aspect = asp;
  camera.updateProjectionMatrix();
}

function setClip(level) {
  clipPlane.constant = level === null ? 1000 : (level === 0 ? F0 : F1) + 2.45;
  renderer.shadowMap.needsUpdate = true;
}

function outsideView() {
  const d = portrait() ? 60 : 46;
  const dir = new THREE.Vector3(0.62, 0.36, 0.7).normalize();
  return { pos: new THREE.Vector3(3, 2.5, 0).addScaledVector(dir, d), target: new THREE.Vector3(3, 2.5, 0) };
}
function cutView(level) {
  const y = level === 0 ? F0 : F1;
  const d = portrait() ? 50 : 36;
  const dir = new THREE.Vector3(0.28, 1.0, 0.72).normalize();
  const target = new THREE.Vector3(2, y, -0.5);
  return { pos: target.clone().addScaledVector(dir, d), target };
}

function setMode(mode, opts = {}) {
  const prev = state.mode;
  state.mode = mode;
  document.body.dataset.mode = mode;
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  $('#floors').hidden = mode !== 'cut';
  if (mode === 'walk') {
    tween = null;
    orbit.enabled = false;
    orbit.autoRotate = false;
    walk.enabled = true;
    setClip(null);
    const room = opts.room || ROOMS.find((r) => r.id === 'foyer');
    const fy = room.floor ?? (room.level === 1 ? F1 : F0);
    walk.teleport(room.spawn[0], room.spawn[1], fy, room.look[0], room.look[1]);
    $('#joystick').hidden = !isTouch;
    toast(isTouch ? 'Джойстик слева — идти · проведите по экрану — осмотреться' : 'WASD / стрелки — идти · зажмите мышь — осмотреться · Shift — бегом');
  } else {
    walk.enabled = false;
    $('#joystick').hidden = true;
    orbit.enabled = true;
    if (prev === 'walk') {
      // place the orbit pivot in front of the walker, then fly out
      const f = new THREE.Vector3();
      camera.getWorldDirection(f);
      orbit.target.copy(camera.position).addScaledVector(f, 4);
    }
    if (mode === 'outside') {
      setClip(null);
      orbit.minDistance = 8;
      orbit.maxDistance = 120;
      orbit.minPolarAngle = 0.12;
      orbit.maxPolarAngle = 1.47;
      const v = outsideView();
      flyTo(v.pos, v.target, prev === 'walk' ? 1.6 : 1.3);
    } else if (mode === 'cut') {
      if (opts.floor !== undefined) state.floor = opts.floor;
      setFloorButtons();
      setClip(state.floor);
      orbit.minDistance = 5;
      orbit.maxDistance = 90;
      orbit.minPolarAngle = 0.0;
      orbit.maxPolarAngle = 1.25;
      if (!opts.noFly) {
        const v = cutView(state.floor);
        flyTo(v.pos, v.target);
      }
    }
  }
  updateFov();
  assignLamps(true);
  applyLighting();
  updateLabel();
}

function setFloorButtons() {
  document.querySelectorAll('#floors button').forEach((b) => b.classList.toggle('active', +b.dataset.floor === state.floor));
}
function setFloor(level, fly = true) {
  state.floor = level;
  setFloorButtons();
  setClip(level);
  if (fly) {
    const y = level === 0 ? F0 : F1;
    const off = camera.position.clone().sub(orbit.target);
    const target = orbit.target.clone();
    target.y = y;
    flyTo(target.clone().add(off), target, 0.9);
  }
  assignLamps(true);
  updateLabel();
}

function focusRoom(room) {
  const [x0, z0, x1, z1] = room.rect;
  const y = room.floor ?? (room.level === 1 ? F1 : F0);
  const target = new THREE.Vector3((x0 + x1) / 2, y + 0.4, (z0 + z1) / 2);
  const dir = camera.position.clone().sub(orbit.target);
  dir.y = 0;
  if (dir.lengthSq() < 0.01) dir.set(0.4, 0, 0.9);
  dir.normalize();
  const size = Math.max(x1 - x0, z1 - z0);
  const k = (portrait() ? 1.35 : 1) * (5 + size * 0.75);
  flyTo(target.clone().addScaledVector(dir, k * 0.62).add(new THREE.Vector3(0, k, 0)), target, 1.2);
  state.roomId = room.id;
  updateLabel(room.name);
}

function goToRoom(room) {
  closeRooms();
  if (state.mode === 'cut' && room.level >= 0) {
    if (room.level !== state.floor) setFloor(room.level, false);
    focusRoom(room);
  } else {
    setMode('walk', { room });
  }
}

// ---------------------------------------------------------------- lighting
function roomById(id) {
  return ROOMS.find((r) => r.id === id);
}
function currentRoom() {
  if (state.mode !== 'walk') return null;
  const lvl = walk.level;
  const { x, z } = walk;
  if (x > 0.95 && x < 2.9 && z > 1.0 && z < 6.65 && walk.feet > F0 + 0.3 && walk.feet < F1 - 0.3) return { id: 'stairs', name: 'Парадная лестница', level: 0 };
  for (const r of ROOMS) {
    const [x0, z0, x1, z1] = r.rect;
    if (x < x0 || x > x1 || z < z0 || z > z1) continue;
    if (r.level === -1 || r.level === lvl) return r;
  }
  return { id: 'outside', name: 'На улице', level: -1 };
}

let lampKey = '';
function assignLamps(force) {
  let list = [];
  if (state.mode === 'walk') {
    const lvl = walk.level;
    const p = new THREE.Vector2(walk.x, walk.z);
    list = ROOMS.filter((r) => r.light && r.level === lvl)
      .map((r) => ({ r, d: p.distanceTo(new THREE.Vector2(r.light[0], r.light[2])) }))
      .sort((a, b) => a.d - b.d)
      .map((o) => o.r);
    if (lvl === 0 && walk.z < 1.5 && walk.z > -1) list.unshift(roomById('foyer'));
  } else if (state.mode === 'cut') {
    const order = state.floor === 0 ? ['living', 'kitchen', 'cinema', 'dining', 'office', 'foyer'] : ['master', 'guest', 'kids', 'mbath', 'gym', 'hall2'];
    list = order.map(roomById);
  } else {
    list = ['living', 'foyer', 'cinema', 'master', 'guest', 'kitchen'].map(roomById);
  }
  list = [...new Set(list)].slice(0, lampPool.length);
  const key = list.map((r) => r.id).join(',') + state.night + state.mode;
  if (!force && key === lampKey) return;
  lampKey = key;
  const inten = state.night ? (state.mode === 'outside' ? 14 : 20) : 7;
  lampPool.forEach((l, i) => {
    const r = list[i];
    if (!r) {
      l.intensity = 0;
      return;
    }
    l.position.set(r.light[0], r.light[1], r.light[2]);
    l.intensity = r.id === 'cinema' ? inten * 0.45 : r.id === 'foyer' ? inten * 1.6 : inten;
    l.distance = r.id === 'foyer' ? 16 : 12;
  });
}

const C = (h) => new THREE.Color(h);
function applyLighting() {
  const n = state.night;
  const walkIn = state.mode === 'walk';
  skyU.top.value.copy(C(n ? '#03060f' : '#3f86d6'));
  skyU.horizon.value.copy(C(n ? '#17223d' : '#dbe9f5'));
  skyU.bottom.value.copy(C(n ? '#0b0f18' : '#c9d6c1'));
  scene.fog.color.copy(C(n ? '#0c1222' : '#dde8f2'));
  skyGroup.getObjectByName('stars').visible = n;
  hemi.color.copy(C(n ? '#33457a' : '#dfefff'));
  hemi.groundColor.copy(C(n ? '#0d0d12' : '#8a7a5c'));
  hemi.intensity = n ? 0.35 : 0.6;
  sun.color.copy(C(n ? '#9db4ff' : '#fff0d8'));
  sun.intensity = n ? 0.45 : 2.8;
  scene.environmentIntensity = n ? 0.22 : 0.75;
  renderer.toneMappingExposure = n ? 1.12 : walkIn ? 1.06 : 1.0;
  if (!M) return;
  M.glass.emissiveIntensity = n && !walkIn ? 0.65 : 0;
  M.lampOut.emissiveIntensity = n ? 3.2 : 0.25;
  M.lampShade.emissiveIntensity = n ? 1.3 : 0.55;
  M.bulb.emissiveIntensity = n ? 3.4 : 2.2;
  M.waterPool.emissiveIntensity = n ? 0.9 : 0;
  M.fountainWater.emissiveIntensity = n ? 0.8 : 0;
  if (M._nbWin) M._nbWin.emissiveIntensity = n ? 0.8 : 0;
  $('#btnDay').classList.toggle('night', n);
  assignLamps(true);
}

// ---------------------------------------------------------------- UI
let toastTimer = 0;
function toast(msg, ms = 4200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function updateLabel(text) {
  const el = $('#roomLabel');
  let t = text;
  if (!t) {
    if (state.mode === 'outside') t = 'Villa Aurora · вид снаружи';
    else if (state.mode === 'cut') t = state.floor === 0 ? 'Разрез · 1 этаж' : 'Разрез · 2 этаж';
    else {
      const r = currentRoom();
      t = r ? r.name : '';
    }
  }
  if (el.textContent !== t) el.textContent = t;
}

function buildRoomsPanel() {
  const grid = $('#roomGrid');
  const groups = [
    [0, 'Первый этаж'],
    [1, 'Второй этаж'],
    [-1, 'Территория'],
  ];
  for (const [lvl, title] of groups) {
    const h = document.createElement('h3');
    h.textContent = title;
    grid.appendChild(h);
    const wrap = document.createElement('div');
    wrap.className = 'cards';
    for (const r of ROOMS.filter((q) => q.level === lvl)) {
      const b = document.createElement('button');
      b.className = 'room';
      b.innerHTML = `<span class="ic">${r.icon}</span><span class="nm">${r.name}</span>`;
      b.addEventListener('click', () => goToRoom(r));
      wrap.appendChild(b);
    }
    grid.appendChild(wrap);
  }
}
function openRooms() {
  $('#rooms').classList.add('open');
  $('#rooms').setAttribute('aria-hidden', 'false');
  $('#scrim').classList.add('show');
}
function closeRooms() {
  $('#rooms').classList.remove('open');
  $('#rooms').setAttribute('aria-hidden', 'true');
  $('#scrim').classList.remove('show');
}

function wireUI() {
  document.querySelectorAll('#modes button').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.mode === state.mode && b.dataset.mode !== 'walk') {
        if (state.mode === 'outside') { const v = outsideView(); flyTo(v.pos, v.target); }
        if (state.mode === 'cut') { const v = cutView(state.floor); flyTo(v.pos, v.target); }
        return;
      }
      if (b.dataset.mode === 'walk' && state.mode === 'walk') return;
      setMode(b.dataset.mode);
    }),
  );
  document.querySelectorAll('#floors button').forEach((b) => b.addEventListener('click', () => setFloor(+b.dataset.floor)));
  $('#btnRooms').addEventListener('click', () => ($('#rooms').classList.contains('open') ? closeRooms() : openRooms()));
  $('#closeRooms').addEventListener('click', closeRooms);
  $('#scrim').addEventListener('click', () => {
    closeRooms();
    $('#info').hidden = true;
  });
  $('#btnDay').addEventListener('click', () => {
    state.night = !state.night;
    applyLighting();
    toast(state.night ? 'Ночь: в доме зажёгся свет' : 'День');
  });
  $('#btnInfo').addEventListener('click', () => {
    $('#info').hidden = false;
    $('#scrim').classList.add('show');
  });
  $('#closeInfo').addEventListener('click', () => {
    $('#info').hidden = true;
    $('#scrim').classList.remove('show');
  });
  const fs = $('#btnFull');
  const canFs = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
  if (!canFs) fs.hidden = true;
  fs.addEventListener('click', () => {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen).call(d.documentElement);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      closeRooms();
      $('#info').hidden = true;
      $('#scrim').classList.remove('show');
    }
    if (e.code === 'KeyN' && state.ready) $('#btnDay').click();
  });
  // iOS: stop page pinch-zoom gestures from hijacking the 3D view
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateFov();
}

// ---------------------------------------------------------------- boot
async function init() {
  try {
    progress(8, 'Готовим материалы: мрамор, дуб, текстиль…');
    await nextFrame();
    M = buildMaterials(renderer);
    progress(28, 'Возводим стены, лестницу и крышу…');
    await nextFrame();
    buildHouse(M);
    progress(46, 'Расставляем мебель по комнатам…');
    await nextFrame();
    furnish(M);
    progress(62, 'Сад, бассейн и подъездная дорожка…');
    await nextFrame();
    ext = buildExterior(M, scene);
    progress(76, 'Оптимизируем сцену для телефона…');
    await nextFrame();
    bake(scene);
    buildRoomsPanel();
    wireUI();
    const v = outsideView();
    camera.position.copy(v.pos).add(new THREE.Vector3(10, 6, 14));
    orbit.target.copy(v.target);
    flyTo(v.pos, v.target, 2.2);
    orbit.minDistance = 8;
    orbit.maxDistance = 120;
    orbit.maxPolarAngle = 1.47;
    updateFov();
    applyLighting();
    renderer.shadowMap.needsUpdate = true;
    progress(88, 'Компилируем шейдеры…');
    await nextFrame();
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
    progress(100, 'Добро пожаловать!');
    state.ready = true;
    document.body.dataset.mode = 'outside';
    updateLabel();
    renderer.setAnimationLoop(loop);
    setTimeout(() => {
      $('#loader').classList.add('hide');
      orbit.autoRotate = true;
      orbit.autoRotateSpeed = 0.35;
      toast('Нажмите «Комнаты», чтобы зайти внутрь, или «Разрез», чтобы снять крышу', 5200);
    }, 350);
    window.__villa = { ROOMS, colliders, hitsCollider, floorCandidates, state, setMode, goToRoom, setFloor, camera, walk, renderer, scene, M };
  } catch (e) {
    console.error(e);
    fail('Не удалось построить сцену: ' + (e && e.message ? e.message : e));
  }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let frame = 0, perfAcc = 0, perfN = 0, lastRoom = '';
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  frame++;
  if (tween) {
    tween.t += dt;
    const k = ease(Math.min(1, tween.t / tween.dur));
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    orbit.target.lerpVectors(tween.q0, tween.q1, k);
    if (k >= 1) tween = null;
  }
  if (state.mode === 'walk') {
    walk.update(dt);
    const r = currentRoom();
    const id = r ? r.id : '';
    if (id !== lastRoom) {
      lastRoom = id;
      updateLabel();
    }
    if (frame % 20 === 0) assignLamps(false);
  } else {
    orbit.update();
    const tg = orbit.target;
    tg.x = Math.max(-40, Math.min(45, tg.x));
    tg.z = Math.max(-42, Math.min(42, tg.z));
    tg.y = Math.max(-0.5, Math.min(14, tg.y));
    if (camera.position.y < 0.6) camera.position.y = 0.6;
  }
  if (frame % 3 === 0) drawTV(t);
  M.fire.emissiveIntensity = 2.0 + Math.sin(t * 13.0) * 0.35 + Math.sin(t * 7.3) * 0.25;
  if (M.waterPool.map) M.waterPool.map.offset.set(t * 0.012, t * 0.008);
  ext.flag.update(t);
  skyGroup.position.copy(camera.position);
  renderer.render(scene, camera);

  // adaptive resolution for weaker phones
  perfAcc += dt;
  perfN++;
  if (perfAcc > 2.5) {
    const fps = perfN / perfAcc;
    perfAcc = 0;
    perfN = 0;
    if (fps < 30 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
}

init();
