// @ts-check
/**
 * Backup panel inside the parent menu: export progress to a file, import it on another device.
 * @module screens/backuppanel
 */
import { TEXT, BACKUP } from '../config.js';
import { el } from '../dom.js';
import { deliverBackup, parseBackup } from '../backup.js';
import { textButton } from './base.js';

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
    const result = file.size > BACKUP.maxBytes ? { ok: false } : parseBackup(await file.text());
    if (!result.ok) {
      show(TEXT.importBad, 'bad');
      return;
    }
    if (!window.confirm(TEXT.importConfirm)) return;
    ctx.setDevMode(false);
    ctx.setState(result.state);
    ctx.music.configure(result.state.settings);
    show(TEXT.importOk, 'ok');
    onImported();
  }

  input.addEventListener('change', () => { importFile(); });
  const root = el('div', { cls: 'backup-panel' }, [
    el('h2', { cls: 'panel-title', text: TEXT.backupTitle }),
    el('div', { cls: 'backup-row' }, [
      textButton(TEXT.exportBtn, () => { deliverBackup(ctx.getSavedState()); }, 'btn-small', 'btn-export'),
      el('label', { cls: 'btn btn-small', id: 'btn-import', attrs: { for: 'input-import' }, text: TEXT.importBtn }),
      input,
    ]),
    el('p', { cls: 'backup-hint', text: TEXT.backupHint }),
    msg,
  ]);
  return { el: root, refresh: () => show('', '') };
}
