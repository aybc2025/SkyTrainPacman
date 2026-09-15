import { POWER_DOT_COUNT } from '../config/levels.js';

// Parses a maze string array into a structured grid the engine can mutate
// (dots get eaten over time, so this must be a fresh copy per game session,
// never the shared config array).
export function parseMaze(mazeStrings) {
  const grid = mazeStrings.map((row) => row.split(''));
  let playerStart = null;
  const trainStarts = {};

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c];
      if (ch === 'P') {
        playerStart = { row: r, col: c };
        grid[r][c] = '.';
      } else if (ch === 'C') {
        trainStarts.canada = { row: r, col: c };
        grid[r][c] = '.';
      } else if (ch === 'E') {
        trainStarts.expo = { row: r, col: c };
        grid[r][c] = '.';
      } else if (ch === 'M') {
        trainStarts.millennium = { row: r, col: c };
        grid[r][c] = '.';
      }
    }
  }

  choosePowerDotCells(grid, playerStart).forEach(({ row, col }) => {
    grid[row][col] = 'o';
  });

  return { grid, playerStart, trainStarts };
}

// Picks cells farthest (by BFS distance) from the player's start to hold
// power dots, so they never spawn conveniently next to the player and always
// require crossing real distance (and usually train territory) to reach.
function choosePowerDotCells(grid, playerStart, count = POWER_DOT_COUNT) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  dist[playerStart.row][playerStart.col] = 0;
  const queue = [[playerStart.row, playerStart.col]];

  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === '#') continue;
      if (dist[nr][nc] !== Infinity) continue;
      dist[nr][nc] = dist[r][c] + 1;
      queue.push([nr, nc]);
    }
  }

  const candidates = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== '#' && dist[r][c] !== Infinity) {
        candidates.push({ row: r, col: c, dist: dist[r][c] });
      }
    }
  }
  candidates.sort((a, b) => b.dist - a.dist);

  // Spread picks across different regions rather than clustering the 4
  // farthest cells together (which are often adjacent to each other).
  const chosen = [];
  for (const cand of candidates) {
    if (chosen.length >= count) break;
    const tooClose = chosen.some(
      (c) => Math.abs(c.row - cand.row) + Math.abs(c.col - cand.col) < Math.min(rows, cols) / 3
    );
    if (!tooClose) chosen.push(cand);
  }
  // Fallback: if spreading left us short, fill with next-farthest regardless.
  for (const cand of candidates) {
    if (chosen.length >= count) break;
    if (!chosen.includes(cand)) chosen.push(cand);
  }

  return chosen;
}

export function isWalkable(grid, row, col) {
  if (row < 0 || row >= grid.length) return false;
  if (col < 0 || col >= grid[0].length) return false;
  return grid[row][col] !== '#';
}

export const DIRECTIONS = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 }
};

export function neighborsOf(grid, row, col) {
  const result = [];
  for (const [name, { dr, dc }] of Object.entries(DIRECTIONS)) {
    const nr = row + dr;
    const nc = col + dc;
    if (isWalkable(grid, nr, nc)) {
      result.push({ direction: name, row: nr, col: nc });
    }
  }
  return result;
}

export function manhattanDistance(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}
