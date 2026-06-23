import { useEffect, useRef } from 'react';
import { useAudio } from './AudioProvider';
import { useProgress } from './ProgressProvider';

/**
 * Silent background tracker — measures audio listening time and forwards
 * it to ProgressProvider so the Progress dashboard auto-updates.
 */
export function ActivityTracker() {
  const { isPlaying } = useAudio();
  const { addListeningSeconds } = useProgress();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        addListeningSeconds(5);
      }, 5000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, addListeningSeconds]);

  return null;
}
