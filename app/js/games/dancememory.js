// @ts-check
/**
 * „Tanzschritte merken“: pure logic of the pose memory game.
 * @module games/dancememory
 */
import { DANCE_GAME } from '../config.js';

/**
 * Random sequence of pose ids.
 * @param {number} length Number of poses.
 * @param {() => number} rng Random number generator returning [0, 1).
 * @returns {string[]}
 */
export function makeSequence(length, rng) {
  const poses = DANCE_GAME.poses;
  return Array.from({ length }, () => poses[Math.min(poses.length - 1, Math.floor(rng() * poses.length))].id);
}

/**
 * Judges one tap while the child repeats the sequence.
 * @param {string[]} sequence Sequence to repeat.
 * @param {number} index Position of this tap (0-based).
 * @param {string} pose Tapped pose id.
 * @returns {'next'|'done'|'wrong'} Continue, sequence complete, or mistake.
 */
export function checkTap(sequence, index, pose) {
  if (index >= sequence.length || sequence[index] !== pose) return 'wrong';
  return index === sequence.length - 1 ? 'done' : 'next';
}

/**
 * Length of the next sequence after a success (capped).
 * @param {number} length Current length.
 * @returns {number}
 */
export function nextLength(length) {
  return Math.min(DANCE_GAME.maxLength, length + 1);
}
