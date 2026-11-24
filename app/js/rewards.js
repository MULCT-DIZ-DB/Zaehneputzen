// @ts-check
/**
 * Gift rules: stickers, outfits, dance moves, streaks and the calendar.
 * All functions are pure and return new objects (input state is not changed).
 * @module rewards
 */
import { REWARDS, STICKERS, OUTFITS, MOVES, BACKGROUNDS } from './config.js';

/** @typedef {import('./storage.js').State} State */
/** @typedef {'morgens'|'abends'} Slot */
/**
 * @typedef {Object} Reward
 * @property {Slot} slot
 * @property {string|null} sticker
 * @property {string|null} outfit
 * @property {string|null} move
 * @property {string|null} background
 * @property {number} streak
 */

/**
 * Formats a date as YYYY-MM-DD in local time.
 * @param {Date} date Date to format.
 * @returns {string}
 */
export function dateKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Returns the same time on the previous calendar day (safe across DST changes).
 * @param {Date} date Start date.
 * @returns {Date}
 */
function previousDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 12);
}

/**
 * Morning or evening slot for a time.
 * @param {Date} date Time of brushing.
 * @returns {Slot}
 */
export function slotFor(date) {
  return date.getHours() < REWARDS.cutoffHour ? 'morgens' : 'abends';
}

/**
 * True if the day has both slots done.
 * @param {import('./storage.js').DayEntry|undefined} entry Calendar entry.
 * @returns {boolean}
 */
function isFullDay(entry) {
  return Boolean(entry && entry.morgens && entry.abends);
}

/**
 * Counts full days in a row. Today counts if it is complete; otherwise the
 * streak ending yesterday is kept (today is still possible).
 * @param {Object<string, import('./storage.js').DayEntry>} calendar Calendar.
 * @param {Date} date Today.
 * @returns {number}
 */
export function computeStreak(calendar, date) {
  let day = isFullDay(calendar[dateKey(date)]) ? date : previousDay(date);
  let count = 0;
  while (isFullDay(calendar[dateKey(day)])) {
    count += 1;
    day = previousDay(day);
  }
  return count;
}

/**
 * True if this slot of the day has not been rewarded yet.
 * @param {State} state Current state.
 * @param {Date} date Time of brushing.
 * @returns {boolean}
 */
export function canReward(state, date) {
  const entry = state.calendar[dateKey(date)];
  return !(entry && entry[slotFor(date)]);
}

/**
 * Picks a random sticker the child does not own yet.
 * @param {string[]} owned Owned sticker ids.
 * @param {() => number} rng Random number generator returning [0, 1).
 * @returns {string|null} Sticker id, or null when the album is full.
 */
export function pickSticker(owned, rng) {
  const missing = STICKERS.filter((s) => !owned.includes(s.id));
  if (missing.length === 0) return null;
  const index = Math.min(missing.length - 1, Math.floor(rng() * missing.length));
  return missing[index].id;
}

/**
 * Next outfit in unlock order if the session count hits the rhythm.
 * @param {string[]} owned Owned outfit ids.
 * @param {number} sessions Session count including the current one.
 * @returns {string|null}
 */
function nextOutfit(owned, sessions) {
  if (sessions % REWARDS.outfitEverySessions !== 0) return null;
  const item = OUTFITS.find((o) => !owned.includes(o.id));
  return item ? item.id : null;
}

/**
 * Next background in unlock order if the session count hits the rhythm.
 * @param {string[]} owned Owned background ids.
 * @param {number} sessions Session count including the current one.
 * @returns {string|null}
 */
function nextBackground(owned, sessions) {
  if (sessions % REWARDS.backgroundEverySessions !== 0) return null;
  const item = BACKGROUNDS.find((b) => !owned.includes(b.id));
  return item ? item.id : null;
}

/**
 * Lowest locked dance move whose streak threshold is reached.
 * @param {string[]} owned Owned move ids.
 * @param {number} streak Current streak.
 * @returns {string|null}
 */
function nextMove(owned, streak) {
  const thresholds = REWARDS.moveStreakThresholds;
  for (let i = 0; i < thresholds.length; i += 1) {
    const move = MOVES[i + 1];
    if (move && streak >= thresholds[i] && !owned.includes(move.id)) return move.id;
  }
  return null;
}

/**
 * Handles the end of a brushing session.
 * @param {State} state Current state (not modified).
 * @param {{date: Date, completed: boolean, rng: () => number}} options Session info.
 * @returns {{state: State, reward: Reward|null}} New state and the gifts (null = no gift).
 */
export function completeSession(state, { date, completed, rng }) {
  if (!completed || !canReward(state, date)) return { state, reward: null };
  const key = dateKey(date);
  const slot = slotFor(date);
  const previous = state.calendar[key] || { morgens: false, abends: false };
  const calendar = { ...state.calendar, [key]: { ...previous, [slot]: true } };
  const sessions = state.sessions + 1;
  const sticker = pickSticker(state.stickers, rng);
  const outfit = nextOutfit(state.outfits, sessions);
  const streak = computeStreak(calendar, date);
  const move = nextMove(state.moves, streak);
  const background = nextBackground(state.backgrounds, sessions);
  const next = {
    ...state,
    calendar,
    sessions,
    stickers: sticker ? [...state.stickers, sticker] : [...state.stickers],
    outfits: outfit ? [...state.outfits, outfit] : [...state.outfits],
    moves: move ? [...state.moves, move] : [...state.moves],
    backgrounds: background ? [...state.backgrounds, background] : [...state.backgrounds],
  };
  return { state: next, reward: { slot, sticker, outfit, move, background, streak } };
}
