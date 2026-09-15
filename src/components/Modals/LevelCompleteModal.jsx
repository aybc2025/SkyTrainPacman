import Button from '../shared/Button.jsx';
import styles from './Modal.module.css';

export default function LevelCompleteModal({ score, previousHighScore, isNewHighScore, hasNextLevel, onNext, onReplay, onExit }) {
  return (
    <div className={styles.overlay}>
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
      </div>
    </div>
  );
}
