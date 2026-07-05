'use strict';

// ---------------------------------------------------------------------------
// Board geometry for a classic 15x15 Ludo board.
//
// The shared main track is a 52-cell loop. Coordinates are [row, col] on the
// 15x15 grid. Index 0 is Red's starting square; the loop runs clockwise.
// ---------------------------------------------------------------------------

const TRACK = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],           // 0-4   red arm (right)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],   // 5-10  up
  [0, 7],                                            // 11    top turn
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],   // 12-17 down
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18-23 green arm (right)
  [7, 14],                                           // 24    right turn
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 25-30 back
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31-36 down
  [14, 7],                                           // 37    bottom turn
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 38-43 up
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],   // 44-49 left arm
  [7, 0],                                            // 50    left turn
  [6, 0],                                            // 51    back to start
];

// Home columns (the coloured lane leading to the centre). 6 cells each; the
// last cell is the goal — a token reaching it is "home".
const HOME_COLUMNS = {
  red:    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green:  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue:   [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Where each colour enters the shared track (index into TRACK).
const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };

// Full journey length per token: 51 shared-track steps (offset 0..50) plus a
// 6-cell home column (offset 51..56). Offset 56 == home / goal.
const HOME_ENTRY_OFFSET = 51; // first offset inside the home column
const GOAL_OFFSET = 56;       // exact offset that counts as "home"
const TRACK_LEN = TRACK.length; // 52

// Safe squares: the four coloured starts and the four star squares. Tokens on
// these cannot be captured.
const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const PLAYERS = ['red', 'green', 'yellow', 'blue'];

// The 6x6 yard corners and the 2x2 slots where based tokens sit.
const YARDS = {
  red:    { origin: [0, 0],   slots: [[1, 1], [1, 3], [3, 1], [3, 3]] },
  green:  { origin: [0, 9],   slots: [[1, 10], [1, 12], [3, 10], [3, 12]] },
  yellow: { origin: [9, 9],   slots: [[10, 10], [10, 12], [12, 10], [12, 12]] },
  blue:   { origin: [9, 0],   slots: [[10, 1], [10, 3], [12, 1], [12, 3]] },
};

const CENTER = [7, 7];

module.exports = {
  TRACK,
  TRACK_LEN,
  HOME_COLUMNS,
  START_INDEX,
  HOME_ENTRY_OFFSET,
  GOAL_OFFSET,
  SAFE_INDICES,
  PLAYERS,
  YARDS,
  CENTER,
};
