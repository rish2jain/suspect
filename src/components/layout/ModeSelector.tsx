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
    <nav className="row" aria-label="Game mode">
      <button
        type="button"
        aria-pressed={currentMode === 'daily'}
        className={`btn ${currentMode === 'daily' ? 'btn-action' : 'btn-ghost'}`}
        onClick={onSelectDaily}
      >
        Daily Mystery
        {dailyCompleted && (
          <span aria-label="Completed" style={{ marginLeft: '4px' }}>
            &#10003;
          </span>
        )}
      </button>

      <button
        type="button"
        aria-pressed={currentMode === 'practice'}
        className={`btn ${currentMode === 'practice' ? 'btn-action' : 'btn-ghost'}`}
        onClick={onSelectPractice}
      >
        Practice
      </button>

      {currentMode === 'daily' && puzzleNumber > 0 && (
        <span className="badge" aria-label={`Case number ${caseNumber}`}>
          Case #{caseNumber}
        </span>
      )}
    </nav>
  );
}

export const ModeSelector = memo(ModeSelectorInner);
