import Button from '../shared/Button.jsx';
import styles from './Modal.module.css';

export default function GameOverModal({ score, threshold, onRetry, onExit }) {
  const gap = Math.max(0, threshold - score);
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={`${styles.title} ${styles.titleLose}`}>נגמרו החיים</div>
        <div className={`${styles.scoreValue} mono`}>{score}</div>
        <div className={styles.sub}>
          {gap > 0 ? `חסרים ${gap} נקודות לסף המעבר` : 'כמעט הגעת לסף!'}
        </div>

        <Button variant="primary" onClick={onRetry}>
          נסה שוב
        </Button>
        <div className={styles.spacer} />
        <Button variant="secondary" onClick={onExit}>
          חזרה לבחירת שלב
        </Button>
      </div>
    </div>
  );
}
