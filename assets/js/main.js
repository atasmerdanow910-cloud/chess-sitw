import { GAMES, simulate, toRussianSan } from './games.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (window.Capacitor?.isNativePlatform?.()) document.documentElement.classList.add('is-native');

/* ---------------- Шапка и появление блоков ---------------- */

const header = $('.site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('is-in');
      revealer.unobserve(e.target);
    }
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
$$('.reveal').forEach((el) => revealer.observe(el));

// активный пункт меню
const navLinks = $$('.site-nav a');
const spy = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
['board', 'facts', 'legends'].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

/* ---------------- Проигрыватель партий ---------------- */

const STEP = 0.95;      // пауза между ходами, сек
const END_PAUSE = 5;    // пауза после последнего хода
const els = {
  hero: $('#board'),
  stage: $('#stage'),
  title: $('#game-title'),
  meta: $('#game-meta'),
  note: $('#game-note'),
  moves: $('#moves'),
  counter: $('#counter'),
  progress: $('#progress'),
  play: $('#btn-play'),
  prev: $('#btn-prev'),
  next: $('#btn-next'),
  first: $('#btn-first'),
  orbit: $('#btn-orbit'),
  tabs: $$('[data-game-tab]'),
  hint: $('#stage-hint'),
  status: $('#stage-status'),
  playStatus: $('#play-status'),
  panelLegends: $('.panel-legends'),
  panelPlay: $('.panel-play'),
  modeBtns: $$('[data-mode]'),
  colorBtns: $$('[data-color]'),
  levelBtns: $$('[data-level]'),
  newGame: $('#btn-new'),
  undo: $('#btn-undo'),
  promo: $('#promo'),
};

const player = {
  id: null, game: null, sim: null, san: [], ply: 0,
  playing: !reduceMotion, wait: 0, visible: true, ready: false,
};
let scene = null;
let mode = 'legends';
let play = null;

function store(key, value) {
  try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch { /* без хранилища */ }
  return null;
}

function total() { return player.san.length; }

function loadGame(id, { autoplay } = {}) {
  const game = GAMES[id];
  if (!game) return;
  player.id = id;
  player.game = game;
  player.sim = simulate(game.uci, game.san);
  player.san = player.sim.san;
  player.ply = 0;
  player.wait = 0;

  els.tabs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gameTab === id)));
  els.title.textContent = game.title;
  els.meta.replaceChildren(...[`${game.white} — ${game.black}`, `${game.place}, ${game.year}`, game.result].map((t) => {
    const span = document.createElement('span');
    span.textContent = t;
    return span;
  }));
  els.note.textContent = game.note;
  renderMoves(player.san);
  if (mode === 'legends') scene?.setGame(player.sim);
  if (autoplay !== undefined) setPlaying(autoplay);
  update();
}

function renderMoves(sans) {
  const frag = document.createDocumentFragment();
  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'mv mv-start';
  start.dataset.ply = '0';
  start.textContent = 'Старт';
  frag.append(start);
  sans.forEach((san, i) => {
    if (i % 2 === 0) {
      const no = document.createElement('span');
      no.className = 'mv-no';
      no.textContent = `${i / 2 + 1}.`;
      frag.append(no);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mv';
    b.dataset.ply = String(i + 1);
    b.textContent = toRussianSan(san);
    frag.append(b);
  });
  els.moves.replaceChildren(frag);
}

function markCurrent(ply) {
  const prevCur = els.moves.querySelector('.is-current');
  prevCur?.classList.remove('is-current');
  prevCur?.removeAttribute('aria-current');
  const cur = els.moves.querySelector(`[data-ply="${ply}"]`);
  if (!cur) return;
  cur.classList.add('is-current');
  cur.setAttribute('aria-current', 'step');
  const strip = els.moves;
  const left = cur.offsetLeft - strip.clientWidth / 2 + cur.offsetWidth / 2;
  strip.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' });
}

function update() {
  if (mode !== 'legends') return;
  const n = total();
  const ply = player.ply;
  els.counter.textContent = ply === 0 ? `Начало · ${Math.ceil(n / 2)} ходов` : `Ход ${Math.ceil(ply / 2)} из ${Math.ceil(n / 2)}`;
  els.progress.style.transform = `scaleX(${n ? ply / n : 0})`;
  els.prev.disabled = els.first.disabled = ply === 0;
  els.next.disabled = ply >= n;
  markCurrent(ply);
}

function goTo(ply) {
  if (mode !== 'legends') return;
  const n = total();
  ply = Math.max(0, Math.min(n, ply));
  scene?.show(ply, { animate: true });
  player.ply = ply;
  player.wait = 0;
  update();
}

function setPlaying(v) {
  player.playing = v;
  player.wait = v ? STEP * 0.6 : 0;
  els.play.setAttribute('aria-pressed', String(v));
  els.play.setAttribute('aria-label', v ? 'Пауза' : 'Воспроизвести');
  els.play.classList.toggle('is-playing', v);
  if (v && player.ply >= total()) goTo(0);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (mode === 'legends' && player.ready && player.playing && player.visible && !document.hidden && !(scene && scene.busy())) {
    player.wait += dt;
    const atEnd = player.ply >= total();
    if (atEnd && player.wait > END_PAUSE) goTo(0);
    else if (!atEnd && player.wait > STEP) goTo(player.ply + 1);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

new IntersectionObserver(([e]) => { player.visible = e.isIntersecting; }, { threshold: 0.2 }).observe(els.hero);

/* ---------------- Игра с компьютером ---------------- */

function pressed(btns, attr, value) {
  btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === value)));
}

