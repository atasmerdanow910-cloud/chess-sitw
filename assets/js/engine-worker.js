// Фоновый поток: движок считает ход, не блокируя анимацию доски.
import { Engine, LEVELS } from './engine.js';

const engine = new Engine();
self.onmessage = (e) => {
  const { id, fen, level } = e.data;
  engine.load(fen);
  const move = engine.bestMove(LEVELS[level] || LEVELS.medium);
  self.postMessage({ id, move });
};
