import { memo } from 'react';
import type { GameMode } from '../../lib/types';

interface ModeSelectorProps {
  currentMode: GameMode | null;
  onSelectDaily: () => void;
  onSelectPractice: () => void;
  dailyCompleted: boolean;
  puzzleNumber: number;
}

function ModeSelectorInner({
  currentMode,
  onSelectDaily,
  onSelectPractice,
  dailyCompleted,
  puzzleNumber,
}: ModeSelectorProps) {
  const caseNumber = String(puzzleNumber).padStart(3, '0');

  return (
    <nav className="row" aria-label="Game mode" style={{ gap: 'var(--space-sm)' }}>
      <div className="mode-selector">
        <button
          type="button"
          aria-pressed={currentMode === 'daily'}
          className="mode-selector__btn"
          onClick={onSelectDaily}
        >
          Daily Mystery
          {dailyCompleted && (
            <span aria-label="Completed" style={{ marginLeft: '2px' }}>
              &#10003;
            </span>
          )}
        </button>

        <button
          type="button"
          aria-pressed={currentMode === 'practice'}
          className="mode-selector__btn"
          onClick={onSelectPractice}
        >
          Practice
        </button>
      </div>

      {currentMode === 'daily' && puzzleNumber > 0 && (
        <span className="badge mode-selector__badge" aria-label={`Case number ${caseNumber}`}>
          Case #{caseNumber}
        </span>
      )}
    </nav>
  );
}

export const ModeSelector = memo(ModeSelectorInner);
