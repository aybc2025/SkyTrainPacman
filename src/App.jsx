import { useCallback, useState } from 'react';
import HomeScreen from './components/HomeScreen/HomeScreen.jsx';
import GameScreen from './components/GameScreen/GameScreen.jsx';
import { useHighScores } from './hooks/useHighScores.js';
import { getLevelById } from './config/levels.js';

export default function App() {
  const [activeLevelId, setActiveLevelId] = useState(null);
  // Bumped on every (re)start of the same level so GameScreen remounts with
  // a fresh engine instance instead of reloading the whole page — a replay
  // should feel instant, not like a browser refresh.
  const [sessionKey, setSessionKey] = useState(0);
  const highScores = useHighScores();

  const openLevel = useCallback((levelId) => {
    setActiveLevelId(levelId);
    setSessionKey((k) => k + 1);
  }, []);

  const closeLevel = useCallback(() => {
    setActiveLevelId(null);
  }, []);

  const restartLevel = useCallback(() => {
    setSessionKey((k) => k + 1);
  }, []);

  if (activeLevelId != null) {
    const level = getLevelById(activeLevelId);
    return (
      <GameScreen
        key={sessionKey}
        level={level}
        onExit={closeLevel}
        onRestart={restartLevel}
        onGoToLevel={openLevel}
        onLevelComplete={highScores.recordResult}
        getLevelProgress={highScores.getLevelProgress}
      />
    );
  }

  return <HomeScreen onSelectLevel={openLevel} highScores={highScores} />;
}
