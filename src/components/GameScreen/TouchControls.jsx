import { useRef } from 'react';
import styles from './TouchControls.module.css';

const SWIPE_THRESHOLD = 24; // px — minimum drag distance to register as a swipe

export default function TouchControls({ onDirection }) {
  const touchStartRef = useRef(null);

  function handleTouchStart(e) {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e) {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    touchStartRef.current = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      onDirection(dx > 0 ? 'right' : 'left');
    } else {
      onDirection(dy > 0 ? 'down' : 'up');
    }
  }

  return (
    <>
      {/* Invisible swipe-capture layer sits over the maze via GameScreen's
          layout; TouchControls only supplies the handlers + the D-pad UI. */}
      <div
        className={styles.swipeLayer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
      <div className={styles.dpad} role="group" aria-label="בקרת כיוונים">
        <button
          type="button"
          className={`${styles.dpadBtn} ${styles.up} pressable`}
          onClick={() => onDirection('up')}
          aria-label="למעלה"
        >
          ▲
        </button>
        <button
          type="button"
          className={`${styles.dpadBtn} ${styles.left} pressable`}
          onClick={() => onDirection('left')}
          aria-label="שמאלה"
        >
          ◀
        </button>
        <button
          type="button"
          className={`${styles.dpadBtn} ${styles.right} pressable`}
          onClick={() => onDirection('right')}
          aria-label="ימינה"
        >
          ▶
        </button>
        <button
          type="button"
          className={`${styles.dpadBtn} ${styles.down} pressable`}
          onClick={() => onDirection('down')}
          aria-label="למטה"
        >
          ▼
        </button>
      </div>
    </>
  );
}
