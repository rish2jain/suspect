// ---------------------------------------------------------------------------
// Puzzle data types
// ---------------------------------------------------------------------------

export interface Suspect {
  id: string;
  name: string;
  role: string;
  motive: string;
  alibi: string;
}

export type ClueType = 'witness' | 'physical' | 'contradiction';

export interface Clue {
  id: string;
  type: ClueType;
  title: string;
  content: string;
  order: number;
}

export interface Hint {
  id: string;
  text: string;
  order: number;
}

export interface Puzzle {
  id: string;
  version: number;
  genre: string;
  difficulty: number;
  title: string;
  setting: string;
  premise: string;
  suspects: Suspect[];
  clues: Clue[];
  hints?: Hint[];
}

export interface Solution {
  culprit: string;
  explanation: string;
  funFact: string;
}

export interface PackMeta {
  id: string;
  name: string;
  genre: string;
  emoji: string;
  puzzles: string[];
}

export interface PuzzleIndex {
  daily: string[];
  packs: PackMeta[];
  difficulties?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Game state types
// ---------------------------------------------------------------------------

export type GameMode = 'daily' | 'practice';
export type GameStatus = 'playing' | 'solved' | 'failed';

export interface GameState {
  puzzleId: string;
  mode: GameMode;
  puzzle: Puzzle | null;
  solution: Solution | null;
  revealedClues: string[];
  revealedHints: string[];
  selectedSuspect: string | null;
  status: GameStatus;
  startedAt: number;
  solvedAt: number | null;
  expandedSuspect: string | null;
}

// ---------------------------------------------------------------------------
// Player persistent state
// ---------------------------------------------------------------------------

export interface PuzzleCompletion {
  solvedAt: string;
  correct: boolean;
  cluesUsed: number;
  timeSeconds: number;
  stars: number;
  difficulty?: number;
  hintsUsed?: number;
}

export interface Streak {
  current: number;
  max: number;
  lastDailyDate: string;
}

export interface PlayerState {
  completedPuzzles: Record<string, PuzzleCompletion>;
  streak: Streak;
  settings: {
    reduceMotion: boolean;
  };
  hasSeenTutorial: boolean;
  achievements: string[];
}

// ---------------------------------------------------------------------------
// Share card types
// ---------------------------------------------------------------------------

export interface ShareData {
  puzzleNumber: number;
  title: string;
  stars: number;
  cluesUsed: number;
  timeSeconds: number;
  rating: string;
  mode: GameMode;
  genre: string;
  suspectOutcomes?: SuspectOutcome[];
}

export interface SuspectOutcome {
  id: string;
  status: 'accused' | 'cleared' | 'untouched';
}
