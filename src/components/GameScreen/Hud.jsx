import { useEffect, useRef, useState } from 'react';
import styles from './Hud.module.css';

// A brief scale-pop whenever score actually changes, so points landing reads
// as a small reward rather than the number just silently updating.
function useScorePulse(score) {
  const [pulsing, setPulsing] = useState(false);
  const prevScoreRef = useRef(score);

  useEffect(() => {
    if (score === prevScoreRef.current) return;
    prevScoreRef.current = score;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 260);
    return () => clearTimeout(t);
  }, [score]);

  return pulsing;
}

// Watches the engine's event channel for a 'hit' so the heart that was just
// lost can flash before settling into its inactive state, instead of just
// silently switching off — same event-channel pattern as MazeCanvas's hooks.
function useHeartLostFlash(lastEvent) {
  const [flashing, setFlashing] = useState(false);
  const lastNonceRef = useRef(0);

  useEffect(() => {
    if (lastEvent.nonce === lastNonceRef.current) return;
    lastNonceRef.current = lastEvent.nonce;
    if (lastEvent.kind !== 'hit') return;
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent.nonce]);

  return flashing;
}

export default function Hud({ level, score, threshold, lives, maxLives, onPause, onExit, powerMode, lastEvent }) {
  const progressPct = Math.min(100, (score / threshold) * 100);
  const scorePulsing = useScorePulse(score);
  const heartFlashing = useHeartLostFlash(lastEvent);

  return (
    <div className={styles.hud}>
      <div className={styles.topRow}>
        <div className={styles.levelName}>
          שלב {level.id} · {level.name}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onExit}
            aria-label="חזרה לדף הבית"
          >
            🏠
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onPause}
            aria-label="השהה משחק"
          >
            ⏸
          </button>
        </div>
      </div>

      <div className={styles.scoreRow}>
        <span className={`${styles.scoreText} ${scorePulsing ? styles.scorePulse : ''} mono`}>
          {score} / {threshold}
        </span>
        {powerMode && <span className={styles.powerBadge}>כוח־על!</span>}
      </div>

      <div className={styles.progressTrack} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={threshold}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>

      <div className={styles.livesRow}>
        {Array.from({ length: maxLives }).map((_, i) => (
          <span
            key={i}
            className={`${styles.heart} ${heartFlashing && i === lives ? styles.heartLost : ''}`}
            data-active={i < lives}
            aria-hidden="true"
          />
        ))}
        <span className="visually-hidden">{lives} חיים נותרו מתוך {maxLives}</span>
      </div>
    </div>
  );
}
