import { memo, useCallback } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';

function HeaderInner() {
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
          <span className="badge badge--evidence" aria-label={`${streak} day streak`}>
            {streak}
          </span>
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
