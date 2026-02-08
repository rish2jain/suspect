import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTimerResult {
  seconds: number;
  start: () => void;
  stop: () => void;
  isRunning: boolean;
}

export function useTimer(): UseTimerResult {
  const [seconds, setSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    startTimeRef.current = Date.now();
    setSeconds(0);
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(elapsed);
    }, 1000);
  }, [clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    // Capture final elapsed time precisely
    if (startTimeRef.current > 0) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(elapsed);
    }
    setIsRunning(false);
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { seconds, start, stop, isRunning };
}
