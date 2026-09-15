import styles from './LevelRow.module.css';

const LINE_COLOR_VAR = {
  canada: 'var(--canada)',
  expo: 'var(--expo)',
  millennium: 'var(--millennium)'
};

export default function LevelRow({ level, progress, stars, onSelect }) {
  const locked = !progress.unlocked;
  const primaryLine = level.trains[0]?.line ?? 'canada';

  return (
    <li>
      <button
        type="button"
        className={`${styles.row} pressable ${locked ? styles.locked : styles.hoverableRow} hoverable`}
        onClick={onSelect}
        disabled={locked}
        aria-disabled={locked}
      >
        <div className={styles.info}>
          <div className={styles.name}>
            {level.id} · {level.name}
          </div>
          {locked ? (
            <div className={styles.meta}>נעול — עברו את השלב הקודם כדי לפתוח</div>
          ) : (
            <>
              <div className={`${styles.meta} mono`}>
                שיא: {progress.highScore} / סף: {level.threshold}
              </div>
              {progress.completed && (
                <div className={styles.stars} aria-label={`${stars} מתוך 3 כוכבים`}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={styles.star} data-filled={i < stars}>
                      ★
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div
          className={styles.badge}
          style={{
            background: locked ? 'var(--line)' : LINE_COLOR_VAR[primaryLine],
            color: locked ? 'var(--text-dim)' : '#0B1220'
          }}
          aria-hidden="true"
        >
          {locked ? '🔒' : progress.completed ? '✓' : level.id}
        </div>
      </button>
    </li>
  );
}
