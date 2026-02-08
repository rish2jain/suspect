import {
  EPOCH,
  STAR_RATINGS,
  PUZZLE_INDEX_URL,
  DAILY_PUZZLE_PATH,
  PACK_PUZZLE_PATH,
  SOLUTION_PATH,
} from './constants';
import type { Puzzle, Solution, PuzzleIndex, ShareData, PuzzleCompletion, SuspectOutcome } from './types';

/**
 * Get the daily puzzle index based on UTC date.
 * Wraps around the pool using modular arithmetic so it never exceeds bounds.
 */
export function getDailyPuzzleIndex(poolSize: number): number {
  const now = Date.now();
  const daysSinceEpoch = Math.floor((now - EPOCH) / 86_400_000);
  return ((daysSinceEpoch % poolSize) + poolSize) % poolSize;
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC).
 */
export function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get the puzzle number (days since epoch + 1).
 */
export function getDailyPuzzleNumber(): number {
  const now = Date.now();
  return Math.floor((now - EPOCH) / 86_400_000) + 1;
}

/**
 * Calculate time remaining until next daily puzzle (UTC midnight).
 */
export function getTimeUntilNextPuzzle(): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const diff = tomorrow.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

/**
 * Calculate stars from clues used (fewer clues = more stars).
 */
export function calculateStars(cluesUsed: number): number {
  return STAR_RATINGS[cluesUsed]?.stars ?? 1;
}

/**
 * Get the detective rating label from the number of clues used.
 */
export function getRatingLabel(cluesUsed: number): string {
  return STAR_RATINGS[cluesUsed]?.label ?? 'THOROUGH';
}

/**
 * Format seconds into M:SS display.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Fetch the puzzle index manifest.
 */
export async function fetchPuzzleIndex(): Promise<PuzzleIndex> {
  const res = await fetch(PUZZLE_INDEX_URL);
  if (!res.ok) throw new Error('Failed to load puzzle index');
  return res.json() as Promise<PuzzleIndex>;
}

/**
 * Fetch a puzzle by ID and mode.
 */
export async function fetchPuzzle(
  id: string,
  mode: 'daily' | 'practice',
): Promise<Puzzle> {
  const basePath = mode === 'daily' ? DAILY_PUZZLE_PATH : PACK_PUZZLE_PATH;
  const res = await fetch(`${basePath}/${id}.json`);
  if (!res.ok) throw new Error(`Failed to load puzzle: ${id}`);
  return res.json() as Promise<Puzzle>;
}

/**
 * Fetch and decode a solution. Supports raw JSON or base64-encoded payloads.
 */
export async function fetchSolution(id: string): Promise<Solution> {
  const res = await fetch(`${SOLUTION_PATH}/${id}.json`);
  if (!res.ok) throw new Error(`Failed to load solution: ${id}`);
  const data: unknown = await res.json();
  // Solution may be base64 encoded
  if (typeof data === 'string') {
    return JSON.parse(atob(data)) as Solution;
  }
  return data as Solution;
}

/**
 * Build a suspect outcome grid line for the share card.
 * Shows accused/cleared/untouched status per suspect.
 */
function buildSuspectGrid(outcomes?: SuspectOutcome[]): string {
  if (!outcomes || outcomes.length === 0) return '';
  return outcomes
    .map((o) => {
      switch (o.status) {
        case 'accused': return '\u{1F534}';  // red circle
        case 'cleared': return '\u2716';       // X mark
        default: return '\u26AA';              // gray circle
      }
    })
    .join('');
}

/**
 * Generate spoiler-free share text for social posting.
 * Compact format with deduction grid and CTA.
 */
export function generateShareText(data: ShareData): string {
  const starDisplay =
    '\u2B50'.repeat(data.stars) + '\u25CB'.repeat(4 - data.stars);
  const clueDisplay =
    '\u25A0'.repeat(data.cluesUsed) + '\u25A1'.repeat(3 - data.cluesUsed);

  const suspectGrid = buildSuspectGrid(data.suspectOutcomes);
  const timeEmoji = data.timeSeconds < 60 ? '\u26A1' : '';

  const lines = [
    `SUSPECT #${String(data.puzzleNumber).padStart(3, '0')} \u{1F50E}`,
    '',
    ...(suspectGrid ? [suspectGrid] : []),
    `${starDisplay} ${data.rating}`,
    '',
    `Clues ${clueDisplay} | ${formatTime(data.timeSeconds)}${timeEmoji}`,
    '',
    'Can you crack the case?',
    'play.suspect.game',
  ];
  return lines.join('\n');
}

/**
 * Check if a daily puzzle is already completed today.
 */
export function isDailyCompleted(
  completedPuzzles: Record<string, PuzzleCompletion>,
  puzzleId: string,
): boolean {
  const completion = completedPuzzles[puzzleId];
  if (!completion) return false;
  return completion.solvedAt.split('T')[0] === getTodayUTC();
}
