'use strict';

const {
  TRACK,
  HOME_COLUMNS,
  START_INDEX,
  SAFE_INDICES,
  YARDS,
  CENTER,
  PLAYERS,
} = require('./constants');
const { BASE } = require('./game');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

// Foreground colours (bright) per player.
const FG = {
  red: '\x1b[91m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  blue: '\x1b[94m',
};
// Background colours for yards / home columns.
const BG = {
  red: '\x1b[101m',
  green: '\x1b[102m',
  yellow: '\x1b[103m',
  blue: '\x1b[104m',
};
const BLACK_FG = '\x1b[30m'; // dark text on a coloured token so it stays legible

const LETTER = { red: 'R', green: 'G', yellow: 'Y', blue: 'B' };
const supportsColor = process.stdout.isTTY !== false && !process.env.NO_COLOR;

function paint(code, s) {
  return supportsColor ? code + s + RESET : s;
}

function key(r, c) {
  return r + ',' + c;
}

// Build lookup maps so we can decide what to draw in each grid cell.
const trackAt = new Map();
TRACK.forEach(([r, c], i) => trackAt.set(key(r, c), i));

const homeAt = new Map(); // "r,c" -> color
for (const color of PLAYERS) {
  HOME_COLUMNS[color].forEach(([r, c]) => homeAt.set(key(r, c), color));
}

const yardCells = new Map(); // "r,c" -> color   (the 6x6 corners)
for (const color of PLAYERS) {
  const [r0, c0] = YARDS[color].origin;
  for (let r = r0; r < r0 + 6; r++) {
    for (let c = c0; c < c0 + 6; c++) yardCells.set(key(r, c), color);
  }
}

const yardSlotColor = new Map(); // "r,c" -> color
for (const color of PLAYERS) {
  YARDS[color].slots.forEach(([r, c]) => yardSlotColor.set(key(r, c), color));
}

const startCell = new Map(); // "r,c" -> color
for (const color of PLAYERS) {
  const [r, c] = TRACK[START_INDEX[color]];
  startCell.set(key(r, c), color);
}

// Render the whole board (plus token positions) to a string.
function render(game) {
  // Map each grid cell to the tokens sitting on it.
  const occupants = new Map(); // "r,c" -> [{color, token}]
  const baseTokens = {};       // color -> list of based token indices
  for (const color of game.colors) {
    baseTokens[color] = [];
    game.tokens[color].forEach((offset, t) => {
      if (offset === BASE) {
        baseTokens[color].push(t);
        return;
      }
      const [r, c] = cellFor(color, offset);
      const k = key(r, c);
      if (!occupants.has(k)) occupants.set(k, []);
      occupants.get(k).push({ color, token: t });
    });
  }

  // Place based tokens into their yard slots.
  const slotFill = new Map(); // "r,c" -> {color, token}
  for (const color of game.colors) {
    const slots = YARDS[color].slots;
    baseTokens[color].forEach((t) => {
      const [r, c] = slots[t];
      slotFill.set(key(r, c), { color, token: t });
    });
  }

  const lines = [];
  for (let r = 0; r < 15; r++) {
    let line = '';
    for (let c = 0; c < 15; c++) {
      line += cellString(game, r, c, occupants, slotFill);
    }
    lines.push(line);
  }
  return lines.join('\n');
}

// Grid coordinate for a token of `color` at a given offset (>=0).
function cellFor(color, offset) {
  if (offset <= 50) {
    const abs = (START_INDEX[color] + offset) % TRACK.length;
    return TRACK[abs];
  }
  return HOME_COLUMNS[color][offset - 51];
}

function cellString(game, r, c, occupants, slotFill) {
  const k = key(r, c);

  // A token on the board takes precedence. Draw it as a filled coloured pill
  // (dark letter on the colour's background) so it is easy to spot on the track.
  const occ = occupants.get(k);
  if (occ && occ.length) {
    const top = occ[0];
    const ch = occ.length > 1 ? String(occ.length) : LETTER[top.color];
    return paint(BG[top.color] + BLACK_FG + BOLD, ch) + paint(BG[top.color], ' ');
  }

  // A based token in its yard slot.
  const slot = slotFill.get(k);
  if (slot) {
    return paint(BG[slot.color] + BOLD, LETTER[slot.color]) + paint(BG[slot.color], ' ');
  }

  // Centre goal.
  if (r === CENTER[0] && c === CENTER[1]) return paint(BOLD, '★') + ' ';

  // Home column cell.
  const homeColor = homeAt.get(k);
  if (homeColor) return paint(BG[homeColor], '  ');

  // Start square (coloured).
  const startColor = startCell.get(k);
  if (startColor) return paint(FG[startColor] + BOLD, '◈') + ' ';

  // Regular track cell.
  if (trackAt.has(k)) {
    const abs = trackAt.get(k);
    if (SAFE_INDICES.has(abs)) return paint(DIM, '✦') + ' ';
    return paint(DIM, '·') + ' ';
  }

  // Yard interior (coloured block, empty slot marker).
  const yardColor = yardCells.get(k);
  if (yardColor) {
    if (yardSlotColor.has(k)) return paint(BG[yardColor] + DIM, '○') + paint(BG[yardColor], ' ');
    return paint(BG[yardColor], '  ');
  }

  return '  ';
}

// A short coloured status/legend block.
function status(game) {
  const rows = game.colors.map((color) => {
    const tag = game.isHuman(color) ? 'you' : 'cpu';
    const home = game.homeCount(color);
    const marker = color === game.current ? '▶' : ' ';
    const label = paint(FG[color] + BOLD, LETTER[color] + ' ' + color.padEnd(6));
    return `${marker} ${label} (${tag})  home ${home}/4`;
  });
  return rows.join('\n');
}

module.exports = { render, status, paint, FG, LETTER, RESET, BOLD, DIM };
