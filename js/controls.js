// First-person "walk" controls: joystick + swipe look (touch), WASD + drag look (desktop)
import * as THREE from '../vendor/three/three.module.min.js';
import { floorCandidates, hitsCollider } from './builder.js';

export class WalkControls {
  constructor(camera, dom, joyEl) {
    this.camera = camera;
    this.dom = dom;
    this.joyEl = joyEl;
    this.knob = joyEl.querySelector('.knob');
    this.enabled = false;
    this.x = 0;
    this.z = 0;
    this.feet = 0;
    this.camY = 1.6;
    this.eye = 1.62;
    this.yaw = 0;
    this.pitch = 0;
    this.radius = 0.24;
    this.keys = Object.create(null);
    this.joy = { x: 0, y: 0, id: null };
    this.look = { id: null, x: 0, y: 0, vx: 0, vy: 0 };
    this.bob = 0;
    this.moving = false;
    this.onInteract = null;

    dom.addEventListener('pointerdown', (e) => this._lookDown(e));
    window.addEventListener('pointermove', (e) => this._lookMove(e));
    window.addEventListener('pointerup', (e) => this._lookUp(e));
    window.addEventListener('pointercancel', (e) => this._lookUp(e));
    joyEl.addEventListener('pointerdown', (e) => this._joyDown(e));
    joyEl.addEventListener('pointermove', (e) => this._joyMove(e));
    joyEl.addEventListener('pointerup', (e) => this._joyUp(e));
    joyEl.addEventListener('pointercancel', (e) => this._joyUp(e));
    joyEl.addEventListener('lostpointercapture', (e) => this._joyUp(e));
    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      this.keys[e.code] = true;
      if (this.enabled && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = Object.create(null); this._joyReset(); });
  }

  teleport(x, z, floorY, lookX, lookZ) {
    this.x = x;
    this.z = z;
    this.feet = floorY;
    this.camY = floorY + this.eye;
    this.yaw = Math.atan2(-(lookX - x), -(lookZ - z));
    this.pitch = -0.06;
    this.apply();
  }

  apply() {
    const bobY = Math.sin(this.bob) * 0.022;
    this.camera.position.set(this.x, this.camY + bobY, this.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  get level() {
    return this.feet > 2.6 ? 1 : 0;
  }

  _sens() {
    return Math.min(0.0085, Math.max(0.0032, 3.4 / Math.max(320, window.innerWidth)));
  }
  _lookDown(e) {
    if (!this.enabled || this.look.id !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.look.id = e.pointerId;
    this.look.x = e.clientX;
    this.look.y = e.clientY;
    try { this.dom.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    if (this.onInteract) this.onInteract();
  }
  _lookMove(e) {
    if (!this.enabled || e.pointerId !== this.look.id) return;
    const dx = e.clientX - this.look.x, dy = e.clientY - this.look.y;
    this.look.x = e.clientX;
    this.look.y = e.clientY;
    const s = this._sens();
    this.yaw -= dx * s;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - dy * s));
  }
  _lookUp(e) {
    if (e.pointerId === this.look.id) this.look.id = null;
  }

  _joyDown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.joy.id !== null) return;
    this.joy.id = e.pointerId;
    try { this.joyEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    this._joyMove(e);
    if (this.onInteract) this.onInteract();
  }
  _joyMove(e) {
    if (e.pointerId !== this.joy.id) return;
    e.preventDefault();
    const r = this.joyEl.getBoundingClientRect();
    const R = r.width / 2;
    let vx = (e.clientX - (r.left + R)) / (R * 0.75);
    let vy = (e.clientY - (r.top + R)) / (R * 0.75);
    const l = Math.hypot(vx, vy);
    if (l > 1) { vx /= l; vy /= l; }
    this.joy.x = vx;
    this.joy.y = vy;
    this.knob.style.transform = `translate(${vx * R * 0.6}px, ${vy * R * 0.6}px)`;
  }
  _joyUp(e) {
    if (e.pointerId !== this.joy.id) return;
    this._joyReset();
  }
  _joyReset() {
    this.joy.id = null;
    this.joy.x = this.joy.y = 0;
    if (this.knob) this.knob.style.transform = '';
  }

  _tryMove(nx, nz) {
    const cand = floorCandidates(nx, nz);
    let best = null, bd = 1e9;
    for (const y of cand) {
      const d = Math.abs(y - this.feet);
      if (d < bd) { bd = d; best = y; }
    }
    if (best === null || bd > 0.52) return false;
    const stuck = hitsCollider(this.x, this.z, this.radius, this.feet + 0.32, this.feet + 1.75);
    if (!stuck && hitsCollider(nx, nz, this.radius, best + 0.32, best + 1.75)) return false;
    this.x = nx;
    this.z = nz;
    this.feet = best;
    return true;
  }

  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    let fwd = 0, str = 0;
    if (k.KeyW || k.ArrowUp) fwd += 1;
    if (k.KeyS || k.ArrowDown) fwd -= 1;
    if (k.KeyD) str += 1;
    if (k.KeyA) str -= 1;
    if (k.ArrowLeft) this.yaw += 1.9 * dt;
    if (k.ArrowRight) this.yaw -= 1.9 * dt;
    if (k.KeyQ) this.yaw += 1.6 * dt;
    if (k.KeyE) this.yaw -= 1.6 * dt;
    fwd -= this.joy.y;
    str += this.joy.x;
    const mag = Math.min(1, Math.hypot(fwd, str));
    const run = k.ShiftLeft || k.ShiftRight;
    const speed = (run ? 4.6 : 2.4) * (this.joy.id !== null ? 1.15 : 1);
    this.moving = mag > 0.05;
    if (this.moving) {
      const l = Math.hypot(fwd, str);
      const f = fwd / l, s = str / l;
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      const dx = (-sy * f + cy * s) * speed * mag * dt;
      const dz = (-cy * f - sy * s) * speed * mag * dt;
      // move in small sub-steps so fast motion can't tunnel through thin walls
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
      for (let i = 0; i < steps; i++) {
        this._tryMove(this.x + dx / steps, this.z);
        this._tryMove(this.x, this.z + dz / steps);
      }
      this.bob += dt * speed * 3.2;
    } else {
      this.bob *= 0.9;
    }
    const target = this.feet + this.eye;
    this.camY += (target - this.camY) * Math.min(1, dt * 10);
    this.apply();
  }
}
