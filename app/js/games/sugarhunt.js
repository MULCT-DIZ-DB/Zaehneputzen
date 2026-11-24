// @ts-check
/**
 * „Zuckerjagd“: pure logic of the whack-a-mole game (timing, spawn rules).
 * @module games/sugarhunt
 */
import { SUGAR } from '../config.js';

/**
 * Linear blend from `start` to `end` over one round, then stays at `end`.
 * @param {number} start Value at the beginning.
 * @param {number} end Value at the end of the round.
 * @param {number} elapsedMs Time since the round started.
 * @returns {number}
 */
function ramp(start, end, elapsedMs) {
  const t = Math.min(1, Math.max(0, elapsedMs / SUGAR.roundMs));
  return Math.round(start + (end - start) * t);
}

/**
 * How long a bug stays visible; gets shorter during the round.
 * @param {number} elapsedMs Time since the round started.
 * @returns {number} Milliseconds.
 */
export function lifetimeAt(elapsedMs) {
  return ramp(SUGAR.startLifeMs, SUGAR.minLifeMs, elapsedMs);
}

/**
 * Pause until the next bug may appear; gets shorter during the round.
 * @param {number} elapsedMs Time since the round started.
 * @returns {number} Milliseconds.
 */
export function spawnDelayAt(elapsedMs) {
  return ramp(SUGAR.startSpawnMs, SUGAR.minSpawnMs, elapsedMs);
}

/**
 * True if another bug may appear.
 * @param {number} activeCount Bugs currently visible.
 * @returns {boolean}
 */
export function canSpawn(activeCount) {
  return activeCount < SUGAR.maxBugs;
}

/**
 * Picks a random free tooth.
 * @param {() => number} rng Random number generator returning [0, 1).
 * @param {number[]} occupied Teeth that already have a bug.
 * @returns {number|null} Tooth index, or null if all are taken.
 */
export function pickTooth(rng, occupied) {
  const free = [];
  for (let i = 0; i < SUGAR.toothCount; i += 1) if (!occupied.includes(i)) free.push(i);
  if (free.length === 0) return null;
  return free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
}
