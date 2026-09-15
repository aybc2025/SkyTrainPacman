import { useEffect, useRef, useState } from 'react';
import { PLAYER_STEP_MS } from '../../engine/useMazeEngine.js';
import styles from './MazeCanvas.module.css';

const LINE_CLASS = {
  canada: styles.trainCanada,
  expo: styles.trainExpo,
  millennium: styles.trainMillennium
};

// Sprites are drawn elongated along the horizontal axis by default (see
// .sprite's aspect-ratio), so a 90° turn is all it takes to make a train
// visually face the axis it's actually travelling on.
function axisRotation(direction) {
  return direction === 'up' || direction === 'down' ? 90 : 0;
}

// A light squash/stretch along the travel axis — purely cosmetic, sells a
// sense of momentum without needing real sprite art.
function motionSquash(direction) {
  if (direction === 'left' || direction === 'right') return 'scale(1.16, 0.87)';
  if (direction === 'up' || direction === 'down') return 'scale(0.87, 1.16)';
  return 'scale(1, 1)';
}

const BURST_KINDS = ['collect', 'powerup', 'capture'];
const BURST_LIFETIME_MS = 620;

// Observes the engine's event channel to spawn short-lived "+N" score
// popups at the exact cell an event happened, then self-removes each one
// after its animation finishes — see useFlashOnEvent below for the same
// event-channel pattern applied to a single boolean instead of a list.
function useScoreBursts(lastEvent) {
  const [bursts, setBursts] = useState([]);
  const lastNonceRef = useRef(0);

  useEffect(() => {
    if (lastEvent.nonce === lastNonceRef.current) return;
    lastNonceRef.current = lastEvent.nonce;
    if (!BURST_KINDS.includes(lastEvent.kind)) return;

    const id = lastEvent.nonce;
    const { row, col, points } = lastEvent.payload;
    setBursts((prev) => [...prev, { id, row, col, points, kind: lastEvent.kind }]);
    const t = setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, BURST_LIFETIME_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent.nonce]);

  return bursts;
}

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
  const bursts = useScoreBursts(lastEvent);

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

      {trains.map((train) => {
        // transitionDuration is set inline (rather than fixed in CSS) so the
        // glide exactly matches this train's own step cadence — otherwise a
        // slower train visibly pauses between steps once its CSS transition
        // finishes early. Order matches the wrapper's transition-property
        // list: top, left, transform.
        const stepMs = train.speed ?? 260;
        return (
          <div
            key={train.line}
            className={styles.spriteWrap}
            style={{
              top: `${((train.row + 0.5) / rows) * 100}%`,
              left: `${((train.col + 0.5) / cols) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${axisRotation(train.direction)}deg)`,
              transitionDuration: `${stepMs}ms, ${stepMs}ms, 160ms`
            }}
            aria-hidden="true"
          >
            <div className={`${styles.sprite} ${LINE_CLASS[train.line]} ${powerMode ? styles.fleeing : ''}`} />
          </div>
        );
      })}

      <div
        className={styles.playerWrap}
        style={{
          top: `${((player.row + 0.5) / rows) * 100}%`,
          left: `${((player.col + 0.5) / cols) * 100}%`,
          transform: `translate(-50%, -50%) ${motionSquash(player.direction)}`,
          transitionDuration: `${PLAYER_STEP_MS}ms, ${PLAYER_STEP_MS}ms, 160ms`
        }}
        aria-hidden="true"
      >
        <div className={`${styles.player} ${!player.direction ? styles.playerIdle : ''}`} />
      </div>

      {bursts.map((b) => (
        <div
          key={b.id}
          className={`${styles.burst} ${b.kind === 'collect' ? styles.burstSmall : styles.burstBig}`}
          style={{
            top: `${((b.row + 0.5) / rows) * 100}%`,
            left: `${((b.col + 0.5) / cols) * 100}%`
          }}
        >
          <span className={styles.burstRing} />
          <span className={styles.burstScore}>+{b.points}</span>
        </div>
      ))}
    </div>
  );
}
