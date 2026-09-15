import { LEVELS } from '../../config/levels.js';
import LevelRow from './LevelRow.jsx';
import styles from './HomeScreen.module.css';

export default function HomeScreen({ onSelectLevel, highScores }) {
  return (
    <div className={`screen ${styles.screen}`}>
      <header className={styles.hero}>
        <div className={styles.logo} aria-hidden="true">
          🚈
        </div>
        <h1 className={styles.title}>SkyTrain Chase</h1>
        <p className={styles.subtitle}>בחר/י שלב</p>
      </header>

      <ul className={styles.levelList}>
        {LEVELS.map((level) => {
          const entry = highScores.getLevelProgress(level.id);
          const stars = highScores.getStars(level);
          return (
            <LevelRow
              key={level.id}
              level={level}
              progress={entry}
              stars={stars}
              onSelect={() => entry.unlocked && onSelectLevel(level.id)}
            />
          );
        })}
      </ul>
    </div>
  );
}
