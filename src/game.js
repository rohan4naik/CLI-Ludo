'use strict';

const {
  TRACK_LEN,
  START_INDEX,
  HOME_ENTRY_OFFSET,
  GOAL_OFFSET,
  SAFE_INDICES,
  PLAYERS,
} = require('./constants');

// Token offsets:
//   -1        -> in the yard (base), needs a 6 to come out
//    0..50    -> on the shared track (offset from the colour's start square)
//   51..56    -> inside the home column (56 == home / goal)
const BASE = -1;

class Game {
  // activeColors: array of colour names actually playing (2-4).
  constructor(activeColors = PLAYERS.slice()) {
    this.colors = activeColors.slice();
    this.tokens = {};
    for (const c of this.colors) this.tokens[c] = [BASE, BASE, BASE, BASE];
    this.humans = new Set(); // colours controlled by a human
    this.turn = 0;           // index into this.colors
    this.lastDice = null;
    this.sixStreak = 0;
    this.winner = null;
    this.finishers = [];     // colours that have finished, in order
  }

  get current() {
    return this.colors[this.turn];
  }

  isHuman(color) {
    return this.humans.has(color);
  }

  // Absolute track index for a token, or null if in base / home column.
  absIndex(color, offset) {
    if (offset < 0 || offset > 50) return null;
    return (START_INDEX[color] + offset) % TRACK_LEN;
  }

  hasFinished(color) {
    return this.tokens[color].every((o) => o === GOAL_OFFSET);
  }

  // Legal moves for `color` given a dice value. Returns [{token, from, to}].
  legalMoves(color, dice) {
    const moves = [];
    const offs = this.tokens[color];
    for (let t = 0; t < offs.length; t++) {
      const from = offs[t];
      if (from === GOAL_OFFSET) continue; // already home
      if (from === BASE) {
        if (dice === 6) moves.push({ token: t, from, to: 0 });
        continue;
      }
      const to = from + dice;
      if (to > GOAL_OFFSET) continue; // must land exactly on the goal
      moves.push({ token: t, from, to });
    }
    return moves;
  }

  // Would applying `move` for `color` capture at least one opponent token?
  wouldCapture(color, move) {
    return this.capturesFor(color, move.to).length > 0;
  }

  // List of {color, token} opponents captured if `color` lands on `toOffset`.
  capturesFor(color, toOffset) {
    const abs = this.absIndex(color, toOffset);
    if (abs === null) return [];       // home column: never captures
    if (SAFE_INDICES.has(abs)) return []; // safe square: no captures
    const hits = [];
    for (const other of this.colors) {
      if (other === color) continue;
      const offs = this.tokens[other];
      for (let t = 0; t < offs.length; t++) {
        if (this.absIndex(other, offs[t]) === abs) hits.push({ color: other, token: t });
      }
    }
    return hits;
  }

  // Apply a move. Returns { captured: [...], home: bool, extraTurn: bool }.
  applyMove(color, move) {
    const captured = this.capturesFor(color, move.to);
    for (const cap of captured) this.tokens[cap.color][cap.token] = BASE;
    this.tokens[color][move.token] = move.to;

    const home = move.to === GOAL_OFFSET;
    if (this.hasFinished(color) && !this.finishers.includes(color)) {
      this.finishers.push(color);
    }
    const extraTurn = this.lastDice === 6 || captured.length > 0 || home;
    return { captured, home, extraTurn };
  }

  // Advance to the next colour that has not finished.
  nextTurn() {
    this.sixStreak = 0;
    for (let i = 0; i < this.colors.length; i++) {
      this.turn = (this.turn + 1) % this.colors.length;
      if (!this.hasFinished(this.current)) return;
    }
  }

  // True once only one (or zero) unfinished players remain.
  get gameOver() {
    const remaining = this.colors.filter((c) => !this.hasFinished(c));
    return remaining.length <= 1;
  }

  // Count of tokens home for a colour.
  homeCount(color) {
    return this.tokens[color].filter((o) => o === GOAL_OFFSET).length;
  }

  // Plain-object snapshot for saving to disk.
  serialize() {
    return {
      v: 1,
      colors: this.colors.slice(),
      tokens: JSON.parse(JSON.stringify(this.tokens)),
      humans: [...this.humans],
      turn: this.turn,
      lastDice: this.lastDice,
      sixStreak: this.sixStreak,
      finishers: this.finishers.slice(),
      difficulty: this.difficulty,
    };
  }

  // Rebuild a Game from a serialized snapshot.
  static deserialize(data) {
    if (!data || !Array.isArray(data.colors)) throw new Error('invalid save file');
    const g = new Game(data.colors);
    g.tokens = data.tokens;
    g.humans = new Set(data.humans || []);
    g.turn = data.turn || 0;
    g.lastDice = data.lastDice ?? null;
    g.sixStreak = data.sixStreak || 0;
    g.finishers = data.finishers || [];
    if (data.difficulty) g.difficulty = data.difficulty;
    return g;
  }
}

module.exports = { Game, BASE };
