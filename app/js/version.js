// @ts-check
/**
 * Build info shown in the parent menu. `version.json` is a placeholder in the repository;
 * the GitHub Pages workflow overwrites it with the deployed commit's short hash and date.
 * @module version
 */
import { TEXT } from './config.js';

/** @typedef {{commit: string, date: string}} VersionInfo */

const COMMIT = /^[0-9a-f]{7,40}$/;

/**
 * Validates raw version data.
 * @param {unknown} data Parsed `version.json`.
 * @returns {VersionInfo|null} Null for the placeholder or broken data.
 */
export function parseVersion(data) {
  if (typeof data !== 'object' || data === null) return null;
  const { commit, date } = /** @type {any} */ (data);
  if (typeof commit !== 'string' || !COMMIT.test(commit)) return null;
  if (typeof date !== 'string' || Number.isNaN(new Date(date).getTime())) return null;
  return { commit, date };
}

/**
 * Text for the parent menu, e.g. "Version a9eb852 vom 24.11.2026, 14:32".
 * @param {VersionInfo|null} info Parsed version, or null when running locally.
 * @returns {string}
 */
export function formatVersion(info) {
  if (!info) return `${TEXT.versionLabel}: ${TEXT.versionLocal}`;
  const d = new Date(info.date);
  const pad = (n) => String(n).padStart(2, '0');
  const when = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${TEXT.versionLabel} ${info.commit} ${TEXT.versionFrom} ${when}`;
}

/**
 * Loads `version.json` next to the app.
 * @returns {Promise<VersionInfo|null>} Null when missing, unreadable or the placeholder.
 */
export async function loadVersion() {
  try {
    const response = await fetch('./version.json', { cache: 'no-store' });
    return response.ok ? parseVersion(await response.json()) : null;
  } catch {
    return null;
  }
}
