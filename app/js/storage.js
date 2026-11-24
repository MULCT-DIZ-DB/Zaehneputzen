// @ts-check
/**
 * Loading, validating and saving progress in localStorage.
 * Broken or missing data never crashes the app – it falls back to defaults.
 * @module storage
 */
import {
  STORAGE_KEY, SCHEMA_VERSION, DEFAULT_SETTINGS, TIMER, ZONE_ORDERS, STICKERS, OUTFITS, MOVES, OUTFIT_SLOTS,
} from './config.js';

/**
 * @typedef {{totalSec: number, zoneOrder: string, music: boolean, volume: number}} Settings
 * @typedef {{morgens: boolean, abends: boolean}} DayEntry
 * @typedef {Object} State
 * @property {number} schema
 * @property {string} name
 * @property {number} sessions Number of rewarded brushing sessions.
 * @property {string[]} stickers
 * @property {string[]} outfits
 * @property {string[]} moves
 * @property {string[]} wearing Outfit ids currently worn (max one per slot).
 * @property {Object<string, string>} sequins Outfit id → encoded sequin states.
 * @property {Object<string, DayEntry>} calendar Date key (YYYY-MM-DD) → day entry.
 * @property {Settings} settings
 */

/**
 * @typedef {{getItem(k: string): (string|null), setItem(k: string, v: string): void, removeItem(k: string): void}} KeyValueStore
 */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const SEQUIN_CODE = /^[01]*$/;

/**
 * Returns a fresh default state.
 * @returns {State}
 */
export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    name: '',
    sessions: 0,
    stickers: [],
    outfits: [],
    moves: [MOVES[0].id],
    wearing: [],
    sequins: {},
    calendar: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

/**
 * Simple in-memory store with the localStorage interface (fallback and tests).
 * @returns {KeyValueStore}
 */
export function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}

/**
 * Returns window.localStorage, or a memory store if it is blocked.
 * @returns {KeyValueStore}
 */
export function browserStorage() {
  try {
    const ls = window.localStorage;
    const probe = `${STORAGE_KEY}-probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStorage();
  }
}

/**
 * Keeps only known, unique ids from a list.
 * @param {unknown} list Raw value.
 * @param {ReadonlyArray<{id: string}>} catalog Allowed items.
 * @returns {string[]}
 */
function cleanIds(list, catalog) {
  if (!Array.isArray(list)) return [];
  const allowed = new Set(catalog.map((c) => c.id));
  return [...new Set(list.filter((x) => typeof x === 'string' && allowed.has(x)))];
}

/**
 * Clamps a number into a range, using a fallback for non-numbers.
 * @param {unknown} value Raw value.
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @param {number} fallback Used if value is not a finite number.
 * @returns {number}
 */
function clampNumber(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * True for plain objects (not arrays, not null).
 * @param {unknown} v Value to check.
 * @returns {v is Object<string, unknown>}
 */
function isObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validates parent settings.
 * @param {unknown} raw Raw settings.
 * @returns {Settings}
 */
function cleanSettings(raw) {
  const s = isObject(raw) ? raw : {};
  const orders = ZONE_ORDERS.map((o) => o.id);
  return {
    totalSec: clampNumber(s.totalSec, TIMER.minTotalSec, TIMER.maxTotalSec, DEFAULT_SETTINGS.totalSec),
    zoneOrder: typeof s.zoneOrder === 'string' && orders.includes(s.zoneOrder) ? s.zoneOrder : DEFAULT_SETTINGS.zoneOrder,
    music: typeof s.music === 'boolean' ? s.music : DEFAULT_SETTINGS.music,
    volume: clampNumber(s.volume, 0, 1, DEFAULT_SETTINGS.volume),
  };
}

/**
 * Validates the calendar: only real date keys with object entries.
 * @param {unknown} raw Raw calendar.
 * @returns {Object<string, DayEntry>}
 */
function cleanCalendar(raw) {
  /** @type {Object<string, DayEntry>} */
  const out = {};
  if (!isObject(raw)) return out;
  Object.entries(raw).forEach(([key, entry]) => {
    if (!DATE_KEY.test(key) || !isObject(entry)) return;
    out[key] = { morgens: entry.morgens === true, abends: entry.abends === true };
  });
  return out;
}

/**
 * Keeps at most one worn outfit per slot, only owned ones.
 * @param {unknown} raw Raw list.
 * @param {string[]} owned Owned outfit ids.
 * @returns {string[]}
 */
function cleanWearing(raw, owned) {
  const ids = cleanIds(raw, OUTFITS).filter((id) => owned.includes(id));
  const bySlot = new Map();
  ids.forEach((id) => {
    const item = OUTFITS.find((o) => o.id === id);
    if (item && OUTFIT_SLOTS.includes(item.slot)) bySlot.set(item.slot, id);
  });
  return [...bySlot.values()];
}

/**
 * Repairs any raw object into a valid state (wrong types become defaults).
 * @param {unknown} raw Parsed JSON.
 * @returns {State}
 */
export function validateState(raw) {
  const r = isObject(raw) ? raw : {};
  const outfits = cleanIds(r.outfits, OUTFITS);
  const moves = cleanIds(r.moves, MOVES);
  if (!moves.includes(MOVES[0].id)) moves.unshift(MOVES[0].id);
  /** @type {Object<string, string>} */
  const sequins = {};
  if (isObject(r.sequins)) {
    Object.entries(r.sequins).forEach(([k, v]) => {
      if (typeof v === 'string' && SEQUIN_CODE.test(v)) sequins[k] = v;
    });
  }
  return {
    schema: SCHEMA_VERSION,
    name: typeof r.name === 'string' ? r.name.slice(0, 30) : '',
    sessions: Number.isInteger(r.sessions) && Number(r.sessions) >= 0 ? Number(r.sessions) : 0,
    stickers: cleanIds(r.stickers, STICKERS),
    outfits,
    moves,
    wearing: cleanWearing(r.wearing, outfits),
    sequins,
    calendar: cleanCalendar(r.calendar),
    settings: cleanSettings(r.settings),
  };
}

/**
 * Upgrades older saved data to the current schema.
 * Schema 0 (no version field) has the same fields, so validation is enough;
 * newer unknown schemas are read as well as possible.
 * @param {unknown} raw Parsed JSON.
 * @returns {State}
 */
export function migrate(raw) {
  return validateState(raw);
}

/**
 * Loads the saved state.
 * @param {KeyValueStore} [store] Storage to read from (default: browser storage).
 * @returns {State}
 */
export function loadState(store = browserStorage()) {
  try {
    const text = store.getItem(STORAGE_KEY);
    if (!text) return defaultState();
    return migrate(JSON.parse(text));
  } catch {
    return defaultState();
  }
}

/**
 * Saves the state.
 * @param {State} state State to save.
 * @param {KeyValueStore} [store] Storage to write to (default: browser storage).
 * @returns {boolean} False if saving failed.
 */
export function saveState(state, store = browserStorage()) {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes all saved progress.
 * @param {KeyValueStore} [store] Storage to clear.
 * @returns {void}
 */
export function resetState(store = browserStorage()) {
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do – storage unavailable */
  }
}
