// Исторические партии. Ходы проверены на легальность (python-chess).
// uci — ходы в формате «откуда-куда», san — стандартная алгебраическая запись.

export const GAMES = {
  fischer: {
    id: 'fischer',
    title: '«Партия века»',
    white: 'Дональд Бирн',
    black: 'Роберт Фишер',
    place: 'Нью-Йорк',
    year: 1956,
    result: '0–1',
    note: '13-летний Фишер жертвует ферзя и разносит позицию одного из сильнейших шахматистов США.',
    uci: 'g1f3 g8f6 c2c4 g7g6 b1c3 f8g7 d2d4 e8g8 c1f4 d7d5 d1b3 d5c4 b3c4 c7c6 e2e4 b8d7 a1d1 d7b6 c4c5 c8g4 f4g5 b6a4 c5a3 a4c3 b2c3 f6e4 g5e7 d8b6 f1c4 e4c3 e7c5 f8e8 e1f1 g4e6 c5b6 e6c4 f1g1 c3e2 g1f1 e2d4 f1g1 d4e2 g1f1 e2c3 f1g1 a7b6 a3b4 a8a4 b4b6 c3d1 h2h3 a4a2 g1h2 d1f2 h1e1 e8e1 b6d8 g7f8 f3e1 c4d5 e1f3 f2e4 d8b8 b7b5 h3h4 h7h5 f3e5 g8g7 h2g1 f8c5 g1f1 e4g3 f1e1 c5b4 e1d1 d5b3 d1c1 g3e2 c1b1 e2c3 b1c1 a2c2',
    san: 'Nf3 Nf6 c4 g6 Nc3 Bg7 d4 O-O Bf4 d5 Qb3 dxc4 Qxc4 c6 e4 Nbd7 Rd1 Nb6 Qc5 Bg4 Bg5 Na4 Qa3 Nxc3 bxc3 Nxe4 Bxe7 Qb6 Bc4 Nxc3 Bc5 Rfe8+ Kf1 Be6 Bxb6 Bxc4+ Kg1 Ne2+ Kf1 Nxd4+ Kg1 Ne2+ Kf1 Nc3+ Kg1 axb6 Qb4 Ra4 Qxb6 Nxd1 h3 Rxa2 Kh2 Nxf2 Re1 Rxe1 Qd8+ Bf8 Nxe1 Bd5 Nf3 Ne4 Qb8 b5 h4 h5 Ne5 Kg7 Kg1 Bc5+ Kf1 Ng3+ Ke1 Bb4+ Kd1 Bb3+ Kc1 Ne2+ Kb1 Nc3+ Kc1 Rc2#',
  },
  kasparov: {
    id: 'kasparov',
    title: '«Бессмертная Каспарова»',
    white: 'Гарри Каспаров',
    black: 'Веселин Топалов',
    place: 'Вейк-ан-Зее',
    year: 1999,
    result: '1–0',
    note: 'Жертва ладьи 24. Лxd4 запускает охоту на чёрного короля через всю доску.',
    uci: 'e2e4 d7d6 d2d4 g8f6 b1c3 g7g6 c1e3 f8g7 d1d2 c7c6 f2f3 b7b5 g1e2 b8d7 e3h6 g7h6 d2h6 c8b7 a2a3 e7e5 e1c1 d8e7 c1b1 a7a6 e2c1 e8c8 c1b3 e5d4 d1d4 c6c5 d4d1 d7b6 g2g3 c8b8 b3a5 b7a8 f1h3 d6d5 h6f4 b8a7 h1e1 d5d4 c3d5 b6d5 e4d5 e7d6 d1d4 c5d4 e1e7 a7b6 f4d4 b6a5 b2b4 a5a4 d4c3 d6d5 e7a7 a8b7 a7b7 d5c4 c3f6 a4a3 f6a6 a3b4 c2c3 b4c3 a6a1 c3d2 a1b2 d2d1 h3f1 d8d2 b7d7 d2d7 f1c4 b5c4 b2h8 d7d3 h8a8 c4c3 a8a4 d1e1 f3f4 f7f5 b1c1 d3d2 a4a7',
    san: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5 Nge2 Nbd7 Bh6 Bxh6 Qxh6 Bb7 a3 e5 O-O-O Qe7 Kb1 a6 Nc1 O-O-O Nb3 exd4 Rxd4 c5 Rd1 Nb6 g3 Kb8 Na5 Ba8 Bh3 d5 Qf4+ Ka7 Rhe1 d4 Nd5 Nbxd5 exd5 Qd6 Rxd4 cxd4 Re7+ Kb6 Qxd4+ Kxa5 b4+ Ka4 Qc3 Qxd5 Ra7 Bb7 Rxb7 Qc4 Qxf6 Kxa3 Qxa6+ Kxb4 c3+ Kxc3 Qa1+ Kd2 Qb2+ Kd1 Bf1 Rd2 Rd7 Rxd7 Bxc4 bxc4 Qxh8 Rd3 Qa8 c3 Qa4+ Ke1 f4 f5 Kc1 Rd2 Qa7',
  },
  carlsen: {
    id: 'carlsen',
    title: 'Атака 13-летнего',
    white: 'Магнус Карлсен',
    black: 'Сипке Эрнст',
    place: 'Вейк-ан-Зее',
    year: 2004,
    result: '1–0',
    note: 'Школьник из Норвегии жертвует коня, слона и ладью и заканчивает партию матом.',
    uci: 'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6 h2h4 h7h6 g1f3 b8d7 h4h5 g6h7 f1d3 h7d3 d1d3 e7e6 c1f4 g8f6 e1c1 f8e7 g3e4 d8a5 c1b1 e8g8 e4f6 d7f6 f3e5 a8d8 d3e2 c6c5 e5g6 f7g6 e2e6 g8h8 h5g6 f6g8 f4h6 g7h6 h1h6 g8h6 e6e7 h6f7 g6f7 h8g7 d1d3 d8d6 d3g3 d6g6 e7e5 g7f7 e5f5 g6f6 f5d7',
    san: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bf4 Ngf6 O-O-O Be7 Ne4 Qa5 Kb1 O-O Nxf6+ Nxf6 Ne5 Rad8 Qe2 c5 Ng6 fxg6 Qxe6+ Kh8 hxg6 Ng8 Bxh6 gxh6 Rxh6+ Nxh6 Qxe7 Nf7 gxf7 Kg7 Rd3 Rd6 Rg3+ Rg6 Qe5+ Kxf7 Qf5+ Rf6 Qd7#',
  },
};

