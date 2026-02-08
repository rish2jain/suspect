// Date epoch for daily puzzle seeding (Feb 7, 2026 UTC)
export const EPOCH = Date.UTC(2026, 1, 7);

// Max allowed values
export const MAX_CLUES = 3;
export const MAX_SUSPECTS = 4;
export const MAX_GUESSES = 1; // One guess only

// Star ratings
export const STAR_RATINGS: Record<number, { stars: number; label: string }> = {
  0: { stars: 4, label: 'MASTERMIND' },
  1: { stars: 3, label: 'SHARP-EYED' },
  2: { stars: 2, label: 'PERSISTENT' },
  3: { stars: 1, label: 'THOROUGH' },
};

// Colors (Cozy Noir palette)
export const COLORS = {
  background: '#FAF8F5',
  backgroundAlt: '#E8E4DF',
  text: '#2C2420',
  action: '#1A6B5A',
  evidence: '#C4882B',
  danger: '#9B3B3B',
  success: '#5B8C5A',
} as const;

// Local storage key
export const STORAGE_KEY = 'suspect-player-v1';

// Puzzle paths
export const PUZZLE_INDEX_URL = '/puzzles/index.json';
export const DAILY_PUZZLE_PATH = '/puzzles/daily';
export const PACK_PUZZLE_PATH = '/puzzles/packs';
export const SOLUTION_PATH = '/puzzles/solutions';

// Clue type display
export const CLUE_TYPE_CONFIG: Record<string, { emoji: string; label: string }> = {
  witness: { emoji: '\u{1F441}\uFE0F', label: 'Witness Statement' },
  physical: { emoji: '\u{1F50D}', label: 'Physical Evidence' },
  contradiction: { emoji: '\u26A1', label: 'Contradiction Found' },
};

// Game URL for sharing
export const GAME_URL = 'play.suspect.game';

// Star-aware verdict headlines
export const VERDICT_HEADLINES: Record<number, string> = {
  4: 'MASTERMIND DEDUCTION!',
  3: 'SHARP WORK, DETECTIVE!',
  2: 'CASE CRACKED!',
  1: 'CASE SOLVED... BARELY.',
  0: 'CASE COLD',
};

// Streak milestone thresholds
export const STREAK_MILESTONES = [7, 14, 30, 50, 100] as const;
