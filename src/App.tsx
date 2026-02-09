import { useState, useEffect, useCallback, useRef } from 'react';
import { GameProvider, useGame } from './contexts/GameContext';
import { PlayerProvider, usePlayer } from './contexts/PlayerContext';
import { useDaily } from './hooks/useDaily';
import { Header } from './components/layout/Header';
import { ModeSelector } from './components/layout/ModeSelector';
import { PuzzleView } from './components/game/PuzzleView';
import { PuzzleSkeleton } from './components/ui/PuzzleSkeleton';
import { TutorialOverlay } from './components/onboarding/TutorialOverlay';
import { StatsOverlay } from './components/layout/StatsOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  fetchPuzzle,
  fetchPuzzleIndex,
  isDailyCompleted,
} from './lib/puzzleUtils';
import type { GameMode, PuzzleIndex, PackMeta } from './lib/types';

// ---------------------------------------------------------------------------
// View type for simple app-level routing
// ---------------------------------------------------------------------------

type AppView = 'home' | 'playing' | 'loading' | 'error';

// ---------------------------------------------------------------------------
// Inner app component (uses contexts)
// ---------------------------------------------------------------------------

function AppInner() {
  const { dailyPuzzleId, puzzleNumber, isLoading: isDailyLoading, error: dailyError } = useDaily();
  const { state: gameState, startPuzzle, resetGame } = useGame();
  const { state: playerState, isCompleted, getCompletion, dismissTutorial } = usePlayer();

  const [view, setView] = useState<AppView>('home');
  const [currentMode, setCurrentMode] = useState<GameMode>('daily');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [puzzleIndex, setPuzzleIndex] = useState<PuzzleIndex | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const initialLoadDone = useRef(false);

  // Track whether the daily puzzle is already completed
  const dailyCompleted = dailyPuzzleId !== null && isDailyCompleted(playerState.completedPuzzles, dailyPuzzleId);

  // Apply reduce-motion preference to the document
  useEffect(() => {
    if (playerState.settings.reduceMotion) {
      document.documentElement.style.setProperty('--transition-fast', '0.01ms');
      document.documentElement.style.setProperty('--transition-base', '0.01ms');
      document.documentElement.style.setProperty('--transition-slow', '0.01ms');
    } else {
      document.documentElement.style.removeProperty('--transition-fast');
      document.documentElement.style.removeProperty('--transition-base');
      document.documentElement.style.removeProperty('--transition-slow');
    }
  }, [playerState.settings.reduceMotion]);

  // Load puzzle index for practice mode browsing
  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const idx = await fetchPuzzleIndex();
        if (!cancelled) setPuzzleIndex(idx);
      } catch {
        // Non-critical: practice mode just won't be available
      }
    }
    void loadIndex();
    return () => { cancelled = true; };
  }, []);

  // Handle loading a puzzle by ID and mode
  // NOTE: Only fetches the puzzle data here. Solution is fetched by PuzzleView
  // on accusation to preserve anti-cheat (solution not in memory until guess).
  const loadPuzzle = useCallback(async (puzzleId: string, mode: GameMode) => {
    setView('loading');
    setLoadError(null);

    try {
      const puzzle = await fetchPuzzle(puzzleId, mode);
      startPuzzle(puzzle, mode);
      setView('playing');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load puzzle');
      setView('error');
    }
  }, [startPuzzle]);

  // Select daily mode
  const handleSelectDaily = useCallback(() => {
    setCurrentMode('daily');
    if (dailyPuzzleId !== null) {
      void loadPuzzle(dailyPuzzleId, 'daily');
    }
  }, [dailyPuzzleId, loadPuzzle]);

  // Select practice mode
  const handleSelectPractice = useCallback(() => {
    setCurrentMode('practice');
    resetGame();
    setView('home');
  }, [resetGame]);

  // Select a specific practice puzzle
  const handleSelectPracticePuzzle = useCallback((puzzleId: string) => {
    setCurrentMode('practice');
    void loadPuzzle(puzzleId, 'practice');
  }, [loadPuzzle]);

  // Find the next unsolved puzzle in the same pack as the current puzzle
  const findNextPuzzleInPack = useCallback((currentPuzzleId: string): string | null => {
    if (!puzzleIndex) return null;

    for (const pack of puzzleIndex.packs) {
      const idx = pack.puzzles.indexOf(currentPuzzleId);
      if (idx === -1) continue;

      // Look for the next unsolved puzzle after current index (wrapping around)
      for (let offset = 1; offset <= pack.puzzles.length; offset++) {
        const nextIdx = (idx + offset) % pack.puzzles.length;
        const nextId = pack.puzzles[nextIdx];
        if (!isCompleted(nextId)) return nextId;
      }

      // All completed in this pack - return null to go back to list
      return null;
    }

    return null;
  }, [puzzleIndex, isCompleted]);

  // Auto-load daily puzzle on first render when ready.
  // loadPuzzle triggers setState internally (setView, etc.) which the lint rule flags,
  // but this is a legitimate data-fetch-on-mount pattern.
  useEffect(() => {
    if (!isDailyLoading && dailyPuzzleId !== null && !initialLoadDone.current) {
      initialLoadDone.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadPuzzle(dailyPuzzleId, 'daily');
    }
  }, [isDailyLoading, dailyPuzzleId, loadPuzzle]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderPracticeList() {
    if (puzzleIndex === null) {
      return <p className="text-muted text-center">Loading practice puzzles...</p>;
    }

    if (puzzleIndex.packs.length === 0) {
      return <p className="text-muted text-center">No practice packs available yet.</p>;
    }

    return (
      <div className="stack">
        {puzzleIndex.packs.map((pack: PackMeta) => {
          const completedCount = pack.puzzles.filter((pid) => isCompleted(pid)).length;

          return (
            <div key={pack.id} className="card">
              <h3>
                <span aria-hidden="true">{pack.emoji} </span>{pack.name}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <p className="text-sm text-muted">
                  {pack.genre} - {pack.puzzles.length} puzzles
                </p>
                <span className="text-sm text-muted">
                  {completedCount} / {pack.puzzles.length}
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="progress-bar"
                style={{ marginBottom: 'var(--space-md)' }}
                role="progressbar"
                aria-valuenow={completedCount}
                aria-valuemin={0}
                aria-valuemax={pack.puzzles.length}
                aria-label={`${completedCount} of ${pack.puzzles.length} puzzles completed`}
              >
                <div
                  className="progress-bar__fill"
                  style={{ width: `${(completedCount / pack.puzzles.length) * 100}%` }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {pack.puzzles.map((pid: string, idx: number) => {
                  const completed = isCompleted(pid);
                  const completion = completed ? getCompletion(pid) : undefined;
                  return (
                    <button
                      key={pid}
                      type="button"
                      className={`btn ${completed ? 'btn-ghost' : 'btn-action'}`}
                      onClick={() => handleSelectPracticePuzzle(pid)}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      Puzzle {idx + 1}
                      {completed && (
                        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {completion?.stars !== undefined && (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-evidence)' }}>
                              {'\u2B50'.repeat(completion.stars)}
                            </span>
                          )}
                          {'\u2713'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderGameContent() {
    if (gameState.puzzle === null) return null;

    return (
      <PuzzleView
        puzzle={gameState.puzzle}
        mode={gameState.mode}
        puzzleNumber={puzzleNumber}
        onPlayAgain={
          gameState.mode === 'practice'
            ? () => { void loadPuzzle(gameState.puzzleId, 'practice'); }
            : undefined
        }
        onNextPuzzle={
          gameState.mode === 'practice'
            ? () => {
                const nextId = findNextPuzzleInPack(gameState.puzzleId);
                if (nextId) {
                  void loadPuzzle(nextId, 'practice');
                } else {
                  resetGame();
                  setView('home');
                }
              }
            : undefined
        }
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div data-reduce-motion={playerState.settings.reduceMotion ? 'true' : undefined}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header
        onHelpClick={() => setShowHelp(true)}
        onStatsClick={() => setShowStats(true)}
      />

      <main className="container" id="main-content">
        {/* Mode selector */}
        {!isDailyLoading && (
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <ModeSelector
              currentMode={currentMode}
              onSelectDaily={handleSelectDaily}
              onSelectPractice={handleSelectPractice}
              dailyCompleted={dailyCompleted}
              puzzleNumber={puzzleNumber}
            />
          </div>
        )}

        {/* Daily loading state */}
        {isDailyLoading && <PuzzleSkeleton />}

        {/* Daily error */}
        {dailyError !== null && (
          <div className="card" role="alert" style={{ textAlign: 'center' }}>
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
              {dailyError}
            </p>
          </div>
        )}

        {/* View: loading puzzle */}
        {view === 'loading' && <PuzzleSkeleton />}

        {/* View: error loading puzzle */}
        {view === 'error' && loadError !== null && (
          <div className="card" role="alert" style={{ textAlign: 'center' }}>
            <p className="text-sm" style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>
              {loadError}
            </p>
            {currentMode === 'daily' && dailyPuzzleId !== null && (
              <button
                type="button"
                className="btn btn-action"
                style={{ marginBottom: 'var(--space-sm)' }}
                onClick={() => void loadPuzzle(dailyPuzzleId, 'daily')}
              >
                Retry
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (currentMode === 'daily') setCurrentMode('practice');
                setView('home');
              }}
            >
              {currentMode === 'daily' ? 'Try Practice Mode' : 'Back'}
            </button>
          </div>
        )}

        {/* View: home (practice puzzle list) */}
        {view === 'home' && currentMode === 'practice' && renderPracticeList()}

        {/* View: playing */}
        {view === 'playing' && renderGameContent()}
      </main>

      {/* Tutorial overlay for first-time users (delayed until puzzle loads) */}
      {!playerState.hasSeenTutorial && view === 'playing' && <TutorialOverlay onDismiss={dismissTutorial} />}

      {/* Tutorial re-access via help button (single-page summary) */}
      {showHelp && playerState.hasSeenTutorial && (
        <TutorialOverlay onDismiss={() => setShowHelp(false)} variant="summary" />
      )}

      {/* Stats overlay */}
      {showStats && <StatsOverlay onDismiss={() => setShowStats(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App with providers
// ---------------------------------------------------------------------------

function App() {
  return (
    <ErrorBoundary>
      <PlayerProvider>
        <GameProvider>
          <AppInner />
        </GameProvider>
      </PlayerProvider>
    </ErrorBoundary>
  );
}

export default App;
