import Button from '../shared/Button.jsx';
import styles from '../Modals/Modal.module.css';

export default function PauseOverlay({ onResume, onExit }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.title}>המשחק מושהה</div>
        <div className={styles.spacer} />
        <Button variant="primary" onClick={onResume}>
          המשך משחק
        </Button>
        <div className={styles.spacer} />
        <Button variant="secondary" onClick={onExit}>
          חזרה לבחירת שלב
        </Button>
      </div>
    </div>
  );
}