function askPromotion() {
  return new Promise((resolve) => {
    const box = els.promo;
    box.hidden = false;
    box.querySelector('button')?.focus({ preventScroll: true });
    const done = (value) => {
      box.hidden = true;
      box.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onClick = (e) => {
      const b = e.target.closest('[data-promo]');
      if (b) done(b.dataset.promo);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(null); };
    box.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
  });
}

async function getPlay() {
  if (play) return play;
  const { PlayController } = await import('./play.js');
  play = new PlayController({
    scene: () => scene,
    askPromotion,
    // на узком экране смотрим на доску почти сверху — так проще попадать по клеткам
    viewPhi: () => (matchMedia('(max-width: 900px)').matches ? 0.6 : 0.85),
    onMoves: (tracker) => {
      if (mode !== 'play') return;
      renderMoves(tracker.san);
      markCurrent(tracker.ply);
      els.counter.textContent = tracker.ply ? `Ход ${Math.ceil(tracker.ply / 2)}` : 'Начало партии';
      els.undo.disabled = !play?.canUndo();
    },
    onStatus: (text, kind) => {
      if (mode !== 'play') return;
      els.playStatus.textContent = text;
      els.playStatus.dataset.kind = kind;
      els.status.textContent = text;
      els.status.dataset.kind = kind;
      els.undo.disabled = !play?.canUndo();
    },
  });
  return play;
}

async function setMode(next, { scroll = false } = {}) {
  if (next === mode && !(next === 'play' && !play)) return;
  mode = next;
  store('gambit.mode', next);
  const isPlay = next === 'play';
  els.hero.classList.toggle('is-play', isPlay);
  els.panelLegends.hidden = isPlay;
  els.panelPlay.hidden = !isPlay;
  pressed(els.modeBtns, 'mode', next);
  els.status.textContent = '';
  scene?.setTight(isPlay);
  if (isPlay) {
    setPlaying(false);
    setOrbit(false);
    els.progress.style.transform = 'scaleX(0)';
    try {
      const pc = await getPlay();
      if (mode !== 'play') return;
      pc.enter();
      pressed(els.colorBtns, 'color', pc.color);
      pressed(els.levelBtns, 'level', pc.level);
    } catch (err) {
      console.error('Режим игры недоступен:', err);
    }
    if (scroll && matchMedia('(max-width: 900px)').matches) {
      els.stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  } else {
    play?.leave();
    scene?.clearSelection();
    setOrbit(!reduceMotion);
    loadGame(player.id || 'fischer', { autoplay: !reduceMotion });
  }
}

els.modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$$('[data-mode-go]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.modeGo, { scroll: true })));
els.colorBtns.forEach((b) => b.addEventListener('click', () => {
  if (!play) return;
  pressed(els.colorBtns, 'color', b.dataset.color);
  play.newGame(b.dataset.color);
}));
els.levelBtns.forEach((b) => b.addEventListener('click', () => {
  if (!play) return;
  pressed(els.levelBtns, 'level', b.dataset.level);
  play.setLevel(b.dataset.level);
}));
els.newGame.addEventListener('click', () => play?.newGame());
els.undo.addEventListener('click', () => play?.undo());

/* ---------------- Управление ---------------- */

els.play.addEventListener('click', () => setPlaying(!player.playing));
els.next.addEventListener('click', () => { setPlaying(false); goTo(player.ply + 1); });
els.prev.addEventListener('click', () => { setPlaying(false); goTo(player.ply - 1); });
els.first.addEventListener('click', () => { setPlaying(false); goTo(0); });
els.moves.addEventListener('click', (e) => {
  if (mode !== 'legends') return;
  const b = e.target.closest('[data-ply]');
  if (!b) return;
  setPlaying(false);
  goTo(Number(b.dataset.ply));
});
els.tabs.forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.gameTab !== player.id) loadGame(b.dataset.gameTab, { autoplay: !reduceMotion });
}));

document.addEventListener('keydown', (e) => {
  if (mode !== 'legends' || !player.visible || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); setPlaying(false); goTo(player.ply + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); goTo(player.ply - 1); }
});

function setOrbit(v) {
  els.orbit.setAttribute('aria-pressed', String(v));
  scene?.setAutoRotate(v);
}
els.orbit.addEventListener('click', () => setOrbit(els.orbit.getAttribute('aria-pressed') !== 'true'));
$$('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setOrbit(false);
  scene?.view(b.dataset.view);
}));

// «Смотреть на 3D-доске» из карточек легенд
$$('[data-watch]').forEach((b) => b.addEventListener('click', async () => {
  if (mode !== 'legends') await setMode('legends');
  loadGame(b.dataset.watch, { autoplay: true });
  els.hero.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}));

/* ---------------- Запуск ---------------- */

const startInPlay = location.hash === '#play' || store('gambit.mode') === 'play';
setOrbit(!reduceMotion && !startInPlay);
loadGame('fischer');
setPlaying(!reduceMotion && !startInPlay);
if (startInPlay) setMode('play');

(async () => {
  try {
    const { ChessScene } = await import('./board3d.js');
    scene = new ChessScene($('#scene'), els.stage, { reduceMotion });
    scene.setAutoRotate(els.orbit.getAttribute('aria-pressed') === 'true');
    scene.onInteract = () => els.hint?.classList.add('is-hidden');
    scene.setTight(mode === 'play');
    if (mode === 'play' && play) play.attachScene();
    else scene.setGame(player.sim);
  } catch (err) {
    console.error('3D недоступно:', err);
    scene = null;
    els.stage.classList.add('is-fallback');
  }
  player.ready = true;
})();

if (new URLSearchParams(location.search).has('debug')) {
  window.__gambit = { get scene() { return scene; }, get play() { return play; } };
}
