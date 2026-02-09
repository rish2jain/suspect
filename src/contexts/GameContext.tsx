import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { GameState, GameMode, GameStatus, Puzzle, Solution } from '../lib/types';
import { MAX_CLUES, MAX_HINTS } from '../lib/constants';

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

type GameAction =
  | { type: 'START_PUZZLE'; puzzle: Puzzle; mode: GameMode }
  | { type: 'REVEAL_CLUE'; clueId: string }
  | { type: 'REVEAL_HINT'; hintId: string }
  | { type: 'SELECT_SUSPECT'; suspectId: string }
  | { type: 'EXPAND_SUSPECT'; suspectId: string | null }
  | { type: 'MAKE_ACCUSATION' }
  | { type: 'SET_SOLUTION'; solution: Solution }
  | { type: 'RESET' };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: GameState = {
  puzzleId: '',
  mode: 'daily',
  puzzle: null,
  solution: null,
  revealedClues: [],
  revealedHints: [],
  selectedSuspect: null,
  status: 'playing',
  startedAt: 0,
  solvedAt: null,
  expandedSuspect: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_PUZZLE':
      return {
        ...initialState,
        puzzleId: action.puzzle.id,
        mode: action.mode,
        puzzle: action.puzzle,
        startedAt: Date.now(),
      };

    case 'REVEAL_CLUE': {
      if (state.status !== 'playing') return state;
      if (state.revealedClues.length >= MAX_CLUES) return state;
      if (state.revealedClues.includes(action.clueId)) return state;
      return {
        ...state,
        revealedClues: [...state.revealedClues, action.clueId],
      };
    }

    case 'REVEAL_HINT': {
      if (state.status !== 'playing') return state;
      if (state.revealedHints.length >= MAX_HINTS) return state;
      if (state.revealedHints.includes(action.hintId)) return state;
      return {
        ...state,
        revealedHints: [...state.revealedHints, action.hintId],
      };
    }

    case 'SELECT_SUSPECT': {
      if (state.status !== 'playing') return state;
      return {
        ...state,
        selectedSuspect: action.suspectId,
      };
    }

    case 'EXPAND_SUSPECT':
      return {
        ...state,
        expandedSuspect:
          state.expandedSuspect === action.suspectId ? null : action.suspectId,
      };

    case 'MAKE_ACCUSATION': {
      if (state.status !== 'playing') return state;
      if (state.selectedSuspect === null) return state;
      if (state.solution === null) return state;

      const correct = state.selectedSuspect === state.solution.culprit;
      const nextStatus: GameStatus = correct ? 'solved' : 'failed';

      return {
        ...state,
        status: nextStatus,
        solvedAt: Date.now(),
      };
    }

    case 'SET_SOLUTION':
      return {
        ...state,
        solution: action.solution,
      };

    case 'RESET':
      return { ...initialState };
  }
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  revealClue: (clueId: string) => void;
  revealHint: (hintId: string) => void;
  selectSuspect: (suspectId: string) => void;
  expandSuspect: (suspectId: string | null) => void;
  makeAccusation: () => void;
  startPuzzle: (puzzle: Puzzle, mode: GameMode) => void;
  setSolution: (solution: Solution) => void;
  resetGame: () => void;
  canRevealClue: boolean;
  canRevealHint: boolean;
  canAccuse: boolean;
  currentStars: number;
}

const GameContext = createContext<GameContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const revealClue = useCallback(
    (clueId: string) => dispatch({ type: 'REVEAL_CLUE', clueId }),
    [],
  );

  const revealHint = useCallback(
    (hintId: string) => dispatch({ type: 'REVEAL_HINT', hintId }),
    [],
  );

  const selectSuspect = useCallback(
    (suspectId: string) => dispatch({ type: 'SELECT_SUSPECT', suspectId }),
    [],
  );

  const expandSuspect = useCallback(
    (suspectId: string | null) => dispatch({ type: 'EXPAND_SUSPECT', suspectId }),
    [],
  );

  const makeAccusation = useCallback(
    () => dispatch({ type: 'MAKE_ACCUSATION' }),
    [],
  );

  const startPuzzle = useCallback(
    (puzzle: Puzzle, mode: GameMode) => dispatch({ type: 'START_PUZZLE', puzzle, mode }),
    [],
  );

  const setSolution = useCallback(
    (solution: Solution) => dispatch({ type: 'SET_SOLUTION', solution }),
    [],
  );

  const resetGame = useCallback(
    () => dispatch({ type: 'RESET' }),
    [],
  );

  const canRevealClue = state.status === 'playing' && state.revealedClues.length < MAX_CLUES;
  const canRevealHint = state.status === 'playing' && state.revealedHints.length < MAX_HINTS;
  const canAccuse = state.status === 'playing' && state.selectedSuspect !== null;
  const currentStars = MAX_CLUES + 1 - state.revealedClues.length;

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      dispatch,
      revealClue,
      revealHint,
      selectSuspect,
      expandSuspect,
      makeAccusation,
      startPuzzle,
      setSolution,
      resetGame,
      canRevealClue,
      canRevealHint,
      canAccuse,
      currentStars,
    }),
    [
      state,
      revealClue,
      revealHint,
      selectSuspect,
      expandSuspect,
      makeAccusation,
      startPuzzle,
      setSolution,
      resetGame,
      canRevealClue,
      canRevealHint,
      canAccuse,
      currentStars,
    ],
  );

  return <GameContext value={value}>{children}</GameContext>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (ctx === null) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}
