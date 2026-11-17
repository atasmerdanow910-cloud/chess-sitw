// Небольшой шахматный движок: доска 0x88, перебор альфа-бета с итеративным углублением.
// Генератор ходов проверен perft-тестами (tests/perft.mjs).

const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
const BLACK = 8;
const WK = 1, WQ = 2, BK = 4, BQ = 8;

const F_CAPTURE = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8;

const KNIGHT_D = [33, 31, 18, 14, -33, -31, -18, -14];
const BISHOP_D = [17, 15, -17, -15];
const ROOK_D = [16, -16, 1, -1];
const KING_D = [17, 15, -17, -15, 16, -16, 1, -1];

const VALUE = [0, 100, 320, 330, 500, 900, 20000];
const MATE = 100000;
const INF = 1000000;

// Таблицы позиционных бонусов (с точки зрения белых, первая строка — 8-я горизонталь).
const PST = {
  [P]: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  [N]: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  [B]: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  [R]: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  [Q]: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
};
const KING_MG = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];
const KING_EG = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

// Маска прав на рокировку: ход с/на это поле снимает соответствующие права.
const CASTLE_MASK = new Int8Array(128).fill(15);
CASTLE_MASK[0x00] = 15 & ~WQ;
CASTLE_MASK[0x07] = 15 & ~WK;
CASTLE_MASK[0x04] = 15 & ~(WK | WQ);
CASTLE_MASK[0x70] = 15 & ~BQ;
CASTLE_MASK[0x77] = 15 & ~BK;
CASTLE_MASK[0x74] = 15 & ~(BK | BQ);

const FEN_PIECE = { p: P, n: N, b: B, r: R, q: Q, k: K };
const PIECE_CHAR = ['', 'p', 'n', 'b', 'r', 'q', 'k'];

const sqName = (s) => 'abcdefgh'[s & 7] + ((s >> 4) + 1);
const sqFrom = (n) => (n.charCodeAt(0) - 97) + (Number(n[1]) - 1) * 16;

const mFrom = (m) => m & 127;
const mTo = (m) => (m >> 7) & 127;
const mPromo = (m) => (m >> 14) & 7;
const mFlags = (m) => (m >> 17) & 15;
const encode = (from, to, promo, flags) => from | (to << 7) | (promo << 14) | (flags << 17);

