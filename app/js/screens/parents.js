// @ts-check
/**
 * Hidden parent menu: name, brushing time, zone order, music, reset.
 * @module screens/parents
 */
import { TEXT, TIMER, ZONE_ORDERS, MAX_NAME_LENGTH } from '../config.js';
import { el } from '../dom.js';
import { defaultState } from '../storage.js';
import { makeScreen, textButton } from './base.js';
import { createDevPanel } from './devpanel.js';
import { createBackupPanel } from './backuppanel.js';

/**
 * Labelled form row.
 * @param {string} label Label text.
 * @param {HTMLElement} control Input element.
 * @param {HTMLElement} [extra] Optional value display.
 * @returns {HTMLElement}
 */
function row(label, control, extra) {
  return el('label', { cls: 'form-row' }, [el('span', { cls: 'form-label', text: label }), control, extra || null]);
}

/**
 * Creates the parent menu.
 * @param {import('./base.js').AppContext} ctx App context.
 * @returns {import('./base.js').Screen}
 */
export function createParentsScreen(ctx) {
  const { section, body } = makeScreen('parents', { title: TEXT.parents });
  const name = /** @type {HTMLInputElement} */ (el('input', { id: 'input-name', attrs: { type: 'text', maxlength: MAX_NAME_LENGTH, autocomplete: 'off' } }));
  const total = /** @type {HTMLInputElement} */ (el('input', { id: 'input-total', attrs: {
    type: 'range', min: TIMER.minTotalSec, max: TIMER.maxTotalSec, step: TIMER.stepSec } }));
  const totalValue = el('span', { cls: 'form-value' });
  const order = /** @type {HTMLSelectElement} */ (el('select', { id: 'select-order' },
    ZONE_ORDERS.map((o) => el('option', { text: o.label, attrs: { value: o.id } }))));
  const music = /** @type {HTMLInputElement} */ (el('input', { id: 'input-music', attrs: { type: 'checkbox' } }));
  const volume = /** @type {HTMLInputElement} */ (el('input', { id: 'input-volume', attrs: { type: 'range', min: 0, max: 1, step: 0.05 } }));

  /** Reads the form into the state. @returns {void} */
  function save() {
    const state = ctx.getState();
    const settings = { ...state.settings, totalSec: Number(total.value), zoneOrder: order.value,
      music: music.checked, volume: Number(volume.value) };
    totalValue.textContent = `${settings.totalSec} ${TEXT.seconds}`;
    ctx.setState({ ...state, name: name.value.trim().slice(0, MAX_NAME_LENGTH), settings });
    ctx.music.configure(settings);
  }

  [name, total, order, music, volume].forEach((c) => {
    c.addEventListener('input', save);
    c.addEventListener('change', save);
  });
  const reset = textButton(TEXT.reset, () => {
    if (!window.confirm(TEXT.resetConfirm)) return;
    ctx.setDevMode(false);
    dev.refresh();
    const fresh = defaultState();
    ctx.setState({ ...fresh, name: ctx.getState().name, settings: ctx.getState().settings });
  }, 'btn-small btn-danger', 'btn-reset');
  const dev = createDevPanel(ctx);
  const backup = createBackupPanel(ctx, () => { fillForm(); dev.refresh(); });
  const close = textButton(TEXT.close, () => ctx.show('start'), 'btn-big', 'btn-parents-close');
  body.append(el('form', { cls: 'parents-form', attrs: { autocomplete: 'off' }, on: { submit: (e) => e.preventDefault() } }, [
    row(TEXT.nameLabel, name),
    row(TEXT.totalLabel, total, totalValue),
    row(TEXT.orderLabel, order),
    row(TEXT.musicLabel, music),
    row(TEXT.volumeLabel, volume),
  ]), el('div', { cls: 'parents-actions' }, [reset, close]), backup.el, dev.el);

  /** Fills the form from the state. @returns {void} */
  function fillForm() {
    const { name: n, settings: s } = ctx.getState();
    name.value = n;
    total.value = String(s.totalSec);
    totalValue.textContent = `${s.totalSec} ${TEXT.seconds}`;
    order.value = s.zoneOrder;
    music.checked = s.music;
    volume.value = String(s.volume);
  }

  return {
    name: 'parents',
    el: section,
    enter() {
      fillForm();
      dev.refresh();
      backup.refresh();
    },
  };
}