// Русская нотация фигур для отображения ходов.
const RU = { K: 'Кр', Q: 'Ф', R: 'Л', B: 'С', N: 'К' };
export function toRussianSan(san) {
  if (san.startsWith('O-O')) return san.replace(/O/g, '0');
  return san.replace(/^[KQRBN]/, (m) => RU[m]).replace(/=([QRBN])/, (_, p) => '=' + RU[p]);
}

const START = {
  a1: 'wR', b1: 'wN', c1: 'wB', d1: 'wQ', e1: 'wK', f1: 'wB', g1: 'wN', h1: 'wR',
  a8: 'bR', b8: 'bN', c8: 'bB', d8: 'bQ', e8: 'bK', f8: 'bB', g8: 'bN', h8: 'bR',
};
for (const f of 'abcdefgh') { START[f + '2'] = 'wP'; START[f + '7'] = 'bP'; }

/**
 * Прогоняет партию и возвращает список фигур и состояние доски после каждого хода.
 * state[i].where[id] = 'e4' | { grave: 'w'|'b', slot: n }
 * state[i].type[id]  = 'P' | 'N' | ... (меняется при превращении пешки)
 */
export function simulate(uci) {
  const pieces = [];
  const board = {};
  for (const [sq, code] of Object.entries(START)) {
    const id = pieces.length;
    pieces.push({ id, color: code[0], type: code[1], home: sq });
    board[sq] = id;
  }
  const where = pieces.map((p) => p.home);
  const type = pieces.map((p) => p.type);
  const graveCount = { w: 0, b: 0 };
  const states = [{ where: where.slice(), type: type.slice() }];
  const moves = [];

  for (const mv of uci.trim().split(/\s+/)) {
    const from = mv.slice(0, 2);
    const to = mv.slice(2, 4);
    const promo = mv[4] ? mv[4].toUpperCase() : null;
    const id = board[from];
    const info = { id, from, to, captured: null, rook: null, promo, knight: type[id] === 'N' };

    let capSq = board[to] !== undefined ? to : null;
    // Взятие на проходе: пешка идёт по диагонали на пустое поле.
    if (type[id] === 'P' && from[0] !== to[0] && board[to] === undefined) {
      capSq = to[0] + from[1];
    }
    if (capSq) {
      const cid = board[capSq];
      const c = pieces[cid].color;
      where[cid] = { grave: c, slot: graveCount[c]++ };
      delete board[capSq];
      info.captured = cid;
    }
    // Рокировка: король смещается на две вертикали — двигаем и ладью.
    if (type[id] === 'K' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) {
      const rank = from[1];
      const kingSide = to[0] === 'g';
      const rFrom = (kingSide ? 'h' : 'a') + rank;
      const rTo = (kingSide ? 'f' : 'd') + rank;
      const rid = board[rFrom];
      delete board[rFrom];
      board[rTo] = rid;
      where[rid] = rTo;
      info.rook = { id: rid, from: rFrom, to: rTo };
    }
    delete board[from];
    board[to] = id;
    where[id] = to;
    if (promo) type[id] = promo;

    moves.push(info);
    states.push({ where: where.slice(), type: type.slice() });
  }
  return { pieces, states, moves };
}
