// @ts-check
/**
 * Export/import of progress as a JSON file to continue on another device.
 * Parsing is strict about the file type but repairs bad values via storage validation.
 * @module backup
 */
import { BACKUP, SCHEMA_VERSION } from './config.js';
import { migrate, browserStorage } from './storage.js';
import { dateKey } from './rewards.js';

/** @typedef {import('./storage.js').State} State */
/** @typedef {{ok: true, state: State} | {ok: false}} ParseResult */

/**
 * Builds the backup file content.
 * @param {State} state Real state to save.
 * @param {Date} now Export time.
 * @returns {string} Pretty JSON text.
 */
export function serializeBackup(state, now) {
  const pad = (n) => String(n).padStart(2, '0');
  const local = `${dateKey(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return JSON.stringify({ kind: BACKUP.kind, schema: SCHEMA_VERSION, exportedAt: local, state }, null, 1);
}

/**
 * File name for a backup, e.g. "zahnputz-tanz-2026-11-24.json".
 * @param {Date} now Export time.
 * @returns {string}
 */
export function backupFileName(now) {
  return `${BACKUP.filePrefix}-${dateKey(now)}.json`;
}

/**
 * Reads backup text. Rejects foreign or broken files; repairs bad values inside.
 * @param {string} text File content.
 * @returns {ParseResult}
 */
export function parseBackup(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length > BACKUP.maxBytes) return { ok: false };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
  if (!isObj(data) || data.kind !== BACKUP.kind || !isObj(data.state)) return { ok: false };
  return { ok: true, state: migrate(data.state) };
}

/**
 * True if the state holds anything worth restoring (sessions, gifts or calendar entries).
 * @param {State} state Real state.
 * @returns {boolean}
 */
export function hasProgress(state) {
  return state.sessions > 0 || state.stickers.length > 0 || state.outfits.length > 0
    || Object.keys(state.calendar).length > 0;
}

/**
 * Session count stored with the last saved backup (0 if none or unreadable).
 * @param {import('./storage.js').KeyValueStore} [store] Storage to read.
 * @returns {number}
 */
export function lastBackupSessions(store = browserStorage()) {
  try {
    const n = Number(JSON.parse(store.getItem(BACKUP.metaKey) || '{}').sessions);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Remembers that the given state has been backed up.
 * @param {State} state Backed-up state.
 * @param {import('./storage.js').KeyValueStore} [store] Storage to write.
 * @returns {void}
 */
export function recordBackup(state, store = browserStorage()) {
  try {
    store.setItem(BACKUP.metaKey, JSON.stringify({ sessions: state.sessions }));
  } catch {
    /* storage unavailable – the reminder simply shows again */
  }
}

/**
 * True if enough new sessions happened since the last backup to remind the parents.
 * A lower count than at the last backup (progress reset) counts from zero.
 * @param {State} state Real state.
 * @param {number} lastSessions Session count at the last backup.
 * @returns {boolean}
 */
export function needsBackup(state, lastSessions) {
  const base = lastSessions > state.sessions ? 0 : lastSessions;
  return state.sessions - base >= BACKUP.remindAfterSessions;
}

/**
 * Asks the browser not to evict the app's storage when the device runs low on space.
 * Does not protect against the user deleting website data.
 * @returns {void}
 */
export function requestPersistentStorage() {
  const storage = /** @type {any} */ (navigator).storage;
  if (storage && typeof storage.persist === 'function') storage.persist().catch(() => {});
}

/**
 * Hands the backup to the user: share sheet where files can be shared (iPad),
 * otherwise a normal download.
 * @param {State} state Real state.
 * @returns {Promise<boolean>} False if the user cancelled the share sheet.
 */
export async function deliverBackup(state) {
  const now = new Date();
  const name = backupFileName(now);
  const blob = new Blob([serializeBackup(state, now)], { type: BACKUP.mime });
  const nav = /** @type {any} */ (navigator);
  if (typeof File === 'function' && typeof nav.canShare === 'function') {
    const file = new File([blob], name, { type: BACKUP.mime });
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: name });
        return true;
      } catch (err) {
        if (err && err.name === 'AbortError') return false;
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), BACKUP.revokeDelayMs);
  return true;
}
