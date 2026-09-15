import { neighborsOf, manhattanDistance, DIRECTIONS } from './collision.js';

// Each train picks its next cell one grid-step at a time. All three
// behaviors share the same "don't reverse unless forced" rule so movement
// reads as directional (train-like) rather than jittery.

function reverseOf(direction) {
  const map = { up: 'down', down: 'up', left: 'right', right: 'left' };
  return map[direction];
}

function pickBestNeighbor(neighbors, targetCell, currentDirection) {
  const forbiddenReverse = currentDirection ? reverseOf(currentDirection) : null;
  let candidates = neighbors.filter((n) => n.direction !== forbiddenReverse);
  if (candidates.length === 0) candidates = neighbors; // dead end — reversing is the only option

  candidates.sort(
    (a, b) => manhattanDistance(a, targetCell) - manhattanDistance(b, targetCell)
  );
  return candidates[0];
}

// 'patrol' — ignores the player entirely, follows a fixed clockwise-ish loop
// by always preferring to turn toward open space rather than doubling back.
// Deterministic per train (same maze always produces the same loop), so it
// reads as a predictable route rather than random wandering.
function patrolStep(grid, train) {
  const neighbors = neighborsOf(grid, train.row, train.col);
  if (neighbors.length === 0) return train;

  const forbiddenReverse = train.direction ? reverseOf(train.direction) : null;
  let candidates = neighbors.filter((n) => n.direction !== forbiddenReverse);
  if (candidates.length === 0) candidates = neighbors;

  // Prefer continuing straight, then turning, in a fixed priority order —
  // this is what makes patrol read as "route" rather than "random."
  const priority = ['up', 'right', 'down', 'left'];
  candidates.sort((a, b) => priority.indexOf(a.direction) - priority.indexOf(b.direction));

  const next = candidates[0];
  return { row: next.row, col: next.col, direction: next.direction };
}

// 'chase' — always steps toward the player's current cell.
function chaseStep(grid, train, playerCell) {
  const neighbors = neighborsOf(grid, train.row, train.col);
  if (neighbors.length === 0) return train;
  const next = pickBestNeighbor(neighbors, playerCell, train.direction);
  return { row: next.row, col: next.col, direction: next.direction };
}

// 'intercept' — targets a cell a few tiles ahead of the player's current
// heading instead of the player's exact cell, so it cuts corners rather than
// tailing directly (reads as "smarter" than plain chase).
function interceptStep(grid, train, playerCell, playerDirection) {
  const lookahead = 4;
  const offset = playerDirection ? DIRECTIONS[playerDirection] : { dr: 0, dc: 0 };
  const targetCell = {
    row: playerCell.row + offset.dr * lookahead,
    col: playerCell.col + offset.dc * lookahead
  };
  const neighbors = neighborsOf(grid, train.row, train.col);
  if (neighbors.length === 0) return train;
  const next = pickBestNeighbor(neighbors, targetCell, train.direction);
  return { row: next.row, col: next.col, direction: next.direction };
}

// 'flee' — used during player power mode: steps away from the player instead
// of toward them, so a captured-feeling train actually tries to escape.
function fleeStep(grid, train, playerCell) {
  const neighbors = neighborsOf(grid, train.row, train.col);
  if (neighbors.length === 0) return train;
  neighbors.sort(
    (a, b) => manhattanDistance(b, playerCell) - manhattanDistance(a, playerCell)
  );
  const next = neighbors[0];
  return { row: next.row, col: next.col, direction: next.direction };
}

export function computeTrainStep(grid, train, playerCell, playerDirection, isFleeing) {
  if (isFleeing) return fleeStep(grid, train, playerCell);
  switch (train.behavior) {
    case 'patrol':
      return patrolStep(grid, train);
    case 'intercept':
      return interceptStep(grid, train, playerCell, playerDirection);
    case 'chase':
    default:
      return chaseStep(grid, train, playerCell);
  }
}
