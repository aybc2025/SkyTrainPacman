import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameLoop } from './useGameLoop.js';
import { parseMaze, isWalkable, DIRECTIONS, manhattanDistance } from './collision.js';
import { computeTrainStep } from './trainAI.js';
import { DOT_SCORE, POWER_DOT_SCORE, TRAIN_CAPTURE_SCORE } from '../config/levels.js';

export const PLAYER_STEP_MS = 160; // ms per grid cell for the player
const TRAIN_STEP_BASE_MS = 260; // baseline; each train's own `speed` overrides this

// Game phases:
//   'ready'   — level loaded, waiting for first input
//   'playing' — actively running
//   'paused'  — timers frozen, no rendering updates needed beyond the pause UI
//   'won'     — score reached threshold
//   'lost'    — lives exhausted before reaching threshold

function freshPlayerState(parsed) {
  return {
    row: parsed.playerStart.row,
    col: parsed.playerStart.col,
    direction: null,
    pendingDirection: null
  };
}

function freshTrainsState(level, parsed) {
  return level.trains.map((cfg) => ({
    ...cfg,
    row: parsed.trainStarts[cfg.line].row,
    col: parsed.trainStarts[cfg.line].col,
    direction: null
  }));
}

export function useMazeEngine(level, { highScoreMode = false } = {}) {
  const parsed = useMemo(() => parseMaze(level.maze), [level]);

  const [phase, setPhase] = useState('ready');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(level.lives);
  const [grid, setGrid] = useState(parsed.grid);
  const [player, setPlayer] = useState(() => freshPlayerState(parsed));
  const [trains, setTrains] = useState(() => freshTrainsState(level, parsed));
  const [powerMode, setPowerMode] = useState(false);

  // Single event channel for the animation/render layer to observe. Never
  // cleared — consumers dedupe on `nonce` (see app-development skill,
  // Animation Patterns). The engine itself never reads this back.
  const [lastEvent, setLastEvent] = useState({ kind: 'none', payload: {}, nonce: 0 });
  const nonceRef = useRef(0);
  const emit = useCallback((kind, payload = {}) => {
    nonceRef.current += 1;
    setLastEvent({ kind, payload, nonce: nonceRef.current });
  }, []);

  // Reset everything when the level itself changes (e.g. replaying).
  useEffect(() => {
    setPhase('ready');
    setScore(0);
    setLives(level.lives);
    setGrid(parsed.grid);
    setPlayer(freshPlayerState(parsed));
    setTrains(freshTrainsState(level, parsed));
    setPowerMode(false);
  }, [level, parsed]);

  const powerTimerRef = useRef(null);
  const playerMoveAccumRef = useRef(0);
  const trainMoveAccumRef = useRef({});

  const requestDirection = useCallback(
    (direction) => {
      setPhase((p) => (p === 'ready' ? 'playing' : p));
      setPlayer((p) => {
        // A direction change that's immediately walkable takes effect right
        // now instead of waiting for the next scheduled movement tick (up to
        // PLAYER_STEP_MS later) — that wait is what made a well-timed turn
        // occasionally feel like it landed late. Continuing in the same
        // direction (key repeat / holding a swipe) always still rides the
        // normal tick cadence below, so overall movement speed is unchanged.
        if (direction !== p.direction) {
          const { dr, dc } = DIRECTIONS[direction];
          const nr = p.row + dr;
          const nc = p.col + dc;
          if (isWalkable(grid, nr, nc)) {
            playerMoveAccumRef.current = 0;
            return { ...p, row: nr, col: nc, direction, pendingDirection: direction };
          }
        }
        return { ...p, pendingDirection: direction };
      });
    },
    [grid]
  );

  const pause = useCallback(() => {
    setPhase((p) => (p === 'playing' ? 'paused' : p));
  }, []);

  const resume = useCallback(() => {
    setPhase((p) => (p === 'paused' ? 'playing' : p));
  }, []);

  const endPowerMode = useCallback(() => {
    setPowerMode(false);
    if (powerTimerRef.current) {
      clearTimeout(powerTimerRef.current);
      powerTimerRef.current = null;
    }
  }, []);

  // Clear the power timer on unmount so it never fires into a torn-down game.
  useEffect(() => () => {
    if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
  }, []);

  const tick = useCallback(
    (deltaMs) => {
      // ---- player movement ----
      playerMoveAccumRef.current += deltaMs;
      if (playerMoveAccumRef.current >= PLAYER_STEP_MS) {
        playerMoveAccumRef.current = 0;
        setPlayer((p) => {
          const tryDir = p.pendingDirection ?? p.direction;
          if (!tryDir) return p;
          const { dr, dc } = DIRECTIONS[tryDir];
          const nr = p.row + dr;
          const nc = p.col + dc;
          if (isWalkable(grid, nr, nc)) {
            return { ...p, row: nr, col: nc, direction: tryDir };
          }
          if (p.direction && p.direction !== tryDir) {
            const cont = DIRECTIONS[p.direction];
            const cnr = p.row + cont.dr;
            const cnc = p.col + cont.dc;
            if (isWalkable(grid, cnr, cnc)) {
              return { ...p, row: cnr, col: cnc };
            }
          }
          return p;
        });
      }

      // ---- train movement (each on its own speed cadence) ----
      setTrains((prevTrains) =>
        prevTrains.map((train) => {
          const acc = (trainMoveAccumRef.current[train.line] ?? 0) + deltaMs;
          const stepMs = train.speed ?? TRAIN_STEP_BASE_MS;
          if (acc < stepMs) {
            trainMoveAccumRef.current[train.line] = acc;
            return train;
          }
          trainMoveAccumRef.current[train.line] = 0;
          const next = computeTrainStep(
            grid,
            train,
            { row: player.row, col: player.col },
            player.direction,
            powerMode
          );
          return { ...train, ...next };
        })
      );
    },
    [grid, player.row, player.col, player.direction, powerMode]
  );

  useGameLoop(tick, phase === 'playing');

  // ---- dot collection: reacts to the player's cell changing ----
  useEffect(() => {
    if (phase !== 'playing') return;
    const cell = grid[player.row]?.[player.col];
    if (cell === '.') {
      setGrid((g) => {
        const copy = g.map((r) => [...r]);
        copy[player.row][player.col] = ' ';
        return copy;
      });
      setScore((s) => s + DOT_SCORE);
      emit('collect', { row: player.row, col: player.col, points: DOT_SCORE });
    } else if (cell === 'o') {
      setGrid((g) => {
        const copy = g.map((r) => [...r]);
        copy[player.row][player.col] = ' ';
        return copy;
      });
      setScore((s) => s + POWER_DOT_SCORE);
      setPowerMode(true);
      emit('powerup', { row: player.row, col: player.col, points: POWER_DOT_SCORE });
      if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
      powerTimerRef.current = setTimeout(endPowerMode, level.powerDuration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.row, player.col, phase]);

  // ---- collision detection: reacts to player or train positions changing ----
  useEffect(() => {
    if (phase !== 'playing') return;
    const hitTrain = trains.find((t) => manhattanDistance(t, player) === 0);
    if (!hitTrain) return;

    if (powerMode) {
      setScore((s) => s + TRAIN_CAPTURE_SCORE);
      emit('capture', { line: hitTrain.line, row: hitTrain.row, col: hitTrain.col, points: TRAIN_CAPTURE_SCORE });
      setTrains((prev) =>
        prev.map((t) =>
          t.line === hitTrain.line
            ? {
                ...t,
                row: parsed.trainStarts[t.line].row,
                col: parsed.trainStarts[t.line].col,
                direction: null
              }
            : t
        )
      );
    } else {
      emit('hit', { line: hitTrain.line, row: player.row, col: player.col });
      setLives((l) => l - 1);
      setPlayer((p) => ({
        ...p,
        row: parsed.playerStart.row,
        col: parsed.playerStart.col,
        direction: null,
        pendingDirection: null
      }));
      setTrains((prev) =>
        prev.map((t) => ({
          ...t,
          row: parsed.trainStarts[t.line].row,
          col: parsed.trainStarts[t.line].col,
          direction: null
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.row, player.col, trains, phase, powerMode]);

  // ---- win / lose resolution ----
  // In high-score mode (replaying an already-completed level) reaching the
  // threshold doesn't end the run — the player keeps playing past it to
  // build a bigger score. The round then ends either when every dot on the
  // board is gone (board fully cleared — nothing left to score) or when
  // lives run out.
  const hasDotsRemaining = useMemo(
    () => grid.some((row) => row.includes('.') || row.includes('o')),
    [grid]
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    if (!highScoreMode && score >= level.threshold) {
      setPhase('won');
      emit('win', { score });
    } else if (highScoreMode && !hasDotsRemaining) {
      setPhase('won');
      emit('win', { score });
    } else if (lives <= 0) {
      if (score >= level.threshold) {
        setPhase('won');
        emit('win', { score });
      } else {
        setPhase('lost');
        emit('lose', { score });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, lives, phase, highScoreMode, hasDotsRemaining]);

  return {
    phase,
    score,
    threshold: level.threshold,
    lives,
    maxLives: level.lives,
    grid,
    player,
    trains,
    powerMode,
    lastEvent,
    requestDirection,
    pause,
    resume
  };
}
