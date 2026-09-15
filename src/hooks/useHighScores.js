import { useCallback, useEffect, useState } from 'react';
import { LEVELS } from '../config/levels.js';

const STORAGE_KEY = 'skytrain-chase:progress';

function defaultProgress() {
  const byLevel = {};
  LEVELS.forEach((lvl, index) => {
    byLevel[lvl.id] = {
      unlocked: index === 0, // only the first level starts unlocked
      highScore: 0,
      completed: false
    };
  });
  return byLevel;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    // Merge with defaults so a future added level is unlocked/blank correctly
    // even if it's missing from an older saved blob.
    const merged = defaultProgress();
    Object.keys(merged).forEach((id) => {
      if (parsed[id]) merged[id] = { ...merged[id], ...parsed[id] };
    });
    return merged;
  } catch {
    return defaultProgress();
  }
}

function starsFor(level, score) {
  if (score < level.threshold) return 0;
  const ratio = score / level.threshold;
  if (ratio >= 1.6) return 3;
  if (ratio >= 1.2) return 2;
  return 1;
}

export function useHighScores() {
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // localStorage unavailable (private browsing, storage full) — game
      // still works this session, progress just won't persist.
    }
  }, [progress]);

  const recordResult = useCallback((levelId, score, won) => {
    setProgress((prev) => {
      const next = { ...prev };
      const current = next[levelId] ?? { unlocked: true, highScore: 0, completed: false };
      const newHigh = Math.max(current.highScore, score);
      next[levelId] = { ...current, highScore: newHigh, completed: current.completed || won };

      if (won) {
        const levelIndex = LEVELS.findIndex((l) => l.id === levelId);
        const nextLevel = LEVELS[levelIndex + 1];
        if (nextLevel) {
          const nextEntry = next[nextLevel.id] ?? { unlocked: false, highScore: 0, completed: false };
          next[nextLevel.id] = { ...nextEntry, unlocked: true };
        }
      }
      return next;
    });
  }, []);

  const getLevelProgress = useCallback(
    (levelId) => progress[levelId] ?? { unlocked: false, highScore: 0, completed: false },
    [progress]
  );

  const getStars = useCallback(
    (level) => {
      const entry = progress[level.id];
      if (!entry || !entry.completed) return 0;
      return starsFor(level, entry.highScore);
    },
    [progress]
  );

  return { progress, recordResult, getLevelProgress, getStars };
}
