import { memo, useCallback } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';

interface HeaderProps {
  onHelpClick?: () => void;
  onStatsClick?: () => void;
}

function HeaderInner({ onHelpClick, onStatsClick }: HeaderProps) {
  const { state, toggleReduceMotion } = usePlayer();
  const streak = state.streak.current;

  const handleSettingsClick = useCallback(() => {
    toggleReduceMotion();
  }, [toggleReduceMotion]);

  return (
    <header className="game-header" role="banner">
      <h1 className="game-header__logo">
        <span>S</span>USPECT
      </h1>

      <div className="game-header__actions">
        {streak > 0 && (
          <span
            className="badge badge--streak"
            data-intensity={streak >= 30 ? 'max' : streak >= 14 ? 'high' : streak >= 7 ? 'mid' : undefined}
            aria-label={`${streak} day streak`}
          >
            <span aria-hidden="true">{'\u{1F525}'}</span>
            {streak}
          </span>
        )}

        {onHelpClick && (
          <button
            type="button"
            className="game-header__icon-btn"
            onClick={onHelpClick}
            aria-label="How to play"
            title="How to play"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="8.5" />
              <path d="M7.5 7.5a2.5 2.5 0 0 1 4.7 1.2c0 1.7-2.5 2.3-2.5 2.3" />
              <circle cx="10" cy="14.5" r="0.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
        )}

        {onStatsClick && (
          <button
            type="button"
            className="game-header__icon-btn"
            onClick={onStatsClick}
            aria-label="Your stats"
            title="Your stats"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="10" width="4" height="8" rx="1" />
              <rect x="8" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="2" width="4" height="16" rx="1" />
            </svg>
          </button>
        )}

        <button
          type="button"
          className="game-header__icon-btn"
          onClick={handleSettingsClick}
          aria-label={
            state.settings.reduceMotion
              ? 'Enable animations'
              : 'Reduce motion'
          }
          title={
            state.settings.reduceMotion
              ? 'Enable animations'
              : 'Reduce motion'
          }
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="3" />
            <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M4 16l1.4-1.4M14.6 5.4L16 4" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export const Header = memo(HeaderInner);
