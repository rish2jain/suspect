import { memo, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { formatTime } from '../../lib/puzzleUtils';
import { ACHIEVEMENTS } from '../../lib/achievements';
import { DIFFICULTY_CONFIG } from '../../lib/constants';

interface StatsOverlayProps {
  onDismiss: () => void;
}

function StatsOverlayInner({ onDismiss }: StatsOverlayProps) {
  const { state } = usePlayer();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  const { completedPuzzles, streak } = state;
  const currentStreak = streak.current;
  const maxStreak = streak.max;

  // Compute stats from completedPuzzles
  const stats = useMemo(() => {
    const entries = Object.values(completedPuzzles);
    const total = entries.length;
    const wins = entries.filter((e) => e.correct);
    const winCount = wins.length;
    const winRate = total > 0 ? Math.round((winCount / total) * 100) : 0;
    const avgStars =
      winCount > 0
        ? Math.round((wins.reduce((sum, e) => sum + e.stars, 0) / winCount) * 10) / 10
        : 0;
    const bestTime =
      winCount > 0
        ? Math.min(...wins.map((e) => e.timeSeconds))
        : 0;

    // Difficulty breakdown (only for entries that have difficulty set)
    const diffBreakdown: Record<number, { played: number; wins: number }> = {};
    for (const entry of entries) {
      const d = entry.difficulty;
      if (d === undefined) continue;
      if (!diffBreakdown[d]) diffBreakdown[d] = { played: 0, wins: 0 };
      diffBreakdown[d].played++;
      if (entry.correct) diffBreakdown[d].wins++;
    }

    return {
      total,
      winRate,
      avgStars,
      bestTime,
      currentStreak,
      maxStreak,
      diffBreakdown,
    };
  }, [completedPuzzles, currentStreak, maxStreak]);

  // Capture previous focus and focus dialog on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    dialogRef.current?.focus();

    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Escape to dismiss
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  // Backdrop click to dismiss
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onDismiss();
    },
    [onDismiss],
  );

  return (
    <div
      className="stats-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="stats-overlay__content" ref={dialogRef} tabIndex={-1}>
        <h2 className="stats-overlay__title" id="stats-title">
          Detective Record
        </h2>

        {stats.total === 0 ? (
          <p className="stats-overlay__empty">
            No cases on file yet. Play a puzzle to start your record.
          </p>
        ) : (
          <div className="stats-overlay__grid">
            <div className="stats-overlay__stat">
              <span className="stats-overlay__value">{stats.total}</span>
              <span className="stats-overlay__label">Played</span>
            </div>
            <div className="stats-overlay__stat">
              <span className="stats-overlay__value">{stats.winRate}%</span>
              <span className="stats-overlay__label">Win Rate</span>
            </div>
            <div className="stats-overlay__stat">
              <span className="stats-overlay__value">{stats.avgStars.toFixed(1)}</span>
              <span className="stats-overlay__label">Avg Stars</span>
            </div>
            <div className="stats-overlay__stat">
              <span className="stats-overlay__value">{formatTime(stats.bestTime)}</span>
              <span className="stats-overlay__label">Best Time</span>
            </div>
            <div className="stats-overlay__stat">
              <span className="stats-overlay__value">{stats.currentStreak}</span>
              <span className="stats-overlay__label">Streak</span>
            </div>
            <div className="stats-overlay__stat">
              <span className="stats-overlay__value">{stats.maxStreak}</span>
              <span className="stats-overlay__label">Max Streak</span>
            </div>
          </div>
        )}

        {/* Difficulty breakdown */}
        {Object.keys(stats.diffBreakdown).length > 0 && (
          <>
            <h3 className="stats-overlay__subtitle">By Difficulty</h3>
            <div className="stats-overlay__difficulty-list">
              {([1, 2, 3] as const).map((d) => {
                const cfg = DIFFICULTY_CONFIG[d];
                const data = stats.diffBreakdown[d];
                if (!cfg || !data) return null;
                const rate = data.played > 0 ? Math.round((data.wins / data.played) * 100) : 0;
                return (
                  <div key={d} className="stats-overlay__difficulty-row">
                    <span className="stats-overlay__difficulty-label" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="stats-overlay__difficulty-bar-track">
                      <span
                        className="stats-overlay__difficulty-bar-fill"
                        style={{ width: `${rate}%`, backgroundColor: cfg.color }}
                      />
                    </span>
                    <span className="stats-overlay__difficulty-detail">
                      {data.wins}/{data.played} ({rate}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Achievements */}
        <h3 className="stats-overlay__subtitle">Achievements</h3>
        <div className="stats-overlay__achievements">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = state.achievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`achievement-badge${unlocked ? ' achievement-badge--unlocked' : ''}`}
                title={`${ach.name}: ${ach.description}`}
              >
                <span className="achievement-badge__icon" aria-hidden="true">
                  {ach.icon}
                </span>
                <span className="achievement-badge__name">{ach.name}</span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="btn btn-action btn-full"
          onClick={onDismiss}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export const StatsOverlay = memo(StatsOverlayInner);
