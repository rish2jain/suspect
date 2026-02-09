import type { PlayerState, PuzzleCompletion } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-case',
    name: 'Case Opened',
    description: 'Solve your first puzzle',
    icon: '\u{1F4CB}',
  },
  {
    id: 'mastermind',
    name: 'Mastermind',
    description: 'Solve with 4 stars (0 clues)',
    icon: '\u{1F9E0}',
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Solve in under 60 seconds',
    icon: '\u26A1',
  },
  {
    id: 'no-stone-unturned',
    name: 'No Stone Unturned',
    description: 'Use all 3 clues and still solve correctly',
    icon: '\u{1F50E}',
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    description: '7-day streak',
    icon: '\u{1F525}',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Solve 10 puzzles',
    icon: '\u{1F396}\uFE0F',
  },
  {
    id: 'hint-free',
    name: 'No Hints Needed',
    description: 'Solve without using any hints',
    icon: '\u{1F4AA}',
  },
  {
    id: 'hard-boiled',
    name: 'Hard Boiled',
    description: '4 stars on a Hard puzzle',
    icon: '\u{1F3AF}',
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    description: '30-day streak',
    icon: '\u{1F451}',
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Complete an entire practice pack',
    icon: '\u{1F3C6}',
  },
];

interface CompletionInfo {
  correct: boolean;
  cluesUsed: number;
  timeSeconds: number;
  stars: number;
  difficulty?: number;
  hintsUsed?: number;
}

export function checkAchievements(
  state: PlayerState,
  justCompleted: CompletionInfo,
  packPuzzleLists?: string[][],
): string[] {
  const unlocked = state.achievements;
  const newlyUnlocked: string[] = [];

  function tryUnlock(id: string) {
    if (!unlocked.includes(id) && !newlyUnlocked.includes(id)) {
      newlyUnlocked.push(id);
    }
  }

  const totalCorrect = Object.values(state.completedPuzzles).filter(
    (c: PuzzleCompletion) => c.correct,
  ).length;

  // first-case: just solved any puzzle correctly
  if (justCompleted.correct && totalCorrect >= 1) {
    tryUnlock('first-case');
  }

  // mastermind: 4 stars (0 clues used)
  if (justCompleted.correct && justCompleted.stars === 4) {
    tryUnlock('mastermind');
  }

  // speed-demon: under 60 seconds
  if (justCompleted.correct && justCompleted.timeSeconds < 60) {
    tryUnlock('speed-demon');
  }

  // no-stone-unturned: all 3 clues and still correct
  if (justCompleted.correct && justCompleted.cluesUsed === 3) {
    tryUnlock('no-stone-unturned');
  }

  // perfect-week: 7-day streak
  if (state.streak.current >= 7 || state.streak.max >= 7) {
    tryUnlock('perfect-week');
  }

  // veteran: 10 total correct solves
  if (totalCorrect >= 10) {
    tryUnlock('veteran');
  }

  // hint-free: solve without hints
  if (justCompleted.correct && (justCompleted.hintsUsed === 0 || justCompleted.hintsUsed === undefined)) {
    tryUnlock('hint-free');
  }

  // hard-boiled: 4 stars on a hard (difficulty 3) puzzle
  if (justCompleted.correct && justCompleted.stars === 4 && justCompleted.difficulty === 3) {
    tryUnlock('hard-boiled');
  }

  // streak-master: 30-day streak
  if (state.streak.current >= 30 || state.streak.max >= 30) {
    tryUnlock('streak-master');
  }

  // completionist: entire practice pack completed
  if (packPuzzleLists) {
    for (const packPuzzles of packPuzzleLists) {
      const allDone = packPuzzles.every(
        (pid) => state.completedPuzzles[pid]?.correct,
      );
      if (allDone) {
        tryUnlock('completionist');
        break;
      }
    }
  }

  return newlyUnlocked;
}
