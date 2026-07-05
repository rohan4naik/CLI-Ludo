'use strict';

const { SAFE_INDICES, GOAL_OFFSET, TRACK_LEN } = require('./constants');

// Heuristic AI with three difficulty levels.
//   easy   - mostly random, ignores threats
//   normal - full heuristic (default)
//   hard   - full heuristic with sharper threat/aggression weighting
function chooseMove(game, color, dice, moves, difficulty = 'normal') {
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  // Easy players blunder often: 65% of the time they move at random.
  if (difficulty === 'easy' && Math.random() < 0.65) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = scoreMove(game, color, dice, move, difficulty);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

function scoreMove(game, color, dice, move, difficulty = 'normal') {
  const hard = difficulty === 'hard';
  let score = 0;

  // Capturing an opponent is almost always great (more so on hard).
  const captures = game.capturesFor(color, move.to);
  score += captures.length * (hard ? 1300 : 1000);

  // Getting a token all the way home.
  if (move.to === GOAL_OFFSET) score += 800;

  // Bringing a fresh token out of the yard keeps options open.
  if (move.from < 0) score += 400;

  // Reaching the safety of the home column.
  if (move.to >= 51 && move.to < GOAL_OFFSET) score += 200;

  // Landing on a safe square.
  const abs = game.absIndex(color, move.to);
  if (abs !== null && SAFE_INDICES.has(abs)) score += 120;

  // Prefer progressing tokens that are already advanced.
  score += move.to * 3;

  // Avoid parking a lone token where an opponent one dice-roll behind could
  // capture it next turn (only matters on unsafe track squares). Hard players
  // weigh this danger more heavily.
  if (abs !== null && !SAFE_INDICES.has(abs) && move.to < GOAL_OFFSET) {
    if (isThreatened(game, color, abs)) score -= hard ? 260 : 150;
  }

  return score;
}

// Is absolute square `abs` reachable by an opponent token within 1..6 steps?
function isThreatened(game, color, abs) {
  for (const other of game.colors) {
    if (other === color) continue;
    for (const off of game.tokens[other]) {
      if (off < 0 || off > 50) continue;
      const oAbs = game.absIndex(other, off);
      let d = abs - oAbs;
      if (d < 0) d += TRACK_LEN;
      if (d >= 1 && d <= 6) return true;
    }
  }
  return false;
}

module.exports = { chooseMove };
