import { useEffect, useRef } from 'react';
import { useMazeEngine } from '../../engine/useMazeEngine.js';
import Hud from './Hud.jsx';
import MazeCanvas from './MazeCanvas.jsx';
import TouchControls from './TouchControls.jsx';
import PauseOverlay from './PauseOverlay.jsx';
import LevelCompleteModal from '../Modals/LevelCompleteModal.jsx';
import GameOverModal from '../Modals/GameOverModal.jsx';
import styles from './GameScreen.module.css';

const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right'
};

export default function GameScreen({ level, onExit, onRestart, onGoToLevel, onLevelComplete, getLevelProgress }) {
  const engine = useMazeEngine(level);

  // Keyboard support (desktop testing / anyone with a keyboard attached).
  useEffect(() => {
    function handleKeyDown(e) {
      const direction = KEY_TO_DIRECTION[e.key];
      if (direction) {
        e.preventDefault();
        engine.requestDirection(direction);
      } else if (e.key === 'Escape') {
        if (engine.phase === 'playing') {
          engine.pause();
        } else {
          engine.resume();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase]);

  // Snapshot the pre-write high score the instant the round resolves, before
  // onLevelComplete overwrites stored progress — reading getLevelProgress
  // fresh after that write would always show the score that just landed
  // (see CLAUDE.md "Intentional decisions": this ref exists specifically to
  // avoid comparing a score against itself).
  const resultSnapshotRef = useRef(null);
  useEffect(() => {
    if ((engine.phase === 'won' || engine.phase === 'lost') && resultSnapshotRef.current === null) {
      resultSnapshotRef.current = {
        previousHighScore: getLevelProgress(level.id).highScore
      };
      onLevelComplete(level.id, engine.score, engine.phase === 'won');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase]);

  const previousHighScore = resultSnapshotRef.current?.previousHighScore ?? 0;
  const nextLevelExists = level.id < 5;

  return (
    <div className={`screen ${styles.screen}`}>
      <Hud
        level={level}
        score={engine.score}
        threshold={engine.threshold}
        lives={engine.lives}
        maxLives={engine.maxLives}
        onPause={engine.pause}
        powerMode={engine.powerMode}
      />

      <div className={styles.mazeWrap}>
        <MazeCanvas
          grid={engine.grid}
          player={engine.player}
          trains={engine.trains}
          powerMode={engine.powerMode}
          lastEvent={engine.lastEvent}
        />
        {(engine.phase === 'playing' || engine.phase === 'ready') && (
          <TouchControls onDirection={engine.requestDirection} />
        )}

        {engine.phase === 'paused' && <PauseOverlay onResume={engine.resume} onExit={onExit} />}

        {engine.phase === 'won' && (
          <LevelCompleteModal
            score={engine.score}
            previousHighScore={previousHighScore}
            isNewHighScore={engine.score > previousHighScore}
            hasNextLevel={nextLevelExists}
            onNext={() => onGoToLevel(level.id + 1)}
            onReplay={onRestart}
            onExit={onExit}
          />
        )}

        {engine.phase === 'lost' && (
          <GameOverModal
            score={engine.score}
            threshold={engine.threshold}
            onRetry={onRestart}
            onExit={onExit}
          />
        )}
      </div>

      <footer className={styles.footer}>
        <span className={styles.hint}>גררו כדי לנוע · ⏸ להשהיה</span>
      </footer>
    </div>
  );
}
