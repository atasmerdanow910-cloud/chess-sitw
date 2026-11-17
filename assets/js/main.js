import { GAMES, simulate, toRussianSan } from './games.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
};

const player = {
  id: null, game: null, sim: null, san: [], ply: 0,
  playing: !reduceMotion, wait: 0, visible: true, ready: false,
};
let scene = null;

function total() { return player.san.length; }

function loadGame(id, { autoplay } = {}) {
  const game = GAMES[id];
  if (!game) return;
  player.id = id;
  player.game = game;
  player.san = game.san.split(' ');
  player.sim = simulate(game.uci);
  player.sim.san = player.san;
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
  renderMoves();
  scene?.setGame(player.sim);
  if (autoplay !== undefined) setPlaying(autoplay);
  update();
}

function renderMoves() {
  const frag = document.createDocumentFragment();
  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'mv mv-start';
  start.dataset.ply = '0';
  start.textContent = 'Старт';
  frag.append(start);
  player.san.forEach((san, i) => {
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
  els.moves.scrollLeft = 0;
}

function update() {
  const n = total();
  const ply = player.ply;
  els.counter.textContent = ply === 0 ? `Начало · ${Math.ceil(n / 2)} ходов` : `Ход ${Math.ceil(ply / 2)} из ${Math.ceil(n / 2)}`;
  els.progress.style.transform = `scaleX(${n ? ply / n : 0})`;
  els.prev.disabled = els.first.disabled = ply === 0;
  els.next.disabled = ply >= n;

  const prevCur = els.moves.querySelector('.is-current');
  prevCur?.classList.remove('is-current');
  prevCur?.removeAttribute('aria-current');
  const cur = els.moves.querySelector(`[data-ply="${ply}"]`);
  if (cur) {
    cur.classList.add('is-current');
    cur.setAttribute('aria-current', 'step');
    const strip = els.moves;
    const left = cur.offsetLeft - strip.clientWidth / 2 + cur.offsetWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' });
  }
}

function goTo(ply) {
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
  if (player.ready && player.playing && player.visible && !document.hidden && !(scene && scene.busy())) {
    player.wait += dt;
    const atEnd = player.ply >= total();
    if (atEnd && player.wait > END_PAUSE) goTo(0);
    else if (!atEnd && player.wait > STEP) goTo(player.ply + 1);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

new IntersectionObserver(([e]) => { player.visible = e.isIntersecting; }, { threshold: 0.2 }).observe(els.hero);

/* ---------------- Управление ---------------- */

els.play.addEventListener('click', () => setPlaying(!player.playing));
els.next.addEventListener('click', () => { setPlaying(false); goTo(player.ply + 1); });
els.prev.addEventListener('click', () => { setPlaying(false); goTo(player.ply - 1); });
els.first.addEventListener('click', () => { setPlaying(false); goTo(0); });
els.moves.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ply]');
  if (!b) return;
  setPlaying(false);
  goTo(Number(b.dataset.ply));
});
els.tabs.forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.gameTab !== player.id) loadGame(b.dataset.gameTab, { autoplay: !reduceMotion });
}));

document.addEventListener('keydown', (e) => {
  if (!player.visible || e.altKey || e.ctrlKey || e.metaKey) return;
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
$$('[data-watch]').forEach((b) => b.addEventListener('click', () => {
  loadGame(b.dataset.watch, { autoplay: true });
  els.hero.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}));

/* ---------------- Запуск ---------------- */

setOrbit(!reduceMotion);
loadGame('fischer');
setPlaying(!reduceMotion);

(async () => {
  try {
    const { ChessScene } = await import('./board3d.js');
    scene = new ChessScene($('#scene'), els.stage, { reduceMotion });
    scene.setAutoRotate(els.orbit.getAttribute('aria-pressed') === 'true');
    scene.onInteract = () => els.hint?.classList.add('is-hidden');
    scene.setGame(player.sim);
    if (player.ply) scene.show(player.ply, { animate: false });
  } catch (err) {
    console.error('3D недоступно:', err);
    scene = null;
    els.stage.classList.add('is-fallback');
  }
  player.ready = true;
})();
