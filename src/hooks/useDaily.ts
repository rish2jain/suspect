import { useState, useEffect } from 'react';
import { fetchPuzzleIndex, getDailyPuzzleIndex, getDailyPuzzleNumber } from '../lib/puzzleUtils';

interface UseDailyResult {
  dailyPuzzleId: string | null;
  puzzleNumber: number;
  isLoading: boolean;
  error: string | null;
}

export function useDaily(): UseDailyResult {
  const [dailyPuzzleId, setDailyPuzzleId] = useState<string | null>(null);
  const [puzzleNumber, setPuzzleNumber] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDaily() {
      try {
        setIsLoading(true);
        setError(null);

        const index = await fetchPuzzleIndex();
        if (cancelled) return;

        const pool = index.daily;
        if (pool.length === 0) {
          setError('No daily puzzles available');
          setIsLoading(false);
          return;
        }

        const dayIndex = getDailyPuzzleIndex(pool.length);
        const id = pool[dayIndex];
        const number = getDailyPuzzleNumber();

        setDailyPuzzleId(id);
        setPuzzleNumber(number);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load daily puzzle');
        setIsLoading(false);
      }
    }

    void loadDaily();

    return () => {
      cancelled = true;
    };
  }, []);

  return { dailyPuzzleId, puzzleNumber, isLoading, error };
}
