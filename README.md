# SUSPECT

A daily micro-mystery deduction game. One case per day, plus weekly genre packs. Read suspects' alibis, reveal clues, and identify the liar.

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

**Daily mode**: Same puzzle for everyone, UTC midnight reset.
**Practice mode**: 5-puzzle genre packs, self-paced.

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
  index.json              Daily pool + pack metadata
  daily/*.json            7 daily puzzles
  packs/*.json            5 practice pack puzzles
  solutions/*.json        12 solution files (separate for anti-cheat)

src/
  lib/                    Types, constants, utility functions
  contexts/               GameContext (session) + PlayerContext (persistent)
  hooks/                  useDaily, useTimer, useCountdown
  components/
    game/                 SuspectCard, ClueCard, CluePanel, PuzzleView, etc.
    layout/               Header, ModeSelector, StatsOverlay
    share/                ShareButton, ResultScreen
  styles/global.css       Complete design system (1700+ lines)
```

## Adding Puzzles

Each puzzle needs 3 files:
1. `public/puzzles/daily/{id}.json` or `public/puzzles/packs/{id}.json`
2. `public/puzzles/solutions/{id}.json`
3. Reference in `public/puzzles/index.json`

Constraints:
- Exactly 4 suspects, 3 clues with `order` values 1-3
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

~75KB gzipped total (budget: <80KB). No custom fonts, no CSS framework, puzzle data lazy-loaded on demand.
