import { useState, useEffect } from 'react';
import { getTimeUntilNextPuzzle } from '../lib/puzzleUtils';

interface UseCountdownResult {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function useCountdown(): UseCountdownResult {
  const [time, setTime] = useState(getTimeUntilNextPuzzle);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeUntilNextPuzzle());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatted = `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;

  return {
    hours: time.hours,
    minutes: time.minutes,
    seconds: time.seconds,
    formatted,
  };
}
