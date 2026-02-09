# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint across all src/
npm run preview      # Preview production build locally
npx tsc --noEmit     # Type check only (no build)
```

There are no tests configured. Validation is done via `tsc --noEmit` + `eslint`.

## Architecture

SUSPECT is a daily micro-mystery browser game. Players read 4 suspects' alibis, optionally reveal up to 3 clues (costs stars) and 2 free hints (no star cost), then identify the liar. Fewer clues = more stars (4 max). Puzzles have difficulty ratings (Easy/Medium/Hard). 10 achievement badges reward milestones. One daily puzzle for everyone (UTC seeded), plus weekly practice packs.

### Data Flow

```
index.json ─→ useDaily() ─→ App.tsx (loads puzzle) ─→ PuzzleView (gameplay)
                                                          │
                                                   on accusation
                                                          │
                                                   fetchSolution() ─→ ResultScreen
```

**Anti-cheat**: Solution JSON is fetched only when the player confirms their accusation, never on puzzle load. This keeps the answer out of browser memory during gameplay.

### Two Contexts, Two Lifecycles

- **GameContext** (`useGame()`): Per-puzzle session state. Resets on each `START_PUZZLE`. Manages revealed clues, revealed hints, selected suspect, game status (playing/solved/failed), expand/collapse state. Uses `useReducer` with 8 action types (including `REVEAL_HINT`).
- **PlayerContext** (`usePlayer()`): Persists across sessions via localStorage (`suspect-player-v1`). Tracks completed puzzles (with difficulty + hints used), streak, achievements, reduce-motion setting. Debounced 300ms writes.

These are split so clue reveals don't re-render streak-dependent components.

### Daily Puzzle Selection

```
dailyIndex = daysSince(EPOCH, nowUTC) % dailyPool.length
EPOCH = Feb 7, 2026 UTC
```

Everyone plays the same puzzle regardless of timezone. Countdown displays in local time.

### Puzzle Data

Puzzles are static JSON in `/public/puzzles/` (not bundled into JS), fetched on demand:
- `index.json` — daily pool IDs + pack metadata + `difficulties` map (puzzle ID → 1/2/3)
- `daily/{id}.json` — 30 daily puzzles
- `packs/{id}.json` — 15 practice pack puzzles (3 packs)
- `solutions/{id}.json` — 45 solution files (separate for anti-cheat)

Each puzzle has exactly 4 suspects, 3 clues (ordered by `order` field), and 2 hints (free, no star cost). The liar has exactly one objectively falsifiable claim. Clue types: `witness`, `physical`, `contradiction`. Hint types: generic direction (h1) and specific nudge (h2).

### Component Ownership

**PuzzleView** owns the full game lifecycle: start timer, read alibis, reveal clues/hints, select suspect, confirm accusation, fetch solution, check achievements, record completion, render ResultScreen + AchievementToast. App.tsx just handles puzzle loading and mode routing.

**App.tsx** manages view state (home/loading/playing/error), auto-loads daily puzzle on mount, renders PuzzleView or practice pack list.

### Styling

Vanilla CSS with custom properties in `src/styles/global.css` (1700+ lines). "Cozy Noir" palette:
- Background: `#FAF8F5`, Text: `#2C2420`, Action/CTA: `#1A6B5A`, Evidence: `#C4882B`, Danger: `#9B3B3B`
- System font stack (zero custom fonts)
- 44px minimum touch targets, WCAG AA contrast
- `prefers-reduced-motion` support

CSS classes follow BEM-like naming: `.suspect-card__alibi`, `.result-screen__verdict--correct`, `.clue-card[data-type="witness"]`.

## Key Conventions

- **TypeScript strict mode** with `verbatimModuleSyntax` — use `import type` for type-only imports
- **React 19** — uses `<Context value={}>` pattern (not `.Provider`)
- **No external state libraries** — Context + useReducer only
- **No CSS framework** — vanilla CSS + custom properties
- **Memo pattern**: Leaf components use `memo(InnerComponent)` with a named export
- **Context pattern**: Provider + `use*` hook co-located in same file (eslint override in `eslint.config.js` allows this)
- **Performance budget**: <80KB gzipped JS (~77KB currently)
- **Star scoring**: 0 clues = 4 stars (MASTERMIND), 1 = 3 (SHARP-EYED), 2 = 2 (PERSISTENT), 3 = 1 (THOROUGH) — all positive ratings

## Adding Puzzles

New puzzles need 3 files: `daily/{id}.json` or `packs/{id}.json`, `solutions/{id}.json`, and a reference in `index.json`. Constraints:
- Exactly 4 suspects, 3 clues with contiguous `order` values (1-3)
- 2 hints per puzzle (`hints` array: `{ id, text, order }`) — generic direction + specific nudge
- `difficulty` field (1=Easy, 2=Medium, 3=Hard) — add to `index.json` `difficulties` map too
- 40-word max per alibi, standardized lengths (no length-as-tell)
- `solution.culprit` must reference a valid suspect ID
- Liar has exactly one objectively falsifiable claim
- No outside knowledge required
