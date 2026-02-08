import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { Puzzle, GameMode, SuspectOutcome } from '../../lib/types';
import {
  fetchSolution,
  formatTime,
  calculateStars,
} from '../../lib/puzzleUtils';
import { useGame } from '../../contexts/GameContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { useTimer } from '../../hooks/useTimer';
import { fireConfetti } from '../../lib/confetti';
import { SuspectCard } from './SuspectCard';
import { CluePanel } from './CluePanel';
import { StarsDisplay } from './StarsDisplay';
import { AccusationOverlay } from './AccusationOverlay';
import { ResultScreen } from '../share/ResultScreen';

interface PuzzleViewProps {
  puzzle: Puzzle;
  mode: GameMode;
  puzzleNumber: number;
  onPlayAgain?: () => void;
  onNextPuzzle?: () => void;
}

const VERDICT_DELAY_MS = 2200;

export function PuzzleView({ puzzle, mode, puzzleNumber, onPlayAgain, onNextPuzzle }: PuzzleViewProps) {
  const {
    state,
    startPuzzle,
    expandSuspect,
    selectSuspect,
    revealClue,
    setSolution,
    makeAccusation,
    canRevealClue,
    canAccuse,
    currentStars,
  } = useGame();

  const { state: playerState, completePuzzle, updateStreak } = usePlayer();
  const timer = useTimer();

  const [showOverlay, setShowOverlay] = useState(false);
  const [clearedSuspects, setClearedSuspects] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetchingSolution, setIsFetchingSolution] = useState(false);
  const [verdictPending, setVerdictPending] = useState(false);
  const [cluePulse, setCluePulse] = useState(false);
  const cluePulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (cluePulseTimer.current) clearTimeout(cluePulseTimer.current);
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

          completePuzzle(puzzle.id, correct, capturedCluesUsed, timeSeconds, stars);

          if (mode === 'daily' && correct) {
            updateStreak();
          }

          // Fire confetti on correct guess
          if (correct) {
            fireConfetti();
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
    setSolution,
    makeAccusation,
    timer,
    state.revealedClues.length,
    state.selectedSuspect,
    completePuzzle,
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
      const heading = document.getElementById('result-verdict');
      if (heading) heading.focus();
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
        </div>
        <h2 className="scenario-banner__title">{puzzle.title}</h2>
        <p className="scenario-banner__description">{puzzle.premise}</p>
      </div>

      <div className="game-layout">
        {/* Streak-at-risk banner for daily mode */}
        {mode === 'daily' && streak >= 3 && (
          <div className="streak-banner">
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
        />

        <hr className="divider" />

        {/* Accuse button */}
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
    </div>
  );
}