export class Engine {
  constructor(fen) {
    this.board = new Int8Array(128);
    this.kings = [0, 0];
    this.stack = [];
    this.load(fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }

  load(fen) {
    const [placement, turn, castling, ep, half] = fen.trim().split(/\s+/);
    this.board.fill(0);
    let rank = 7;
    let file = 0;
    for (const ch of placement) {
      if (ch === '/') { rank--; file = 0; continue; }
      if (ch >= '1' && ch <= '8') { file += Number(ch); continue; }
      const t = FEN_PIECE[ch.toLowerCase()];
      const color = ch === ch.toLowerCase() ? BLACK : 0;
      const sq = rank * 16 + file;
      this.board[sq] = t | color;
      if (t === K) this.kings[color ? 1 : 0] = sq;
      file++;
    }
    this.side = turn === 'b' ? BLACK : 0;
    this.castle = 0;
    if (castling && castling !== '-') {
      if (castling.includes('K')) this.castle |= WK;
      if (castling.includes('Q')) this.castle |= WQ;
      if (castling.includes('k')) this.castle |= BK;
      if (castling.includes('q')) this.castle |= BQ;
    }
    this.ep = ep && ep !== '-' ? sqFrom(ep) : -1;
    this.half = Number(half) || 0;
    this.stack.length = 0;
  }

  /* ---------- атаки ---------- */

  attacked(sq, by) {
    const b = this.board;
    // пешки
    if (by === 0) {
      let s = sq - 15; if (!(s & 0x88) && b[s] === P) return true;
      s = sq - 17; if (!(s & 0x88) && b[s] === P) return true;
    } else {
      let s = sq + 15; if (!(s & 0x88) && b[s] === (P | BLACK)) return true;
      s = sq + 17; if (!(s & 0x88) && b[s] === (P | BLACK)) return true;
    }
    for (let i = 0; i < 8; i++) {
      const s = sq + KNIGHT_D[i];
      if (!(s & 0x88) && b[s] === (N | by)) return true;
      const k = sq + KING_D[i];
      if (!(k & 0x88) && b[k] === (K | by)) return true;
    }
    for (let i = 0; i < 4; i++) {
      const d = BISHOP_D[i];
      let s = sq + d;
      while (!(s & 0x88)) {
        const p = b[s];
        if (p) { if (p === (B | by) || p === (Q | by)) return true; break; }
        s += d;
      }
    }
    for (let i = 0; i < 4; i++) {
      const d = ROOK_D[i];
      let s = sq + d;
      while (!(s & 0x88)) {
        const p = b[s];
        if (p) { if (p === (R | by) || p === (Q | by)) return true; break; }
        s += d;
      }
    }
    return false;
  }

  inCheck(side = this.side) {
    return this.attacked(this.kings[side ? 1 : 0], side ^ BLACK);
  }

  /* ---------- генерация (псевдолегальная) ---------- */

  generate(capturesOnly = false) {
    const b = this.board;
    const us = this.side;
    const them = us ^ BLACK;
    const moves = [];
    const up = us ? -16 : 16;
    const startRank = us ? 6 : 1;
    const promoRank = us ? 0 : 7;

    const addPawn = (from, to, flags) => {
      if ((to >> 4) === promoRank) {
        for (const pr of [Q, R, B, N]) moves.push(encode(from, to, pr, flags));
      } else moves.push(encode(from, to, 0, flags));
    };

    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (!p || (p & BLACK) !== us) continue;
      const t = p & 7;
      if (t === P) {
        const one = sq + up;
        if (!capturesOnly || (one >> 4) === promoRank) {
          if (!(one & 0x88) && !b[one]) {
            addPawn(sq, one, 0);
            const two = one + up;
            if (!capturesOnly && (sq >> 4) === startRank && !b[two]) moves.push(encode(sq, two, 0, F_DOUBLE));
          }
        }
        for (const d of [up - 1, up + 1]) {
          const to = sq + d;
          if (to & 0x88) continue;
          const c = b[to];
          if (c && (c & BLACK) === them) addPawn(sq, to, F_CAPTURE);
          else if (to === this.ep) moves.push(encode(sq, to, 0, F_CAPTURE | F_EP));
        }
      } else if (t === N || t === K) {
        const dirs = t === N ? KNIGHT_D : KING_D;
        for (let i = 0; i < 8; i++) {
          const to = sq + dirs[i];
          if (to & 0x88) continue;
          const c = b[to];
          if (!c) { if (!capturesOnly) moves.push(encode(sq, to, 0, 0)); }
          else if ((c & BLACK) === them) moves.push(encode(sq, to, 0, F_CAPTURE));
        }
        if (t === K && !capturesOnly) this.genCastles(sq, moves);
      } else {
        const dirs = t === B ? BISHOP_D : t === R ? ROOK_D : KING_D;
        for (let i = 0; i < dirs.length; i++) {
          const d = dirs[i];
          let to = sq + d;
          while (!(to & 0x88)) {
            const c = b[to];
            if (!c) { if (!capturesOnly) moves.push(encode(sq, to, 0, 0)); }
            else { if ((c & BLACK) === them) moves.push(encode(sq, to, 0, F_CAPTURE)); break; }
            to += d;
          }
        }
      }
    }
    return moves;
  }

  genCastles(ksq, moves) {
    const b = this.board;
    const us = this.side;
    const them = us ^ BLACK;
    if (us === 0 && ksq === 0x04) {
      if ((this.castle & WK) && !b[0x05] && !b[0x06] && b[0x07] === R
        && !this.attacked(0x04, them) && !this.attacked(0x05, them) && !this.attacked(0x06, them)) {
        moves.push(encode(0x04, 0x06, 0, F_CASTLE));
      }
      if ((this.castle & WQ) && !b[0x03] && !b[0x02] && !b[0x01] && b[0x00] === R
        && !this.attacked(0x04, them) && !this.attacked(0x03, them) && !this.attacked(0x02, them)) {
        moves.push(encode(0x04, 0x02, 0, F_CASTLE));
      }
    } else if (us === BLACK && ksq === 0x74) {
      if ((this.castle & BK) && !b[0x75] && !b[0x76] && b[0x77] === (R | BLACK)
        && !this.attacked(0x74, them) && !this.attacked(0x75, them) && !this.attacked(0x76, them)) {
        moves.push(encode(0x74, 0x76, 0, F_CASTLE));
      }
      if ((this.castle & BQ) && !b[0x73] && !b[0x72] && !b[0x71] && b[0x70] === (R | BLACK)
        && !this.attacked(0x74, them) && !this.attacked(0x73, them) && !this.attacked(0x72, them)) {
        moves.push(encode(0x74, 0x72, 0, F_CASTLE));
      }
    }
  }

