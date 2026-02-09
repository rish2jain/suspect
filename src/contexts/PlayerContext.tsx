import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import type { PlayerState, PuzzleCompletion } from '../lib/types';
import { STORAGE_KEY } from '../lib/constants';
import { getTodayUTC } from '../lib/puzzleUtils';

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

type PlayerAction =
  | {
      type: 'COMPLETE_PUZZLE';
      id: string;
      correct: boolean;
      cluesUsed: number;
      timeSeconds: number;
      stars: number;
      difficulty?: number;
      hintsUsed?: number;
    }
  | { type: 'UNLOCK_ACHIEVEMENTS'; ids: string[] }
  | { type: 'UPDATE_STREAK' }
  | { type: 'TOGGLE_REDUCE_MOTION' }
  | { type: 'DISMISS_TUTORIAL' }
  | { type: 'LOAD_STATE'; state: PlayerState };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: PlayerState = {
  completedPuzzles: {},
  streak: { current: 0, max: 0, lastDailyDate: '' },
  settings: { reduceMotion: false },
  hasSeenTutorial: false,
  achievements: [],
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'COMPLETE_PUZZLE': {
      const completion: PuzzleCompletion = {
        solvedAt: new Date().toISOString(),
        correct: action.correct,
        cluesUsed: action.cluesUsed,
        timeSeconds: action.timeSeconds,
        stars: action.stars,
        difficulty: action.difficulty,
        hintsUsed: action.hintsUsed,
      };
      return {
        ...state,
        completedPuzzles: {
          ...state.completedPuzzles,
          [action.id]: completion,
        },
      };
    }

    case 'UNLOCK_ACHIEVEMENTS': {
      const newIds = action.ids.filter((id) => !state.achievements.includes(id));
      if (newIds.length === 0) return state;
      return {
        ...state,
        achievements: [...state.achievements, ...newIds],
      };
    }

    case 'UPDATE_STREAK': {
      const today = getTodayUTC();
      const { lastDailyDate, current, max } = state.streak;

      // Already updated today
      if (lastDailyDate === today) return state;

      // Check if yesterday was the last daily date (streak continues)
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const isConsecutive = lastDailyDate === yesterdayStr;
      const newCurrent = isConsecutive ? current + 1 : 1;
      const newMax = Math.max(max, newCurrent);

      return {
        ...state,
        streak: {
          current: newCurrent,
          max: newMax,
          lastDailyDate: today,
        },
      };
    }

    case 'TOGGLE_REDUCE_MOTION':
      return {
        ...state,
        settings: {
          ...state.settings,
          reduceMotion: !state.settings.reduceMotion,
        },
      };

    case 'DISMISS_TUTORIAL':
      return { ...state, hasSeenTutorial: true };

    case 'LOAD_STATE':
      return {
        ...initialState,
        ...action.state,
        achievements: action.state.achievements ?? [],
      };
  }
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): PlayerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    // Basic shape validation
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'completedPuzzles' in parsed &&
      'streak' in parsed &&
      'settings' in parsed
    ) {
      return parsed as PlayerState;
    }
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(state: PlayerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable -- silently ignore
  }
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface PlayerContextValue {
  state: PlayerState;
  completePuzzle: (
    id: string,
    correct: boolean,
    cluesUsed: number,
    timeSeconds: number,
    stars: number,
    difficulty?: number,
    hintsUsed?: number,
  ) => void;
  unlockAchievements: (ids: string[]) => void;
  updateStreak: () => void;
  isCompleted: (puzzleId: string) => boolean;
  getCompletion: (puzzleId: string) => PuzzleCompletion | undefined;
  toggleReduceMotion: () => void;
  dismissTutorial: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const isInitialised = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored !== null) {
      dispatch({ type: 'LOAD_STATE', state: stored });
    }
    isInitialised.current = true;
  }, []);

  // Debounced write to localStorage on every state change (300ms)
  useEffect(() => {
    if (!isInitialised.current) return;

    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveToStorage(state);
      saveTimerRef.current = null;
    }, 300);

    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state]);

  const completePuzzle = useCallback(
    (
      id: string,
      correct: boolean,
      cluesUsed: number,
      timeSeconds: number,
      stars: number,
      difficulty?: number,
      hintsUsed?: number,
    ) => {
      dispatch({ type: 'COMPLETE_PUZZLE', id, correct, cluesUsed, timeSeconds, stars, difficulty, hintsUsed });
    },
    [],
  );

  const unlockAchievements = useCallback(
    (ids: string[]) => {
      if (ids.length > 0) dispatch({ type: 'UNLOCK_ACHIEVEMENTS', ids });
    },
    [],
  );

  const updateStreak = useCallback(() => {
    dispatch({ type: 'UPDATE_STREAK' });
  }, []);

  const isCompleted = useCallback(
    (puzzleId: string): boolean => {
      return puzzleId in state.completedPuzzles;
    },
    [state.completedPuzzles],
  );

  const getCompletion = useCallback(
    (puzzleId: string): PuzzleCompletion | undefined => {
      return state.completedPuzzles[puzzleId];
    },
    [state.completedPuzzles],
  );

  const toggleReduceMotion = useCallback(() => {
    dispatch({ type: 'TOGGLE_REDUCE_MOTION' });
  }, []);

  const dismissTutorial = useCallback(() => {
    dispatch({ type: 'DISMISS_TUTORIAL' });
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      state,
      completePuzzle,
      unlockAchievements,
      updateStreak,
      isCompleted,
      getCompletion,
      toggleReduceMotion,
      dismissTutorial,
    }),
    [state, completePuzzle, unlockAchievements, updateStreak, isCompleted, getCompletion, toggleReduceMotion, dismissTutorial],
  );

  return <PlayerContext value={value}>{children}</PlayerContext>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (ctx === null) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return ctx;
}
