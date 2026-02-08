import { memo } from 'react';
import type { Clue } from '../../lib/types';
import { CLUE_TYPE_CONFIG } from '../../lib/constants';

interface ClueCardProps {
  clue: Clue;
  index: number;
  isRevealed: boolean;
}

function ClueCardInner({ clue, index, isRevealed }: ClueCardProps) {
  const typeConfig = CLUE_TYPE_CONFIG[clue.type];

  if (!isRevealed) {
    return (
      <div
        className="clue-card clue-card--locked"
        data-type={clue.type}
        aria-label={`Clue ${index + 1}, locked`}
      >
        <div className="clue-card__number">Clue {index + 1}</div>
        <div className="clue-card__text">
          Evidence sealed. Reveal to investigate.
        </div>
      </div>
    );
  }

  return (
    <div
      className="clue-card slide-up"
      data-type={clue.type}
      aria-label={`Clue ${index + 1}: ${typeConfig?.label ?? clue.type}`}
    >
      <div className="clue-card__number">Clue {index + 1}</div>
      <div className="clue-card__text">{clue.content}</div>
      <div className="clue-card__type">
        <span aria-hidden="true">{typeConfig?.emoji ?? ''}</span>
        {typeConfig?.label ?? clue.type}
      </div>
    </div>
  );
}

export const ClueCard = memo(ClueCardInner);
