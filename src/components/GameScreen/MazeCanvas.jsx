import { useEffect, useRef, useState } from 'react';
import { PLAYER_STEP_MS } from '../../engine/useMazeEngine.js';
import styles from './MazeCanvas.module.css';

const LINE_CLASS = {
  canada: styles.trainCanada,
  expo: styles.trainExpo,
  millennium: styles.trainMillennium
};

// Both trains and the player are drawn in a "facing right" base pose (train
// headlight/window detail on the right edge, player's mouth wedge opening
// rightward) — rotating the wrapper is all it takes to make either one
// visually face whichever of the 4 directions it's actually travelling.
function facingRotation(direction) {
  switch (direction) {
    case 'down':
      return 90;
    case 'left':
      return 180;
    case 'up':
      return 270;
    default:
      return 0;
  }
}

// A light squash/stretch along the local (already-rotated) travel axis —
// purely cosmetic, sells a sense of momentum without needing real sprite art.
function travelSquash(direction) {
  return direction ? 'scale(1.16, 0.87)' : 'scale(1, 1)';
}

// Observes the engine's event channel for a 'hit' event and spawns a
// short-lived "death" ghost at the exact cell the player was hit — the real
// player sprite resets to the start cell immediately (engine-driven, no
// delay to gameplay), while this purely decorative ghost independently
// spins/shrinks away at the old spot. Same event-channel pattern as
// useScoreBursts, just a single slot since only one life can be lost at once.
function usePlayerDeathGhost(lastEvent) {
  const [ghost, setGhost] = useState(null);
  const lastNonceRef = useRef(0);

  useEffect(() => {
    if (lastEvent.nonce === lastNonceRef.current) return;
    lastNonceRef.current = lastEvent.nonce;
    if (lastEvent.kind !== 'hit') return;

    const id = lastEvent.nonce;
    const { row, col } = lastEvent.payload;
    setGhost({ id, row, col });
    const t = setTimeout(() => {
      setGhost((g) => (g?.id === id ? null : g));
    }, 520);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent.nonce]);

  return ghost;
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
  const deathGhost = usePlayerDeathGhost(lastEvent);

  const rows = grid.length;
  const cols = grid[0].length;

  return (
    <div
      className={`${styles.maze} ${hitFlash ? styles.hitFlash : ''} ${winFlash ? styles.winFlash : ''} ${powerMode ? styles.powerActive : ''}`}
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
              transform: `translate(-50%, -50%) rotate(${facingRotation(train.direction)}deg)`,
              transitionDuration: `${stepMs}ms, ${stepMs}ms, 160ms`
            }}
            aria-hidden="true"
          >
            <div className={`${styles.sprite} ${LINE_CLASS[train.line]} ${powerMode ? styles.fleeing : ''}`}>
              <span className={styles.trainWindow} />
              <span className={styles.headlight} />
            </div>
          </div>
        );
      })}

      {deathGhost && (
        <div
          className={styles.deathGhost}
          style={{
            top: `${((deathGhost.row + 0.5) / rows) * 100}%`,
            left: `${((deathGhost.col + 0.5) / cols) * 100}%`
          }}
          aria-hidden="true"
        />
      )}

      <div
        className={styles.playerWrap}
        style={{
          top: `${((player.row + 0.5) / rows) * 100}%`,
          left: `${((player.col + 0.5) / cols) * 100}%`,
          transform: `translate(-50%, -50%) rotate(${facingRotation(player.direction)}deg) ${travelSquash(player.direction)}`,
          transitionDuration: `${PLAYER_STEP_MS}ms, ${PLAYER_STEP_MS}ms, 160ms`
        }}
        aria-hidden="true"
      >
        <div className={`${styles.player} ${player.direction ? styles.playerChomp : styles.playerIdle}`} />
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
