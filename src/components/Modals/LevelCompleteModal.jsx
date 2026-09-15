import { useMemo } from 'react';
import Button from '../shared/Button.jsx';
import styles from './Modal.module.css';

const CONFETTI_COLORS = ['var(--track)', 'var(--good)', 'var(--canada)', 'var(--expo)', 'var(--millennium)'];
const CONFETTI_COUNT = 20;

// Randomized once per mount (never re-rolled on re-render) — each piece gets
// a straight-line burst direction/distance computed in JS rather than via
// CSS trig functions, so it degrades gracefully on any browser that can do
// basic CSS transforms. Only ever mounts on an actual win.
function useConfetti() {
  return useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 55 + Math.random() * 60;
        return {
          id: i,
          dx: Math.round(Math.cos(angle) * distance),
          dy: Math.round(Math.sin(angle) * distance),
          delay: Math.round(Math.random() * 120),
          duration: 650 + Math.round(Math.random() * 450),
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 5 + Math.round(Math.random() * 4)
        };
      }),
    []
  );
}

export default function LevelCompleteModal({ score, previousHighScore, isNewHighScore, hasNextLevel, onNext, onReplay, onExit }) {
  const confetti = useConfetti();

  return (
    <div className={styles.overlay}>
      <div className={styles.confettiField} aria-hidden="true">
        {confetti.map((c) => (
          <span
            key={c.id}
            className={styles.confettiPiece}
            style={{
              '--dx': `${c.dx}px`,
              '--dy': `${c.dy}px`,
              '--dur': `${c.duration}ms`,
              '--delay': `${c.delay}ms`,
              background: c.color,
              width: `${c.size}px`,
              height: `${c.size}px`
            }}
          />
        ))}
      </div>
      <div className={styles.card}>
        <div className={`${styles.title} ${styles.titleWin}`}>השלב הושלם! 🎉</div>
        <div className={`${styles.scoreValue} mono`}>{score}</div>
        <div className={styles.sub}>
          {isNewHighScore ? 'שיא חדש!' : `שיא קודם: ${previousHighScore}`}
        </div>

        {hasNextLevel ? (
          <Button variant="primary" onClick={onNext}>
            לשלב הבא
          </Button>
        ) : (
          <Button variant="primary" onClick={onExit}>
            כל הכבוד! חזרה לבחירת שלב
          </Button>
        )}
        <div className={styles.spacer} />
        <Button variant="secondary" onClick={onReplay}>
          שחק שוב לניקוד גבוה
        </Button>
        {hasNextLevel && (
          <>
            <div className={styles.spacer} />
            <Button variant="secondary" onClick={onExit}>
              חזרה לבחירת שלב
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
