import { memo, useMemo, useCallback } from 'react';
import type { Hint } from '../../lib/types';
import { MAX_HINTS } from '../../lib/constants';

interface HintPanelProps {
  hints: Hint[];
  revealedHints: string[];
  onRevealHint: (hintId: string) => void;
  canReveal: boolean;
}

function HintPanelInner({
  hints,
  revealedHints,
  onRevealHint,
  canReveal,
}: HintPanelProps) {
  const sortedHints = useMemo(
    () => [...hints].sort((a, b) => a.order - b.order),
    [hints],
  );

  const nextUnrevealedHint = useMemo(
    () => sortedHints.find((h) => !revealedHints.includes(h.id)) ?? null,
    [sortedHints, revealedHints],
  );

  const handleReveal = useCallback(() => {
    if (nextUnrevealedHint) onRevealHint(nextUnrevealedHint.id);
  }, [nextUnrevealedHint, onRevealHint]);

  // Graceful degradation: render nothing if no hints exist
  if (hints.length === 0) return null;

  const revealedCount = revealedHints.length;
  const maxHints = Math.min(hints.length, MAX_HINTS);

  return (
    <div className="hint-panel" aria-label="Free Hints">
      <div className="hint-panel__header">
        <span className="hint-panel__title">Free Hints</span>
        <span className="hint-panel__count">
          {revealedCount}/{maxHints}
        </span>
      </div>

      <div className="hint-panel__list">
        {sortedHints.slice(0, maxHints).map((hint) => {
          const isRevealed = revealedHints.includes(hint.id);
          return (
            <div
              key={hint.id}
              className={`hint-card${isRevealed ? ' hint-card--revealed' : ''}`}
            >
              {isRevealed ? (
                <p className="hint-card__text">{hint.text}</p>
              ) : (
                <p className="hint-card__locked">Hint locked</p>
              )}
            </div>
          );
        })}
      </div>

      {canReveal && nextUnrevealedHint !== null && (
        <button
          className="btn btn-hint btn-full"
          onClick={handleReveal}
          type="button"
          aria-label={`Reveal free hint ${revealedCount + 1} of ${maxHints}`}
        >
          Get Free Hint ({revealedCount + 1}/{maxHints})
        </button>
      )}

      {!canReveal && revealedCount > 0 && revealedCount >= maxHints && (
        <p className="text-sm text-muted text-center">
          All hints revealed. Try the evidence clues below.
        </p>
      )}
    </div>
  );
}

export const HintPanel = memo(HintPanelInner);
