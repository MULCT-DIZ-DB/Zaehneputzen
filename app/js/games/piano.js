// @ts-check
/**
 * „Klavier“: pure logic of the piano rhythm game (chart, hit judging, stars).
 * @module games/piano
 */
import { PIANO } from '../config.js';

/** @typedef {{lane: number, timeMs: number, midi: number}} ChartNote */

const MS_PER_MINUTE = 60000;

/**
 * Converts a song into timed notes. The first note reaches the hit line after the lead-in.
 * @param {import('../songs.js').Song} song Song.
 * @returns {ChartNote[]}
 */
export function buildChart(song) {
  const beatMs = MS_PER_MINUTE / song.bpm;
  const chart = [];
  let t = PIANO.leadInMs;
  song.notes.forEach(([midi, beats]) => {
    const lane = PIANO.keys.indexOf(midi);
    if (lane >= 0) chart.push({ lane, timeMs: Math.round(t), midi });
    t += beats * beatMs;
  });
  return chart;
}

/**
 * Finds the note a key tap hits: the closest not-yet-hit note in that lane within the window.
 * @param {ChartNote[]} chart Song chart.
 * @param {Set<number>} hits Indices already hit.
 * @param {number} lane Tapped key.
 * @param {number} tMs Time of the tap since the song started.
 * @returns {number|null} Chart index, or null for no hit.
 */
export function judgeTap(chart, hits, lane, tMs) {
  let best = null;
  let bestDiff = Infinity;
  chart.forEach((n, i) => {
    if (n.lane !== lane || hits.has(i)) return;
    const diff = Math.abs(n.timeMs - tMs);
    if (diff <= PIANO.hitWindowMs && diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  });
  return best;
}

/**
 * Stars for a song (always at least one – no failing).
 * @param {number} hitCount Notes hit.
 * @param {number} total Notes in the song.
 * @returns {1|2|3}
 */
export function starsFor(hitCount, total) {
  const share = total > 0 ? hitCount / total : 0;
  if (share >= PIANO.threeStars) return 3;
  return share >= PIANO.twoStars ? 2 : 1;
}
