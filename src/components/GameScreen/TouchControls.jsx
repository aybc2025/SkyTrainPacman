import { useRef } from 'react';
import styles from './TouchControls.module.css';

const SWIPE_THRESHOLD = 24; // px — minimum drag distance to register as a swipe

export default function TouchControls({ onDirection }) {
  const touchStartRef = useRef(null);
  const firedRef = useRef(false);

  function handleTouchStart(e) {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    firedRef.current = false;
  }

  // Fire the instant the drag crosses the threshold, rather than waiting for
  // the finger to lift — waiting for touchend means every swipe input lands
  // a full gesture-duration late, which is the main reason directional input
  // can feel sluggish on touch. Still only ever fires once per gesture.
  function handleTouchMove(e) {
    const start = touchStartRef.current;
    if (!start || firedRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

    firedRef.current = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      onDirection(dx > 0 ? 'right' : 'left');
    } else {
      onDirection(dy > 0 ? 'down' : 'up');
    }
  }

  function handleTouchEnd() {
    touchStartRef.current = null;
    firedRef.current = false;
  }

  return (
    <>
      {/* Invisible swipe-capture layer sits over the maze via GameScreen's
          layout; TouchControls only supplies the handlers + the D-pad UI. */}
      <div
        className={styles.swipeLayer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
