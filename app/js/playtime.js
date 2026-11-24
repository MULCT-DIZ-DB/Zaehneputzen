// @ts-check
/**
 * Play window: mini games are open for a few minutes after each completed brushing.
 * Pure functions; time is passed in as epoch milliseconds.
 * @module playtime
 */

const MINUTE_MS = 60000;

/** @typedef {import('./storage.js').State} State */

/**
 * Opens the play window after a completed brushing (0 minutes keeps games closed).
 * @param {State} state Current state (not modified).
 * @param {number} nowMs Current time.
 * @returns {State}
 */
export function openPlayWindow(state, nowMs) {
  const minutes = state.settings.playMinutes;
  return { ...state, playUntil: minutes > 0 ? nowMs + minutes * MINUTE_MS : 0 };
}

/**
 * Remaining play time. Capped at the configured length, so a clock set backwards
 * cannot create extra play time.
 * @param {State} state State.
 * @param {number} nowMs Current time.
 * @param {boolean} devMode Developer mode keeps games open.
 * @returns {number} Milliseconds left (Infinity in developer mode).
 */
export function playMsLeft(state, nowMs, devMode) {
  if (devMode) return Infinity;
  const left = state.playUntil - nowMs;
  return Math.max(0, Math.min(left, state.settings.playMinutes * MINUTE_MS));
}

/**
 * Remaining whole minutes, rounded up (what the child sees).
 * @param {State} state State.
 * @param {number} nowMs Current time.
 * @param {boolean} devMode Developer mode.
 * @returns {number}
 */
export function playMinutesLeft(state, nowMs, devMode) {
  const ms = playMsLeft(state, nowMs, devMode);
  return ms === Infinity ? Infinity : Math.ceil(ms / MINUTE_MS);
}

/**
 * True while the mini games may be played.
 * @param {State} state State.
 * @param {number} nowMs Current time.
 * @param {boolean} devMode Developer mode.
 * @returns {boolean}
 */
export function isPlayOpen(state, nowMs, devMode) {
  return playMsLeft(state, nowMs, devMode) > 0;
}
