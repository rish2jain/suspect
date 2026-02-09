# SUSPECT

A daily micro-mystery deduction game. One case per day, plus weekly genre packs. Read suspects' alibis, reveal clues, and identify the liar. Built for the browser — no login, no install, ~2 minutes per puzzle.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
```

## How It Works

Each puzzle presents 4 suspects with alibis. One suspect is lying — their alibi contains exactly one objectively falsifiable claim. Players can guess immediately (4 stars) or reveal up to 3 progressive clues to narrow it down. Fewer clues = higher score.

| Clues Used | Stars | Rating |
|-----------|-------|--------|
| 0 | 4 | MASTERMIND |
| 1 | 3 | SHARP-EYED |
| 2 | 2 | PERSISTENT |
| 3 | 1 | THOROUGH |

Each puzzle also includes 2 free hints that guide the player's thinking without costing stars. Puzzles are tagged with difficulty levels (Easy, Medium, Hard).

## Features

- **Daily Mystery**: Same puzzle for everyone, UTC midnight reset
- **Practice Packs**: 3 genre packs (15 puzzles), self-paced with progress tracking
- **Free Hints**: 2 strategic hints per puzzle at no star cost — teaches deduction skills
- **Difficulty Ratings**: Easy, Medium, Hard labels on every puzzle
- **Share Cards**: Text and image share with star rating, time, and deduction grid
- **Streaks**: Daily streak tracking with milestone badges at 7/14/30 days
- **Achievements**: 10 badges (Mastermind, Speed Demon, Hard Boiled, Completionist, etc.)
- **Detective Record**: Stats overlay with win rate, best time, difficulty breakdown, achievements
- **Tutorial**: First-time player onboarding with interactive walkthrough
- **Accessibility**: WCAG AA contrast, keyboard navigation, screen reader support, reduce-motion toggle

## Stack

- Vite + React 19 + TypeScript (strict)
- Vanilla CSS with custom properties ("Cozy Noir" palette)
- System font stack (zero custom fonts)
- Static JSON puzzles in `/public/` (not bundled)
- Context + useReducer (no external state libraries)
- localStorage persistence (`suspect-player-v1`)

## Scripts

```bash
npm run dev       # Dev server with HMR
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Project Structure

```
public/puzzles/
  index.json              Daily pool + pack metadata + difficulty map
  daily/*.json            30 daily puzzles
  packs/*.json            15 practice pack puzzles (3 packs)
  solutions/*.json        45 solution files (separate for anti-cheat)

src/
  lib/                    Types, constants, utility functions, achievements
  contexts/               GameContext (session) + PlayerContext (persistent)
  hooks/                  useDaily, useTimer, useCountdown
  components/
    game/                 SuspectCard, ClueCard, CluePanel, HintPanel, PuzzleView
    layout/               Header, ModeSelector, StatsOverlay
    share/                ShareButton, ResultScreen
    ui/                   AchievementToast, PuzzleSkeleton
    onboarding/           TutorialOverlay (first-time walkthrough)
  styles/global.css       Complete design system (~1900 lines)
```

## Adding Puzzles

Each puzzle needs 3 files:
1. `public/puzzles/daily/{id}.json` or `public/puzzles/packs/{id}.json`
2. `public/puzzles/solutions/{id}.json`
3. Reference in `public/puzzles/index.json`

Constraints:
- Exactly 4 suspects, 3 clues with `order` values 1-3
- 2 hints per puzzle (`hints` array with `id`, `text`, `order`)
- `difficulty` value (1=Easy, 2=Medium, 3=Hard) — also mirrored in `index.json` `difficulties` map
- 40-word max per alibi, standardized lengths across suspects
- Liar has exactly one objectively falsifiable claim
- All honest alibis internally consistent
- No outside knowledge required
- `solution.culprit` must reference a valid suspect ID

## Deploy

```bash
npx vercel
```

## Performance

~77KB gzipped JS + ~9KB CSS (budget: <80KB JS gzipped). No custom fonts, no CSS framework, puzzle data lazy-loaded on demand.
