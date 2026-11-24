// @ts-check
/**
 * Start screen: greeting, swaying dancer, start button, menu, hidden parent button.
 * @module screens/start
 */
import { TEXT, UI, BACKUP } from '../config.js';
import { el, clear } from '../dom.js';
import { drawDancer } from '../dancer.js';
import { computeStreak } from '../rewards.js';
import { decodeStates } from '../sequins.js';
import { SEQUIN_POINTS } from '../dancer.js';
import { hasProgress, needsBackup, lastBackupSessions } from '../backup.js';
import { makeScreen, iconButton, textButton } from './base.js';
import { playOpen, playLabel } from './gamekit.js';
import { applyBackupFile, saveBackup } from './backuppanel.js';

/** @typedef {import('./base.js').AppContext} AppContext */

/**
 * Sequin states of all sequin outfits, decoded from the saved state.
 * @param {import('../storage.js').State} state State.
 * @returns {Object<string, boolean[]>}
 */
export function sequinStatesOf(state) {
  return Object.fromEntries(Object.entries(SEQUIN_POINTS)
    .map(([id, pts]) => [id, decodeStates(state.sequins[id] || '', pts.length)]));
}

/**
 * Attaches a long-press handler (hold for `ms`).
 * @param {HTMLElement} node Target element.
 * @param {number} ms Hold duration.
 * @param {() => void} onHold Called after holding long enough.
 * @returns {void}
 */
export function onLongPress(node, ms, onHold) {
  let timer = 0;
  const cancel = () => {
    window.clearTimeout(timer);
    node.classList.remove('holding');
  };
  node.addEventListener('pointerdown', () => {
    cancel();
    node.classList.add('holding');
    timer = window.setTimeout(() => { cancel(); onHold(); }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => node.addEventListener(ev, cancel));
}

/**
 * Calls `onRelease` when the finger is lifted after holding for at least `ms`.
 * Acting on release (a user gesture) lets the handler open the iOS share sheet.
 * @param {HTMLElement} node Target element.
 * @param {number} ms Minimum hold duration.
 * @param {() => void} onRelease Called on a long enough hold.
 * @returns {void}
 */
export function onHoldRelease(node, ms, onRelease) {
  let since = 0;
  const reset = () => { since = 0; node.classList.remove('holding'); };
  node.addEventListener('pointerdown', () => { since = Date.now(); node.classList.add('holding'); });
  node.addEventListener('pointerup', () => {
    const held = since > 0 && Date.now() - since >= ms;
    reset();
    if (held) onRelease();
  });
  ['pointerleave', 'pointercancel'].forEach((ev) => node.addEventListener(ev, reset));
  node.addEventListener('contextmenu', (e) => e.preventDefault());
}

/**
 * Creates the start screen.
 * @param {AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createStartScreen(ctx) {
  const { section, body } = makeScreen('start');
  const greeting = el('h1', { id: 'greeting', cls: 'greeting' });
  const streak = el('p', { cls: 'streak-badge' });
  const devBadge = el('span', { cls: 'dev-badge', id: 'dev-badge', text: TEXT.devBadge });
  const stage = el('div', { cls: 'stage' });
  const parents = iconButton('eltern', TEXT.parentsHint, () => {}, 'btn-parents', { id: 'btn-parents' });
  onLongPress(parents, UI.parentHoldMs, () => ctx.show('parents'));
  const startBtn = textButton(TEXT.start, () => {
    ctx.music.unlock();
    ctx.keeper.enable();
    ctx.show('countdown');
  }, 'btn-big btn-start', 'btn-start');
  const menu = el('nav', { cls: 'menu' }, [
    iconButton('album', TEXT.album, () => ctx.show('album'), '', { id: 'btn-album', showLabel: true }),
    iconButton('kleid', TEXT.dressUp, () => ctx.show('dress'), '', { id: 'btn-dress', showLabel: true }),
    iconButton('kalender', TEXT.calendar, () => ctx.show('calendar'), '', { id: 'btn-calendar', showLabel: true }),
    iconButton('bild', TEXT.backgrounds, () => ctx.show('backgrounds'), '', { id: 'btn-backgrounds', showLabel: true }),
    iconButton('spiele', TEXT.playTime, () => { ctx.music.unlock(); ctx.show('games'); }, 'btn-games-start',
      { id: 'btn-games-start', showLabel: true }),
  ]);
  const gamesBtn = /** @type {HTMLElement} */ (menu.querySelector('#btn-games-start'));
  const reminder = textButton(TEXT.backupReminder, () => {}, 'btn-small btn-reminder', 'btn-backup-reminder');
  onHoldRelease(reminder, UI.parentHoldMs, () => {
    saveBackup(ctx).then((saved) => { if (saved) reminder.hidden = true; });
  });
  const restoreInput = /** @type {HTMLInputElement} */ (el('input', { id: 'input-restore', cls: 'visually-hidden',
    attrs: { type: 'file', accept: `${BACKUP.mime},.json` } }));
  const restore = el('label', { cls: 'btn btn-small btn-restore', id: 'btn-restore',
    attrs: { for: 'input-restore' }, text: TEXT.restoreBtn });
  restoreInput.addEventListener('change', async () => {
    const file = restoreInput.files && restoreInput.files[0];
    restoreInput.value = '';
    if (!file) return;
    const outcome = await applyBackupFile(ctx, file);
    if (outcome === 'bad') window.alert(TEXT.importBad);
    if (outcome === 'ok') ctx.show('start');
  });
  body.append(parents, devBadge, el('div', { cls: 'start-backup' }, [reminder, restore, restoreInput]),
    el('div', { cls: 'start-layout' }, [
      stage,
      el('div', { cls: 'start-panel' }, [greeting, el('p', { cls: 'subtitle', text: TEXT.ready }), streak, startBtn, menu]),
    ]));

  return {
    name: 'start',
    el: section,
    enter() {
      const state = ctx.getState();
      const saved = ctx.getSavedState();
      restore.hidden = hasProgress(saved);
      reminder.hidden = !needsBackup(saved, lastBackupSessions());
      devBadge.hidden = !ctx.isDevMode();
      gamesBtn.hidden = !playOpen(ctx);
      /** @type {HTMLElement} */ (gamesBtn.querySelector('.btn-label')).textContent = playLabel(ctx);
      greeting.textContent = state.name ? `${TEXT.greeting} ${state.name}!` : `${TEXT.greeting}!`;
      const days = computeStreak(state.calendar, new Date());
      streak.textContent = days > 0 ? `★ ${days} ${TEXT.streak}` : '';
      clear(stage);
      stage.append(drawDancer({ wearing: state.wearing, sequinStates: sequinStatesOf(state), cls: 'move-wiegen' }));
    },
  };
}