  /* ---------- сделать / отменить ход ---------- */

  make(m) {
    const b = this.board;
    const from = mFrom(m);
    const to = mTo(m);
    const flags = mFlags(m);
    const promo = mPromo(m);
    const us = this.side;
    const piece = b[from];
    let captured = b[to];
    let capSq = to;
    if (flags & F_EP) {
      capSq = to + (us ? 16 : -16);
      captured = b[capSq];
      b[capSq] = 0;
    }
    this.stack.push({ m, captured, capSq, castle: this.castle, ep: this.ep, half: this.half });
    b[to] = promo ? (promo | us) : piece;
    b[from] = 0;
    if (flags & F_CASTLE) {
      if (to > from) { b[from + 1] = b[from + 3]; b[from + 3] = 0; }
      else { b[from - 1] = b[from - 4]; b[from - 4] = 0; }
    }
    if ((piece & 7) === K) this.kings[us ? 1 : 0] = to;
    this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.ep = (flags & F_DOUBLE) ? (from + to) >> 1 : -1;
    this.half = (captured || (piece & 7) === P) ? 0 : this.half + 1;
    this.side ^= BLACK;
    // ход легален, если свой король не под боем
    return !this.attacked(this.kings[us ? 1 : 0], us ^ BLACK);
  }

  undo() {
    const u = this.stack.pop();
    const b = this.board;
    const m = u.m;
    const from = mFrom(m);
    const to = mTo(m);
    const flags = mFlags(m);
    this.side ^= BLACK;
    const us = this.side;
    const piece = mPromo(m) ? (P | us) : b[to];
    b[from] = piece;
    b[to] = 0;
    if (u.captured) b[u.capSq] = u.captured;
    if (flags & F_CASTLE) {
      if (to > from) { b[from + 3] = b[from + 1]; b[from + 1] = 0; }
      else { b[from - 4] = b[from - 1]; b[from - 1] = 0; }
    }
    if ((piece & 7) === K) this.kings[us ? 1 : 0] = from;
    this.castle = u.castle;
    this.ep = u.ep;
    this.half = u.half;
  }

  legalMoves() {
    const out = [];
    for (const m of this.generate()) {
      if (this.make(m)) out.push(m);
      this.undo();
    }
    return out;
  }

  perft(depth) {
    if (depth === 0) return 1;
    let n = 0;
    for (const m of this.generate()) {
      if (this.make(m)) n += this.perft(depth - 1);
      this.undo();
    }
    return n;
  }

  /* ---------- оценка ---------- */

