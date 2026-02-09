import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { Puzzle, GameMode, SuspectOutcome } from '../../lib/types';
import {
  fetchSolution,
  formatTime,
  calculateStars,
  getDifficultyLabel,
} from '../../lib/puzzleUtils';
import { DIFFICULTY_CONFIG } from '../../lib/constants';
import { useGame } from '../../contexts/GameContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { useTimer } from '../../hooks/useTimer';
import { fireConfetti } from '../../lib/confetti';
import { checkAchievements, ACHIEVEMENTS } from '../../lib/achievements';
import { SuspectCard } from './SuspectCard';
import { CluePanel } from './CluePanel';
import { StarsDisplay } from './StarsDisplay';
import { AccusationOverlay } from './AccusationOverlay';
import { AchievementToast } from '../ui/AchievementToast';
import { ResultScreen } from '../share/ResultScreen';

interface PuzzleViewProps {
  puzzle: Puzzle;
  mode: GameMode;
  puzzleNumber: number;
  onPlayAgain?: () => void;
  onNextPuzzle?: () => void;
  packPuzzleLists?: string[][];
}

const VERDICT_DELAY_MS = 2200;

export function PuzzleView({ puzzle, mode, puzzleNumber, onPlayAgain, onNextPuzzle, packPuzzleLists }: PuzzleViewProps) {
  const {
    state,
    startPuzzle,
    expandSuspect,
    selectSuspect,
    revealClue,
    revealHint,
    setSolution,
    makeAccusation,
    canRevealClue,
    canRevealHint,
    canAccuse,
    currentStars,
  } = useGame();

  const { state: playerState, completePuzzle, unlockAchievements, updateStreak } = usePlayer();
  const timer = useTimer();

  const [showOverlay, setShowOverlay] = useState(false);
  const [clearedSuspects, setClearedSuspects] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetchingSolution, setIsFetchingSolution] = useState(false);
  const [verdictPending, setVerdictPending] = useState(false);
  const [cluePulse, setCluePulse] = useState(false);
  const [showOnboardingHint, setShowOnboardingHint] = useState(false);
  const [achievementQueue, setAchievementQueue] = useState<string[]>([]);
  const cluePulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasExpandedRef = useRef(false);

  const streak = playerState.streak.current;

  // --- Initialize puzzle on mount ---
  useEffect(() => {
    startPuzzle(puzzle, mode);
    timer.start();
    setClearedSuspects(new Set());
    setShowOverlay(false);
    setFetchError(null);
    setVerdictPending(false);
    setCluePulse(false);
    hasExpandedRef.current = false;
    if (cluePulseTimer.current) clearTimeout(cluePulseTimer.current);

    // Show onboarding hint for first-time players (haven't expanded a card yet)
    const completedCount = Object.keys(playerState.completedPuzzles).length;
    setShowOnboardingHint(completedCount === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  // Clean up clue pulse timer on unmount
  useEffect(() => {
    return () => {
      if (cluePulseTimer.current) clearTimeout(cluePulseTimer.current);
    };
  }, []);

  // --- Suspect interaction handlers ---

  const handleExpandSuspect = useCallback(
    (suspectId: string) => {
      expandSuspect(suspectId);
      // Dismiss onboarding hint after first expand
      if (!hasExpandedRef.current) {
        hasExpandedRef.current = true;
        setShowOnboardingHint(false);
      }
    },
    [expandSuspect],
  );

  const handleSelectSuspect = useCallback(
    (suspectId: string) => {
      selectSuspect(suspectId);
    },
    [selectSuspect],
  );

  const handleClearSuspect = useCallback((suspectId: string) => {
    setClearedSuspects((prev) => {
      const next = new Set(prev);
      if (next.has(suspectId)) {
        next.delete(suspectId);
      } else {
        next.add(suspectId);
      }
      return next;
    });
  }, []);

  // --- Clue handlers ---

  const handleRevealClue = useCallback(
    (clueId: string) => {
      revealClue(clueId);
      // Trigger visual pulse on suspect cards to draw attention
      setCluePulse(true);
      if (cluePulseTimer.current) clearTimeout(cluePulseTimer.current);
      cluePulseTimer.current = setTimeout(() => setCluePulse(false), 3000);
    },
    [revealClue],
  );

  // --- Accusation flow ---

  const handleAccuseClick = useCallback(() => {
    if (!canAccuse) return;
    setShowOverlay(true);
  }, [canAccuse]);

  const handleCancelAccusation = useCallback(() => {
    setShowOverlay(false);
  }, []);

  const handleConfirmAccusation = useCallback(async () => {
    // Capture values before async operation to avoid stale closure reads
    const capturedSuspect = state.selectedSuspect;
    const capturedCluesUsed = state.revealedClues.length;

    setShowOverlay(false);
    setIsFetchingSolution(true);
    setFetchError(null);

    try {
      const solution = await fetchSolution(puzzle.id);
      setSolution(solution);

      // Show deliberation screen before revealing result
      setIsFetchingSolution(false);
      setVerdictPending(true);

      setTimeout(() => {
        requestAnimationFrame(() => {
          makeAccusation();
          timer.stop();

          const stars = calculateStars(capturedCluesUsed);
          const timeSeconds = timer.seconds;
          const correct = capturedSuspect === solution.culprit;
          const hintsUsed = state.revealedHints.length;

          completePuzzle(puzzle.id, correct, capturedCluesUsed, timeSeconds, stars, puzzle.difficulty, hintsUsed);

          if (mode === 'daily' && correct) {
            updateStreak();
          }

          // Fire confetti on correct guess
          if (correct) {
            fireConfetti();
          }

          // Check for new achievements
          const newAchievements = checkAchievements(
            playerState,
            { correct, cluesUsed: capturedCluesUsed, timeSeconds, stars, difficulty: puzzle.difficulty, hintsUsed },
            packPuzzleLists,
          );
          if (newAchievements.length > 0) {
            unlockAchievements(newAchievements);
            setAchievementQueue(newAchievements);
          }

          setVerdictPending(false);
        });
      }, VERDICT_DELAY_MS);
    } catch {
      setFetchError('Failed to verify your accusation. Please try again.');
      setIsFetchingSolution(false);
    }
  }, [
    puzzle.id,
    puzzle.difficulty,
    setSolution,
    makeAccusation,
    timer,
    state.revealedClues.length,
    state.revealedHints.length,
    state.selectedSuspect,
    completePuzzle,
    unlockAchievements,
    playerState,
    packPuzzleLists,
    mode,
    updateStreak,
  ]);

  // --- Derived values ---

  const selectedSuspectName = useMemo(() => {
    if (!state.selectedSuspect) return '';
    return (
      puzzle.suspects.find((s) => s.id === state.selectedSuspect)?.name ?? ''
    );
  }, [state.selectedSuspect, puzzle.suspects]);

  const isGameOver = state.status === 'solved' || state.status === 'failed';
  const isCorrect = state.status === 'solved';

  // Focus management: move focus to verdict heading when result appears
  useEffect(() => {
    if (isGameOver && !verdictPending) {
      requestAnimationFrame(() => {
        const heading = document.getElementById('result-verdict');
        if (heading) heading.focus();
      });
    }
  }, [isGameOver, verdictPending]);

  const finalTime = useMemo(() => {
    if (state.solvedAt && state.startedAt) {
      return Math.floor((state.solvedAt - state.startedAt) / 1000);
    }
    return timer.seconds;
  }, [state.solvedAt, state.startedAt, timer.seconds]);

  // Build suspect outcomes for share card deduction grid
  const suspectOutcomes: SuspectOutcome[] = useMemo(() => {
    return puzzle.suspects.map((s) => ({
      id: s.id,
      status: s.id === state.selectedSuspect
        ? 'accused' as const
        : clearedSuspects.has(s.id)
          ? 'cleared' as const
          : 'untouched' as const,
    }));
  }, [puzzle.suspects, state.selectedSuspect, clearedSuspects]);

  // Streak intensity for visual scaling
  const streakIntensity = streak >= 14 ? 'max' : streak >= 7 ? 'high' : undefined;

  // --- Render: Deliberation screen (verdict delay) ---

  if (verdictPending) {
    return (
      <div className="container">
        <div className="deliberation-screen" role="status" aria-live="polite">
          <div className="deliberation-screen__icon" aria-hidden="true">
            {'\u{1F50E}'}
          </div>
          <div className="deliberation-screen__text">
            Analyzing evidence...
          </div>
          <div className="deliberation-screen__dots" aria-hidden="true">
            <span className="deliberation-screen__dot" />
            <span className="deliberation-screen__dot" />
            <span className="deliberation-screen__dot" />
          </div>
        </div>
      </div>
    );
  }

  // --- Render: Result screen ---

  if (isGameOver && state.solution) {
    return (
      <div className="container">
        <ResultScreen
          correct={isCorrect}
          solution={state.solution}
          suspects={puzzle.suspects}
          cluesUsed={state.revealedClues.length}
          timeSeconds={finalTime}
          puzzleNumber={puzzleNumber}
          puzzleTitle={puzzle.title}
          genre={puzzle.genre}
          mode={mode}
          streak={streak}
          suspectOutcomes={suspectOutcomes}
          onPlayAgain={onPlayAgain}
          onNextPuzzle={onNextPuzzle}
        />

        {/* Achievement toast */}
        {achievementQueue.length > 0 && (() => {
          const def = ACHIEVEMENTS.find((a) => a.id === achievementQueue[0]);
          if (!def) return null;
          return (
            <AchievementToast
              key={def.id}
              achievement={def}
              onDismiss={() => setAchievementQueue((q) => q.slice(1))}
            />
          );
        })()}
      </div>
    );
  }

  // --- Render: Active game ---

  return (
    <div className="container">
      {/* Scenario banner */}
      <div className="scenario-banner">
        <div className="scenario-banner__case-number">
          Case #{String(puzzleNumber).padStart(3, '0')} {mode === 'practice' ? '(Practice)' : ''}
          {puzzle.difficulty > 0 && (
            <span
              className={`badge--difficulty badge--difficulty-${puzzle.difficulty}`}
              style={{ color: DIFFICULTY_CONFIG[puzzle.difficulty]?.color }}
            >
              {getDifficultyLabel(puzzle.difficulty)}
            </span>
          )}
        </div>
        <h2 className="scenario-banner__title">{puzzle.title}</h2>
        <p className="scenario-banner__description">{puzzle.premise}</p>
      </div>

      <div className="game-layout">
        {/* Streak-at-risk banner for daily mode */}
        {mode === 'daily' && streak >= 3 && (
          <div className="streak-banner" data-intensity={streakIntensity}>
            <span className="streak-banner__icon" aria-hidden="true">{'\u{1F525}'}</span>
            Day {streak} streak on the line
          </div>
        )}

        {/* Timer + Stars bar */}
        <div className="row row--between">
          <span className="text-sm text-muted" aria-label={`Elapsed time: ${formatTime(timer.seconds)}`}>
            {formatTime(timer.seconds)}
          </span>
          <StarsDisplay filled={currentStars} total={4} size="sm" />
        </div>

        {/* Suspects section */}
        <section aria-label="Suspects">
          <h3 className="section-heading">Suspects</h3>

          {/* Shared keyboard instructions for screen readers */}
          <p id="suspect-instructions" className="visually-hidden">
            Press Enter to read alibi, S to select suspect, C to toggle cleared.
          </p>

          <p className="keyboard-hint" aria-hidden="true">
            <kbd>Enter</kbd> read &middot; <kbd>S</kbd> select &middot; <kbd>C</kbd> clear
          </p>

          {/* Onboarding hint for first-time players */}
          {showOnboardingHint && (
            <div className="onboarding-hint">
              <span aria-hidden="true">{'\u{1F449}'}</span>
              Tap a suspect to read their alibi
              <button
                className="onboarding-hint__dismiss"
                onClick={() => setShowOnboardingHint(false)}
                type="button"
                aria-label="Dismiss hint"
              >
                {'\u2715'}
              </button>
            </div>
          )}

          <div className={`suspect-list${cluePulse ? ' suspect-list--clue-pulse' : ''}`}>
            {puzzle.suspects.map((suspect, idx) => (
              <SuspectCard
                key={suspect.id}
                suspect={suspect}
                suspectIndex={idx}
                isExpanded={state.expandedSuspect === suspect.id}
                isSelected={state.selectedSuspect === suspect.id}
                isCleared={clearedSuspects.has(suspect.id)}
                onExpand={() => handleExpandSuspect(suspect.id)}
                onSelect={() => handleSelectSuspect(suspect.id)}
                onClear={() => handleClearSuspect(suspect.id)}
                disabled={isGameOver}
                instructionsId="suspect-instructions"
              />
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* Clue panel */}
        <CluePanel
          clues={puzzle.clues}
          revealedClues={state.revealedClues}
          onRevealClue={handleRevealClue}
          canReveal={canRevealClue}
          currentStars={currentStars}
          hints={puzzle.hints}
          revealedHints={state.revealedHints}
          onRevealHint={revealHint}
          canRevealHint={canRevealHint}
        />

        <hr className="divider" />

        {/* Accuse button */}
        {canAccuse && (
          <p className="text-sm text-muted text-center" style={{ marginBottom: 'var(--space-sm)' }}>
            You get one guess per puzzle. Choose carefully.
          </p>
        )}
        <button
          className="btn btn-accuse btn-full"
          disabled={!canAccuse || isFetchingSolution}
          onClick={handleAccuseClick}
          type="button"
        >
          {isFetchingSolution ? 'Verifying...' : `Accuse ${selectedSuspectName || 'Suspect'}`}
        </button>

        {fetchError && (
          <div role="alert" className="text-center">
            <p className="text-sm" style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-sm)' }}>
              {fetchError}
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleConfirmAccusation}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Accusation confirmation overlay */}
      {showOverlay && selectedSuspectName && (
        <AccusationOverlay
          suspectName={selectedSuspectName}
          onConfirm={handleConfirmAccusation}
          onCancel={handleCancelAccusation}
        />
      )}

      {/* Achievement toast */}
      {achievementQueue.length > 0 && (() => {
        const def = ACHIEVEMENTS.find((a) => a.id === achievementQueue[0]);
        if (!def) return null;
        return (
          <AchievementToast
            key={def.id}
            achievement={def}
            onDismiss={() => setAchievementQueue((q) => q.slice(1))}
          />
        );
      })()}
    </div>
  );
}
