import { memo, useRef, useCallback, useState } from 'react';
import type { Suspect } from '../../lib/types';

interface SuspectCardProps {
  suspect: Suspect;
  isExpanded: boolean;
  isSelected: boolean;
  isCleared: boolean;
  onExpand: () => void;
  onSelect: () => void;
  onClear: () => void;
  disabled: boolean;
  suspectIndex: number;
  instructionsId?: string;
}

const LONG_PRESS_MS = 500;

function SuspectCardInner({
  suspect,
  isExpanded,
  isSelected,
  isCleared,
  onExpand,
  onSelect,
  onClear,
  disabled,
  suspectIndex,
  instructionsId,
}: SuspectCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const [pressing, setPressing] = useState(false);

  const initial = suspect.name.charAt(0).toUpperCase();

  const classNames = [
    'suspect-card',
    isExpanded && 'expanded',
    isCleared && 'cleared',
    isSelected && 'selected',
  ]
    .filter(Boolean)
    .join(' ');

  // --- Long-press handling (touch + mouse) ---

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setPressing(false);
  }, []);

  const handlePointerDown = useCallback(() => {
    if (disabled) return;
    didLongPress.current = false;
    setPressing(true);
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPressing(false);
      onClear();
    }, LONG_PRESS_MS);
  }, [disabled, onClear]);

  const handlePointerUp = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handlePointerLeave = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  // Suppress native context menu during long-press
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // --- Click handling ---

  const handleHeaderClick = useCallback(() => {
    if (disabled) return;
    // Ignore click if it was a long-press
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onExpand();
  }, [disabled, onExpand]);

  // --- Double-click to toggle cleared ---

  const handleDoubleClick = useCallback(() => {
    if (disabled) return;
    onClear();
  }, [disabled, onClear]);

  // --- Keyboard support ---

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onExpand();
      }
      // 's' key to select suspect
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (!isCleared) {
          onSelect();
        }
      }
      // 'c' key to toggle cleared
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onClear();
      }
    },
    [disabled, onExpand, onSelect, onClear, isCleared],
  );

  const ariaLabel = `${suspect.name}, ${suspect.role}${isCleared ? ', cleared' : ''}${isSelected ? ', selected for accusation' : ''}`;

  return (
    <div
      className={classNames}
      aria-disabled={disabled || undefined}
      onContextMenu={handleContextMenu}
    >
      {/* Long-press progress indicator */}
      {pressing && !disabled && (
        <span className="suspect-card__press-ring" aria-hidden="true">
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeDasharray="100.53"
              strokeDashoffset="100.53"
              className="suspect-card__press-ring-fill"
            />
          </svg>
        </span>
      )}

      {/* Header button -- the sole interactive expand/collapse trigger */}
      <button
        className="suspect-card__header"
        type="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isExpanded}
        aria-label={ariaLabel}
        aria-describedby={instructionsId}
        onClick={handleHeaderClick}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        {/* Avatar */}
        <div className={`suspect-card__avatar suspect-card__avatar--${suspectIndex % 4}`} aria-hidden="true">
          {initial}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="suspect-card__name">{suspect.name}</div>
          <div className="suspect-card__role">{suspect.role}</div>
        </div>

        {/* Chevron */}
        <svg
          className="suspect-card__chevron"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Expandable alibi section -- grid-based animation */}
      <div className="suspect-card__body">
        {isExpanded && (
          <div className="suspect-card__alibi">
            <p>{suspect.alibi}</p>
            {!disabled && (
              <div className="suspect-card__alibi-actions">
                {!isCleared && (
                  <button
                    className="btn btn-action"
                    onClick={onSelect}
                    type="button"
                  >
                    {isSelected ? 'Selected' : 'Select Suspect'}
                  </button>
                )}
                <button
                  className={`btn btn-ghost${isCleared ? ' btn-action' : ''}`}
                  onClick={onClear}
                  type="button"
                  style={isCleared ? { backgroundColor: 'transparent', color: 'var(--color-action)' } : undefined}
                >
                  {isCleared ? 'Unclear' : 'Clear'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const SuspectCard = memo(SuspectCardInner);