  evaluate() {
    const b = this.board;
    let mg = 0;
    let phase = 0;
    let wk = 0;
    let bk = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (!p) continue;
      const t = p & 7;
      const black = p & BLACK;
      const idx = black ? (sq >> 4) * 8 + (sq & 7) : (7 - (sq >> 4)) * 8 + (sq & 7);
      if (t === K) {
        if (black) bk = idx; else wk = idx;
        continue;
      }
      const v = VALUE[t] + PST[t][idx];
      mg += black ? -v : v;
      if (t === N || t === B) phase += 1;
      else if (t === R) phase += 2;
      else if (t === Q) phase += 4;
    }
    phase = Math.min(24, phase);
    const kw = (KING_MG[wk] * phase + KING_EG[wk] * (24 - phase)) / 24;
    const kb = (KING_MG[bk] * phase + KING_EG[bk] * (24 - phase)) / 24;
    const score = mg + kw - kb;
    return this.side ? -score : score;
  }

  /* ---------- поиск ---------- */

  order(moves, ply, pvMove) {
    const b = this.board;
    const scored = moves.map((m) => {
      let s = 0;
      if (m === pvMove) s = 1e7;
      else if (mFlags(m) & F_CAPTURE) {
        const victim = (mFlags(m) & F_EP) ? P : (b[mTo(m)] & 7);
        s = 1e6 + VALUE[victim] * 10 - VALUE[b[mFrom(m)] & 7] / 10;
      } else if (mPromo(m)) s = 9e5 + VALUE[mPromo(m)];
      else if (this.killers[ply] && (this.killers[ply][0] === m || this.killers[ply][1] === m)) s = 8e5;
      else s = this.history[mFrom(m) * 128 + mTo(m)] || 0;
      return [s, m];
    });
    scored.sort((x, y) => y[0] - x[0]);
    return scored.map((x) => x[1]);
  }

  timeUp() {
    if ((++this.nodes & 1023) === 0 && performance.now() > this.deadline) this.stopped = true;
    return this.stopped;
  }

  quiesce(alpha, beta, ply) {
    if (this.timeUp()) return 0;
    const stand = this.evaluate();
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (ply > 40) return alpha;
    for (const m of this.order(this.generate(true), ply, 0)) {
      if (!this.make(m)) { this.undo(); continue; }
      const score = -this.quiesce(-beta, -alpha, ply + 1);
      this.undo();
      if (this.stopped) return 0;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  search(depth, alpha, beta, ply) {
    if (this.timeUp()) return 0;
    if (ply > 0 && this.half >= 100) return 0;
    const check = this.inCheck();
    if (check && ply < 30) depth++;
    if (depth <= 0) return this.useQuiesce ? this.quiesce(alpha, beta, ply) : this.evaluate();

    let legal = 0;
    for (const m of this.order(this.generate(), ply, 0)) {
      if (!this.make(m)) { this.undo(); continue; }
      legal++;
      const score = -this.search(depth - 1, -beta, -alpha, ply + 1);
      this.undo();
      if (this.stopped) return 0;
      if (score >= beta) {
        if (!(mFlags(m) & F_CAPTURE)) {
          const k = this.killers[ply] || (this.killers[ply] = [0, 0]);
          if (k[0] !== m) { k[1] = k[0]; k[0] = m; }
          const h = mFrom(m) * 128 + mTo(m);
          this.history[h] = (this.history[h] || 0) + depth * depth;
        }
        return beta;
      }
      if (score > alpha) alpha = score;
    }
    if (!legal) return check ? -MATE + ply : 0;
    return alpha;
  }

  /**
   * Лучший ход в формате UCI.
   * opts: { maxDepth, timeMs, noise, quiesce }
   */
  bestMove({ maxDepth = 4, timeMs = 1500, noise = 0, quiesce = true } = {}) {
    const root = this.legalMoves();
    if (!root.length) return null;
    this.nodes = 0;
    this.stopped = false;
    this.deadline = performance.now() + timeMs;
    this.killers = [];
    this.history = Object.create(null);
    this.useQuiesce = quiesce;

    let best = root[Math.floor(Math.random() * root.length)];
    let order = root.slice();
    for (let depth = 1; depth <= maxDepth; depth++) {
      let alpha = -INF;
      let iterBest = 0;
      const scores = new Map();
      for (const m of order) {
        this.make(m);
        let score = -this.search(depth - 1, -INF, noise ? INF : -alpha, 1);
        this.undo();
        if (this.stopped) break;
        if (noise) score += (Math.random() * 2 - 1) * noise;
        scores.set(m, score);
        if (score > alpha) { alpha = score; iterBest = m; }
      }
      if (this.stopped && depth > 1) break;
      if (iterBest) best = iterBest;
      order = root.slice().sort((a, b) => (scores.get(b) ?? -INF) - (scores.get(a) ?? -INF));
      if (alpha > MATE - 100) break; // найден мат
      if (this.stopped) break;
    }
    const promo = mPromo(best);
    return sqName(mFrom(best)) + sqName(mTo(best)) + (promo ? PIECE_CHAR[promo] : '');
  }
}

export const LEVELS = {
  easy: { maxDepth: 1, timeMs: 400, noise: 120, quiesce: false },
  medium: { maxDepth: 3, timeMs: 1000, noise: 25, quiesce: true },
  hard: { maxDepth: 8, timeMs: 2200, noise: 4, quiesce: true },
};
