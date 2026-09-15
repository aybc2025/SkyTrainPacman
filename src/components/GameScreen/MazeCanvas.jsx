import { useEffect, useRef, useState } from 'react';
import styles from './MazeCanvas.module.css';

const LINE_CLASS = {
  canada: styles.trainCanada,
  expo: styles.trainExpo,
  millennium: styles.trainMillennium
};

// Observes the engine's event channel to trigger short-lived visual flashes
// (screen flash on hit, capture pulse) without the engine knowing animation
// exists — see app-development skill, Animation Patterns: event channel.
function useFlashOnEvent(lastEvent, kinds, durationMs = 220) {
  const [flashing, setFlashing] = useState(false);
  const lastNonceRef = useRef(0);

  useEffect(() => {
    if (lastEvent.nonce === lastNonceRef.current) return;
    lastNonceRef.current = lastEvent.nonce;
    if (kinds.includes(lastEvent.kind)) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), durationMs);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent.nonce]);

  return flashing;
}

export default function MazeCanvas({ grid, player, trains, powerMode, lastEvent }) {
  const hitFlash = useFlashOnEvent(lastEvent, ['hit'], 260);
  const winFlash = useFlashOnEvent(lastEvent, ['win'], 400);

  const rows = grid.length;
  const cols = grid[0].length;

  return (
    <div
      className={`${styles.maze} ${hitFlash ? styles.hitFlash : ''} ${winFlash ? styles.winFlash : ''}`}
    >
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} className={cell === '#' ? styles.wall : styles.track}>
              {cell === '.' && <span className={styles.dot} />}
              {cell === 'o' && <span className={styles.powerDot} />}
            </div>
          ))
        )}
      </div>

      {trains.map((train) => (
        <div
          key={train.line}
          className={`${styles.sprite} ${LINE_CLASS[train.line]} ${powerMode ? styles.fleeing : ''}`}
          style={{
            top: `${((train.row + 0.5) / rows) * 100}%`,
            left: `${((train.col + 0.5) / cols) * 100}%`
          }}
          aria-hidden="true"
        />
      ))}

      <div
        className={styles.player}
        style={{
          top: `${((player.row + 0.5) / rows) * 100}%`,
          left: `${((player.col + 0.5) / cols) * 100}%`
        }}
        aria-hidden="true"
      />
    </div>
  );
}
