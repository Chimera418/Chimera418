#!/usr/bin/env node
/**
 * choose-game.js
 *
 * Deterministically selects which game to render based on the current
 * day of the month, then emits a GitHub Actions step output.
 *
 * Rotation schedule (repeats every month):
 *   Days  1-5  → snake
 *   Days  6-10 → pacman
 *   Days 11-15 → breakout
 *   Days 16-20 → galaga
 *   Days 21-25 → puzzle-bobble
 *   Days 26-31 → bomberman
 *
 * To disable a game, set "enabled": false in scripts/games.json.
 * The picker will skip disabled games and fall through to the next one.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Ordered game rotation ────────────────────────────────────────────────────
const ROTATION = [
  "snake",        // slot 0 → days  1-5
  "pacman",       // slot 1 → days  6-10
  "breakout",     // slot 2 → days 11-15
  "galaga",       // slot 3 → days 16-20
  "puzzle-bobble",// slot 4 → days 21-25
  "bomberman",    // slot 5 → days 26-31
];

// ── Load config ──────────────────────────────────────────────────────────────
const configPath = join(__dirname, "games.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

// ── Pick slot based on day of month (1-indexed, 0-based slot index) ──────────
const day = new Date().getUTCDate(); // 1..31
const slot = Math.min(Math.floor((day - 1) / 5), ROTATION.length - 1);

// ── Walk forward from the chosen slot, skip disabled games ───────────────────
function pickGame(startSlot) {
  const n = ROTATION.length;
  for (let i = 0; i < n; i++) {
    const candidate = ROTATION[(startSlot + i) % n];
    if (config[candidate]?.enabled !== false) {
      return candidate;
    }
  }
  // Fallback — should never happen if at least one game is enabled
  return "snake";
}

const game = pickGame(slot);

// ── Emit GitHub Actions output ───────────────────────────────────────────────
// Support both old (set-output) and new ($GITHUB_OUTPUT) methods.
const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  import("fs").then(({ appendFileSync }) => {
    appendFileSync(outputFile, `game=${game}\n`);
  });
} else {
  // Fallback for local testing / old runners
  console.log(`::set-output name=game::${game}`);
}

console.log(`[choose-game] Day ${day} → slot ${slot} → game: ${game}`);
