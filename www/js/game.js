/* Strelka — offline arrow puzzle. Plain script (no modules) so it runs from file://, a PWA, or the Android app. */
(() => {
  'use strict';

  /* ===================== storage ===================== */
  const KEY = 'strelka.v1';
  const DEF = { unlocked: 1, stars: {}, hints: 3, sound: true, vibe: true, lang: null, daily: {}, endlessBest: 0, endlessCur: 1, seen: {} };
  const fresh = () => JSON.parse(JSON.stringify(DEF));
  let S = fresh();
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* storage blocked: play without saving */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  /* ===================== text ===================== */
  const L = {
    ru: {
      brand: 'Стрел<span>ка</span>', tagline: 'Головоломка, где всё решает направление.',
      play: 'Играть', level_n: 'Уровень {0}', world_n: 'Мир {0}', worlds: 'Миры', all_levels: 'Все уровни пройдены',
      daily: 'Задача дня', daily_new: 'новая', daily_done: 'решено', endless: 'Бесконечный', endless_best: 'рекорд: {0}',
      finish_world: 'Пройди мир {0}', left: 'осталось', restart: 'Заново', hint: 'Подсказка',
      no_hints: 'Подсказки кончились. +1 за каждые 3 звезды', win1: 'Пройдено', win2: 'Отлично!', win3: 'Идеально!',
      mistakes: 'Ошибок: {0}', no_mistakes: 'Без единой ошибки', next: 'Дальше', menu: 'Меню', plus_hint: '+1 подсказка',
      fail: 'Жизни кончились', fail_sub: 'Перед нажатием проверь весь путь до края поля.', retry: 'Ещё раз',
      got_it: 'Понятно', new_mech: 'Новая механика', settings: 'Настройки', sound: 'Звук', vibe: 'Вибрация', lang: 'Язык',
      reset: 'Сбросить прогресс', reset_sure: 'Нажми ещё раз — всё сотрётся', reset_done: 'Прогресс сброшен', done: 'Готово',
      daily_back: 'Новая задача появится завтра.', all_done: 'Все 72 уровня пройдены! Дальше — бесконечный режим.',
      tut: 'Нажми на плитку, у которой путь свободен', next_num: 'Следующая: {0}', key_left: 'Освободи ключ, чтобы открыть замки',
      err_block: 'Путь закрыт', err_order: 'Сначала плитка {0}', err_lock: 'Заперто — сначала ключ', stone_msg: 'Камень не двигается',
      unlocked: 'Замки открыты!', endless_n: 'Бесконечный · {0}', back: 'Назад', dirs: ['вверх', 'вправо', 'вниз', 'влево'],
      a_tile: 'Плитка, стрелка {0}', a_stone: 'Камень', a_bomb: 'Бомба', a_lock: ', заперта', a_key: ', с ключом', a_rot: 'Поворотная плитка, стрелка {0}',
      worldsT: [
        ['Стрелки', 'Нажми на плитку — она улетит по стрелке. Если на пути есть другая плитка, потеряешь жизнь.'],
        ['Камни', 'Камни не двигаются и закрывают путь. Ищи плитки, которым они не мешают.'],
        ['Порядок', 'Плитки с цифрами улетают только по порядку: 1, 2, 3… Остальные — когда угодно.'],
        ['Поворот', 'Фиолетовая плитка с кольцом: если путь закрыт, она повернётся на 90°. Жизнь не теряется.'],
        ['Замки', 'Плитки в полоску заперты. Они откроются, когда улетит плитка с ключом.'],
        ['Взрыв', 'Бомба взрывается от нажатия и убирает все плитки вокруг себя. Камни не ломаются.'],
      ],
    },
    en: {
      brand: 'Strel<span>ka</span>', tagline: 'A puzzle where direction is everything.',
      play: 'Play', level_n: 'Level {0}', world_n: 'World {0}', worlds: 'Worlds', all_levels: 'All levels cleared',
      daily: 'Daily puzzle', daily_new: 'new', daily_done: 'solved', endless: 'Endless', endless_best: 'best: {0}',
      finish_world: 'Finish world {0}', left: 'left', restart: 'Restart', hint: 'Hint',
      no_hints: 'No hints left. Earn +1 for every 3-star win', win1: 'Cleared', win2: 'Great!', win3: 'Perfect!',
      mistakes: 'Mistakes: {0}', no_mistakes: 'Not a single mistake', next: 'Next', menu: 'Menu', plus_hint: '+1 hint',
      fail: 'Out of lives', fail_sub: 'Check the whole path to the edge before you tap.', retry: 'Try again',
      got_it: 'Got it', new_mech: 'New mechanic', settings: 'Settings', sound: 'Sound', vibe: 'Vibration', lang: 'Language',
      reset: 'Reset progress', reset_sure: 'Tap again to erase everything', reset_done: 'Progress reset', done: 'Done',
      daily_back: 'A new puzzle arrives tomorrow.', all_done: 'All 72 levels cleared! Endless mode is next.',
      tut: 'Tap a tile whose path is clear', next_num: 'Next: {0}', key_left: 'Free the key to open the locks',
      err_block: 'Path blocked', err_order: 'Tile {0} goes first', err_lock: 'Locked — free the key first', stone_msg: 'Stones never move',
      unlocked: 'Locks open!', endless_n: 'Endless · {0}', back: 'Back', dirs: ['up', 'right', 'down', 'left'],
      a_tile: 'Tile, arrow {0}', a_stone: 'Stone', a_bomb: 'Bomb', a_lock: ', locked', a_key: ', holds the key', a_rot: 'Turning tile, arrow {0}',
      worldsT: [
        ['Arrows', 'Tap a tile and it flies the way its arrow points. Hit another tile and you lose a life.'],
        ['Stones', 'Stones never move and block the way. Find the tiles they do not stop.'],
        ['Order', 'Numbered tiles leave strictly in order: 1, 2, 3… The rest can go any time.'],
        ['Turn', 'Purple ringed tiles turn 90° when their path is blocked. No life lost.'],
        ['Locks', 'Striped tiles are locked. They open once the key tile has flown away.'],
        ['Blast', 'A bomb explodes when tapped and clears every tile around it. Stones survive.'],
      ],
    },
  };
  let lang = S.lang || ((navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en');
  const t = (k, ...a) => { let s = L[lang][k] ?? L.en[k] ?? k; a.forEach((v, i) => { s = s.replace('{' + i + '}', v); }); return s; };
  document.documentElement.lang = lang;

  /* ===================== icons ===================== */
  const SW = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  const SPRITE = `<svg class="sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M12 3.2 20.4 12h-5.2v8.6H8.8V12H3.6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-rot" viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.05-4.95" ${SW} stroke-width="2.6"/><path d="M19.5 4.2v4.3h-4.3" ${SW} stroke-width="2.6"/></symbol>
  <symbol id="i-bomb" viewBox="0 0 24 24"><circle cx="11" cy="14" r="6.8"/><path d="M15.6 8.4 17.7 6.3" ${SW} stroke-width="2.6"/><path d="M18.6 5.4c.6-.9 1.6-1.3 2.6-1.1" ${SW} stroke-width="1.8"/><circle cx="8.6" cy="11.8" r="1.7" fill="rgba(255,255,255,.4)"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" ${SW} stroke-width="2.4"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" ${SW} stroke-width="2.4"/></symbol>
  <symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.8" ${SW} stroke-width="2.4"/><path d="M11.8 12H21M18 12v3.2M21 12v2.4" ${SW} stroke-width="2.4"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20.6s-7.4-4.5-9.5-9.1C1 8.2 3.1 4.4 6.9 4.4c2.2 0 3.6 1.3 5.1 3.1 1.5-1.8 2.9-3.1 5.1-3.1 3.8 0 5.9 3.8 4.4 7.1-2.1 4.6-9.5 9.1-9.5 9.1z"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></symbol>
  <symbol id="i-back" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" ${SW} stroke-width="2.4"/></symbol>
  <symbol id="i-restart" viewBox="0 0 24 24"><path d="M4.6 13.5A7.6 7.6 0 1 0 6.8 6.6" ${SW} stroke-width="2.3"/><path d="M5.2 3.6v4.6h4.6" ${SW} stroke-width="2.3"/></symbol>
  <symbol id="i-bulb" viewBox="0 0 24 24"><path d="M9.2 17.6h5.6M10.2 21h3.6M12 3a6 6 0 0 0-3.7 10.7c.7.6 1 1.3 1 2.1h5.4c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3z" ${SW} stroke-width="2.2"/></symbol>
  <symbol id="i-gear" viewBox="0 0 24 24"><path d="M4 7.5h9M18.5 7.5H20M4 16.5h3.5M12 16.5h8" ${SW} stroke-width="2.2"/><circle cx="15.8" cy="7.5" r="2.4" ${SW} stroke-width="2.2"/><circle cx="9.6" cy="16.5" r="2.4" ${SW} stroke-width="2.2"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><path d="M8.2 5.4v13.2L18.8 12z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-cal" viewBox="0 0 24 24"><rect x="4" y="5.2" width="16" height="15" rx="3" ${SW} stroke-width="2.2"/><path d="M4 10.2h16M9 3v4M15 3v4" ${SW} stroke-width="2.2"/></symbol>
  <symbol id="i-inf" viewBox="0 0 24 24"><path d="M7.6 8.6C5.6 8.6 4 10.1 4 12s1.6 3.4 3.6 3.4c3.6 0 5.2-6.8 8.8-6.8 2 0 3.6 1.5 3.6 3.4s-1.6 3.4-3.6 3.4c-3.6 0-5.2-6.8-8.8-6.8z" ${SW} stroke-width="2.3"/></symbol>
  </svg>`;
  const ico = (id, cls = '', style = '') => `<svg class="${cls}" ${style ? `style="${style}"` : ''} aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /* ===================== sound (synthesised, no files) ===================== */
  const Sfx = {
    ctx: null, out: null, noise: null, combo: 0, lastExit: 0,
    ensure() {
      if (!S.sound) return null;
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          this.ctx = new AC();
          const comp = this.ctx.createDynamicsCompressor();
          comp.threshold.value = -14; comp.ratio.value = 4;
          this.out = this.ctx.createGain(); this.out.gain.value = 0.55;
          this.out.connect(comp); comp.connect(this.ctx.destination);
          const len = this.ctx.sampleRate;
          this.noise = this.ctx.createBuffer(1, len, len);
          const d = this.noise.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { return null; }
      return this.ctx;
    },
    tone(f, dur, type = 'sine', vol = 0.3, at = 0, f2 = 0) {
      const c = this.ensure(); if (!c) return;
      const t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.out); o.start(t0); o.stop(t0 + dur + 0.02);
    },
    hiss(dur, f1, f2, vol, type = 'bandpass', q = 1.2, at = 0) {
      const c = this.ensure(); if (!c) return;
      const t0 = c.currentTime + at, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; fl.type = type; fl.Q.value = q;
      fl.frequency.setValueAtTime(f1, t0); fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(fl); fl.connect(g); g.connect(this.out); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.03);
    },
    exit() {
      const now = performance.now();
      this.combo = now - this.lastExit < 1100 ? Math.min(this.combo + 1, 10) : 0;
      this.lastExit = now;
      const k = Math.pow(2, this.combo / 12);
      this.hiss(0.24, 700 * k, 3400 * k, 0.32);
      this.tone(520 * k, 0.12, 'triangle', 0.16, 0, 820 * k);
    },
    bump() { this.tone(150, 0.18, 'sine', 0.55, 0, 62); this.hiss(0.09, 500, 200, 0.25, 'lowpass', 0.7); },
    soft() { this.tone(240, 0.07, 'sine', 0.2, 0, 180); },
    turn() { this.tone(1250, 0.035, 'square', 0.06); this.tone(1650, 0.04, 'square', 0.05, 0.05); },
    unlock() { this.tone(880, 0.14, 'triangle', 0.25); this.tone(1320, 0.26, 'triangle', 0.22, 0.09); },
    boom() { this.hiss(0.7, 1400, 60, 0.75, 'lowpass', 0.8); this.tone(95, 0.55, 'sine', 0.7, 0, 38); },
    win() { [523.3, 659.3, 784, 1046.5].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.24, i * 0.085)); this.tone(1568, 0.5, 'sine', 0.12, 0.34); },
    star(i) { this.tone(880 * Math.pow(2, i * 4 / 12), 0.22, 'triangle', 0.22); },
    fail() { [392, 329.6, 261.6].forEach((f, i) => this.tone(f, 0.32, 'sine', 0.26, i * 0.15)); },
    ui() { this.tone(660, 0.05, 'sine', 0.12, 0, 520); },
    hint() { this.tone(988, 0.1, 'sine', 0.18); this.tone(1319, 0.18, 'sine', 0.16, 0.08); },
  };
  const buzz = (ms) => { if (!S.vibe) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  /* ===================== random + level generation ===================== */
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
  const shuffle = (arr, R) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const PER = 12, WORLDS = 6, TOTAL = PER * WORLDS;

  // Cells from (x,y) to the edge in direction d; -1 if anything is in the way.
  function freeLen(grid, n, x, y, d) {
    let cx = x + DX[d], cy = y + DY[d], len = 0;
    while (cx >= 0 && cy >= 0 && cx < n && cy < n) {
      if (grid[cy * n + cx]) return -1;
      cx += DX[d]; cy += DY[d]; len++;
    }
    return len;
  }

  // Build a board backwards: every tile is placed with a clear path to the edge,
  // so removing tiles in reverse placement order always works. Removing a tile never
  // blocks anything, so the player can never reach a dead end.
  function build(cfg, R) {
    const n = cfg.size, grid = new Array(n * n).fill(null), tiles = [];
    const stones = Math.min(cfg.f.stones || 0, Math.floor(n * n * 0.14));
    for (let s = 0, guard = 0; s < stones && guard < 300; guard++) {
      const i = Math.floor(R() * n * n);
      if (!grid[i]) { const st = { kind: 'stone', x: i % n, y: (i / n) | 0 }; grid[i] = st; tiles.push(st); s++; }
    }
    const target = Math.max(3, Math.round((n * n - stones) * cfg.fill));
    let placed = 0;
    while (placed < target) {
      const cand = [];
      for (let i = 0; i < n * n; i++) {
        if (grid[i]) continue;
        const x = i % n, y = (i / n) | 0, ds = [];
        for (let d = 0; d < 4; d++) { const len = freeLen(grid, n, x, y, d); if (len >= 0) ds.push([d, len]); }
        if (ds.length) cand.push([x, y, ds]);
      }
      if (!cand.length) break;
      const [x, y, ds] = cand[Math.floor(R() * cand.length)];
      const ws = ds.map(([, len]) => Math.pow(len + 1, cfg.exp));
      let r = R() * ws.reduce((a, b) => a + b, 0), k = 0;
      while (k < ws.length - 1 && r > ws[k]) { r -= ws[k]; k++; }
      const tile = { kind: 'arrow', x, y, dir: ds[k][0], p: placed };
      grid[y * n + x] = tile; tiles.push(tile); placed++;
    }
    return { n, tiles, count: placed, target };
  }

  function generate(cfg) {
    let best = null;
    for (let a = 0; a < 14; a++) {
      const res = build(cfg, rng(hash(cfg.seed + '#' + a)));
      if (!best || res.count > best.count) best = res;
      if (res.count >= res.target) break;
    }
    const R = rng(hash(cfg.seed + '#features')), f = cfg.f;
    const plain = () => best.tiles.filter((x) => x.kind === 'arrow' && !x.num && !x.key && !x.lock);
    if (f.order) {
      shuffle(plain(), R).slice(0, Math.min(f.order, 9)).sort((a, b) => b.p - a.p).forEach((x, i) => { x.num = i + 1; });
    }
    if (f.locks) {
      const byExit = plain().sort((a, b) => b.p - a.p);
      if (byExit.length >= 4) {
        const key = byExit[Math.floor(R() * Math.max(1, Math.floor(byExit.length * 0.35)))];
        key.key = true;
        const later = best.tiles.filter((x) => x.kind === 'arrow' && !x.key && x.p < key.p);
        shuffle(later, R).slice(0, f.locks).forEach((x) => { x.lock = true; });
      }
    }
    if (f.rot) shuffle(plain(), R).slice(0, f.rot).forEach((x) => { x.kind = 'rot'; x.dir = Math.floor(R() * 4); });
    if (f.bombs) shuffle(plain(), R).slice(0, f.bombs).forEach((x) => { x.kind = 'bomb'; });
    return best;
  }

  function levelCfg(lv) {
    const w = Math.floor((lv - 1) / PER), i = (lv - 1) % PER;
    let size, fill;
    if (lv === 1) { size = 3; fill = 0.6; } else if (lv <= 4) { size = 4; fill = 0.62; } else {
      size = Math.min(8, [4, 5, 5, 5, 6, 6][w] + Math.floor(i / 4));
      fill = Math.min(0.9, 0.62 + i * 0.026);
    }
    const f = {};
    if (w === 1) f.stones = 2 + Math.floor(i / 3);
    if (w === 2) { f.order = 3 + Math.floor(i / 3); if (i > 5) f.stones = 1; }
    if (w === 3) { f.rot = 2 + Math.floor(i / 3); if (i > 3) f.stones = 1; }
    if (w === 4) { f.locks = 2 + Math.floor(i / 4); f.stones = 1; if (i > 7) f.order = 3; }
    if (w === 5) { f.bombs = 1 + Math.floor(i / 6); f.stones = 2 + Math.floor(i / 4); if (i > 5) f.rot = 2; if (i > 8) f.locks = 2; }
    return { size, fill, f, exp: Math.min(2.2, 0.9 + w * 0.2 + i * 0.05), seed: 'lv' + lv };
  }

  function mixedCfg(seed, size) {
    const R = rng(hash('cfg' + seed)), f = {};
    shuffle(['stones', 'order', 'rot', 'locks', 'bombs'], R).slice(0, 1 + Math.floor(R() * 3)).forEach((k) => {
      f[k] = { stones: 2 + Math.floor(R() * 3), order: 3 + Math.floor(R() * 4), rot: 2 + Math.floor(R() * 3), locks: 2 + Math.floor(R() * 2), bombs: 1 }[k];
    });
    return { size, fill: 0.82 + R() * 0.08, f, exp: 2, seed };
  }
  const endlessCfg = (k) => mixedCfg('E' + k, Math.min(8, 6 + Math.floor(k / 6)));
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dailyCfg = (key) => mixedCfg('D' + key, 7);

  /* ===================== DOM scaffold ===================== */
  const app = document.getElementById('app');
  app.insertAdjacentHTML('afterbegin', SPRITE);
  const screens = {};
  ['home', 'levels', 'game'].forEach((id) => {
    const s = document.createElement('section');
    s.className = 'screen' + (id === 'game' ? '' : ' scroll'); s.id = id; s.hidden = true;
    app.appendChild(s); screens[id] = s;
  });
  const fxCanvas = document.createElement('canvas'); fxCanvas.id = 'fx'; app.appendChild(fxCanvas);
  let cur = null, curWorld = 0;

  function show(id) {
    const prev = cur ? screens[cur] : null;
    cur = id;
    const el = screens[id];
    el.hidden = false;
    if (prev && prev !== el) prev.hidden = true;
    el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  const totalStars = () => Object.values(S.stars).reduce((a, b) => a + b, 0);
  const worldStars = (w) => { let s = 0; for (let i = 1; i <= PER; i++) s += S.stars[w * PER + i] || 0; return s; };
  const worldDone = (w) => { let c = 0; for (let i = 1; i <= PER; i++) if (S.stars[w * PER + i]) c++; return c; };
  const worldOpen = (w) => S.unlocked > w * PER;
  const W_STYLE = [
    { c: '--c-up', icon: 'arrow' }, { c: '--stone', icon: 'stone' }, { c: '--c-right', icon: 'num' },
    { c: '--c-rot', icon: 'rot' }, { c: '--c-down', icon: 'lock' }, { c: '--bomb', icon: 'bomb' },
  ];
  function worldMini(w, cls = '') {
    const st = W_STYLE[w];
    let inner = '';
    if (st.icon === 'arrow') inner = ico('arrow');
    else if (st.icon === 'num') inner = '<b class="mini-num">1</b>';
    else if (st.icon === 'stone') inner = '';
    else inner = ico(st.icon);
    const extra = st.icon === 'stone' ? ' stone' : st.icon === 'bomb' ? ' bomb' : st.icon === 'lock' ? ' amber' : '';
    return `<span class="mini${extra} ${cls}" style="--c:var(${st.c})">${inner}</span>`;
  }

  /* ===================== HOME ===================== */
  function renderHome() {
    const next = Math.min(S.unlocked, TOTAL), w = Math.floor((next - 1) / PER);
    const tk = todayKey(), dStars = S.daily[tk] || 0;
    const date = niceDate();
    const allDone = S.unlocked > TOTAL;
    const worlds = Array.from({ length: WORLDS }, (_, i) => {
      const open = worldOpen(i), done = worldDone(i);
      return `<button class="world${open ? '' : ' locked'}" data-act="world" data-w="${i}" style="--c:var(${W_STYLE[i].c})" ${open ? '' : 'aria-disabled="true"'}>
        ${worldMini(i)}
        <span class="world-body">
          <span class="world-row"><span class="world-name">${L[lang].worldsT[i][0]}</span>
          ${open ? `<span class="world-stars">${ico('star')}${worldStars(i)}/${PER * 3}</span>` : `<span class="world-stars">${ico('lock', 'lock-ico')}${t('finish_world', i)}</span>`}</span>
          <span class="bar"><i style="--p:${Math.round(done / PER * 100)}%"></i></span>
        </span>
      </button>`;
    }).join('');
    screens.home.innerHTML = `<div class="wrap">
      <div class="home-top">
        <div class="streak">${ico('star')}<span><b>${totalStars()}</b> / ${TOTAL * 3}</span></div>
        <button class="icon-btn" data-act="settings" aria-label="${t('settings')}">${ico('gear')}</button>
      </div>
      <div class="hero">
        <div class="hero-tiles" aria-hidden="true">
          <span class="mini" style="--c:var(--c-left)">${ico('arrow', '', 'rotate:-90deg')}</span>
          <span class="mini amber" style="--c:var(--c-down)">${ico('arrow', '', 'rotate:180deg')}</span>
          <span class="mini" style="--c:var(--c-right)">${ico('arrow')}</span>
          <span class="mini fly" style="--c:var(--c-up)">${ico('arrow', '', 'rotate:90deg')}</span>
        </div>
        <h1 class="wordmark">${t('brand')}</h1>
        <p class="tagline">${t('tagline')}</p>
      </div>
      <button class="btn primary play-btn" data-act="continue">
        <span class="pb-text"><span class="pb-title">${t('play')}</span>
        <span class="pb-sub">${allDone ? t('all_levels') : `${t('world_n', w + 1)} · ${t('level_n', next)}`}</span></span>
        <span class="pb-go">${ico('play')}</span>
      </button>
      <div class="modes">
        <button class="mode" data-act="daily"><span class="mini amber" style="--c:var(--c-down)">${ico('cal')}</span>
          <span class="mode-title">${t('daily')}</span><span class="mode-sub${dStars ? ' done' : ''}">${date} · ${dStars ? t('daily_done') : t('daily_new')}</span></button>
        <button class="mode" data-act="endless"><span class="mini" style="--c:var(--c-rot)">${ico('inf')}</span>
          <span class="mode-title">${t('endless')}</span><span class="mode-sub">${t('endless_best', S.endlessBest)}</span></button>
      </div>
      <div class="label">${t('worlds')}</div>
      <div class="worlds">${worlds}</div>
    </div>`;
  }

  /* ===================== LEVEL SELECT ===================== */
  function renderLevels(w) {
    curWorld = w;
    const cells = Array.from({ length: PER }, (_, i) => {
      const lv = w * PER + i + 1, st = S.stars[lv] || 0, locked = lv > S.unlocked, current = lv === S.unlocked;
      const stars = [0, 1, 2].map((k) => ico('star', k < st ? 'on' : '')).join('');
      return `<button class="lv${locked ? ' locked' : ''}${current ? ' current' + (w === 4 ? ' amber' : '') : ''}" data-act="lv" data-lv="${lv}" ${locked ? 'disabled' : ''} aria-label="${t('level_n', lv)}">
        ${lv}<span class="st">${stars}</span></button>`;
    }).join('');
    screens.levels.innerHTML = `<div class="wrap">
      <div class="bar-top"><button class="icon-btn" data-act="home" aria-label="${t('back')}">${ico('back')}</button>
        <div class="title"><span class="label">${t('world_n', w + 1)}</span><b>${L[lang].worldsT[w][0]}</b></div>
        <div class="streak">${ico('star')}<span><b>${worldStars(w)}</b> / ${PER * 3}</span></div></div>
      <div class="world-intro">${worldMini(w)}<p>${L[lang].worldsT[w][1]}</p></div>
      <div class="lv-grid" style="--c:var(${W_STYLE[w].c})">${cells}</div>
    </div>`;
  }

  /* ===================== GAME ===================== */
  screens.game.innerHTML = `
    <div class="hud">
      <button class="icon-btn" data-act="back" aria-label="${t('back')}">${ico('back')}</button>
      <div class="title"><span class="label" id="g-label"></span><b id="g-title"></b></div>
      <div class="hearts" id="g-hearts">${ico('heart')}${ico('heart')}${ico('heart')}</div>
    </div>
    <div class="status" id="g-status" aria-live="polite"></div>
    <div class="board-wrap" id="g-wrap"><div class="board" id="g-board"><div class="board-in" id="g-in"></div></div></div>
    <div class="tools">
      <div class="tool"><button class="icon-btn" data-act="restart" aria-label="${t('restart')}">${ico('restart')}</button><span id="g-t-restart">${t('restart')}</span></div>
      <div class="left-chip"><span id="g-left">0</span><small id="g-t-left">${t('left')}</small></div>
      <div class="tool"><button class="icon-btn" data-act="hint" aria-label="${t('hint')}">${ico('bulb')}<span class="count" id="g-hints">0</span></button><span id="g-t-hint">${t('hint')}</span></div>
    </div>`;
  const $ = (id) => document.getElementById(id);
  const boardEl = $('g-board'), boardIn = $('g-in'), wrapEl = $('g-wrap');
  let G = null, statusTimer = 0, idleTimer = 0;

  function fitBoard() {
    if (!G) return;
    const r = wrapEl.getBoundingClientRect();
    const size = Math.max(160, Math.floor(Math.min(r.width, r.height, 560)));
    boardEl.style.width = size + 'px'; boardEl.style.height = size + 'px';
    boardEl.style.setProperty('--cell', ((size - 12) / G.n).toFixed(2) + 'px');
  }
  if (window.ResizeObserver) new ResizeObserver(fitBoard).observe(wrapEl); else window.addEventListener('resize', fitBoard);

  function startLevel(lv) { startGame('level', levelCfg(lv), { lv, label: t('world_n', Math.floor((lv - 1) / PER) + 1), title: t('level_n', lv) }); }
  function niceDate() { try { return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' }).format(new Date()); } catch (e) { return todayKey(); } }
  function startDaily() { const k = todayKey(); startGame('daily', dailyCfg(k), { key: k, label: niceDate(), title: t('daily') }); }
  function startEndless() { const k = S.endlessCur; startGame('endless', endlessCfg(k), { k, label: t('endless'), title: t('endless_n', k) }); }

  function startGame(mode, cfg, meta) {
    closeSheet(true);
    const lvl = generate(cfg);
    const n = lvl.n;
    G = { mode, cfg, meta, n, grid: new Array(n * n).fill(null), tiles: lvl.tiles, left: 0, keys: 0, mistakes: 0, over: false, taps: 0 };
    lvl.tiles.forEach((tl, i) => {
      tl.id = i; tl.alive = true; tl.r = tl.dir || 0;
      G.grid[tl.y * n + tl.x] = tl;
      if (tl.kind !== 'stone') G.left++;
      if (tl.key) G.keys++;
    });
    $('g-label').textContent = meta.label; $('g-title').textContent = meta.title;
    boardEl.style.setProperty('--n', n);
    boardIn.textContent = '';
    const frag = document.createDocumentFragment();
    lvl.tiles.forEach((tl) => { tl.el = makeTile(tl); frag.appendChild(tl.el); });
    boardIn.appendChild(frag);
    show('game');
    fitBoard();
    const mid = (n - 1) / 2;
    lvl.tiles.forEach((tl) => {
      const dist = Math.abs(tl.x - mid) + Math.abs(tl.y - mid);
      tl.el.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: 380, delay: 60 + dist * 34, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
    });
    updateHud(); refreshBadges(); setStatus();
    clearTimeout(idleTimer);
    if (mode === 'level' && meta.lv <= 2) idleTimer = setTimeout(() => { if (G && !G.taps) showHint(true); }, 2600);
    // first level of each world explains its mechanic
    if (mode === 'level') {
      const w = Math.floor((meta.lv - 1) / PER);
      if ((meta.lv - 1) % PER === 0 && !S.seen['w' + w]) { S.seen['w' + w] = 1; save(); setTimeout(() => introSheet(w), 450); }
    }
  }

  function tileLabel(tl) {
    if (tl.kind === 'stone') return t('a_stone');
    if (tl.kind === 'bomb') return t('a_bomb');
    const dir = L[lang].dirs[tl.dir];
    let s = tl.kind === 'rot' ? t('a_rot', dir) : t('a_tile', dir);
    if (tl.num) s = tl.num + '. ' + s;
    if (tl.key) s += t('a_key');
    if (tl.lock) s += t('a_lock');
    return s;
  }

  function makeTile(tl) {
    const b = document.createElement('button');
    b.className = 'tile';
    b.style.setProperty('--x', tl.x); b.style.setProperty('--y', tl.y);
    let inner = '';
    if (tl.kind === 'stone') { b.classList.add('t-stone'); b.tabIndex = -1; }
    else if (tl.kind === 'bomb') { b.classList.add('t-bomb'); inner = ico('bomb', 'ico'); }
    else {
      b.classList.add('d' + tl.dir);
      if (tl.kind === 'rot') { b.classList.add('t-rot'); inner += '<span class="ring"></span>'; }
      inner += ico('arrow', 'ico');
      if (tl.num) inner += `<span class="badge">${tl.num}</span>`;
      if (tl.key) inner += `<span class="keyb">${ico('key')}</span>`;
      if (tl.lock) { b.classList.add('t-locked'); inner += `<span class="lockb">${ico('lock')}</span>`; }
      b.style.setProperty('--r', tl.r);
    }
    b.innerHTML = `<span class="face">${inner}</span>`;
    b.setAttribute('aria-label', tileLabel(tl));
    b.dataset.id = tl.id;
    return b;
  }

  function updateHud() {
    if (!G) return;
    $('g-left').textContent = G.left;
    $('g-hints').textContent = S.hints;
    [...$('g-hearts').children].forEach((h, i) => h.classList.toggle('lost', i >= 3 - G.mistakes));
  }
  const minNum = () => { let m = Infinity; G.tiles.forEach((x) => { if (x.alive && x.num && x.num < m) m = x.num; }); return m; };
  function refreshBadges() {
    const m = minNum();
    G.tiles.forEach((x) => { if (x.alive && x.num) x.el.querySelector('.badge').classList.toggle('next', x.num === m); });
  }
  function setStatus(msg, warn) {
    clearTimeout(statusTimer);
    const el = $('g-status');
    if (msg) {
      el.innerHTML = `<span class="chip${warn ? ' warn' : ''}">${msg}</span>`;
      el.firstChild.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      statusTimer = setTimeout(() => setStatus(), 1700);
      return;
    }
    if (!G) { el.textContent = ''; return; }
    const m = minNum();
    let base = '';
    if (G.keys > 0) base = `${ico('key')}${t('key_left')}`;
    else if (m !== Infinity) base = t('next_num', m);
    else if (G.mode === 'level' && G.meta.lv <= 2) base = t('tut');
    el.innerHTML = base ? `<span class="chip">${base}</span>` : '';
  }

  function pathInfo(tl) {
    const n = G.n; let cx = tl.x + DX[tl.dir], cy = tl.y + DY[tl.dir], k = 0;
    while (cx >= 0 && cy >= 0 && cx < n && cy < n) {
      const o = G.grid[cy * n + cx];
      if (o) return { clear: false, k, blocker: o };
      cx += DX[tl.dir]; cy += DY[tl.dir]; k++;
    }
    return { clear: true, k };
  }

  boardIn.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    const b = e.target.closest('.tile'); if (!b) return;
    e.preventDefault();
    tap(G.tiles[+b.dataset.id]);
  });
  boardIn.addEventListener('click', (e) => { // keyboard activation only (pointer taps are handled on pointerdown)
    if (e.detail !== 0) return;
    const b = e.target.closest('.tile'); if (b) tap(G.tiles[+b.dataset.id]);
  });

  function tap(tl) {
    if (!G || G.over || !tl || !tl.alive) return;
    Sfx.ensure(); G.taps++; clearTimeout(idleTimer);
    if (tl.kind === 'stone') { wiggle(tl.el); Sfx.soft(); setStatus(t('stone_msg')); return; }
    if (tl.kind === 'bomb') { explode(tl); return; }
    if (tl.lock && G.keys > 0) { wiggle(tl.el); mistake(tl, t('err_lock')); return; }
    if (tl.num && tl.num !== minNum()) {
      wiggle(tl.el); const m = minNum();
      G.tiles.forEach((x) => { if (x.alive && x.num === m) pulse(x.el); });
      mistake(tl, t('err_order', m)); return;
    }
    const p = pathInfo(tl);
    if (p.clear) { fly(tl, p.k); return; }
    if (tl.kind === 'rot') { turn(tl); return; }
    bump(tl, p); mistake(tl, t('err_block'));
  }

  function removeTile(tl) {
    tl.alive = false; G.grid[tl.y * G.n + tl.x] = null; G.left--;
    tl.el.style.pointerEvents = 'none'; tl.el.tabIndex = -1;
    if (tl.key) { G.keys--; if (G.keys === 0) setTimeout(unlockAll, 120); }
    if (tl.num) refreshBadges();
  }

  function fly(tl, k) {
    removeTile(tl);
    const d = tl.dir, dist = k + 1 + G.n * 0.9;
    const tx = DX[d] * dist * 100, ty = DY[d] * dist * 100;
    const dur = 230 + k * 26;
    const a = tl.el.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${DX[d] * -8}%, ${DY[d] * -8}%) scale(1.04)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${tx * 0.55}%, ${ty * 0.55}%) scale(.96)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${tx}%, ${ty}%) scale(.8)`, opacity: 0 },
    ], { duration: dur, easing: 'cubic-bezier(.5,0,.8,.3)', fill: 'forwards' });
    a.onfinish = () => tl.el.remove();
    trail(tl);
    Sfx.exit(); buzz(8);
    setStatus(); updateHud(); checkWin();
  }

  function bump(tl, p) {
    const d = tl.dir, s = (p.k + 0.16) * 100;
    tl.el.animate([
      { transform: 'translate(0,0)' },
      { transform: `translate(${DX[d] * s}%, ${DY[d] * s}%)`, offset: 0.4, easing: 'cubic-bezier(.2,.8,.2,1)' },
      { transform: 'translate(0,0)' },
    ], { duration: 260 + p.k * 50, easing: 'cubic-bezier(.4,0,.6,1)' });
    const delay = 80 + p.k * 30;
    setTimeout(() => {
      if (p.blocker.el.isConnected) p.blocker.el.animate([{ transform: 'none' }, { transform: `translate(${DX[d] * 9}%, ${DY[d] * 9}%)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
      Sfx.bump();
    }, delay);
    tl.el.classList.add('err'); setTimeout(() => tl.el.classList.remove('err'), 520);
  }

  function wiggle(el) {
    el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(0)' }], { duration: 320, easing: 'ease-out' });
  }
  function pulse(el) { el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' }); }

  function mistake(tl, msg) {
    G.mistakes++;
    const hearts = [...$('g-hearts').children], h = hearts[3 - G.mistakes];
    if (h) { h.classList.remove('pop'); void h.getBoundingClientRect(); h.classList.add('pop'); }
    updateHud(); setStatus(msg, true); buzz([18, 40, 18]);
    if (tl.kind !== 'arrow' || msg !== t('err_block')) Sfx.bump();
    if (G.mistakes >= 3) {
      G.over = true;
      boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake');
      setTimeout(failSheet, 750);
    }
  }

  function turn(tl) {
    tl.dir = (tl.dir + 1) % 4; tl.r++;
    tl.el.classList.remove('d0', 'd1', 'd2', 'd3'); tl.el.classList.add('d' + tl.dir);
    tl.el.style.setProperty('--r', tl.r);
    tl.el.setAttribute('aria-label', tileLabel(tl));
    Sfx.turn(); buzz(6);
  }

  function unlockAll() {
    let any = false;
    G.tiles.forEach((x) => {
      if (!x.alive || !x.lock) return;
      any = true; x.lock = false; x.el.classList.add('unlock');
      setTimeout(() => { x.el.classList.remove('t-locked', 'unlock'); x.el.querySelector('.lockb')?.remove(); x.el.setAttribute('aria-label', tileLabel(x)); }, 460);
    });
    if (any) { Sfx.unlock(); setStatus(t('unlocked')); } else setStatus();
  }

  function explode(b) {
    const n = G.n, hit = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = b.x + dx, y = b.y + dy;
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const o = G.grid[y * n + x];
      if (o && o.kind !== 'stone') hit.push(o);
    }
    const c = centerOf(b.el);
    hit.forEach((o) => {
      removeTile(o);
      const far = o === b ? 0 : 1, del = far * 60;
      const a = o.el.animate([
        { transform: 'scale(1)', opacity: 1 },
        { transform: `translate(${(o.x - b.x) * 40}%, ${(o.y - b.y) * 40}%) scale(1.25)`, opacity: 0.9, offset: 0.3 },
        { transform: `translate(${(o.x - b.x) * 120}%, ${(o.y - b.y) * 120}%) scale(.2) rotate(${(o.x - b.x) * 40}deg)`, opacity: 0 },
      ], { duration: 420, delay: del, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      a.onfinish = () => o.el.remove();
    });
    FX.burst(c.x, c.y, 46, palette().concat(['#ffd166', '#ffffff']), { speed: 9, size: 7, life: 60 });
    boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake');
    Sfx.boom(); buzz(45);
    setStatus(); updateHud(); checkWin();
  }

  function checkWin() {
    if (G.left > 0 || G.over) return;
    G.over = true;
    setTimeout(winSheet, 420);
  }

  function hintTarget() {
    const m = minNum();
    const ok = (x) => x.alive && x.kind !== 'stone' && !(x.lock && G.keys > 0) && !(x.num && x.num !== m);
    let rotPick = null, bombPick = null;
    for (const x of G.tiles) {
      if (!ok(x)) continue;
      if (x.kind === 'bomb') { bombPick = bombPick || x; continue; }
      if (pathInfo(x).clear) return x;
      if (x.kind === 'rot' && !rotPick) {
        for (let d = 0; d < 4; d++) { if (freeLen(G.grid, G.n, x.x, x.y, d) >= 0) { rotPick = x; break; } }
      }
    }
    return rotPick || bombPick;
  }
  function showHint(free) {
    if (!G || G.over) return;
    if (!free) {
      if (S.hints <= 0) { setStatus(t('no_hints'), true); Sfx.soft(); return; }
    }
    const x = hintTarget(); if (!x) return;
    if (!free) { S.hints--; save(); updateHud(); }
    G.tiles.forEach((o) => o.el.classList.remove('hint'));
    void x.el.offsetWidth; x.el.classList.add('hint');
    setTimeout(() => x.el.classList.remove('hint'), 2800);
    Sfx.hint();
  }

  /* ===================== effects ===================== */
  function palette() { const cs = getComputedStyle(document.documentElement); return ['--c-up', '--c-right', '--c-down', '--c-left', '--c-rot'].map((v) => cs.getPropertyValue(v).trim()); }
  function centerOf(el) { const r = el.getBoundingClientRect(), a = app.getBoundingClientRect(); return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2, w: r.width }; }
  function trail(tl) {
    const c = centerOf(tl.el), col = getComputedStyle(tl.el).getPropertyValue('--c').trim() || palette()[0];
    FX.burst(c.x - DX[tl.dir] * c.w * 0.3, c.y - DY[tl.dir] * c.w * 0.3, 7, [col], { speed: 2.4, size: 4, life: 26, dir: [-DX[tl.dir], -DY[tl.dir]] });
  }
  const FX = {
    ctx: fxCanvas.getContext('2d'), parts: [], on: false, dpr: 1, w: 0, h: 0,
    resize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = app.getBoundingClientRect(); this.w = r.width; this.h = r.height;
      fxCanvas.width = Math.round(r.width * this.dpr); fxCanvas.height = Math.round(r.height * this.dpr);
    },
    burst(x, y, count, colors, o = {}) {
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!this.w) this.resize();
      for (let i = 0; i < count; i++) {
        let ang = Math.random() * Math.PI * 2;
        if (o.dir) ang = Math.atan2(o.dir[1], o.dir[0]) + (Math.random() - 0.5) * 1.4;
        const sp = (o.speed || 6) * (0.35 + Math.random() * 0.75);
        this.parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (o.up || 0), g: o.g ?? 0.18, life: 0, max: (o.life || 50) * (0.7 + Math.random() * 0.5),
          s: (o.size || 6) * (0.6 + Math.random() * 0.8), c: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, rect: !!o.rect });
      }
      if (this.parts.length > 420) this.parts.splice(0, this.parts.length - 420);
      if (!this.on) { this.on = true; requestAnimationFrame(() => this.loop()); }
    },
    confetti() {
      if (!this.w) this.resize();
      const cols = palette();
      for (let i = 0; i < 4; i++) setTimeout(() => this.burst(this.w * (0.15 + Math.random() * 0.7), this.h * 0.3, 34, cols, { speed: 10, size: 9, life: 95, g: 0.22, up: 4, rect: true }), i * 120);
    },
    loop() {
      const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.w, this.h);
      this.parts = this.parts.filter((p) => p.life < p.max);
      for (const p of this.parts) {
        p.life++; p.vx *= 0.97; p.vy = p.vy * 0.97 + p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        const k = 1 - p.life / p.max; c.globalAlpha = Math.min(1, k * 1.6); c.fillStyle = p.c;
        if (p.rect) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); }
        else { c.beginPath(); c.arc(p.x, p.y, Math.max(0.5, p.s * (0.4 + k * 0.6)), 0, 6.283); c.fill(); }
      }
      c.globalAlpha = 1;
      if (this.parts.length) requestAnimationFrame(() => this.loop()); else { this.on = false; c.clearRect(0, 0, this.w, this.h); }
    },
  };
  window.addEventListener('resize', () => FX.resize());

  /* ===================== sheets & toast ===================== */
  let sheet = null;
  function openSheet(html, handlers, opts = {}) {
    closeSheet(true);
    const scrim = document.createElement('div');
    scrim.className = 'sheet-scrim';
    scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    app.appendChild(scrim);
    const panel = scrim.firstElementChild;
    scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    panel.animate([{ transform: 'translateY(48px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
    scrim.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b && panel.contains(b)) { Sfx.ui(); handlers[b.dataset.act] && handlers[b.dataset.act](b); }
      else if (e.target === scrim && opts.dismiss) closeSheet();
    });
    sheet = { scrim, opts, handlers };
    setTimeout(() => { const f = panel.querySelector('.btn.primary'); if (f) f.focus({ preventScroll: true }); }, 60);
    return panel;
  }
  function closeSheet(instant) {
    if (!sheet) return;
    const s = sheet.scrim; sheet = null;
    if (instant) { s.remove(); return; }
    s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).onfinish = () => s.remove();
  }
  function toast(msg) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; app.appendChild(el);
    el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 200 });
    setTimeout(() => { el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).onfinish = () => el.remove(); }, 1600);
  }

  function winSheet() {
    const stars = Math.max(1, 3 - G.mistakes);
    let reward = false, title = t('win' + stars), sub = G.mistakes ? t('mistakes', G.mistakes) : t('no_mistakes'), extra = '';
    const { mode, meta } = G;
    if (mode === 'level') {
      const prev = S.stars[meta.lv] || 0;
      if (stars > prev) S.stars[meta.lv] = stars;
      if (stars === 3 && prev < 3) { S.hints++; reward = true; }
      if (meta.lv >= S.unlocked) S.unlocked = meta.lv + 1;
      if (meta.lv === TOTAL) extra = `<p>${t('all_done')}</p>`;
    } else if (mode === 'daily') {
      if (!S.daily[meta.key]) { S.hints++; reward = true; }
      S.daily[meta.key] = Math.max(S.daily[meta.key] || 0, stars);
      extra = `<p>${t('daily_back')}</p>`;
    } else {
      S.endlessBest = Math.max(S.endlessBest, meta.k); S.endlessCur = meta.k + 1;
    }
    save();
    const starsHtml = [0, 1, 2].map((i) => ico('star', i < stars ? 'on' : '', i < stars ? `animation-delay:${200 + i * 180}ms` : '')).join('');
    openSheet(`<div class="big-stars">${starsHtml}</div><h2>${title}</h2><p>${sub}</p>${extra}
      ${reward ? `<span class="reward">${ico('bulb')}${t('plus_hint')}</span>` : ''}
      <div class="acts two"><button class="icon-btn" style="width:54px;height:54px" data-act="again" aria-label="${t('retry')}">${ico('restart')}</button>
      <button class="btn primary" data-act="next">${mode === 'daily' ? t('menu') : t('next')}</button></div>`, {
      again: () => restart(),
      next: () => {
        if (mode === 'daily') { closeSheet(); goHome(); return; }
        if (mode === 'endless' || meta.lv >= TOTAL) { startEndless(); return; }
        startLevel(meta.lv + 1);
      },
    });
    FX.confetti(); Sfx.win(); buzz([20, 60, 30]);
    for (let i = 0; i < stars; i++) setTimeout(() => Sfx.star(i), 260 + i * 180);
  }
  function failSheet() {
    Sfx.fail();
    openSheet(`<div class="big-stars">${ico('heart')}</div><h2>${t('fail')}</h2><p>${t('fail_sub')}</p>
      <div class="acts"><button class="btn primary" data-act="retry">${ico('restart')}${t('retry')}</button>
      <button class="btn" data-act="menu">${t('menu')}</button></div>`, {
      retry: () => restart(), menu: () => { closeSheet(); goBack(); },
    });
    const h = sheet.scrim.querySelector('.big-stars svg'); h.style.fill = 'var(--danger)'; h.style.width = h.style.height = '64px';
  }
  function introSheet(w) {
    if (!G || G.over || cur !== 'game') return;
    const demo = w === 0
      ? `<span class="mini" style="--c:var(--c-up)">${ico('arrow')}</span><span class="mini" style="--c:var(--c-left)">${ico('arrow', '', 'rotate:-90deg')}</span>`
      : worldMini(w);
    openSheet(`<span class="label">${w === 0 ? t('world_n', 1) : t('new_mech')}</span><div class="intro-demo">${demo}</div>
      <h2>${L[lang].worldsT[w][0]}</h2><p>${L[lang].worldsT[w][1]}</p>
      <div class="acts"><button class="btn primary" data-act="ok">${t('got_it')}</button></div>`, { ok: () => closeSheet() }, { dismiss: true });
  }
  function settingsSheet() {
    let armed = false;
    const render = () => `<h2>${t('settings')}</h2><div>
      <button class="setting" data-act="sound"><span>${t('sound')}</span><span class="toggle" role="switch" aria-checked="${S.sound}"></span></button>
      <button class="setting" data-act="vibe"><span>${t('vibe')}</span><span class="toggle" role="switch" aria-checked="${S.vibe}"></span></button>
      <div class="setting"><span>${t('lang')}</span><div class="seg">
        <button data-act="lang" data-v="ru" aria-pressed="${lang === 'ru'}">Русский</button><button data-act="lang" data-v="en" aria-pressed="${lang === 'en'}">English</button></div></div>
      </div><button class="danger-link" data-act="reset">${t('reset')}</button>
      <div class="acts"><button class="btn primary" data-act="close">${t('done')}</button></div>`;
    const panel = openSheet(render(), {
      sound: (b) => { S.sound = !S.sound; save(); b.querySelector('.toggle').setAttribute('aria-checked', S.sound); if (S.sound) Sfx.ui(); },
      vibe: (b) => { S.vibe = !S.vibe; save(); b.querySelector('.toggle').setAttribute('aria-checked', S.vibe); buzz(20); },
      lang: (b) => { setLang(b.dataset.v); panel.innerHTML = render(); },
      reset: (b) => {
        if (!armed) { armed = true; b.textContent = t('reset_sure'); return; }
        const keep = { sound: S.sound, vibe: S.vibe, lang: S.lang };
        S = Object.assign(fresh(), keep); save(); closeSheet(); renderHome(); toast(t('reset_done'));
      },
      close: () => closeSheet(),
    }, { dismiss: true });
  }
  function setLang(v) {
    lang = v; S.lang = v; save(); document.documentElement.lang = v;
    $('g-t-restart').textContent = t('restart'); $('g-t-hint').textContent = t('hint'); $('g-t-left').textContent = t('left');
    renderHome(); if (cur === 'levels') renderLevels(curWorld);
  }

  function restart() {
    if (!G) return;
    if (G.mode === 'level') startLevel(G.meta.lv);
    else if (G.mode === 'daily') startDaily();
    else startGame('endless', endlessCfg(G.meta.k), G.meta);
  }
  function goHome() { G = null; clearTimeout(idleTimer); renderHome(); show('home'); }
  function goBack() {
    if (G && G.mode === 'level') { const w = Math.floor((G.meta.lv - 1) / PER); G = null; renderLevels(w); show('levels'); }
    else goHome();
  }

  /* ===================== navigation ===================== */
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.closest('.sheet-scrim')) return;
    const act = b.dataset.act;
    Sfx.ensure();
    if (act !== 'hint') Sfx.ui();
    switch (act) {
      case 'continue': if (S.unlocked > TOTAL) startEndless(); else startLevel(S.unlocked); break;
      case 'daily': startDaily(); break;
      case 'endless': startEndless(); break;
      case 'settings': settingsSheet(); break;
      case 'world': {
        const w = +b.dataset.w;
        if (!worldOpen(w)) { wiggle(b); toast(t('finish_world', w)); break; }
        renderLevels(w); show('levels'); screens.levels.scrollTop = 0; break;
      }
      case 'lv': startLevel(+b.dataset.lv); break;
      case 'home': goHome(); break;
      case 'back': goBack(); break;
      case 'restart': restart(); break;
      case 'hint': showHint(false); break;
      default: break;
    }
  });

  function onBack() {
    if (sheet) { if (sheet.opts.dismiss) closeSheet(); else if (sheet.handlers.menu) sheet.handlers.menu(); else { closeSheet(); goBack(); } return true; }
    if (cur === 'game') { goBack(); return true; }
    if (cur === 'levels') { goHome(); return true; }
    return false;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') onBack(); });
  const capApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (capApp && capApp.addListener) capApp.addListener('backButton', () => { if (!onBack()) capApp.exitApp(); });
  document.addEventListener('visibilitychange', () => {
    if (!Sfx.ctx) return;
    try { if (document.hidden) Sfx.ctx.suspend(); else if (S.sound) Sfx.ctx.resume(); } catch (e) { /* ignore */ }
  });

  // Exposed for automated checks; harmless in production.
  window.Strelka = { generate, levelCfg, endlessCfg, dailyCfg, freeLen, TOTAL };

  renderHome(); show('home');
})();
