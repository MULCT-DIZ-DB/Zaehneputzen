// @ts-check
/**
 * Export/import of progress as a JSON file to continue on another device.
 * Parsing is strict about the file type but repairs bad values via storage validation.
 * @module backup
 */
import { BACKUP, SCHEMA_VERSION } from './config.js';
import { migrate } from './storage.js';
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
 * Hands the backup to the user: share sheet where files can be shared (iPad),
 * otherwise a normal download.
 * @param {State} state Real state.
 * @returns {Promise<void>}
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
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
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
}
