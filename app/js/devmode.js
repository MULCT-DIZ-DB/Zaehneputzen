// @ts-check
/**
 * Developer mode: a multiplication gate plus an "everything unlocked" view of the state.
 * Real progress is never overwritten while the mode is active.
 * @module devmode
 */
import { DEV, STICKERS, OUTFITS, MOVES, BACKGROUNDS } from './config.js';

/** @typedef {import('./storage.js').State} State */
/** @typedef {{a: number, b: number}} Challenge */

/** Fields that may be saved while developer mode is active. */
const EDITABLE_FIELDS = /** @type {const} */ (['name', 'settings', 'wearing', 'sequins', 'background', 'playUntil', 'gameStats']);

/**
 * Creates a multiplication task with two single-digit factors.
 * @param {() => number} rng Random number generator returning [0, 1).
 * @returns {Challenge}
 */
export function makeChallenge(rng) {
  const span = DEV.maxFactor - DEV.minFactor + 1;
  const pick = () => DEV.minFactor + Math.min(span - 1, Math.floor(rng() * span));
  return { a: pick(), b: pick() };
}

/**
 * Checks a typed answer. Only plain digits (with surrounding spaces) are accepted.
 * @param {Challenge} challenge Task.
 * @param {unknown} answer Text from the input field.
 * @returns {boolean}
 */
export function checkAnswer(challenge, answer) {
  if (typeof answer !== 'string') return false;
  const text = answer.trim();
  if (!/^\d+$/.test(text)) return false;
  return Number(text) === challenge.a * challenge.b;
}

/**
 * Returns a view of the state with every sticker, outfit, move and background unlocked.
 * @param {State} state Real state (not modified).
 * @returns {State}
 */
export function unlockAll(state) {
  return {
    ...state,
    stickers: STICKERS.map((s) => s.id),
    outfits: OUTFITS.map((o) => o.id),
    moves: MOVES.map((m) => m.id),
    backgrounds: BACKGROUNDS.map((b) => b.id),
  };
}

/**
 * Merges edits made in developer mode into the real state, keeping real progress.
 * @param {State} real Real saved state.
 * @param {State} edited State edited on top of the unlocked view.
 * @returns {State}
 */
export function persistable(real, edited) {
  const next = { ...real };
  EDITABLE_FIELDS.forEach((key) => { next[key] = edited[key]; });
  return next;
}
