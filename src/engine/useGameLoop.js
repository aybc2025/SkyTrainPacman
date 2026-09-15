import { useEffect, useRef } from 'react';

// Generic requestAnimationFrame loop. Calls onTick(deltaMs) every frame while
// active is true. Knows nothing about mazes, trains, or scoring — any app
// using rAF-driven updates could reuse this unchanged.
export function useGameLoop(onTick, active) {
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!active) {
      lastTimeRef.current = null;
      return undefined;
    }

    function frame(time) {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;
      onTickRef.current(delta);
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active]);
}
