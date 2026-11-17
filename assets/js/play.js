// Игра с компьютером: правила — chess.js, ходы компьютера — собственный движок в фоновом потоке.
import { Chess } from '../../vendor/chess.js/chess.js';
import { Tracker } from './games.js';

const SAVE_KEY = 'gambit.play.v1';
const LEVEL_NAMES = { easy: 'Новичок', medium: 'Любитель', hard: 'Мастер' };

function load() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
function save(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* приватный режим и т. п. */ }
}

export class PlayController {
  /**
   * hooks: {
   *   scene(): ChessScene | null,
   *   onMoves(tracker): void   — обновить список ходов
   *   onStatus(text, kind): void — kind: 'turn' | 'think' | 'check' | 'win' | 'lose' | 'draw'
   *   askPromotion(): Promise<'q'|'r'|'b'|'n'|null>
   * }
   */
  constructor(hooks) {
    this.hooks = hooks;
    this.color = 'w';
    this.level = 'medium';
    this.chess = new Chess();
    this.tracker = new Tracker();
    this.selected = null;
    this.targets = [];
    this.thinking = false;
    this.requestId = 0;
    this.active = false;
    this.worker = null;
  }

  get scene() {
    return this.hooks.scene();
  }

  /* ---------- жизненный цикл ---------- */

  enter() {
    this.active = true;
    const saved = load();
    if (saved && Array.isArray(saved.moves) && (saved.color === 'w' || saved.color === 'b')) {
      this.color = saved.color;
      this.level = LEVEL_NAMES[saved.level] ? saved.level : 'medium';
      if (this.restore(saved.moves)) return;
    }
    this.newGame();
  }

  leave() {
    this.active = false;
    this.cancelThinking();
    this.select(null);
    if (this.scene) this.scene.onPick = null;
  }

  attachScene() {
    const sc = this.scene;
    if (!sc || !this.active) return;
    sc.onPick = (sq) => this.onSquare(sq);
    sc.isPickable = (sq) => this.isPickable(sq);
    sc.setGame(this.tracker, this.tracker.ply);
    sc.view(this.color === 'w' ? 'white' : 'black', this.hooks.viewPhi?.());
  }

  newGame(color = this.color) {
    this.cancelThinking();
    this.color = color;
    this.chess = new Chess();
    this.tracker = new Tracker();
    this.select(null);
    this.attachScene();
    this.persist();
    this.hooks.onMoves(this.tracker);
    this.afterMove();
  }

  restore(moves) {
    const chess = new Chess();
    const tracker = new Tracker();
    try {
      for (const uci of moves) {
        const mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        tracker.apply(uci, mv.san);
      }
    } catch {
      return false;
    }
    this.chess = chess;
    this.tracker = tracker;
    this.select(null);
    this.attachScene();
    this.hooks.onMoves(this.tracker);
    this.afterMove();
    return true;
  }

  setLevel(level) {
    if (!LEVEL_NAMES[level]) return;
    this.level = level;
    this.persist();
  }

  persist() {
    save({ color: this.color, level: this.level, moves: this.tracker.moves.map((m) => m.from + m.to + (m.promo ? m.promo.toLowerCase() : '')) });
  }

  /* ---------- ход игрока ---------- */

  isPlayerTurn() {
    return this.active && !this.thinking && !this.chess.isGameOver() && this.chess.turn() === this.color;
  }

  isPickable(sq) {
    if (!this.isPlayerTurn()) return false;
    const p = this.chess.get(sq);
    return (p && p.color === this.color) || this.targets.some((t) => t.to === sq);
  }

  select(sq) {
    this.selected = sq;
    this.targets = sq
      ? this.chess.moves({ square: sq, verbose: true }).map((m) => ({ to: m.to, capture: !!m.captured, promotion: m.promotion }))
      : [];
    // для превращения chess.js даёт 4 хода на одно поле — оставляем одну отметку
    const seen = new Set();
    this.targets = this.targets.filter((t) => (seen.has(t.to) ? false : seen.add(t.to)));
    this.scene?.setSelection(sq, this.targets);
  }

  async onSquare(sq) {
    if (!sq || !this.isPlayerTurn()) return;
    const target = this.targets.find((t) => t.to === sq);
    if (this.selected && target) {
      const from = this.selected;
      let promotion;
      if (target.promotion) {
        this.select(null);
        promotion = await this.hooks.askPromotion();
        if (!promotion) return;
      }
      this.select(null);
      this.play(from, sq, promotion); // afterMove() сам запустит ход компьютера
      return;
    }
    const p = this.chess.get(sq);
    if (p && p.color === this.color && sq !== this.selected) this.select(sq);
    else this.select(null);
  }

