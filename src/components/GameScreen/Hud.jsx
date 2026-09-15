import styles from './Hud.module.css';

export default function Hud({ level, score, threshold, lives, maxLives, onPause, onExit, powerMode }) {
  const progressPct = Math.min(100, (score / threshold) * 100);

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
        <span className={`${styles.scoreText} mono`}>
          {score} / {threshold}
        </span>
        {powerMode && <span className={styles.powerBadge}>כוח־על!</span>}
      </div>

      <div className={styles.progressTrack} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={threshold}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>

      <div className={styles.livesRow}>
        {Array.from({ length: maxLives }).map((_, i) => (
          <span key={i} className={styles.heart} data-active={i < lives} aria-hidden="true" />
        ))}
        <span className="visually-hidden">{lives} חיים נותרו מתוך {maxLives}</span>
      </div>
    </div>
  );
}
