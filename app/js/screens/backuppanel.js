// @ts-check
/**
 * Backup panel inside the parent menu: export progress to a file, import it on another device.
 * @module screens/backuppanel
 */
import { TEXT, BACKUP } from '../config.js';
import { el } from '../dom.js';
import { deliverBackup, parseBackup, recordBackup } from '../backup.js';
import { textButton } from './base.js';

/**
 * Reads a backup file and, after confirmation, replaces the progress with it.
 * @param {import('./base.js').AppContext} ctx App context.
 * @param {File} file Chosen file.
 * @returns {Promise<'ok'|'bad'|'cancelled'>}
 */
export async function applyBackupFile(ctx, file) {
  const result = file.size > BACKUP.maxBytes ? { ok: false } : parseBackup(await file.text());
  if (!result.ok) return 'bad';
  if (!window.confirm(TEXT.importConfirm)) return 'cancelled';
  ctx.setDevMode(false);
  ctx.setState(result.state);
  ctx.music.configure(result.state.settings);
  recordBackup(result.state);
  return 'ok';
}

/**
 * Saves a backup of the real progress and remembers it when the user did not cancel.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {Promise<boolean>} True if the backup was handed over.
 */
export async function saveBackup(ctx) {
  const state = ctx.getSavedState();
  const delivered = await deliverBackup(state);
  if (delivered) recordBackup(state);
  return delivered;
}

/**
 * Creates the backup panel.
 * @param {import('./base.js').AppContext} ctx App context.
 * @param {() => void} onImported Called after a successful import (to refresh the menu).
 * @returns {{el: HTMLElement, refresh: () => void}}
 */
export function createBackupPanel(ctx, onImported) {
  const msg = el('p', { cls: 'backup-msg', id: 'backup-msg' });
  const input = /** @type {HTMLInputElement} */ (el('input', { id: 'input-import', cls: 'visually-hidden',
    attrs: { type: 'file', accept: `${BACKUP.mime},.json` } }));

  /**
   * Shows a result message.
   * @param {string} text Message.
   * @param {'ok'|'bad'|''} kind Style.
   * @returns {void}
   */
  function show(text, kind) {
    msg.textContent = text;
    msg.className = `backup-msg ${kind}`.trim();
  }

  /** Reads the chosen file and replaces the progress after confirmation. @returns {Promise<void>} */
  async function importFile() {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const outcome = await applyBackupFile(ctx, file);
    if (outcome === 'bad') show(TEXT.importBad, 'bad');
    if (outcome !== 'ok') return;
    show(TEXT.importOk, 'ok');
    onImported();
  }

  input.addEventListener('change', () => { importFile(); });
  const root = el('div', { cls: 'backup-panel' }, [
    el('h2', { cls: 'panel-title', text: TEXT.backupTitle }),
    el('div', { cls: 'backup-row' }, [
      textButton(TEXT.exportBtn, () => { saveBackup(ctx); }, 'btn-small', 'btn-export'),
      el('label', { cls: 'btn btn-small', id: 'btn-import', attrs: { for: 'input-import' }, text: TEXT.importBtn }),
      input,
    ]),
    el('p', { cls: 'backup-hint', text: TEXT.backupHint }),
    el('p', { cls: 'backup-hint', text: TEXT.backupSafetyHint }),
    msg,
  ]);
  return { el: root, refresh: () => show('', '') };
}
