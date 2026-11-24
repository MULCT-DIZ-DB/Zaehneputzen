// @ts-check
/**
 * „Klavier“: pure logic of the piano rhythm game (chart, hit judging, stars).
 * @module games/piano
 */
import { PIANO } from '../config.js';

/** @typedef {{lane: number, timeMs: number, midi: number}} ChartNote */

const MS_PER_MINUTE = 60000;

/**
 * Tempo of a song at a tempo level: 'langsam' = practice tempo, otherwise a share of the real tempo.
 * @param {import('../songs.js').Song} song Song.
 * @param {string} tempoId Tempo level id (unknown ids fall back to the practice tempo).
 * @returns {number} Beats per minute.
 */
export function bpmFor(song, tempoId) {
  const level = PIANO.tempos.find((t) => t.id === tempoId);
  return level && level.factor ? song.originalBpm * level.factor : song.bpm;
}

/**
 * Converts a song into timed notes. The first note reaches the hit line after the lead-in.
 * @param {import('../songs.js').Song} song Song.
 * @param {string} [tempoId] Tempo level (default: slow practice tempo).
 * @returns {ChartNote[]}
 */
export function buildChart(song, tempoId = PIANO.tempos[0].id) {
  const beatMs = MS_PER_MINUTE / bpmFor(song, tempoId);
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
 * How far (in ms of its fall) a note should already be when it appears at `nowMs`.
 * 0 = at the top; `travelMs` = crossing the line. Keeps the picture in step with the
 * song clock when a timer fires late.
 * @param {number} noteTimeMs When the note reaches the line (since song start).
 * @param {number} nowMs Current song time.
 * @returns {number} Milliseconds, between 0 and the full fall (with overshoot).
 */
export function fallProgressMs(noteTimeMs, nowMs) {
  const progress = nowMs - (noteTimeMs - PIANO.travelMs);
  return Math.min(PIANO.travelMs * PIANO.overshoot, Math.max(0, progress));
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
