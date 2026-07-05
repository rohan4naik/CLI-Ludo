'use strict';

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { Game } = require('./game');
const { chooseMove } = require('./ai');
const { render, status, paint, FG, LETTER, BOLD, DIM } = require('./render');
const { PLAYERS } = require('./constants');

// ---------------------------------------------------------------------------
// Keypress-based input.
//
// We read raw keypresses rather than lines so that prompts like "press Enter
// to roll" react to a single key with no visible text field / cursor. A tiny
// line editor (readLine) is layered on top for the few prompts that genuinely
// need typed text (player counts, colour lists).
// ---------------------------------------------------------------------------
const stdin = process.stdin;
const stdout = process.stdout;
const IS_TTY = !!stdin.isTTY;

readline.emitKeypressEvents(stdin);
if (IS_TTY) {
  try { stdin.setRawMode(true); } catch (_) { /* not a raw-capable TTY */ }
}
stdin.resume();

const keyBuffer = [];
const keyWaiters = [];
let inputClosed = false;

stdin.on('keypress', (str, key) => {
  if (key && key.ctrl && key.name === 'c') { onInterrupt(); return; }
  const ev = { str: str || '', key: key || {} };
  const w = keyWaiters.shift();
  if (w) w(ev);
  else keyBuffer.push(ev);
});
stdin.on('end', () => {
  inputClosed = true;
  while (keyWaiters.length) keyWaiters.shift()({ str: '', key: { name: 'return' }, eof: true });
});

function nextKey() {
  return new Promise((res) => {
    if (keyBuffer.length) return res(keyBuffer.shift());
    if (inputClosed) return res({ str: '', key: { name: 'return' }, eof: true });
    keyWaiters.push(res);
  });
}

function isEnter(ev) {
  const n = ev.key.name;
  return ev.eof || n === 'return' || n === 'enter' || ev.str === '\r' || ev.str === '\n';
}

// Wait for a single keypress (optionally after printing a prompt).
async function readKey(prompt) {
  if (prompt) stdout.write(prompt);
  return nextKey();
}

// Read a line of text, echoing characters when interactive.
async function readLine(prompt) {
  if (prompt) stdout.write(prompt);
  let buf = '';
  while (true) {
    const ev = await nextKey();
    if (isEnter(ev)) {
      if (IS_TTY) stdout.write('\n');
      return buf;
    }
    if (ev.key.name === 'backspace') {
      if (buf.length) {
        buf = buf.slice(0, -1);
        if (IS_TTY) stdout.write('\b \b');
      }
      continue;
    }
    const ch = ev.str;
    if (ch && ch >= ' ') {
      buf += ch;
      if (IS_TTY) stdout.write(ch);
    }
  }
}
const ask = readLine; // typed prompts (counts, colours)

function cleanup() {
  if (IS_TTY) {
    try { stdin.setRawMode(false); } catch (_) { /* ignore */ }
  }
  stdin.pause();
}
// Safety net: never leave the terminal stuck in raw mode, even on a crash.
process.on('exit', () => {
  if (IS_TTY) {
    try { stdin.setRawMode(false); } catch (_) { /* ignore */ }
  }
});

const FAST = !!process.env.LUDO_FAST;
const sleep = (ms) => new Promise((res) => setTimeout(res, FAST ? 0 : ms));

