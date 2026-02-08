/**
 * validate-puzzles.ts
 *
 * Build-time validation for SUSPECT game puzzle data.
 * Reads index.json, loads every puzzle and solution, and checks
 * structural invariants documented in CLAUDE.md.
 *
 * Usage:  npx tsx scripts/validate-puzzles.ts
 *         npm run validate
 *
 * Exit code 0 = all clear, 1 = errors found.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types (mirroring src/lib/types.ts without importing from browser code)
// ---------------------------------------------------------------------------

interface Suspect {
  id: string;
  name: string;
  role: string;
  motive: string;
  alibi: string;
}

type ClueType = 'witness' | 'physical' | 'contradiction';

interface Clue {
  id: string;
  type: ClueType;
  title: string;
  content: string;
  order: number;
}

interface Puzzle {
  id: string;
  version: number;
  genre: string;
  difficulty: number;
  title: string;
  setting: string;
  premise: string;
  suspects: Suspect[];
  clues: Clue[];
}

interface Solution {
  culprit: string;
  explanation: string;
  funFact: string;
}

interface PackMeta {
  id: string;
  name: string;
  genre: string;
  emoji: string;
  puzzles: string[];
}

interface PuzzleIndex {
  daily: string[];
  packs: PackMeta[];
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const ok = (msg: string) => console.log(`  ${GREEN}\u2713${RESET} ${msg}`);
const err = (msg: string) => console.log(`  ${RED}\u2717${RESET} ${msg}`);
const warn = (msg: string) => console.log(`  ${YELLOW}!${RESET} ${msg}`);
const heading = (msg: string) => console.log(`\n${BOLD}${msg}${RESET}`);
const dim = (msg: string) => `${DIM}${msg}${RESET}`;

// ---------------------------------------------------------------------------
// Validation accumulator
// ---------------------------------------------------------------------------

let totalErrors = 0;
let totalWarnings = 0;
let totalPuzzles = 0;

function addError(puzzleId: string, message: string): void {
  totalErrors++;
  err(`[${puzzleId}] ${message}`);
}

function addWarning(puzzleId: string, message: string): void {
  totalWarnings++;
  warn(`[${puzzleId}] ${message}`);
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

const PUZZLES_DIR = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  '..',
  'public',
  'puzzles',
);

function readJson<T>(relativePath: string): T | null {
  const fullPath = path.join(PUZZLES_DIR, relativePath);
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const VALID_CLUE_TYPES: ReadonlySet<string> = new Set<ClueType>([
  'witness',
  'physical',
  'contradiction',
]);

const SUSPECT_REQUIRED_FIELDS: readonly (keyof Suspect)[] = [
  'id',
  'name',
  'role',
  'motive',
  'alibi',
];

const CLUE_REQUIRED_FIELDS: readonly (keyof Clue)[] = [
  'id',
  'type',
  'title',
  'content',
  'order',
];

const PUZZLE_REQUIRED_FIELDS: readonly (keyof Puzzle)[] = [
  'id',
  'version',
  'genre',
  'difficulty',
  'title',
  'setting',
  'premise',
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function validatePuzzle(puzzleId: string, source: 'daily' | 'packs'): boolean {
  const puzzle = readJson<Puzzle>(`${source}/${puzzleId}.json`);

  if (puzzle === null) {
    addError(puzzleId, `Puzzle file not found: ${source}/${puzzleId}.json`);
    return false;
  }

  let puzzleValid = true;

  // --- Puzzle-level required fields ---
  for (const field of PUZZLE_REQUIRED_FIELDS) {
    if (puzzle[field] === undefined || puzzle[field] === null || puzzle[field] === '') {
      addError(puzzleId, `Missing required puzzle field: "${field}"`);
      puzzleValid = false;
    }
  }

  // --- Puzzle ID consistency ---
  if (puzzle.id !== puzzleId) {
    addError(puzzleId, `Puzzle "id" field ("${puzzle.id}") does not match filename ("${puzzleId}")`);
    puzzleValid = false;
  }

  // --- Suspects ---
  if (!Array.isArray(puzzle.suspects)) {
    addError(puzzleId, 'suspects is not an array');
    return false;
  }

  if (puzzle.suspects.length !== 4) {
    addError(puzzleId, `Expected exactly 4 suspects, found ${puzzle.suspects.length}`);
    puzzleValid = false;
  }

  const suspectIds = new Set<string>();

  for (const suspect of puzzle.suspects) {
    // Required fields
    for (const field of SUSPECT_REQUIRED_FIELDS) {
      if (
        suspect[field] === undefined ||
        suspect[field] === null ||
        suspect[field] === ''
      ) {
        addError(puzzleId, `Suspect "${suspect.id ?? suspect.name ?? '?'}" missing field: "${field}"`);
        puzzleValid = false;
      }
    }

    // Unique IDs
    if (suspect.id) {
      if (suspectIds.has(suspect.id)) {
        addError(puzzleId, `Duplicate suspect ID: "${suspect.id}"`);
        puzzleValid = false;
      }
      suspectIds.add(suspect.id);
    }

    // Alibi word count
    if (suspect.alibi) {
      const words = countWords(suspect.alibi);
      if (words > 40) {
        addError(puzzleId, `Suspect "${suspect.name}" alibi is ${words} words (max 40)`);
        puzzleValid = false;
      }
    }
  }

  // Alibi length variance (no length-as-tell)
  const alibiLengths = puzzle.suspects
    .filter((s) => s.alibi)
    .map((s) => countWords(s.alibi));

  if (alibiLengths.length > 1) {
    const avg = alibiLengths.reduce((a, b) => a + b, 0) / alibiLengths.length;
    for (let i = 0; i < alibiLengths.length; i++) {
      const deviation = Math.abs(alibiLengths[i] - avg) / avg;
      if (deviation > 0.2) {
        const suspect = puzzle.suspects[i];
        addWarning(
          puzzleId,
          `Suspect "${suspect.name}" alibi length (${alibiLengths[i]} words) deviates ${(deviation * 100).toFixed(0)}% from mean (${avg.toFixed(1)} words) -- potential length-as-tell`,
        );
      }
    }
  }

  // --- Clues ---
  if (!Array.isArray(puzzle.clues)) {
    addError(puzzleId, 'clues is not an array');
    return false;
  }

  if (puzzle.clues.length !== 3) {
    addError(puzzleId, `Expected exactly 3 clues, found ${puzzle.clues.length}`);
    puzzleValid = false;
  }

  const clueIds = new Set<string>();
  const clueOrders = new Set<number>();

  for (const clue of puzzle.clues) {
    // Required fields
    for (const field of CLUE_REQUIRED_FIELDS) {
      if (
        clue[field] === undefined ||
        clue[field] === null ||
        clue[field] === ''
      ) {
        addError(puzzleId, `Clue "${clue.id ?? '?'}" missing field: "${field}"`);
        puzzleValid = false;
      }
    }

    // Valid type
    if (clue.type && !VALID_CLUE_TYPES.has(clue.type)) {
      addError(puzzleId, `Clue "${clue.id}" has invalid type: "${clue.type}" (expected witness|physical|contradiction)`);
      puzzleValid = false;
    }

    // Unique IDs
    if (clue.id) {
      if (clueIds.has(clue.id)) {
        addError(puzzleId, `Duplicate clue ID: "${clue.id}"`);
        puzzleValid = false;
      }
      clueIds.add(clue.id);
    }

    // Track orders
    if (typeof clue.order === 'number') {
      clueOrders.add(clue.order);
    }
  }

  // Contiguous order values (1, 2, 3)
  if (puzzle.clues.length === 3) {
    const hasOrder1 = clueOrders.has(1);
    const hasOrder2 = clueOrders.has(2);
    const hasOrder3 = clueOrders.has(3);

    if (!hasOrder1 || !hasOrder2 || !hasOrder3) {
      const found = Array.from(clueOrders).sort((a, b) => a - b).join(', ');
      addError(puzzleId, `Clue orders must be contiguous 1, 2, 3 -- found: [${found}]`);
      puzzleValid = false;
    }
  }

  // --- Solution ---
  const solution = readJson<Solution>(`solutions/${puzzleId}.json`);

  if (solution === null) {
    addError(puzzleId, `Solution file not found: solutions/${puzzleId}.json`);
    puzzleValid = false;
  } else {
    // culprit references valid suspect
    if (!solution.culprit) {
      addError(puzzleId, 'Solution missing "culprit" field');
      puzzleValid = false;
    } else if (!suspectIds.has(solution.culprit)) {
      addError(
        puzzleId,
        `Solution culprit "${solution.culprit}" does not match any suspect ID (valid: ${Array.from(suspectIds).join(', ')})`,
      );
      puzzleValid = false;
    }

    // explanation non-empty
    if (!solution.explanation || solution.explanation.trim().length === 0) {
      addError(puzzleId, 'Solution "explanation" is empty');
      puzzleValid = false;
    }

    // funFact non-empty (warning, not error)
    if (!solution.funFact || solution.funFact.trim().length === 0) {
      addWarning(puzzleId, 'Solution "funFact" is empty');
    }
  }

  return puzzleValid;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  heading('SUSPECT Puzzle Validator');
  console.log(dim(`Reading from: ${PUZZLES_DIR}`));

  // Load index
  const index = readJson<PuzzleIndex>('index.json');
  if (index === null) {
    err('Could not read index.json -- aborting');
    process.exit(1);
  }

  // Collect all puzzle IDs with their source folder
  const puzzleEntries: Array<{ id: string; source: 'daily' | 'packs' }> = [];

  for (const id of index.daily) {
    puzzleEntries.push({ id, source: 'daily' });
  }

  for (const pack of index.packs) {
    // Validate pack metadata
    if (!pack.id || !pack.name || !pack.genre) {
      addError(pack.id ?? 'unknown-pack', 'Pack metadata missing required field (id, name, or genre)');
    }
    if (!Array.isArray(pack.puzzles) || pack.puzzles.length === 0) {
      addError(pack.id ?? 'unknown-pack', 'Pack has no puzzles listed');
    }
    for (const id of pack.puzzles) {
      puzzleEntries.push({ id, source: 'packs' });
    }
  }

  // Check for duplicate IDs across all sources
  const allIds = puzzleEntries.map((e) => e.id);
  const idCounts = new Map<string, number>();
  for (const id of allIds) {
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      addError(id, `Puzzle ID appears ${count} times across daily/packs`);
    }
  }

  // Validate each puzzle
  heading(`Validating ${puzzleEntries.length} puzzles...`);

  let passed = 0;

  for (const entry of puzzleEntries) {
    totalPuzzles++;
    const label = `${entry.source}/${entry.id}`;

    const valid = validatePuzzle(entry.id, entry.source);
    if (valid) {
      ok(label);
      passed++;
    }
  }

  // Summary
  heading('Summary');
  console.log(`  Total puzzles: ${totalPuzzles}`);
  console.log(`  ${GREEN}Passed:${RESET}   ${passed}`);

  if (totalErrors > 0) {
    console.log(`  ${RED}Errors:${RESET}   ${totalErrors}`);
  } else {
    console.log(`  ${GREEN}Errors:${RESET}   0`);
  }

  if (totalWarnings > 0) {
    console.log(`  ${YELLOW}Warnings:${RESET} ${totalWarnings}`);
  } else {
    console.log(`  Warnings: 0`);
  }

  console.log('');

  if (totalErrors > 0) {
    console.log(`${RED}${BOLD}Validation FAILED${RESET} -- ${totalErrors} error(s) found.\n`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}All puzzles valid.${RESET}\n`);
    process.exit(0);
  }
}

main();