  play(from, to, promotion) {
    let mv;
    try {
      mv = this.chess.move({ from, to, promotion });
    } catch {
      return false;
    }
    const uci = mv.from + mv.to + (mv.promotion || '');
    this.tracker.apply(uci, mv.san);
    this.scene?.show(this.tracker.ply, { animate: true });
    this.hooks.onMoves(this.tracker);
    this.persist();
    this.afterMove();
    return true;
  }

  undo() {
    if (!this.active) return;
    if (this.thinking) {
      this.cancelThinking();
      this.takeBack(1);
    } else if (this.chess.turn() === this.color || this.chess.isGameOver()) {
      // откатываем ход компьютера и свой
      const lastIsMine = this.chess.history().length && this.chess.turn() !== this.color;
      this.takeBack(lastIsMine ? 1 : 2);
    }
  }

  takeBack(n) {
    let undone = 0;
    while (undone < n && this.chess.history().length) {
      // нельзя отменить первый ход компьютера, если игрок играет чёрными
      if (this.color === 'b' && this.chess.history().length === 1) break;
      this.chess.undo();
      this.tracker.pop();
      undone++;
    }
    if (!undone) { this.afterMove(); return; }
    this.select(null);
    this.scene?.show(this.tracker.ply, { animate: true });
    this.hooks.onMoves(this.tracker);
    this.persist();
    this.afterMove();
  }

  canUndo() {
    const n = this.chess.history().length;
    return this.color === 'w' ? n > 0 : n > 1;
  }

  /* ---------- ход компьютера ---------- */

  getWorker() {
    if (this.worker !== null) return this.worker;
    try {
      this.worker = new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' });
    } catch {
      this.worker = false;
    }
    return this.worker;
  }

  cancelThinking() {
    this.requestId++;
    if (this.thinking && this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.thinking = false;
  }

  async think() {
    if (this.thinking || !this.active || this.chess.isGameOver() || this.chess.turn() === this.color) return;
    this.thinking = true;
    this.afterMove();
    const id = ++this.requestId;
    const fen = this.chess.fen();
    const started = performance.now();

    let move = null;
    try {
      const worker = this.getWorker();
      if (worker) {
        move = await new Promise((resolve, reject) => {
          worker.onmessage = (e) => { if (e.data.id === id) resolve(e.data.move); };
          worker.onerror = reject;
          worker.postMessage({ id, fen, level: this.level });
        });
      } else {
        const { Engine, LEVELS } = await import('./engine.js');
        await new Promise((r) => setTimeout(r, 30));
        move = new Engine(fen).bestMove(LEVELS[this.level]);
      }
    } catch (err) {
      console.error('Движок:', err);
    }
    if (id !== this.requestId) return; // партию сбросили или отменили ход

    // небольшая пауза, чтобы ход компьютера не был мгновенным, и ждём окончания анимации
    const wait = Math.max(0, 450 - (performance.now() - started));
    await new Promise((r) => setTimeout(r, wait));
    while (this.scene?.busy()) await new Promise((r) => requestAnimationFrame(r));
    if (id !== this.requestId) return;

    const legal = this.chess.moves({ verbose: true });
    let chosen = move && legal.find((m) => m.from + m.to + (m.promotion || '') === move);
    if (!chosen) chosen = legal[Math.floor(Math.random() * legal.length)];
    this.thinking = false;
    if (chosen) this.play(chosen.from, chosen.to, chosen.promotion);
  }

  /* ---------- статус ---------- */

  afterMove() {
    const c = this.chess;
    const mine = c.turn() === this.color;
    let text;
    let kind;
    if (c.isCheckmate()) {
      kind = mine ? 'lose' : 'win';
      text = mine ? 'Мат. Победил компьютер' : 'Мат! Вы победили';
    } else if (c.isStalemate()) {
      kind = 'draw'; text = 'Пат — ничья';
    } else if (c.isInsufficientMaterial()) {
      kind = 'draw'; text = 'Ничья: мало материала для мата';
    } else if (c.isThreefoldRepetition()) {
      kind = 'draw'; text = 'Ничья: троекратное повторение';
    } else if (c.isDraw()) {
      kind = 'draw'; text = 'Ничья по правилу 50 ходов';
    } else if (this.thinking || !mine) {
      kind = 'think'; text = 'Компьютер думает…';
    } else if (c.inCheck()) {
      kind = 'check'; text = 'Шах! Ваш ход';
    } else {
      kind = 'turn'; text = c.history().length ? 'Ваш ход' : `Ваш ход — вы играете ${this.color === 'w' ? 'белыми' : 'чёрными'}`;
    }
    this.hooks.onStatus(text, kind);
    // если компьютер ходит первым (игрок за чёрных)
    if (this.active && !this.thinking && !c.isGameOver() && !mine) this.think();
  }
}
