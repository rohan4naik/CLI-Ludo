'use strict';

// Tiny dependency-free test runner.
const assert = require('assert');
const { Game, BASE } = require('../src/game');
const { chooseMove } = require('../src/ai');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (err) {
    console.error('FAIL  ' + name);
    console.error('      ' + err.message);
    process.exitCode = 1;
  }
}

test('fresh game: all tokens in base', () => {
  const g = new Game();
  for (const c of g.colors) assert.deepStrictEqual(g.tokens[c], [BASE, BASE, BASE, BASE]);
});

test('only a 6 releases a token from base', () => {
  const g = new Game();
  assert.strictEqual(g.legalMoves('red', 3).length, 0);
  const m = g.legalMoves('red', 6);
  assert.strictEqual(m.length, 4);
  assert.strictEqual(m[0].to, 0);
});

test('cannot overshoot the goal', () => {
  const g = new Game();
  g.tokens.red[0] = 55; // one short of goal (56)
  assert.strictEqual(g.legalMoves('red', 3).length, 0, 'roll 3 would overshoot');
  const exact = g.legalMoves('red', 1);
  assert.strictEqual(exact.some((m) => m.to === 56), true, 'exact roll reaches home');
});

test('absolute index wraps the 52-cell loop', () => {
  const g = new Game();
  assert.strictEqual(g.absIndex('red', 0), 0);
  assert.strictEqual(g.absIndex('green', 0), 13);
  assert.strictEqual(g.absIndex('yellow', 0), 26);
  assert.strictEqual(g.absIndex('blue', 0), 39);
  assert.strictEqual(g.absIndex('blue', 20), (39 + 20) % 52); // wraps
});

test('capture sends opponent back to base', () => {
  const g = new Game();
  // Put a green token on green-start (abs 13). Red at offset 13 -> abs 13.
  g.tokens.green[0] = 0;      // abs 13
  g.tokens.red[0] = 12;       // abs 12
  // Green start (13) is a safe square, so move red onto abs 14 instead.
  g.tokens.green[0] = 1;      // abs 14 (not safe)
  const move = { token: 0, from: 12, to: 14 }; // red abs 14
  const res = g.applyMove('red', move);
  assert.strictEqual(res.captured.length, 1);
  assert.strictEqual(g.tokens.green[0], BASE);
  assert.strictEqual(g.tokens.red[0], 14);
});

test('safe squares block capture', () => {
  const g = new Game();
  g.tokens.green[0] = 0; // abs 13 == green start == safe
  // Red needs to reach abs 13 -> red offset 13.
  g.tokens.red[0] = 12;
  const caps = g.capturesFor('red', 13);
  assert.strictEqual(caps.length, 0, 'no capture on a safe square');
});

test('home column never captures', () => {
  const g = new Game();
  g.tokens.green[0] = 52; // green home column
  const caps = g.capturesFor('red', 53); // red home column
  assert.strictEqual(caps.length, 0);
});

test('rolling a 6 grants an extra turn', () => {
  const g = new Game();
  g.tokens.red[0] = 5;
  g.lastDice = 6;
  const res = g.applyMove('red', { token: 0, from: 5, to: 11 });
  assert.strictEqual(res.extraTurn, true);
});

test('finishing all tokens marks a finisher and ends the game', () => {
  const g = new Game(['red', 'green']);
  g.tokens.red = [56, 56, 56, 55];
  g.lastDice = 1;
  g.applyMove('red', { token: 3, from: 55, to: 56 });
  assert.strictEqual(g.hasFinished('red'), true);
  assert.deepStrictEqual(g.finishers, ['red']);
  assert.strictEqual(g.gameOver, true); // only green left
});

test('nextTurn skips finished players', () => {
  const g = new Game(['red', 'green', 'yellow']);
  g.tokens.green = [56, 56, 56, 56]; // green done
  g.turn = 0; // red
  g.nextTurn();
  assert.strictEqual(g.current, 'yellow'); // skipped green
});

test('AI prefers a capturing move', () => {
  const g = new Game();
  g.tokens.green[0] = 1;   // abs 14
  g.tokens.red[0] = 12;    // abs 12
  g.tokens.red[1] = 2;     // abs 2, unrelated
  const dice = 2;
  const moves = g.legalMoves('red', dice);
  const chosen = chooseMove(g, 'red', dice, moves);
  assert.strictEqual(chosen.to, 14, 'AI should pick the capture');
});

console.log(`\n${passed} passed`);
