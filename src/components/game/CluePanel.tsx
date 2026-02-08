import { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { Clue } from '../../lib/types';
import { ClueCard } from './ClueCard';
import { StarsDisplay } from './StarsDisplay';

interface CluePanelProps {
  clues: Clue[];
  revealedClues: string[];
  onRevealClue: (clueId: string) => void;
  canReveal: boolean;
  currentStars: number;
}

const ARMED_DISMISS_MS = 3000;

function CluePanelInner({
  clues,
  revealedClues,
  onRevealClue,
  canReveal,
  currentStars,
}: CluePanelProps) {
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedClues = useMemo(
    () => [...clues].sort((a, b) => a.order - b.order),
    [clues],
  );

  const nextUnrevealedClue = useMemo(
    () => sortedClues.find((c) => !revealedClues.includes(c.id)) ?? null,
    [sortedClues, revealedClues],
  );

  const revealedCount = revealedClues.length;

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return clearDismissTimer;
  }, [clearDismissTimer]);

  // Clear the dismiss timer when the next unrevealed clue changes
  // (e.g. after a successful reveal). No need to reset pendingRevealId
  // here because isArmed already checks pendingRevealId === nextUnrevealedClue?.id,
  // so a stale pendingRevealId is naturally ignored.
  useEffect(() => {
    clearDismissTimer();
  }, [nextUnrevealedClue?.id, clearDismissTimer]);

  const handleRevealClick = useCallback(() => {
    if (nextUnrevealedClue === null) return;

    if (pendingRevealId === nextUnrevealedClue.id) {
      // Second click: confirm reveal
      clearDismissTimer();
      setPendingRevealId(null);
      onRevealClue(nextUnrevealedClue.id);
    } else {
      // First click: arm the button
      clearDismissTimer();
      setPendingRevealId(nextUnrevealedClue.id);
      dismissTimerRef.current = setTimeout(() => {
        setPendingRevealId(null);
        dismissTimerRef.current = null;
      }, ARMED_DISMISS_MS);
    }
  }, [nextUnrevealedClue, pendingRevealId, clearDismissTimer, onRevealClue]);

  const isArmed = pendingRevealId !== null && pendingRevealId === nextUnrevealedClue?.id;

  return (
    <section aria-label="Clues" className="stack">
      <div className="row row--between">
        <h3>Evidence</h3>
        <StarsDisplay filled={currentStars} total={4} size="sm" />
      </div>

      <div className="stack--sm">
        {sortedClues.map((clue, idx) => (
          <ClueCard
            key={clue.id}
            clue={clue}
            index={idx}
            isRevealed={revealedClues.includes(clue.id)}
          />
        ))}
      </div>

      {canReveal && nextUnrevealedClue !== null && (
        <button
          className={`btn btn-evidence btn-full${isArmed ? ' btn-evidence--armed' : ''}`}
          onClick={handleRevealClick}
          type="button"
          aria-label={
            isArmed
              ? `Tap again to reveal clue ${revealedCount + 1}. This costs 1 star.`
              : `Reveal clue ${revealedCount + 1}. Your score will drop from ${currentStars} to ${currentStars - 1} stars.`
          }
        >
          {isArmed
            ? 'Tap again to reveal (costs 1 star)'
            : <>Reveal Clue {revealedCount + 1} ({'\u2B50'} {currentStars} {'\u2192'} {currentStars - 1})</>
          }
        </button>
      )}

      {!canReveal && revealedClues.length > 0 && (
        <p className="text-sm text-muted text-center">
          All available clues have been revealed.
        </p>
      )}
    </section>
  );
}

export const CluePanel = memo(CluePanelInner);
