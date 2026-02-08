import { memo, useMemo } from 'react';
import type { GameMode, Solution, Suspect, ShareData, SuspectOutcome } from '../../lib/types';
import { calculateStars, getRatingLabel, formatTime } from '../../lib/puzzleUtils';
import { VERDICT_HEADLINES, STREAK_MILESTONES } from '../../lib/constants';
import { useCountdown } from '../../hooks/useCountdown';
import { StarsDisplay } from '../game/StarsDisplay';
import { ShareButton } from './ShareButton';

interface ResultScreenProps {
  correct: boolean;
  solution: Solution;
  suspects: Suspect[];
  cluesUsed: number;
  timeSeconds: number;
  puzzleNumber: number;
  puzzleTitle: string;
  genre: string;
  mode: GameMode;
  streak: number;
  suspectOutcomes: SuspectOutcome[];
  onPlayAgain?: () => void;
  onNextPuzzle?: () => void;
}

function CountdownSection() {
  const { formatted } = useCountdown();

  return (
    <div className="countdown-timer" role="timer" aria-label="Countdown to next daily puzzle">
      <span className="countdown-timer__label">Next daily puzzle in</span>
      <span className="countdown-timer__number" aria-hidden="true">
        {formatted}
      </span>
      <span className="visually-hidden">{formatted}</span>
    </div>
  );
}

function ResultScreenInner({
  correct,
  solution,
  suspects,
  cluesUsed,
  timeSeconds,
  puzzleNumber,
  puzzleTitle,
  genre,
  mode,
  streak,
  suspectOutcomes,
  onPlayAgain,
  onNextPuzzle,
}: ResultScreenProps) {
  const stars = correct ? calculateStars(cluesUsed) : 0;
  const rating = correct ? getRatingLabel(cluesUsed) : 'UNSOLVED';
  const formattedTime = formatTime(timeSeconds);

  // Star-aware verdict headline
  const verdictText = correct
    ? VERDICT_HEADLINES[stars] ?? 'CASE SOLVED!'
    : VERDICT_HEADLINES[0] ?? 'CASE COLD';

  // Find culprit name for wrong-answer reveal
  const culpritName = useMemo(() => {
    const culprit = suspects.find((s) => s.id === solution.culprit);
    return culprit?.name ?? 'Unknown';
  }, [suspects, solution.culprit]);

  // Check for streak milestone
  const streakMilestone = useMemo(() => {
    if (!correct || mode !== 'daily') return null;
    return STREAK_MILESTONES.find((m) => streak === m) ?? null;
  }, [correct, mode, streak]);

  const shareData: ShareData = {
    puzzleNumber,
    title: puzzleTitle,
    stars,
    cluesUsed,
    timeSeconds,
    rating,
    mode,
    genre,
    suspectOutcomes,
  };

  return (
    <section className="result-screen" aria-labelledby="result-verdict">
      {/* Verdict */}
      <h2
        id="result-verdict"
        tabIndex={-1}
        className={`result-screen__verdict ${
          correct
            ? 'result-screen__verdict--correct'
            : 'result-screen__verdict--wrong'
        }`}
      >
        {verdictText}
      </h2>

      {/* Wrong-answer culprit reveal */}
      {!correct && (
        <div className="result-screen__culprit-reveal">
          The real culprit was
          <span className="result-screen__culprit-name">{culpritName}</span>
        </div>
      )}

      {/* Solution explanation */}
      <p className="result-screen__case-summary">{solution.explanation}</p>

      <div className="result-screen__divider" />

      {/* Stats grid */}
      <div className="result-screen__stats" role="group" aria-label="Game statistics">
        <div className="result-screen__stat">
          <div className="result-screen__stat-value">
            <StarsDisplay filled={stars} total={4} size="lg" />
          </div>
          <span className="result-screen__stat-label">Stars</span>
        </div>

        <div className="result-screen__stat">
          <span className="result-screen__stat-value">{formattedTime}</span>
          <span className="result-screen__stat-label">Time</span>
        </div>

        <div className="result-screen__stat">
          <span className="result-screen__stat-value">
            {cluesUsed} / 3
          </span>
          <span className="result-screen__stat-label">Clues Used</span>
        </div>
      </div>

      {/* Detective rating badge */}
      <span className={`badge badge--rating ${correct ? 'badge--rating-correct' : 'badge--rating-wrong'}`}>
        {rating}
      </span>

      {/* Streak milestone celebration */}
      {streakMilestone !== null && (
        <div className="streak-milestone">
          <span aria-hidden="true">{'\u{1F525}'}</span>
          {streakMilestone}-day streak!
        </div>
      )}

      <div className="result-screen__divider" />

      {/* Fun fact */}
      {solution.funFact && (
        <div className="card fun-fact-card">
          <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>
            <strong>Did you know?</strong>
          </p>
          <p className="text-sm">{solution.funFact}</p>
        </div>
      )}

      {/* Share button */}
      <div className="share-container">
        <ShareButton shareData={shareData} />
      </div>

      {/* Countdown or action buttons */}
      <div className="result-screen__actions">
        {mode === 'daily' && <CountdownSection />}

        {mode === 'practice' && onPlayAgain && (
          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={onPlayAgain}
          >
            Play Again
          </button>
        )}

        {mode === 'practice' && onNextPuzzle && (
          <button
            type="button"
            className="btn btn-action btn-full"
            onClick={onNextPuzzle}
          >
            Next Puzzle
          </button>
        )}
      </div>
    </section>
  );
}

export const ResultScreen = memo(ResultScreenInner);