function rollDice() {
  return 1 + Math.floor(Math.random() * 6);
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const DEFAULT_SAVE = path.join(process.cwd(), 'ludo-save.json');

let currentGame = null; // for autosave on Ctrl-C

function clear() {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

function title() {
  return paint(BOLD, '  L U D O ') + paint(DIM, ' — terminal edition');
}

function draw(game, message) {
  clear();
  console.log(title());
  console.log();
  console.log(render(game));
  console.log();
  console.log(status(game));
  if (game.humans.size > 0) {
    console.log(paint(DIM, "  (at the roll prompt: 's' saves & quits, 'q' quits)"));
  }
  console.log();
  if (message) console.log(message);
}

// ---------------------------------------------------------------------------
// Dice-roll animation (only for a human's own roll; AI just pauses briefly).
// ---------------------------------------------------------------------------
async function animateDice(finalDice) {
  if (FAST) return;
  const frames = 9;
  for (let i = 0; i < frames; i++) {
    const f = 1 + Math.floor(Math.random() * 6);
    process.stdout.write('\r  🎲 rolling…  ' + paint(BOLD, DICE_FACES[f - 1]) + '   ');
    await sleep(35 + i * 14);
  }
  process.stdout.write(
    '\r  🎲 rolled    ' + paint(BOLD, DICE_FACES[finalDice - 1] + '  ' + finalDice) + '   \n'
  );
  await sleep(220);
}

// ---------------------------------------------------------------------------
// Save / load
// ---------------------------------------------------------------------------
function saveGame(game, file) {
  fs.writeFileSync(file, JSON.stringify(game.serialize(), null, 2));
}

function loadGame(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Game.deserialize(data);
}

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------
async function doRoll(game, color) {
  if (game.isHuman(color)) {
    const prompt =
      paint(FG[color] + BOLD, color) +
      ' — ' + paint(BOLD, 'press Enter') + ' to roll   ' +
      paint(DIM, '(s = save · q = quit)') + '  ';
    while (true) {
      const ev = await readKey(prompt);
      const ch = (ev.str || '').toLowerCase();
      if (ch === 's') {
        saveGame(game, DEFAULT_SAVE);
        clear();
        console.log(paint(BOLD, 'Game saved to ') + DEFAULT_SAVE);
        console.log('Resume with:  ' + paint(BOLD, `ludo --load "${DEFAULT_SAVE}"`));
        cleanup();
        process.exit(0);
      }
      if (ch === 'q') {
        clear();
        console.log(paint(DIM, 'Thanks for playing!'));
        cleanup();
        process.exit(0);
      }
      // Enter or Space rolls; any other key is ignored (keeps the prompt).
      if (isEnter(ev) || ev.key.name === 'space') break;
    }
    const dice = rollDice();
    await animateDice(dice);
    game.lastDice = dice;
    return dice;
  }
  // AI
  await sleep(650);
  const dice = rollDice();
  game.lastDice = dice;
  return dice;
}

async function pickMove(game, color, dice, moves) {
  if (!game.isHuman(color)) {
    return chooseMove(game, color, dice, moves, game.difficulty);
  }
  if (moves.length === 1) {
    await sleep(150);
    return moves[0];
  }
  const lines = moves.map((m, i) => `  ${paint(BOLD, String(i + 1))}) ${describeMove(game, color, m)}`);
  console.log('Choose a token to move ' + paint(DIM, `(press 1-${moves.length})`) + ':');
  console.log(lines.join('\n'));
  while (true) {
    const ev = await readKey('> ');
    if (ev.eof) return chooseMove(game, color, dice, moves, game.difficulty);
    const idx = parseInt(ev.str, 10) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < moves.length) {
      stdout.write(String(idx + 1) + '\n');
      return moves[idx];
    }
    // ignore other keys and keep waiting
  }
}

function describeMove(game, color, m) {
  let where;
  if (m.from < 0) where = 'leave the yard → start';
  else if (m.to === 56) where = `token ${m.token + 1} → HOME`;
  else if (m.to >= 51) where = `token ${m.token + 1} → home column`;
  else where = `token ${m.token + 1}: ${m.from} → ${m.to}`;
  const caps = game.capturesFor(color, m.to);
  if (caps.length) where += paint(BOLD, `  (captures ${caps.map((x) => LETTER[x.color]).join(',')}!)`);
  return where;
}

async function playTurn(game) {
  const color = game.current;
  draw(game, `${paint(FG[color] + BOLD, color)}'s turn.`);

  const dice = await doRoll(game, color);
  game.sixStreak = dice === 6 ? game.sixStreak + 1 : 0;

  const faceMsg = `${paint(FG[color] + BOLD, color)} rolled ${paint(BOLD, DICE_FACES[dice - 1] + ' ' + dice)}.`;

  if (game.sixStreak >= 3) {
    draw(game, faceMsg + '  ' + paint(DIM, 'Three sixes — turn forfeited!'));
    await pause(game, color);
    game.nextTurn();
    return;
  }

  const moves = game.legalMoves(color, dice);
  if (moves.length === 0) {
    const extra = dice === 6 ? '  Rolling again (6).' : '';
    draw(game, faceMsg + '  No legal move.' + extra);
    await pause(game, color);
    if (dice !== 6) game.nextTurn();
    return;
  }

  draw(game, faceMsg);
  const move = await pickMove(game, color, dice, moves);
  const result = game.applyMove(color, move);

  let msg = faceMsg + '  ' + describeMove(game, color, move);
  if (result.captured.length) {
    msg += '\n' + paint(BOLD, `Captured ${result.captured.map((x) => x.color).join(', ')}! Sent back to yard.`);
  }
  if (result.home) msg += '\n' + paint(BOLD, `A ${color} token reached home!`);
  if (game.hasFinished(color) && game.finishers[game.finishers.length - 1] === color) {
    msg += '\n' + paint(FG[color] + BOLD, `${color.toUpperCase()} has all tokens home — finished #${game.finishers.length}!`);
  }

  draw(game, msg);
  await pause(game, color);

  if (result.extraTurn && !game.hasFinished(color)) return; // same player again
  game.nextTurn();
}

async function pause(game, color) {
  if (game.isHuman(color)) {
    await readKey(paint(DIM, 'Press any key to continue…'));
    if (IS_TTY) stdout.write('\n');
  } else {
    await sleep(game.watch ? 700 : 850);
  }
}

// ---------------------------------------------------------------------------
// Setup / arg parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const opts = { watch: false, difficulty: 'normal', load: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--watch' || a === '-w') opts.watch = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--load' || a === '-l') opts.load = argv[++i];
    else if (a.startsWith('--load=')) opts.load = a.slice(7);
    else if (a === '--difficulty' || a === '-d') opts.difficulty = argv[++i];
    else if (a.startsWith('--difficulty=')) opts.difficulty = a.slice(13);
  }
  if (!['easy', 'normal', 'hard'].includes(opts.difficulty)) opts.difficulty = 'normal';
  return opts;
}

