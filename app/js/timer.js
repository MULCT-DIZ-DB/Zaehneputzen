// @ts-check
/**
 * Pure brushing timer. Time is always passed in (milliseconds), so the timer
 * does not drift with uneven frames and is easy to test.
 * @module timer
 */

/**
 * @typedef {Object} TimerState
 * @property {number} elapsedMs Brushing time so far (without pauses), clamped to the total.
 * @property {number} zoneIndex Position in the brushing order (0 … zoneCount-1).
 * @property {number} zoneProgress Progress inside the current zone (0 … 1).
 * @property {number} totalProgress Progress of the whole session (0 … 1).
 * @property {boolean} running True while counting.
 * @property {boolean} done True once the total time is reached.
 */

/**
 * Calculates the end time of every zone; remainders are spread evenly.
 * @param {number} totalMs Total brushing time in ms.
 * @param {number} zoneCount Number of zones.
 * @returns {number[]} Integer end times, the last one equals `totalMs`.
 */
export function zoneBoundaries(totalMs, zoneCount) {
  const result = [];
  for (let i = 1; i <= zoneCount; i += 1) {
    result.push(Math.round((totalMs * i) / zoneCount));
  }
  return result;
}

/** Zone timer with pause/resume. */
export class ZoneTimer {
  /**
   * @param {{totalMs: number, zoneCount: number}} options Total time and number of zones.
   * @throws {RangeError} If the total time or zone count is not a positive number.
   */
  constructor({ totalMs, zoneCount }) {
    if (!Number.isFinite(totalMs) || totalMs <= 0) throw new RangeError('totalMs must be > 0');
    if (!Number.isInteger(zoneCount) || zoneCount <= 0) throw new RangeError('zoneCount must be > 0');
    this.totalMs = totalMs;
    this.boundaries = zoneBoundaries(totalMs, zoneCount);
    /** @type {number|null} */ this.startedAt = null;
    /** @type {number|null} */ this.pausedAt = null;
    this.pausedTotal = 0;
  }

  /**
   * Starts counting.
   * @param {number} now Current time in ms.
   * @returns {void}
   */
  start(now) {
    this.startedAt = now;
    this.pausedAt = null;
    this.pausedTotal = 0;
  }

  /**
   * Pauses; calling it twice has no extra effect.
   * @param {number} now Current time in ms.
   * @returns {void}
   */
  pause(now) {
    if (this.startedAt !== null && this.pausedAt === null) this.pausedAt = now;
  }

  /**
   * Continues after a pause; calling it without a pause does nothing.
   * @param {number} now Current time in ms.
   * @returns {void}
   */
  resume(now) {
    if (this.pausedAt === null) return;
    this.pausedTotal += now - this.pausedAt;
    this.pausedAt = null;
  }

  /**
   * True while the timer is paused.
   * @returns {boolean}
   */
  isPaused() {
    return this.pausedAt !== null;
  }

  /**
   * Brushing time without pauses.
   * @param {number} now Current time in ms.
   * @returns {number} Elapsed ms, between 0 and the total.
   */
  elapsed(now) {
    if (this.startedAt === null) return 0;
    const end = this.pausedAt === null ? now : this.pausedAt;
    return Math.min(this.totalMs, Math.max(0, end - this.startedAt - this.pausedTotal));
  }

  /**
   * Full state for drawing.
   * @param {number} now Current time in ms.
   * @returns {TimerState}
   */
  state(now) {
    const elapsedMs = this.elapsed(now);
    const done = elapsedMs >= this.totalMs;
    let zoneIndex = this.boundaries.findIndex((b) => elapsedMs < b);
    if (zoneIndex === -1) zoneIndex = this.boundaries.length - 1;
    const zoneStart = zoneIndex === 0 ? 0 : this.boundaries[zoneIndex - 1];
    const zoneLen = this.boundaries[zoneIndex] - zoneStart;
    return {
      elapsedMs,
      zoneIndex,
      zoneProgress: Math.min(1, (elapsedMs - zoneStart) / zoneLen),
      totalProgress: elapsedMs / this.totalMs,
      running: this.startedAt !== null && this.pausedAt === null && !done,
      done,
    };
  }
}

/**
 * Creates a function that calls `onChange` whenever a new zone index appears.
 * @param {(index: number) => void} onChange Callback for zone changes.
 * @returns {(index: number) => void} Feed it the current zone index every frame.
 */
export function zoneWatcher(onChange) {
  let last = -1;
  return (index) => {
    if (last !== -1 && index !== last) onChange(index);
    last = index;
  };
}