function printHelp() {
  console.log(`${title()}

Usage: ludo [options]

Options:
  -h, --help                 Show this help
  -w, --watch                Watch four AI players battle it out (no input)
  -d, --difficulty <level>   AI level: easy | normal | hard   (default: normal)
  -l, --load <file>          Resume a previously saved game

In-game (on the roll prompt):
  Enter   roll the dice
  s       save the game and quit
  q       quit without saving

Examples:
  ludo                       Interactive game (asks player counts)
  ludo -d hard               Interactive game vs. hard AI
  ludo --watch -d hard       Demo: four hard AIs play themselves
  ludo --load ludo-save.json Resume a saved game
`);
}

// Resolve one token (name, initial, or 1-based index) to a colour in `pool`.
function resolveColor(token, pool) {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  const byName = pool.find((c) => c === t);
  if (byName) return byName;
  const byInitial = pool.find((c) => LETTER[c].toLowerCase() === t);
  if (byInitial) return byInitial;
  const idx = parseInt(t, 10) - 1;
  if (Number.isInteger(idx) && pool[idx]) return pool[idx];
  return null;
}

// Parse a comma/space separated list of colours from `pool`, de-duplicated.
function parseColorList(input, pool) {
  const out = [];
  for (const tok of input.split(/[,\s]+/)) {
    const c = resolveColor(tok, pool);
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

function colorMenu(pool) {
  return pool.map((c, i) => `${i + 1}) ` + paint(FG[c] + BOLD, c)).join('   ');
}

async function setup(opts) {
  clear();
  console.log(title());
  console.log();
  console.log('Colours: ' + PLAYERS.map((c) => paint(FG[c] + BOLD, c)).join(', '));
  console.log(paint(DIM, `AI difficulty: ${opts.difficulty}`));
  console.log();

  const nRaw = (await ask('How many players (2-4)? [4] ')).trim();
  let n = parseInt(nRaw, 10);
  if (!Number.isInteger(n) || n < 2 || n > 4) n = 4;

  // Pick which colours are in the game (only matters when fewer than 4).
  let colors = PLAYERS.slice(0, n);
  if (n < 4) {
    console.log('\nChoose ' + n + ' colours:  ' + colorMenu(PLAYERS));
    const pick = parseColorList(await ask(`Which colours play? [${colors.join(', ')}] `), PLAYERS);
    if (pick.length >= 2) colors = pick.slice(0, n);
  }

  // Pick which of those colours are controlled by a human.
  console.log('\nIn play:  ' + colorMenu(colors));
  const humansRaw = await ask(
    `Which colours are human? (comma list, or 'none') [${colors[0]}] `
  );
  let humans;
  if (humansRaw.trim().toLowerCase() === 'none') humans = [];
  else {
    humans = parseColorList(humansRaw, colors);
    if (humansRaw.trim() === '') humans = [colors[0]]; // default: first colour
  }

  const game = new Game(colors);
  for (const c of humans) game.humans.add(c);
  game.difficulty = opts.difficulty;
  return game;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    cleanup();
    return;
  }

  let game;
  if (opts.load) {
    try {
      game = loadGame(opts.load);
      if (game.difficulty === undefined) game.difficulty = opts.difficulty;
    } catch (err) {
      console.error(paint(BOLD, 'Could not load save file: ') + err.message);
      cleanup();
      process.exitCode = 1;
      return;
    }
  } else if (opts.watch) {
    game = new Game(PLAYERS.slice());
    game.difficulty = opts.difficulty;
    game.watch = true; // all AI, no humans
  } else {
    game = await setup(opts);
  }
  currentGame = game;

  while (!game.gameOver) {
    await playTurn(game);
  }

  const podium = game.finishers.slice();
  for (const c of game.colors) if (!podium.includes(c)) podium.push(c);

  draw(game, '');
  console.log(paint(BOLD, '  🏆  Game over!'));
  console.log();
  podium.forEach((c, i) => {
    const medal = ['🥇', '🥈', '🥉', '  '][i] || '  ';
    console.log(`  ${medal} ${i + 1}. ${paint(FG[c] + BOLD, c)}  (${game.homeCount(c)}/4 home)`);
  });
  console.log();
  cleanup();
}

// Ctrl-C: in raw mode the OS won't send SIGINT, so the keypress handler calls
// this directly. We also register it on SIGINT for non-raw / piped runs.
function onInterrupt() {
  cleanup();
  if (currentGame && !currentGame.gameOver && currentGame.humans.size > 0) {
    try {
      const auto = path.join(process.cwd(), 'ludo-autosave.json');
      saveGame(currentGame, auto);
      console.log('\n' + paint(DIM, 'Autosaved to ' + auto + ' — resume with  ludo --load "' + auto + '"'));
    } catch (_) {
      console.log('\n' + paint(DIM, 'Thanks for playing!'));
    }
  } else {
    console.log('\n' + paint(DIM, 'Thanks for playing!'));
  }
  process.exit(0);
}
process.on('SIGINT', onInterrupt);

module.exports = { main };
